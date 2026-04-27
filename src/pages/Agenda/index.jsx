import { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Badge, Button, Card, Avatar, Icons, MonoLabel } from '../../components/ui';
import { useAgendaRange } from '../../hooks/useAgendaRange';
import { updateAppointmentStatus, updateAppointment, deleteAppointment } from '../../lib/appointmentService';

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
  }).replace(/\b\w/g, c => c.toUpperCase());
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
    .replace(/\b\w/g, c => c.toUpperCase());
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
      <div className="animate-pulse bg-[var(--cq-surface-2)] rounded-full h-9 w-9 shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-4 w-40" />
        <div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-3 w-28" />
      </div>
      <div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-4 w-24 hidden sm:block" />
      <div className="animate-pulse bg-[var(--cq-surface-2)] rounded-full h-[22px] w-24" />
    </li>
  );
});

// ─── Edit appointment modal ───────────────────────────────────────────────────
function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function EditApptModal({ appt, onClose, onSuccess }) {
  const [date,         setDate]         = useState('');
  const [time,         setTime]         = useState('');
  const [type,         setType]         = useState('');
  const [professional, setProfessional] = useState('');
  const [notes,        setNotes]        = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!appt) return;
    setDate(toLocalDate(appt.appointment_datetime));
    setTime(toLocalTime(appt.appointment_datetime));
    setType(appt.appointment_type ?? '');
    setProfessional(appt.professional_name ?? '');
    setNotes(appt.notes ?? '');
    setError(null);
    setSubmitting(false);
  }, [appt]);

  useEffect(() => {
    if (!appt) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    containerRef.current?.querySelector('input,select,textarea,button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [appt, onClose]);

  if (!appt) return null;

  const patientName = appt.patients?.full_name ?? '—';

  const handleSubmit = async () => {
    if (!date || !time) { setError('Completá la fecha y hora.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const datetime = new Date(`${date}T${time}:00`).toISOString();
      await updateAppointment(appt.id, { datetime, type, professionalName: professional, notes });
      onSuccess?.();
    } catch {
      setError('No se pudo guardar el turno. Intentá de nuevo.');
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-appt-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={containerRef}
        className="relative w-full max-w-[480px] bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[16px] p-6 max-h-[90vh] overflow-y-auto"
        style={{ animation: 'cqModalIn 220ms cubic-bezier(.2,.7,.2,1)' }}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <MonoLabel>Editar turno</MonoLabel>
            <h3 id="edit-appt-title" className="mt-1 text-[20px] font-semibold tracking-tight truncate max-w-[320px]">
              {patientName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-[8px] hover:bg-[var(--cq-surface-2)] flex items-center justify-center"
            aria-label="Cerrar"
          >
            <Icons.Close size={15} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block">
                <MonoLabel>Fecha *</MonoLabel>
                <div className="mt-1.5 flex items-center gap-2 h-11 px-3 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-bg)] focus-within:border-[var(--cq-fg)]">
                  <span className="text-[var(--cq-fg-muted)] shrink-0"><Icons.Calendar size={14} /></span>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="flex-1 bg-transparent outline-none text-[13.5px]" />
                </div>
              </label>
            </div>
            <div>
              <label className="block">
                <MonoLabel>Hora *</MonoLabel>
                <div className="mt-1.5 flex items-center h-11 px-3 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-bg)] focus-within:border-[var(--cq-fg)]">
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} className="flex-1 bg-transparent outline-none text-[13.5px]" />
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block">
              <MonoLabel>Tipo de consulta</MonoLabel>
              <div className="mt-1.5 h-11 px-3 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-bg)] focus-within:border-[var(--cq-fg)] flex items-center">
                <select value={type} onChange={e => setType(e.target.value)} className="flex-1 bg-transparent outline-none text-[13.5px] cursor-pointer">
                  <option value="">Seleccionar…</option>
                  {APPOINTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </label>
          </div>

          <div>
            <label className="block">
              <MonoLabel>Profesional</MonoLabel>
              <div className="mt-1.5 flex items-center gap-2 h-11 px-3 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-bg)] focus-within:border-[var(--cq-fg)]">
                <input type="text" value={professional} onChange={e => setProfessional(e.target.value)} placeholder="Dr. / Dra. …" className="flex-1 bg-transparent outline-none text-[13.5px]" />
              </div>
            </label>
          </div>

          <div>
            <label className="block">
              <MonoLabel>Notas</MonoLabel>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones internas…" rows={2} className="mt-1.5 w-full px-3 py-2.5 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-bg)] focus:border-[var(--cq-fg)] outline-none text-[13.5px] resize-none" />
            </label>
          </div>

          {error && <p role="alert" className="text-[13px] text-[var(--cq-danger)]">{error}</p>}
        </div>

        <div className="mt-5 flex items-center gap-2 justify-end">
          <Button variant="ghost" size="md" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={submitting || !date || !time}>
            {submitting ? <SpinnerIcon /> : <Icons.Check size={14} />}
            {submitting ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}

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
        className="w-8 h-8 rounded-[6px] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[var(--cq-surface-2)] transition-opacity focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--cq-accent)]"
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
                  No
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
              {STATUS_ACTIONS.filter(a => a.status !== appt.status).map(a => (
                <button
                  key={a.status}
                  onClick={(e) => { e.stopPropagation(); close(); onStatusChange(appt.id, a.status); }}
                  className={`w-full text-left px-4 py-2 text-[13px] hover:bg-[var(--cq-surface-2)] transition-colors ${
                    a.status === 'cancelled' ? 'text-[var(--cq-danger)]' : ''
                  }`}
                >
                  {a.label}
                </button>
              ))}
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

  const W = 210;
  let left = rect.left + rect.width / 2 - W / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - W - 8));
  const spaceBelow = window.innerHeight - rect.bottom;
  const top = spaceBelow > 160 ? rect.bottom + 6 : rect.top - 6;
  const ty  = spaceBelow > 160 ? '0%' : '-100%';

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
        {type && <p className="text-[12px] text-[var(--cq-fg-muted)]">{type}</p>}
        {prof && <p className="text-[12px] text-[var(--cq-fg-muted)]">{prof}</p>}
      </div>
      <div className="mt-2.5">
        <Badge tone={tone} dot>{label}</Badge>
      </div>
    </div>
  );
}

// ─── Day view ─────────────────────────────────────────────────────────────────
function DayView({ appointments, loading, activeFilter, onFilterChange, onStatusChange, onEdit, onDelete, onNew }) {
  const filtered = useMemo(() => {
    if (activeFilter === 'all') return appointments;
    return appointments.filter(a => a.status === activeFilter);
  }, [appointments, activeFilter]);

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
        {!loading && appointments.length > 0 && (
          <MonoLabel className="ml-auto pr-2 shrink-0">
            {appointments.length} turno{appointments.length !== 1 ? 's' : ''}
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
  const today    = todayISO();

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
  const today  = todayISO();

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
                      className={`w-6 h-6 flex items-center justify-center rounded-full text-[12px] font-medium leading-none transition-colors ${
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
                  {loading && isThisMonth && dayAppts.length === 0 && Math.random() > 0.7 && (
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

  const [currentDate,  setCurrentDate]  = useState(todayISO);
  const [view,         setView]         = useState('day');
  const [activeFilter, setActiveFilter] = useState('all');
  const [editingAppt,  setEditingAppt]  = useState(null);

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

  const { appointments, loading } = useAgendaRange(startDate, endDate);

  const handleStatusChange = useCallback(async (apptId, newStatus) => {
    try {
      await updateAppointmentStatus(apptId, newStatus);
      push?.(`Estado actualizado: ${STATUS_LABELS[newStatus] ?? newStatus}.`, 'success');
    } catch {
      push?.('No se pudo actualizar el estado. Intentá de nuevo.', 'error');
    }
  }, [push]);

  const handleDelete = useCallback(async (apptId) => {
    try {
      await deleteAppointment(apptId);
      push?.('Turno eliminado correctamente.', 'success');
    } catch {
      push?.('No se pudo eliminar el turno. Intentá más tarde.', 'error');
    }
  }, [push]);

  const handleEdit = useCallback((appt) => {
    setEditingAppt(appt);
  }, []);

  const handleEditSuccess = useCallback(() => {
    push?.('Turno actualizado correctamente.', 'success');
    setEditingAppt(null);
  }, [push]);

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
            className="w-8 h-8 rounded-[7px] border border-[var(--cq-border)] flex items-center justify-center hover:bg-[var(--cq-surface-2)] transition-colors"
            aria-label="Período anterior"
          >
            <ChevronLeft />
          </button>
          <div className="min-w-[160px] text-center">
            <span className="text-[13.5px] font-medium">{dateLabel}</span>
          </div>
          <button
            onClick={goNext}
            className="w-8 h-8 rounded-[7px] border border-[var(--cq-border)] flex items-center justify-center hover:bg-[var(--cq-surface-2)] transition-colors"
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
