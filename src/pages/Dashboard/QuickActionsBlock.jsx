import { Icons, Card, MonoLabel } from '../../components/ui';

const BASE_ACTIONS = [
  { id: 'new-appt',    l: 'Nuevo turno',    icon: Icons.Plus     },
  { id: 'express',     l: 'Turno express',  icon: Icons.Zap      },
  { id: 'new-patient', l: 'Nuevo paciente', icon: Icons.Users    },
  { id: 'invite',      l: 'Invitar equipo', icon: Icons.UserPlus },
];

export function QuickActionsBlock({ onNew, onNewExpress, onInvite, onNewPatient }) {
  const actions = BASE_ACTIONS.map((a) =>
    a.id === 'new-appt'     ? { ...a, onClick: onNew          } :
    a.id === 'express'      ? { ...a, onClick: onNewExpress    } :
    a.id === 'invite'       ? { ...a, onClick: onInvite        } :
    a.id === 'new-patient'  ? { ...a, onClick: onNewPatient    } :
    a
  );

  return (
    <Card>
      <MonoLabel>Acciones rápidas</MonoLabel>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              onClick={a.onClick}
              className="h-20 rounded-[10px] border border-[var(--cq-border)] hover:border-[var(--cq-fg)] hover:bg-[var(--cq-surface-2)] transition-all flex flex-col items-start justify-between p-3 text-left group"
            >
              <Icon size={16} />
              <span className="text-[13px] font-medium">{a.l}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
