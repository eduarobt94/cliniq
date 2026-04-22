import { memo, useMemo } from 'react';
import { Icons, Badge, Card, Avatar, MonoLabel, Divider } from '../../components/ui';

const STATUS_MAP = {
  confirmed:   { tone: 'success', label: 'Confirmado' },
  pending:     { tone: 'warn',    label: 'Esperando'  },
  new:         { tone: 'accent',  label: 'Nuevo'      },
  rescheduled: { tone: 'outline', label: 'Reagendó'   },
};

const APPTS = [
  { id: 'a1', t: '09:00', name: 'Camila Álvarez',   type: 'Control',        prof: 'Dr. Bonomi',  status: 'confirmed'   },
  { id: 'a2', t: '09:30', name: 'Martín Pérez',     type: 'Limpieza',       prof: 'Dra. Silva',  status: 'confirmed'   },
  { id: 'a3', t: '10:00', name: 'Lucía Fernández',  type: 'Ortodoncia',     prof: 'Dr. Bonomi',  status: 'pending'     },
  { id: 'a4', t: '10:30', name: 'Roberto Castro',   type: 'Endodoncia',     prof: 'Dr. Bonomi',  status: 'confirmed'   },
  { id: 'a5', t: '11:00', name: 'Ana Rodríguez',    type: 'Primera visita', prof: 'Dra. Silva',  status: 'new'         },
  { id: 'a6', t: '11:30', name: 'Diego Méndez',     type: 'Control',        prof: 'Dr. Bonomi',  status: 'rescheduled' },
];

const NOW_INDEX = 2;

const StatusPill = memo(({ status }) => {
  const { tone, label } = STATUS_MAP[status] ?? STATUS_MAP.pending;
  return <Badge tone={tone} dot>{label}</Badge>;
});

const AppointmentRow = memo(({ appt, isNow }) => (
  <li className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--cq-surface-2)] transition-colors cursor-pointer group relative">
    {isNow && <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--cq-accent)]" />}
    <div className="w-14 shrink-0">
      <div className="font-mono text-[13px] font-medium">{appt.t}</div>
      <MonoLabel>{appt.prof.split(' ')[1]}</MonoLabel>
    </div>
    <Avatar name={appt.name} size={34} />
    <div className="flex-1 min-w-0">
      <div className="text-[14px] font-medium truncate">{appt.name}</div>
      <div className="text-[12.5px] text-[var(--cq-fg-muted)] truncate">
        {appt.type} · {appt.prof}
      </div>
    </div>
    <StatusPill status={appt.status} />
    <button
      className="w-7 h-7 rounded-[6px] hover:bg-[var(--cq-surface-3)] opacity-0 group-hover:opacity-100 flex items-center justify-center focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--cq-accent)]"
      aria-label={`Acciones para ${appt.name}`}
    >
      <Icons.More size={14} />
    </button>
  </li>
));

export function AgendaBlock() {
  return (
    <Card className="lg:col-span-2" padded={false}>
      <div className="flex items-center justify-between p-5 pb-4">
        <div>
          <MonoLabel>Agenda · Hoy</MonoLabel>
          <h3 className="mt-1 text-[18px] font-semibold tracking-tight">Lunes 20 abril</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge tone="success" dot>14 confirmados</Badge>
          <Badge tone="warn"    dot>3 pendientes</Badge>
        </div>
      </div>
      <Divider />
      <ul className="divide-y divide-[var(--cq-border)]">
        {APPTS.map((a, i) => (
          <AppointmentRow key={a.id} appt={a} isNow={i === NOW_INDEX} />
        ))}
      </ul>
      <div className="p-4 flex items-center justify-between">
        <MonoLabel>8 turnos más hoy</MonoLabel>
        <button className="text-[13px] font-medium inline-flex items-center gap-1 hover:text-[var(--cq-accent)] transition-colors">
          Ver agenda completa <Icons.ArrowUpRight size={12} />
        </button>
      </div>
    </Card>
  );
}
