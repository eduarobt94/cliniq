import { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Button, Badge, Card, Avatar, Icons, MonoLabel } from '../../components/ui';
import { useAgenda } from '../../hooks/useAgenda';
import { updateAppointmentStatus } from '../../lib/appointmentService';

const STATUS_MAP = {
  confirmed:   { tone: 'success', label: 'Confirmado'  },
  pending:     { tone: 'warn',    label: 'Pendiente'   },
  new:         { tone: 'accent',  label: 'Nuevo'       },
  rescheduled: { tone: 'outline', label: 'Reagendó'    },
  cancelled:   { tone: 'danger',  label: 'Cancelado'   },
};

const STATUS_ACTIONS = [
  { status: 'confirmed',   label: 'Confirmar'   },
  { status: 'pending',     label: 'Pendiente'   },
  { status: 'rescheduled', label: 'Reagendó'    },
  { status: 'cancelled',   label: 'Cancelar'    },
];

const FILTERS = [
  { key: 'all',        label: 'Todos'       },
  { key: 'confirmed',  label: 'Confirmados' },
  { key: 'pending',    label: 'Pendientes'  },
  { key: 'new',        label: 'Nuevos'      },
];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(isoDate, n) {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateLabel(isoDate) {
  const today = todayISO();
  const tomorrow = addDays(today, 1);
  const yesterday = addDays(today, -1);
  if (isoDate === today)     return 'Hoy';
  if (isoDate === tomorrow)  return 'Mañana';
  if (isoDate === yesterday) return 'Ayer';
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('es-UY', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).replace(/\b\w/g, c => c.toUpperCase());
}

function formatTime(datetimeStr) {
  return new Date(datetimeStr).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' });
}

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

function ActionsMenu({ apptId, currentStatus, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const available = STATUS_ACTIONS.filter(a => a.status !== currentStatus);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className="w-8 h-8 rounded-[6px] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[var(--cq-surface-3)] transition-opacity focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--cq-accent)]"
        aria-label="Acciones"
      >
        <Icons.More size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-10 w-44 bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[10px] shadow-lg overflow-hidden py-1">
          {available.map(a => (
            <button
              key={a.status}
              onClick={(e) => { e.stopPropagation(); setOpen(false); onStatusChange(apptId, a.status); }}
              className={`w-full text-left px-4 py-2 text-[13px] hover:bg-[var(--cq-surface-2)] transition-colors ${
                a.status === 'cancelled' ? 'text-[var(--cq-danger)]' : ''
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const AppointmentRow = memo(function AppointmentRow({ appt, onStatusChange }) {
  const name   = appt.patients?.full_name ?? appt.patient_name ?? '—';
  const time   = formatTime(appt.appointment_datetime);
  const type   = appt.appointment_type ?? '';
  const prof   = appt.professional_name ?? '';
  const status = appt.status ?? 'new';
  const { tone, label } = STATUS_MAP[status] ?? STATUS_MAP.new;

  return (
    <li className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--cq-surface-2)] transition-colors cursor-default group">
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
      <ActionsMenu apptId={appt.id} currentStatus={status} onStatusChange={onStatusChange} />
    </li>
  );
});

export function Agenda() {
  const { openModal } = useOutletContext() ?? {};
  const [currentDate,  setCurrentDate]  = useState(todayISO);
  const [activeFilter, setActiveFilter] = useState('all');
  const { appointments, loading } = useAgenda(currentDate);

  const goToday = useCallback(() => { setCurrentDate(todayISO()); }, []);
  const goPrev  = useCallback(() => setCurrentDate(d => addDays(d, -1)), []);
  const goNext  = useCallback(() => setCurrentDate(d => addDays(d, +1)), []);

  const handleNewAppointment = useCallback(() => {
    openModal?.({ date: currentDate });
  }, [openModal, currentDate]);

  const handleStatusChange = useCallback(async (apptId, newStatus) => {
    try {
      await updateAppointmentStatus(apptId, newStatus);
    } catch {
      // realtime will not fire on error; silent fail acceptable here
    }
  }, []);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return appointments;
    return appointments.filter(a => a.status === activeFilter);
  }, [appointments, activeFilter]);

  const dateLabel = formatDateLabel(currentDate);
  const isToday   = currentDate === todayISO();

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Agenda</h1>
          <p className="text-[13px] text-[var(--cq-fg-muted)] mt-0.5">{dateLabel}</p>
        </div>
        <Button variant="accent" size="sm" onClick={handleNewAppointment}>
          <Icons.Plus size={14} />
          Nuevo turno
        </Button>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={goPrev}
          className="w-9 h-9 rounded-[8px] border border-[var(--cq-border)] flex items-center justify-center hover:bg-[var(--cq-surface-2)] transition-colors"
          aria-label="Día anterior"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="flex-1 text-center">
          <span className="text-[14px] font-medium">
            {new Date(`${currentDate}T12:00:00`).toLocaleDateString('es-UY', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            }).replace(/\b\w/g, c => c.toUpperCase())}
          </span>
        </div>

        <button
          onClick={goNext}
          className="w-9 h-9 rounded-[8px] border border-[var(--cq-border)] flex items-center justify-center hover:bg-[var(--cq-surface-2)] transition-colors"
          aria-label="Día siguiente"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {!isToday && (
          <button
            onClick={goToday}
            className="px-3 h-9 rounded-[8px] border border-[var(--cq-border)] text-[13px] font-medium hover:bg-[var(--cq-surface-2)] transition-colors"
          >
            Hoy
          </button>
        )}
      </div>

      {/* List */}
      <Card padded={false}>
        <div className="flex items-center gap-1 p-3 border-b border-[var(--cq-border)]">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
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
            <MonoLabel className="ml-auto pr-2">{appointments.length} turno{appointments.length !== 1 ? 's' : ''}</MonoLabel>
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
                  <button
                    onClick={handleNewAppointment}
                    className="mt-2 text-[13px] text-[var(--cq-accent)] hover:underline"
                  >
                    Agregar el primero
                  </button>
                )}
              </div>
            </li>
          ) : (
            filtered.map(appt => (
              <AppointmentRow key={appt.id} appt={appt} onStatusChange={handleStatusChange} />
            ))
          )}
        </ul>
      </Card>
    </div>
  );
}
