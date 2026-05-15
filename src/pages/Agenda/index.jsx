import { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Badge, Button, Card, Avatar, Icons, MonoLabel } from '../../components/ui';
import { EditApptModal } from '../../components/EditApptModal';
import { useAgendaRange } from '../../hooks/useAgendaRange';
import { updateAppointmentStatus, deleteAppointment } from '../../lib/appointmentService';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_MAP = {
  confirmed:   { tone: 'success', label: 'Confirmado'  },
  pending:     { tone: 'warn',    label: 'Pendiente'   },
  new:         { tone: 'accent',  label: 'Nuevo'       },
  rescheduled: { tone: 'outline', label: 'Reagendó'    },
  cancelled:   { tone: 'danger',  label: 'Cancelado'   },
};

// Color-mix chips matching Badge component style (uses oklch to stay in gamut)
const CHIP_STYLE = {
  confirmed:   { background: 'color-mix(in oklch, var(--cq-success) 14%, transparent)', color: 'var(--cq-success)', borderLeftColor: 'var(--cq-success)'  },
  pending:     { background: 'color-mix(in oklch, var(--cq-warn)    14%, transparent)', color: 'var(--cq-warn)',    borderLeftColor: 'var(--cq-warn)'     },
  new:         { background: 'color-mix(in oklch, var(--cq-accent)  14%, transparent)', color: 'var(--cq-accent)',  borderLeftColor: 'var(--cq-accent)'   },
  rescheduled: { background: 'var(--cq-surface-2)',                                     color: 'var(--cq-fg-muted)',borderLeftColor: 'var(--cq-border)'   },
  cancelled:   { background: 'color-mix(in oklch, var(--cq-danger)  14%, transparent)', color: 'var(--cq-danger)',  borderLeftColor: 'var(--cq-danger)'   },
};

const STATUS_ACTIONS = [
  { status: 'confirmed',   label: 'Confirmar' },
  { status: 'pending',     label: 'Pendiente' },
  { status: 'rescheduled', label: 'Reagendó'  },
  { status: 'cancelled',   label: 'Cancelar'  },
];

const APPOINTMENT_TYPES = [
  'Control', 'Primera consulta', 'Seguimiento', 'Urgencia', 'Procedimiento', 'Laboratorio',
];

const DELETABLE_STATUSES = ['new', 'cancelled'];

const STATUS_LABELS = {
  confirmed:   'Confirmado',
  pending:     'Pendiente',
  new:         'Nuevo',
  rescheduled: 'Reagendó',
  cancelled:   'Cancelado',
};

const FILTERS = [
  { key: 'all',       label: 'Todos'       },
  { key: 'confirmed', label: 'Confirmados' },
  { key: 'pending',   label: 'Pendientes'  },
  { key: 'new',       label: 'Nuevos'      },
];

const WEEK_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// ─── Date utilities ───────────────────────────────────────────────────────────
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

function addMonths(iso, n) {
  const [y, m, day] = iso.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISO(d);
}

function getWeekDays(iso) {
  const d = new Date(`${iso}T12:00:00`);
  const dow = d.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diffToMon);
  return Array.from({ length: 7 }, (_, i) => {
    const c = new Date(d);
    c.setDate(d.getDate() + i);
    return toISO(c);
  });
}

function getMonthGrid(iso) {
  const [y, m] = iso.split('-').map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const lastDay  = new Date(y, m, 0);
  const firstDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const grid = [];
  const cursor = new Date(firstDay);
  cursor.setDate(cursor.getDate() - firstDow);
  while (cursor <= lastDay || (grid.length < 5 && grid.flat().length < 35)) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(toISO(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    grid.push(week);
    if (cursor > lastDay && grid.length >= 5) break;
  }
  return grid;
}

function groupByDate(appointments) {
  const map = {};
  for (const a of appointments) {
    const iso = toISO(new Date(a.appointment_datetime));
    if (!map[iso]) map[iso] = [];
    map[iso].push(a);
  }
  return map;
}

function fmtTime(datetimeStr) {
  return new Date(datetimeStr).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' });
}

function fmtDayLabel(iso) {
  const today     = todayISO();
  const tomorrow  = addDays(today, 1);
  const yesterday = addDays(today, -1);
  if (iso === today)     return 'Hoy';
  if (iso === tomorrow)  return 'Mañana';
  if (iso === yesterday) return 'Ayer';
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-UY', {
    weekday: 'long', day: 'numeric', month: 'long',
  // Capitalizar primer carácter de cada palabra sin romper acentos
  }).split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ');
}

function fmtWeekLabel(weekDays) {
  const s = new Date(`${weekDays[0]}T12:00:00`);
  const e = new Date(`${weekDays[6]}T12:00:00`);
  if (s.getMonth() === e.getMonth()) {
    return `${s.getDate()}–${e.toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  }
  return `${s.toLocaleDateString('es-UY', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('es-UY', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function fmtMonthLabel(iso) {
  return new Date(`${iso.slice(0, 7)}-15T12:00:00`)
    .toLocaleDateString('es-UY', { month: 'long', year: 'numeric' })
    .split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ');
}

function toLocalDate(isoUtc) {
  const d = new Date(isoUtc);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toLocalTime(isoUtc) {
  const d = new Date(isoUtc);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
const SkeletonRow = memo(function SkeletonRow() {
  return (
    <li className="flex items-center gap-4 px-5 py-3">
      <div className="w-12 shrink-0 animate-pulse bg-[var(--cq-surface-2)] rounded h-4" />
      <div className="animate-pulse bg-[var(--cq-surface-2)] rounded-full size-9 shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-4 w-40" />
        <div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-3 w-28" />
      </div>
      <div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-4 w-24 hidden sm:block" />
      <div className="animate-pulse bg-[var(--cq-surface-2)] rounded-full h-[22px] w-24" />
    </li>
  );
});

// ─── Day-view actions dropdown ────────────────────────────────────────────────
function ActionsMenu({ appt, onStatusChange, onEdit, onDelete }) {
  const [open,          setOpen]          = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ref = useRef(null);
  const canDelete = DELETABLE_STATUSES.includes(appt.status);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (!ref.current?.contains(e.target)) { setOpen(false); setConfirmDelete(false); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const close = () => { setOpen(false); setConfirmDelete(false); };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className="size-8 rounded-[6px] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[var(--cq-surface-2)] transition-opacity focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--cq-accent)]"
        aria-label="Acciones del turno"
      >
        <Icons.More size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-20 w-48 bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[10px] shadow-lg overflow-hidden py-1">
          {confirmDelete ? (
            <div className="px-4 py-2.5">
              <p className="text-[12.5px] text-[var(--cq-fg-muted)] mb-2">¿Eliminar este turno?</p>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); close(); onDelete(appt.id); }}
                  className="flex-1 px-2 py-1 rounded-[6px] bg-[var(--cq-danger)] text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
                >
                  Sí, eliminar
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                  className="flex-1 px-2 py-1 rounded-[6px] border border-[var(--cq-border)] text-[12px] hover:bg-[var(--cq-surface-2)] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); close(); onEdit(appt); }}
                className="w-full text-left px-4 py-2 text-[13px] hover:bg-[var(--cq-surface-2)] transition-colors"
              >
                Editar
              </button>
              <div className="h-px bg-[var(--cq-border)] mx-2 my-1" />
              {STATUS_ACTIONS.flatMap(a => a.status === appt.status ? [] : [
                <button
                  key={a.status}
                  onClick={(e) => { e.stopPropagation(); close(); onStatusChange(appt.id, a.status); }}
                  className={`w-full text-left px-4 py-2 text-[13px] hover:bg-[var(--cq-surface-2)] transition-colors ${
                    a.status === 'cancelled' ? 'text-[var(--cq-danger)]' : ''
                  }`}
                >
                  {a.label}
                </button>
              ])}
              {canDelete && (
                <>
                  <div className="h-px bg-[var(--cq-border)] mx-2 my-1" />
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                    className="w-full text-left px-4 py-2 text-[13px] text-[var(--cq-danger)] hover:bg-[var(--cq-surface-2)] transition-colors"
                  >
                    Eliminar turno
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Appointment chip (week / month) ─────────────────────────────────────────
function ApptChip({ appt, onHover }) {
  const name   = appt.patients?.full_name ?? '—';
  const time   = fmtTime(appt.appointment_datetime);
  const status = appt.status ?? 'new';
  const style  = CHIP_STYLE[status] ?? CHIP_STYLE.new;

  return (
    <button
      className="w-full text-left px-1.5 py-[2px] rounded-[4px] text-[11px] font-medium truncate leading-[1.65] border-l-2 transition-opacity hover:opacity-75 cursor-default"
      style={{ ...style, borderLeftWidth: '2px', borderLeftStyle: 'solid' }}
      onMouseEnter={(e) => onHover?.(appt, e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => onHover?.(null, null)}
      tabIndex={0}
      aria-label={`${name} a las ${time}`}
    >
      <span className="font-mono opacity-80">{time} </span>{name}
    </button>
  );
}

// ─── Hover tooltip ────────────────────────────────────────────────────────────
function ApptTooltip({ appt, rect }) {
  if (!appt || !rect) return null;
  const name   = appt.patients?.full_name ?? '—';
  const phone  = appt.patients?.phone_number;
  const time   = fmtTime(appt.appointment_datetime);
  const type   = appt.appointment_type;
  const prof   = appt.professional_name;
  const status = appt.status ?? 'new';
  const { tone, label } = STATUS_MAP[status] ?? STATUS_MAP.new;
  const rawNotes = appt.notes ?? '';
  // For AI appointments, extract service from notes if appointment_type is missing
  const notesService = rawNotes.match(/Servicio:\s*([^—\n]+)/)?.[1]?.trim() ?? '';
  const displayType  = type || notesService;
  // Observation = everything after the "—" separator, or plain notes without AI prefix
  const notesAfterDash = rawNotes.includes('—') ? rawNotes.split('—').slice(1).join('—').trim() : '';
  const notes = rawNotes.startsWith('[IA]') ? notesAfterDash : rawNotes.trim();

  const W = 220;
  let left = rect.left + rect.width / 2 - W / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - W - 8));
  const spaceBelow = window.innerHeight - rect.bottom;
  const top = spaceBelow > 180 ? rect.bottom + 6 : rect.top - 6;
  const ty  = spaceBelow > 180 ? '0%' : '-100%';

  return (
    <div
      className="fixed z-50 pointer-events-none bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[12px] shadow-xl p-3"
      style={{ left, top, width: W, transform: `translateY(${ty})` }}
      role="tooltip"
    >
      <p className="font-semibold text-[13px] leading-tight truncate">{name}</p>
      {phone && <p className="text-[11.5px] text-[var(--cq-fg-muted)] mt-0.5">{phone}</p>}
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[12px]">
          <Icons.Calendar size={11} />
          <span className="font-mono">{time}</span>
        </div>
        {displayType && <p className="text-[12px] text-[var(--cq-fg-muted)]">{displayType}</p>}
        {prof && <p className="text-[12px] text-[var(--cq-fg-muted)]">{prof}</p>}
      </div>
      {notes && (
        <p className="mt-2 text-[11.5px] text-[var(--cq-fg-muted)] italic leading-snug line-clamp-3 border-t border-[var(--cq-border)] pt-2">
          {notes}
        </p>
      )}
      <div className="mt-2.5">
        <Badge tone={tone} dot>{label}</Badge>
      </div>
    </div>
  );
}

// ─── Day view ─────────────────────────────────────────────────────────────────
function DayView({ appointments, loading, activeFilter, onFilterChange, onStatusChange, onEdit, onDelete, onNew, textFilter, onTextFilterClear }) {
  const filtered = useMemo(() => {
    let list = activeFilter === 'all' ? appointments : appointments.filter(a => a.status === activeFilter);
    if (textFilter?.trim()) {
      const q = textFilter.trim().toLowerCase();
      list = list.filter(a =>
        (a.patients?.full_name ?? '').toLowerCase().includes(q) ||
        (a.appointment_type    ?? '').toLowerCase().includes(q) ||
        (a.professional_name   ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [appointments, activeFilter, textFilter]);

  return (
    <Card padded={false}>
      <div className="flex items-center gap-1 p-3 border-b border-[var(--cq-border)]">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className={`px-3 h-8 rounded-[6px] text-[13px] font-medium transition-colors ${
              activeFilter === f.key
                ? 'bg-[var(--cq-fg)] text-[var(--cq-bg)]'
                : 'text-[var(--cq-fg-muted)] hover:bg-[var(--cq-surface-2)] hover:text-[var(--cq-fg)]'
            }`}
          >
            {f.label}
          </button>
        ))}
        {textFilter?.trim() && (
          <button
            onClick={onTextFilterClear}
            className="ml-2 inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-[color-mix(in_oklch,var(--cq-accent)_12%,transparent)] text-[var(--cq-accent)] text-[12px] font-medium hover:opacity-75 transition-opacity"
          >
            <Icons.Search size={11} />
            {textFilter}
            <Icons.Close size={10} />
          </button>
        )}
        {!loading && appointments.length > 0 && (
          <MonoLabel className="ml-auto pr-2 shrink-0">
            {filtered.length !== appointments.length
              ? `${filtered.length} de ${appointments.length}`
              : `${appointments.length} turno${appointments.length !== 1 ? 's' : ''}`}
          </MonoLabel>
        )}
      </div>

      <ul className="divide-y divide-[var(--cq-border)]">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : filtered.length === 0 ? (
          <li className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--cq-fg-muted)]">
            <Icons.Calendar size={32} />
            <div className="text-center">
              <p className="text-[14px] font-medium">
                {activeFilter === 'all' ? 'Sin turnos para este día' : 'Sin turnos con este filtro'}
              </p>
              {activeFilter === 'all' && (
                <button onClick={onNew} className="mt-2 text-[13px] text-[var(--cq-accent)] hover:underline">
                  Agregar el primero
                </button>
              )}
            </div>
          </li>
        ) : (
          filtered.map(appt => {
            const name   = appt.patients?.full_name ?? '—';
            const time   = fmtTime(appt.appointment_datetime);
            const type   = appt.appointment_type ?? '';
            const prof   = appt.professional_name ?? '';
            const status = appt.status ?? 'new';
            const { tone, label } = STATUS_MAP[status] ?? STATUS_MAP.new;
            return (
              <li key={appt.id} className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--cq-surface-2)] transition-colors group">
                <div className="w-12 shrink-0">
                  <span className="font-mono text-[13px] font-medium">{time}</span>
                </div>
                <Avatar name={name} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium truncate">{name}</div>
                  <div className="text-[12px] text-[var(--cq-fg-muted)] truncate">{type}</div>
                </div>
                <div className="hidden sm:block text-[13px] text-[var(--cq-fg-muted)] w-32 truncate shrink-0">{prof}</div>
                <Badge tone={tone} dot>{label}</Badge>
                <ActionsMenu appt={appt} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} />
              </li>
            );
          })
        )}
      </ul>
    </Card>
  );
}

// ─── Week view ────────────────────────────────────────────────────────────────
function WeekView({ currentDate, appointments, loading, onNew }) {
  const [hovered, setHovered] = useState({ appt: null, rect: null });
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  const byDate   = useMemo(() => groupByDate(appointments), [appointments]);
  const [today, setToday] = useState(todayISO);
  useEffect(() => { setToday(todayISO()); }, []);

  const handleHover = useCallback((appt, rect) => setHovered({ appt, rect }), []);

  return (
    <>
      <Card padded={false}>
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-[var(--cq-border)]">
          {weekDays.map((iso, i) => {
            const d       = new Date(`${iso}T12:00:00`);
            const isToday = iso === today;
            return (
              <div
                key={iso}
                className={`px-1 py-3 text-center border-r last:border-r-0 border-[var(--cq-border)] ${
                  isToday ? 'bg-[var(--cq-accent-soft)]' : ''
                }`}
              >
                <div className={`text-[10px] font-mono uppercase tracking-wider ${
                  isToday ? 'text-[var(--cq-accent)]' : 'text-[var(--cq-fg-muted)]'
                }`}>
                  {WEEK_LABELS[i]}
                </div>
                <div className={`text-[18px] font-semibold mt-0.5 leading-none ${
                  isToday ? 'text-[var(--cq-accent)]' : ''
                }`}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Appointment columns */}
        <div className="grid grid-cols-7 min-h-[220px]">
          {weekDays.map((iso) => {
            const dayAppts = byDate[iso] ?? [];
            const isToday  = iso === today;
            return (
              <div
                key={iso}
                className={`p-1 border-r last:border-r-0 border-[var(--cq-border)] flex flex-col gap-[3px] min-h-[220px] ${
                  isToday ? 'bg-[color-mix(in_oklch,var(--cq-accent)_4%,transparent)]' : ''
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-5 w-full" />
                    <div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-5 w-3/4" />
                  </>
                ) : dayAppts.length === 0 ? (
                  <button
                    onClick={() => onNew(iso)}
                    className="w-full mt-1 h-7 rounded-[5px] border border-dashed border-transparent hover:border-[var(--cq-border)] hover:bg-[var(--cq-surface-2)] text-[10.5px] text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] transition-all flex items-center justify-center opacity-0 hover:opacity-100 focus:opacity-100"
                    aria-label={`Nuevo turno para el ${iso}`}
                  >
                    +
                  </button>
                ) : (
                  dayAppts.map(a => (
                    <ApptChip key={a.id} appt={a} onHover={handleHover} />
                  ))
                )}
              </div>
            );
          })}
        </div>
      </Card>
      <ApptTooltip appt={hovered.appt} rect={hovered.rect} />
    </>
  );
}

// ─── Month view ───────────────────────────────────────────────────────────────
const MAX_CHIPS = 3;

function MonthView({ currentDate, appointments, loading, onNew }) {
  const [hovered, setHovered] = useState({ appt: null, rect: null });
  const grid  = useMemo(() => getMonthGrid(currentDate), [currentDate]);
  const m     = parseInt(currentDate.split('-')[1], 10);
  const y     = parseInt(currentDate.split('-')[0], 10);
  const byDate = useMemo(() => groupByDate(appointments), [appointments]);
  const [today, setToday] = useState(todayISO);
  useEffect(() => { setToday(todayISO()); }, []);

  const handleHover = useCallback((appt, rect) => setHovered({ appt, rect }), []);

  return (
    <>
      <Card padded={false}>
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-[var(--cq-border)]">
          {WEEK_LABELS.map(d => (
            <div key={d} className="py-2.5 text-center text-[10.5px] font-mono uppercase tracking-wider text-[var(--cq-fg-muted)] border-r last:border-r-0 border-[var(--cq-border)]">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {grid.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b last:border-b-0 border-[var(--cq-border)]">
            {week.map((iso) => {
              const cellDate     = new Date(`${iso}T12:00:00`);
              const isThisMonth  = cellDate.getMonth() + 1 === m && cellDate.getFullYear() === y;
              const isToday      = iso === today;
              const dayAppts     = byDate[iso] ?? [];
              const overflow     = Math.max(0, dayAppts.length - MAX_CHIPS);

              return (
                <div
                  key={iso}
                  className={`min-h-[88px] p-1.5 border-r last:border-r-0 border-[var(--cq-border)] flex flex-col gap-[3px] transition-colors ${
                    isThisMonth ? '' : 'opacity-30'
                  } ${isToday ? 'bg-[var(--cq-accent-soft)]' : 'hover:bg-[var(--cq-surface-2)]'}`}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-0.5 px-0.5">
                    <button
                      onClick={() => onNew(iso)}
                      className={`size-6 flex items-center justify-center rounded-full text-[12px] font-medium leading-none transition-colors ${
                        isToday
                          ? 'bg-[var(--cq-accent)] text-white text-[11px]'
                          : 'hover:bg-[var(--cq-surface-3)]'
                      }`}
                      aria-label={`Agregar turno el ${iso}`}
                      title={`Nuevo turno el ${iso}`}
                    >
                      {cellDate.getDate()}
                    </button>
                  </div>

                  {/* Appointment chips */}
                  {!loading && dayAppts.slice(0, MAX_CHIPS).map(a => (
                    <ApptChip key={a.id} appt={a} onHover={handleHover} />
                  ))}
                  {!loading && overflow > 0 && (
                    <span className="text-[10px] text-[var(--cq-fg-muted)] px-1 leading-none mt-0.5">
                      +{overflow} más
                    </span>
                  )}
                  {loading && isThisMonth && dayAppts.length === 0 && (
                    <div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-4 w-full" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </Card>
      <ApptTooltip appt={hovered.appt} rect={hovered.rect} />
    </>
  );
}

// ─── Main Agenda ──────────────────────────────────────────────────────────────
export function Agenda() {
  const { openModal, push } = useOutletContext() ?? {};

  const [searchParams, setSearchParams] = useSearchParams();
  const [currentDate,  setCurrentDate]  = useState(todayISO);
  const [view,         setView]         = useState('day');
  const [activeFilter, setActiveFilter] = useState('all');
  const [editingAppt,  setEditingAppt]  = useState(null);
  const [textFilter,   setTextFilter]   = useState(() => searchParams.get('q') ?? '');

  // Clear URL param once applied
  useEffect(() => {
    if (searchParams.get('q')) setSearchParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute the date range based on view mode
  const { startDate, endDate } = useMemo(() => {
    if (view === 'week') {
      const days = getWeekDays(currentDate);
      return { startDate: days[0], endDate: days[6] };
    }
    if (view === 'month') {
      const grid = getMonthGrid(currentDate);
      const all  = grid.flat();
      return { startDate: all[0], endDate: all[all.length - 1] };
    }
    return { startDate: currentDate, endDate: currentDate };
  }, [view, currentDate]);

  const { appointments, loading, refetch: refetchAgenda } = useAgendaRange(startDate, endDate);

  // Refetch cuando el modal global crea un turno nuevo (viene del DashboardLayout)
  useEffect(() => {
    const handler = () => refetchAgenda();
    window.addEventListener('cq_appointment_created', handler);
    return () => window.removeEventListener('cq_appointment_created', handler);
  }, [refetchAgenda]);

  const handleStatusChange = useCallback(async (apptId, newStatus) => {
    try {
      await updateAppointmentStatus(apptId, newStatus);
      refetchAgenda();
      push?.(`Estado actualizado: ${STATUS_LABELS[newStatus] ?? newStatus}.`, 'success');
    } catch {
      push?.('No se pudo actualizar el estado. Intentá de nuevo.', 'error');
    }
  }, [push, refetchAgenda]);

  const handleDelete = useCallback(async (apptId) => {
    try {
      await deleteAppointment(apptId);
      refetchAgenda();
      push?.('Turno eliminado correctamente.', 'success');
    } catch {
      push?.('No se pudo eliminar el turno. Intentá más tarde.', 'error');
    }
  }, [push, refetchAgenda]);

  const handleEdit = useCallback((appt) => {
    setEditingAppt(appt);
  }, []);

  const handleEditSuccess = useCallback(() => {
    refetchAgenda();
    push?.('Turno actualizado correctamente.', 'success');
    setEditingAppt(null);
  }, [push, refetchAgenda]);

  const handleNew = useCallback((date) => {
    openModal?.({ date: date ?? currentDate });
  }, [openModal, currentDate]);

  // Navigation
  const goPrev = useCallback(() => {
    if (view === 'month') setCurrentDate(d => addMonths(d, -1));
    else setCurrentDate(d => addDays(d, view === 'week' ? -7 : -1));
  }, [view]);

  const goNext = useCallback(() => {
    if (view === 'month') setCurrentDate(d => addMonths(d, +1));
    else setCurrentDate(d => addDays(d, view === 'week' ? +7 : +1));
  }, [view]);

  const goToday = useCallback(() => setCurrentDate(todayISO()), []);

  // Label for the date navigator
  const dateLabel = useMemo(() => {
    if (view === 'day')   return fmtDayLabel(currentDate);
    if (view === 'week')  return fmtWeekLabel(getWeekDays(currentDate));
    return fmtMonthLabel(currentDate);
  }, [view, currentDate]);

  const isCurrentPeriod = useMemo(() => {
    const t = todayISO();
    if (view === 'day')   return currentDate === t;
    if (view === 'week')  return getWeekDays(currentDate).includes(t);
    const [y, m] = currentDate.split('-');
    const [ty, tm] = t.split('-');
    return y === ty && m === tm;
  }, [view, currentDate]);

  const handleViewChange = useCallback((newView) => {
    setView(newView);
    setActiveFilter('all');
  }, []);

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Agenda</h1>
          <p className="text-[13px] text-[var(--cq-fg-muted)] mt-0.5">{dateLabel}</p>
        </div>
        <button
          onClick={() => handleNew(currentDate)}
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[8px] bg-[var(--cq-accent)] text-white text-[13px] font-medium hover:opacity-90 transition-opacity shrink-0"
        >
          <Icons.Plus size={14} />
          Nuevo turno
        </button>
      </div>

      {/* View switcher + Date navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* View toggle */}
        <div className="flex items-center bg-[var(--cq-surface-2)] rounded-[8px] p-0.5 gap-0.5">
          {[
            { key: 'day',   label: 'Día'    },
            { key: 'week',  label: 'Semana' },
            { key: 'month', label: 'Mes'    },
          ].map(v => (
            <button
              key={v.key}
              onClick={() => handleViewChange(v.key)}
              className={`px-3 h-7 rounded-[6px] text-[12.5px] font-medium transition-colors ${
                view === v.key
                  ? 'bg-[var(--cq-surface)] text-[var(--cq-fg)] shadow-sm'
                  : 'text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)]'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Date navigation */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={goPrev}
            className="size-8 rounded-[7px] border border-[var(--cq-border)] flex items-center justify-center hover:bg-[var(--cq-surface-2)] transition-colors"
            aria-label="Período anterior"
          >
            <ChevronLeft />
          </button>
          <div className="min-w-[160px] text-center">
            <span className="text-[13.5px] font-medium">{dateLabel}</span>
          </div>
          <button
            onClick={goNext}
            className="size-8 rounded-[7px] border border-[var(--cq-border)] flex items-center justify-center hover:bg-[var(--cq-surface-2)] transition-colors"
            aria-label="Período siguiente"
          >
            <ChevronRight />
          </button>
          {!isCurrentPeriod && (
            <button
              onClick={goToday}
              className="px-3 h-8 rounded-[7px] border border-[var(--cq-border)] text-[12.5px] font-medium hover:bg-[var(--cq-surface-2)] transition-colors"
            >
              Hoy
            </button>
          )}
        </div>
      </div>

      {/* View content */}
      {view === 'day' && (
        <DayView
          appointments={appointments}
          loading={loading}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          onStatusChange={handleStatusChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onNew={() => handleNew(currentDate)}
          textFilter={textFilter}
          onTextFilterClear={() => setTextFilter('')}
        />
      )}
      {view === 'week' && (
        <div className="overflow-x-auto">
          <WeekView
            currentDate={currentDate}
            appointments={appointments}
            loading={loading}
            onNew={handleNew}
          />
        </div>
      )}
      {view === 'month' && (
        <MonthView
          currentDate={currentDate}
          appointments={appointments}
          loading={loading}
          onNew={handleNew}
        />
      )}

      <EditApptModal
        appt={editingAppt}
        onClose={() => setEditingAppt(null)}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}

// ─── Inline SVG chevrons ──────────────────────────────────────────────────────
function ChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
