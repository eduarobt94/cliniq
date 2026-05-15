import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useConversations } from '../../hooks/useConversations';
import { useUnreadCounts } from '../../hooks/useUnreadCounts';
import { Icons, Badge, Card, Avatar, MonoLabel, Divider } from '../../components/ui';

function relativeTime(isoStr) {
  if (!isoStr) return '';
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
      <div className="size-[34px] rounded-full bg-[var(--cq-surface-3)] shrink-0" />
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
      <p className="text-[13px] text-[var(--cq-fg-muted)]">Todo al día.</p>
      <p className="text-[12px] text-[var(--cq-fg-muted)] mt-1">
        Cuando un paciente escriba, aparecerá aquí.
      </p>
    </li>
  );
}

/** Small pill showing N unread messages */
function UnreadBadge({ count }) {
  if (!count) return null;
  return (
    <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--cq-accent)] text-white text-[10px] font-semibold font-mono inline-flex items-center justify-center leading-none">
      {count > 9 ? '9+' : count}
    </span>
  );
}

export function InboxBlock() {
  const navigate   = useNavigate();
  const { clinic } = useAuth();
  const { conversations, loading } = useConversations(clinic?.id);

  // Only conversations where patient wrote last (needs a reply)
  const pending = useMemo(
    () => conversations.filter(c => c.last_message_direction === 'inbound').slice(0, 5),
    [conversations],
  );

  const pendingIds = useMemo(() => pending.map(c => c.id), [pending]);
  const unreadCounts = useUnreadCounts(pendingIds);

  return (
    <Card padded={false}>
      <div className="flex items-center justify-between p-5 pb-4">
        <div>
          <MonoLabel>Inbox · WhatsApp</MonoLabel>
          <h3 className="mt-1 text-[18px] font-semibold tracking-tight">
            {loading
              ? 'Cargando…'
              : pending.length > 0
              ? `${pending.length} esperando respuesta`
              : 'Todo al día'}
          </h3>
        </div>
        <Badge tone="success" dot>Bot activo</Badge>
      </div>
      <Divider />

      <ul className="divide-y divide-[var(--cq-border)]">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <RowSkeleton key={i} />)
          : pending.length === 0
          ? <EmptyState />
          : pending.map((conv) => {
              const name  = conv.patients?.full_name ?? conv.phone_number ?? 'Paciente';
              const msgCount = unreadCounts.get(conv.id) ?? 0;

              return (
                <li
                  key={conv.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate('/dashboard/inbox')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/dashboard/inbox'); } }}
                  className="px-5 py-3 hover:bg-[var(--cq-surface-2)] cursor-pointer transition-colors flex items-start gap-3"
                >
                  {/* Avatar with unread-count badge instead of a dot */}
                  <div className="relative shrink-0">
                    <Avatar name={name} size={34} />
                    {msgCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-0.5 rounded-full bg-[var(--cq-accent)] text-white text-[9px] font-semibold font-mono inline-flex items-center justify-center leading-none ring-2 ring-[var(--cq-surface)]">
                        {msgCount > 9 ? '9+' : msgCount}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-semibold truncate">{name}</span>
                      <span className="ml-auto font-mono text-[11px] text-[var(--cq-fg-muted)] shrink-0">
                        {relativeTime(conv.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[12.5px] text-[var(--cq-fg-muted)] truncate flex-1">
                        {conv.last_message ?? '—'}
                      </span>
                      <UnreadBadge count={msgCount} />
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
