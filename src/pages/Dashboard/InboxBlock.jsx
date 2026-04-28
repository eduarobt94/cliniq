import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWhatsappInbox } from '../../hooks/useWhatsappInbox';
import { Icons, Badge, Card, Avatar, MonoLabel, Divider } from '../../components/ui';

function relativeTime(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const min  = Math.floor(diff / 60_000);
  if (min < 1)   return 'ahora';
  if (min < 60)  return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24)    return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function RowSkeleton() {
  return (
    <li className="px-5 py-3 flex items-start gap-3 animate-pulse">
      <div className="w-[34px] h-[34px] rounded-full bg-[var(--cq-surface-3)] shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-3 w-1/3 rounded bg-[var(--cq-surface-3)]" />
        <div className="h-2.5 w-2/3 rounded bg-[var(--cq-surface-3)]" />
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <li className="px-5 py-8 text-center">
      <p className="text-[13px] text-[var(--cq-fg-muted)]">
        Sin mensajes aún.
      </p>
      <p className="text-[12px] text-[var(--cq-fg-muted)] mt-1">
        Los pacientes aparecerán aquí cuando respondan los recordatorios.
      </p>
    </li>
  );
}

export function InboxBlock() {
  const navigate      = useNavigate();
  const { clinic }    = useAuth();
  const { messages, unreadCount, loading } = useWhatsappInbox(clinic?.id);

  const isRecent = unreadCount > 0;

  return (
    <Card padded={false}>
      <div className="flex items-center justify-between p-5 pb-4">
        <div>
          <MonoLabel>Inbox · WhatsApp</MonoLabel>
          <h3 className="mt-1 text-[18px] font-semibold tracking-tight">
            {loading ? 'Cargando…' : isRecent ? `${unreadCount} sin leer` : 'Sin mensajes nuevos'}
          </h3>
        </div>
        <Badge tone="success" dot>
          Bot activo
        </Badge>
      </div>
      <Divider />

      <ul className="divide-y divide-[var(--cq-border)]">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
          : messages.length === 0
          ? <EmptyState />
          : messages.map((m) => {
              const name    = m.patients?.full_name ?? m.phone_number;
              const isUnread = new Date(m.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000);

              return (
                <li
                  key={m.id}
                  className="px-5 py-3 hover:bg-[var(--cq-surface-2)] cursor-pointer transition-colors flex items-start gap-3"
                >
                  <div className="relative shrink-0">
                    <Avatar name={name} size={34} />
                    {isUnread && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--cq-accent)] ring-2 ring-[var(--cq-surface)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[13.5px] truncate ${isUnread ? 'font-semibold' : 'font-medium'}`}>
                        {name}
                      </span>
                      <span className="ml-auto font-mono text-[11px] text-[var(--cq-fg-muted)] shrink-0">
                        {relativeTime(m.created_at)}
                      </span>
                    </div>
                    <div className="text-[12.5px] text-[var(--cq-fg-muted)] truncate mt-0.5">
                      {m.message}
                    </div>
                  </div>
                </li>
              );
            })
        }
      </ul>

      <div className="p-4">
        <button
          onClick={() => navigate('/dashboard/inbox')}
          className="w-full h-9 text-[13px] font-medium text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] inline-flex items-center justify-center gap-1 transition-colors"
        >
          Abrir bandeja <Icons.ArrowUpRight size={12} />
        </button>
      </div>
    </Card>
  );
}
