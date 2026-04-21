import { Icons, Card, MonoLabel } from '../../components/ui';

export function QuickActionsBlock({ onNew }) {
  const actions = [
    { l: 'Nuevo turno', icon: Icons.Plus, onClick: onNew },
    { l: 'Nuevo paciente', icon: Icons.Users },
    { l: 'Enviar encuesta', icon: Icons.Chat },
    { l: 'Emitir factura', icon: Icons.Zap },
  ];

  return (
    <Card>
      <MonoLabel>Acciones rápidas</MonoLabel>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {actions.map((a, i) => {
          const Icon = a.icon;
          return (
            <button
              key={i}
              onClick={a.onClick}
              className="h-20 rounded-[10px] border border-[var(--cq-border)] hover:border-[var(--cq-fg)] hover:bg-[var(--cq-surface-2)] transition-all flex flex-col items-start justify-between p-3 text-left group"
            >
              <Icon size={16} />
              <span className="text-[12.5px] font-medium">{a.l}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
