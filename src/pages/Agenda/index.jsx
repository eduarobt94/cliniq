import { useState, useEffect, useMemo, memo } from 'react';
import { Button, Badge, Card, Avatar, Icons, MonoLabel, SectionLabel, Divider } from '../../components/ui';
import { useAppointments } from '../../hooks/useAppointments';
import { APPOINTMENTS_MOCK } from '../../data/appointments.mock';

const STATUS_MAP = {
  confirmed:   { tone: 'success', label: 'Confirmado' },
  pending:     { tone: 'warn',    label: 'Pendiente'  },
  new:         { tone: 'accent',  label: 'Nuevo'      },
  rescheduled: { tone: 'outline', label: 'Reagendó'   },
};

const FILTERS = [
  { key: 'all',        label: 'Todos'       },
  { key: 'confirmed',  label: 'Confirmados' },
  { key: 'pending',    label: 'Pendientes'  },
  { key: 'new',        label: 'Nuevos'      },
];

function normalizeAppt(appt) {
  if (appt.t !== undefined) return appt;
  return {
    id: appt.id,
    t: new Date(appt.appointment_datetime).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' }),
    name: appt.patient_name,
    type: appt.appointment_type ?? '',
    prof: appt.professional_name ?? '',
    status: appt.status,
  };
}

const SkeletonRow = memo(function SkeletonRow() {
  return (
    <li className="flex items-center gap-4 px-5 py-3">
      <div className="w-12 shrink-0">
        <div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-4 w-12" />
      </div>
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

const AppointmentRow = memo(function AppointmentRow({ appt }) {
  const norm = useMemo(() => normalizeAppt(appt), [appt]);
  const { tone, label } = STATUS_MAP[norm.status] ?? STATUS_MAP.pending;

  return (
    <li className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--cq-surface-2)] transition-colors cursor-pointer group">
      <div className="w-12 shrink-0">
        <span className="font-mono text-[13px] font-medium text-[var(--cq-fg)]">{norm.t}</span>
      </div>
      <Avatar name={norm.name} size={36} />
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium truncate">{norm.name}</div>
        <div className="text-[12px] text-[var(--cq-fg-muted)] truncate">{norm.type}</div>
      </div>
      <div className="hidden sm:block text-[13px] text-[var(--cq-fg-muted)] w-32 truncate shrink-0">
        {norm.prof}
      </div>
      <Badge tone={tone} dot>{label}</Badge>
      <button
        className="w-8 h-8 rounded-[6px] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[var(--cq-surface-3)] transition-opacity focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--cq-accent)] shrink-0"
        aria-label={`Acciones para ${norm.name}`}
      >
        <Icons.More size={14} />
      </button>
    </li>
  );
});

function useTodayLabel() {
  const [label, setLabel] = useState('');
  useEffect(() => {
    const fmt = new Date().toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long' });
    setLabel(fmt.charAt(0).toUpperCase() + fmt.slice(1));
  }, []);
  return label;
}

export function Agenda() {
  const { appointments: liveData, loading } = useAppointments();
  const [activeFilter, setActiveFilter] = useState('all');
  const todayLabel = useTodayLabel();

  const appointments = liveData && liveData.length > 0 ? liveData : APPOINTMENTS_MOCK;

  const filtered = useMemo(() => {
    const normalized = appointments.map(normalizeAppt);
    if (activeFilter === 'all') return normalized;
    return normalized.filter(a => a.status === activeFilter);
  }, [appointments, activeFilter]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Agenda</h1>
          <p className="text-[13px] text-[var(--cq-fg-muted)] mt-0.5">{todayLabel}</p>
        </div>
        <Button variant="accent" size="sm">
          <Icons.Plus size={14} />
          Nuevo turno
        </Button>
      </div>

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
        </div>

        <ul className="divide-y divide-[var(--cq-border)]">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
          ) : filtered.length === 0 ? (
            <li className="flex flex-col items-center justify-center py-16 gap-2 text-[var(--cq-fg-muted)]">
              <Icons.Calendar size={32} />
              <span className="text-[14px]">Sin turnos para este filtro</span>
            </li>
          ) : (
            filtered.map(appt => <AppointmentRow key={appt.id} appt={appt} />)
          )}
        </ul>

        {!loading && filtered.length > 0 && (
          <>
            <Divider />
            <div className="px-5 py-3">
              <button className="text-[13px] font-medium inline-flex items-center gap-1 text-[var(--cq-fg-muted)] hover:text-[var(--cq-accent)] transition-colors">
                Ver semana completa <Icons.ArrowUpRight size={12} />
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
