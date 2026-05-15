import { memo, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Icons, Badge, Card, Avatar, MonoLabel, Divider } from '../../components/ui';
import { EditApptModal } from '../../components/EditApptModal';
import { updateAppointmentStatus } from '../../lib/appointmentService';

const STATUS_MAP = {
  confirmed:   { tone: 'success', label: 'Confirmado' },
  pending:     { tone: 'warn',    label: 'Esperando'  },
  new:         { tone: 'accent',  label: 'Nuevo'      },
  rescheduled: { tone: 'outline', label: 'Reagendó'   },
  cancelled:   { tone: 'danger',  label: 'Cancelado'  },
};

const STATUS_ACTIONS = [
  { status: 'confirmed',   label: 'Confirmar'  },
  { status: 'pending',     label: 'Pendiente'  },
  { status: 'rescheduled', label: 'Reagendó'   },
  { status: 'cancelled',   label: 'Cancelar'   },
];

// ─── Actions menu (portal) ────────────────────────────────────────────────────
function ApptActionsMenu({ appt, onEdit, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState({ top: 0, right: 0 });
  const btnRef  = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        btnRef.current  && !btnRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!open) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen(v => !v);
  };

  const close = () => setOpen(false);

  const menu = open && createPortal(
    <div
      ref={menuRef}
      className="fixed z-[200] w-48 bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[10px] shadow-xl overflow-hidden py-1"
      style={{ top: pos.top, right: pos.right }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); close(); onEdit(appt); }}
        className="w-full text-left px-4 py-2 text-[13px] hover:bg-[var(--cq-surface-2)] transition-colors"
      >
        Editar turno
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
    </div>,
    document.body
  );

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        aria-label="Acciones del turno"
        className="size-9 rounded-[6px] hover:bg-[var(--cq-surface-3)] opacity-0 group-hover:opacity-100 flex items-center justify-center focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[var(--cq-accent)]"
      >
        <Icons.More size={14} />
      </button>
      {menu}
    </>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonRow = memo(function SkeletonRow() {
  return (
    <li className="flex items-center gap-4 px-5 py-3">
      <div className="w-14 shrink-0 flex flex-col gap-1.5">
        <div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-4 w-12" />
        <div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-3 w-10" />
      </div>
      <div className="animate-pulse bg-[var(--cq-surface-2)] rounded-full h-[34px] w-[34px] shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-4 w-36" />
        <div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-3 w-24" />
      </div>
      <div className="animate-pulse bg-[var(--cq-surface-2)] rounded-full h-6 w-24" />
    </li>
  );
});

// ─── Status pill ──────────────────────────────────────────────────────────────
const StatusPill = memo(({ status }) => {
  const { tone, label } = STATUS_MAP[status] ?? STATUS_MAP.pending;
  return <Badge tone={tone} dot>{label}</Badge>;
});

// ─── Appointment row ──────────────────────────────────────────────────────────
const AppointmentRow = memo(function AppointmentRow({ appt, isNow, isReal, onEdit, onStatusChange }) {
  const navigate = useNavigate();

  const t    = isReal
    ? new Date(appt.appointment_datetime).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })
    : appt.t;
  const name = isReal ? (appt.patient_name ?? '—') : appt.name;
  const type = isReal ? (appt.appointment_type ?? '') : appt.type;
  const prof = isReal ? (appt.professional_name ?? '') : appt.prof;
  const profLastName = prof ? prof.split(' ').pop() : '';
  const status = appt.status;

  const handleNameClick = (e) => {
    e.stopPropagation();
    navigate(`/dashboard/agenda?q=${encodeURIComponent(name)}`);
  };

  return (
    <li className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--cq-surface-2)] transition-colors cursor-default group relative">
      {isNow && <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--cq-accent)]" />}
      <div className="w-14 shrink-0">
        <div className="font-mono text-[13px] font-medium">{t}</div>
        <MonoLabel>{profLastName}</MonoLabel>
      </div>
      <Avatar name={name} size={34} />
      <div className="flex-1 min-w-0">
        <button
          onClick={handleNameClick}
          className="text-[14px] font-medium truncate max-w-full text-left hover:text-[var(--cq-accent)] hover:underline transition-colors"
          title={`Ver agenda de ${name}`}
        >
          {name}
        </button>
        <div className="text-[12.5px] text-[var(--cq-fg-muted)] truncate">
          {type}{type && prof ? ' · ' : ''}{prof}
        </div>
      </div>
      <StatusPill status={status} />
      {isReal ? (
        <ApptActionsMenu appt={appt} onEdit={onEdit} onStatusChange={onStatusChange} />
      ) : (
        <div className="size-9" />
      )}
    </li>
  );
});

// ─── Today label ──────────────────────────────────────────────────────────────
function useTodayLabel() {
  const [label, setLabel] = useState('');
  useEffect(() => {
    const fmt = new Date().toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long' });
    setLabel(fmt.charAt(0).toUpperCase() + fmt.slice(1));
  }, []);
  return label;
}

// ─── Mock data (shown when no real appointments prop) ─────────────────────────
const MOCK_APPTS = [
  { id: 'a1', t: '09:00', name: 'Camila Álvarez',   type: 'Control',        prof: 'Dr. Bonomi',  status: 'confirmed'   },
  { id: 'a2', t: '09:30', name: 'Martín Pérez',     type: 'Limpieza',       prof: 'Dra. Silva',  status: 'confirmed'   },
  { id: 'a3', t: '10:00', name: 'Lucía Fernández',  type: 'Ortodoncia',     prof: 'Dr. Bonomi',  status: 'pending'     },
  { id: 'a4', t: '10:30', name: 'Roberto Castro',   type: 'Endodoncia',     prof: 'Dr. Bonomi',  status: 'confirmed'   },
  { id: 'a5', t: '11:00', name: 'Ana Rodríguez',    type: 'Primera visita', prof: 'Dra. Silva',  status: 'new'         },
  { id: 'a6', t: '11:30', name: 'Diego Méndez',     type: 'Control',        prof: 'Dr. Bonomi',  status: 'rescheduled' },
];
const NOW_INDEX = 2;

// ─── Main ─────────────────────────────────────────────────────────────────────
export function AgendaBlock({ appointments, loading, push, refetch }) {
  const navigate    = useNavigate();
  const todayLabel  = useTodayLabel();
  const isReal      = appointments !== undefined;
  const displayAppts = isReal ? appointments : MOCK_APPTS;

  const [editingAppt, setEditingAppt] = useState(null);

  const confirmedCount = displayAppts.filter(a => a.status === 'confirmed').length;
  const pendingCount   = displayAppts.filter(a => a.status === 'pending').length;
  const remainingCount = Math.max(0, displayAppts.length - 6);

  const handleStatusChange = useCallback(async (apptId, newStatus) => {
    try {
      await updateAppointmentStatus(apptId, newStatus);
      refetch?.();
      const label = STATUS_MAP[newStatus]?.label ?? newStatus;
      push?.(`Estado actualizado: ${label}.`, 'success');
    } catch {
      push?.('No se pudo actualizar el estado.', 'error');
    }
  }, [push, refetch]);

  const handleEditSuccess = useCallback(() => {
    refetch?.();
    push?.('Turno actualizado correctamente.', 'success');
    setEditingAppt(null);
  }, [push, refetch]);

  return (
    <>
      <Card className="lg:col-span-2" padded={false}>
        <div className="flex items-center justify-between p-5 pb-4">
          <div>
            <MonoLabel>Agenda · Hoy</MonoLabel>
            <h3 className="mt-1 text-[18px] font-semibold tracking-tight">{todayLabel}</h3>
          </div>
          <div className="flex items-center gap-1.5">
            {loading ? (
              <>
                <div className="animate-pulse bg-[var(--cq-surface-2)] rounded-full h-6 w-28" />
                <div className="animate-pulse bg-[var(--cq-surface-2)] rounded-full h-6 w-24" />
              </>
            ) : (
              <>
                <Badge tone="success" dot>{isReal ? `${confirmedCount} confirmados` : '14 confirmados'}</Badge>
                <Badge tone="warn"    dot>{isReal ? `${pendingCount} pendientes`   : '3 pendientes'}</Badge>
              </>
            )}
          </div>
        </div>
        <Divider />
        <ul className="divide-y divide-[var(--cq-border)]">
          {loading ? (
            <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
          ) : displayAppts.length === 0 ? (
            <li className="flex flex-col items-center justify-center py-10 gap-2 text-[var(--cq-fg-muted)]">
              <Icons.Calendar size={28} />
              <p className="text-[13.5px] font-medium">Sin turnos para hoy</p>
            </li>
          ) : (
            displayAppts.slice(0, 6).map((a, i) => (
              <AppointmentRow
                key={a.id}
                appt={a}
                isNow={!isReal && i === NOW_INDEX}
                isReal={isReal}
                onEdit={setEditingAppt}
                onStatusChange={handleStatusChange}
              />
            ))
          )}
        </ul>
        <div className="p-4 flex items-center justify-between">
          <MonoLabel>
            {loading ? '' : isReal
              ? remainingCount > 0 ? `${remainingCount} turnos más hoy` : 'Todos los turnos mostrados'
              : '8 turnos más hoy'}
          </MonoLabel>
          <button
            onClick={() => navigate('/dashboard/agenda')}
            className="text-[13px] font-medium inline-flex items-center gap-1 hover:text-[var(--cq-accent)] transition-colors"
          >
            Ver agenda completa <Icons.ArrowUpRight size={12} />
          </button>
        </div>
      </Card>

      <EditApptModal
        appt={editingAppt}
        onClose={() => setEditingAppt(null)}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}
