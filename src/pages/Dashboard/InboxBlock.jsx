import { Icons, Badge, Card, Avatar, MonoLabel, Divider } from '../../components/ui';

const MESSAGES = [
  { name: 'Camila Álvarez', msg: '1 — Confirmo el turno de mañana, gracias', time: 'ahora', unread: true, auto: true },
  { name: 'Martín Pérez', msg: 'Hola, ¿tienen turno esta semana para limpieza?', time: '12m', unread: true },
  { name: 'Lucía Fernández', msg: '¿Cuánto sale la primera consulta?', time: '34m', unread: true, bot: true },
  { name: 'Roberto Castro', msg: 'Perfecto, nos vemos el jueves', time: '1h', unread: false },
];

export function InboxBlock() {
  return (
    <Card padded={false}>
      <div className="flex items-center justify-between p-5 pb-4">
        <div>
          <MonoLabel>Inbox · WhatsApp</MonoLabel>
          <h3 className="mt-1 text-[18px] font-semibold tracking-tight">3 sin leer</h3>
        </div>
        <Badge tone="success" dot>
          Bot activo
        </Badge>
      </div>
      <Divider />
      <ul className="divide-y divide-[var(--cq-border)]">
        {MESSAGES.map((m, i) => (
          <li
            key={i}
            className="px-5 py-3 hover:bg-[var(--cq-surface-2)] cursor-pointer transition-colors flex items-start gap-3"
          >
            <div className="relative shrink-0">
              <Avatar name={m.name} size={34} />
              {m.unread && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--cq-accent)] ring-2 ring-[var(--cq-surface)]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[13.5px] truncate ${m.unread ? 'font-semibold' : 'font-medium'}`}
                >
                  {m.name}
                </span>
                {m.auto && <MonoLabel className="text-[var(--cq-success)]">auto</MonoLabel>}
                {m.bot && <MonoLabel className="text-[var(--cq-accent)]">bot</MonoLabel>}
                <span className="ml-auto font-mono text-[11px] text-[var(--cq-fg-muted)]">
                  {m.time}
                </span>
              </div>
              <div className="text-[12.5px] text-[var(--cq-fg-muted)] truncate mt-0.5">{m.msg}</div>
            </div>
          </li>
        ))}
      </ul>
      <div className="p-4">
        <button className="w-full h-9 text-[13px] font-medium text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] inline-flex items-center justify-center gap-1">
          Abrir bandeja <Icons.ArrowUpRight size={12} />
        </button>
      </div>
    </Card>
  );
}
