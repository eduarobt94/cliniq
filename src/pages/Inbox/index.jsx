import { useState, useMemo } from 'react';
import { Avatar, Badge, Icons } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useInbox } from '../../hooks/useInbox';

function SkeletonList() {
  return (
    <div className="flex flex-col gap-0">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="px-3 py-3 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--cq-surface-3)] animate-pulse shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5 pt-0.5">
            <div className="h-3 w-24 bg-[var(--cq-surface-3)] rounded animate-pulse" />
            <div className="h-2.5 w-36 bg-[var(--cq-surface-3)] rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChatListItem({ conv, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-3 flex items-start gap-3 hover:bg-[var(--cq-surface-2)] transition-colors ${
        isActive ? 'bg-[var(--cq-surface-2)]' : ''
      }`}
    >
      <div className="relative shrink-0">
        <Avatar name={conv.patientName} size={36} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className="text-[13px] font-medium text-[var(--cq-fg)] truncate">
            {conv.patientName}
          </span>
          <span className="text-[11px] text-[var(--cq-fg-muted)] shrink-0">
            {conv.lastTimeFormatted}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <span className="text-[12px] text-[var(--cq-fg-muted)] truncate">
            {conv.lastDirection === 'outbound' && (
              <span className="text-[var(--cq-fg-muted)] mr-0.5">↗</span>
            )}
            {conv.lastMsg}
          </span>
          {conv.unread > 0 && (
            <span
              className="shrink-0 min-w-[18px] h-[18px] rounded-full text-white text-[10px] font-semibold flex items-center justify-center px-1"
              style={{ backgroundColor: 'var(--cq-accent)' }}
            >
              {conv.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function EmptyConversationState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'var(--cq-surface-2)' }}
      >
        <Icons.Chat size={20} />
      </div>
      <div>
        <p className="text-[14px] font-medium text-[var(--cq-fg)]">Seleccioná una conversación</p>
        <p className="text-[12.5px] text-[var(--cq-fg-muted)] mt-1">
          Elegí un chat de la lista para ver los mensajes.
        </p>
      </div>
    </div>
  );
}

function NoMessagesState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'var(--cq-surface-2)' }}
      >
        <Icons.Whatsapp size={20} />
      </div>
      <div>
        <p className="text-[14px] font-medium text-[var(--cq-fg)]">Sin mensajes todavía</p>
        <p className="text-[12.5px] text-[var(--cq-fg-muted)] mt-1 max-w-[240px]">
          Los mensajes de WhatsApp de tus pacientes aparecerán acá.
        </p>
      </div>
    </div>
  );
}

function ConversationView({ conv, thread }) {
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--cq-border)' }}
      >
        <Avatar name={conv.patientName} size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-[var(--cq-fg)]">
              {conv.patientName}
            </span>
            <Badge tone="success">BOT ACTIVO</Badge>
          </div>
          <span className="text-[11.5px] font-mono text-[var(--cq-fg-muted)]">{conv.phone}</span>
        </div>
        <button className="p-1.5 rounded-md hover:bg-[var(--cq-surface-2)] transition-colors text-[var(--cq-fg-muted)]">
          <Icons.More size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 p-4">
        {thread.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[12.5px] text-[var(--cq-fg-muted)]">Sin mensajes en esta conversación.</p>
          </div>
        ) : (
          thread.map((msg) => {
            const isOutbound = msg.direction === 'outbound';
            return (
              <div key={msg.id} className={`flex ${isOutbound ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[72%] rounded-[10px] p-3 ${isOutbound ? '' : 'text-white'}`}
                  style={{
                    backgroundColor: isOutbound ? 'var(--cq-surface-2)' : 'var(--cq-accent)',
                  }}
                >
                  <p className="text-[13px] leading-relaxed">{msg.message}</p>
                  <p className={`text-[11px] mt-1 opacity-60 ${isOutbound ? '' : 'text-right'}`}>
                    {msg.time}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input row */}
      <div
        className="flex items-center gap-2 px-3 py-3 border-t shrink-0"
        style={{ borderColor: 'var(--cq-border)' }}
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setInputValue('')}
          placeholder="Escribí un mensaje..."
          className="flex-1 bg-[var(--cq-surface-2)] border border-[var(--cq-border)] rounded-[8px] px-3 py-2 text-[13px] text-[var(--cq-fg)] placeholder:text-[var(--cq-fg-muted)] outline-none focus:border-[var(--cq-accent)] transition-colors"
        />
        <button
          onClick={() => setInputValue('')}
          className="w-9 h-9 rounded-[8px] flex items-center justify-center text-white transition-opacity hover:opacity-80 shrink-0"
          style={{ backgroundColor: 'var(--cq-accent)' }}
        >
          <Icons.Arrow size={15} />
        </button>
      </div>
    </div>
  );
}

export function Inbox() {
  const { clinic } = useAuth();
  const { conversations, getThread, loading } = useInbox(clinic?.id);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [search, setSearch] = useState('');

  const totalUnread = conversations.reduce((acc, c) => acc + c.unread, 0);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.patientName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.lastMsg.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  // Auto-select first conversation when data loads
  const firstPhone = conversations[0]?.phone ?? null;
  const activePhone = selectedPhone ?? firstPhone;
  const selectedConv = conversations.find((c) => c.phone === activePhone) ?? null;
  const thread = selectedConv ? getThread(selectedConv.phone) : [];

  return (
    <div
      className="flex -m-5 md:-m-8 h-[calc(100vh-64px)] overflow-hidden"
      style={{ backgroundColor: 'var(--cq-bg)' }}
    >
      {/* Left column */}
      <div
        className="w-[280px] shrink-0 border-r flex flex-col"
        style={{ borderColor: 'var(--cq-border)', backgroundColor: 'var(--cq-surface)' }}
      >
        {/* Header */}
        <div
          className="px-4 pt-4 pb-3 border-b shrink-0"
          style={{ borderColor: 'var(--cq-border)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Icons.Whatsapp size={16} />
              <span className="text-[14px] font-semibold text-[var(--cq-fg)]">
                Inbox WhatsApp
              </span>
            </div>
            {totalUnread > 0 && (
              <Badge tone="accent">{totalUnread} sin leer</Badge>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--cq-fg-muted)] pointer-events-none">
              <Icons.Search size={14} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-[var(--cq-surface-2)] border border-[var(--cq-border)] rounded-[8px] pl-8 pr-3 py-2 text-[12.5px] text-[var(--cq-fg)] placeholder:text-[var(--cq-fg-muted)] outline-none focus:border-[var(--cq-accent)] transition-colors"
            />
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <SkeletonList />
          ) : filteredConversations.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-[12.5px] text-[var(--cq-fg-muted)]">
                {search ? 'Sin resultados.' : 'Sin mensajes todavía.'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <ChatListItem
                key={conv.phone}
                conv={conv}
                isActive={activePhone === conv.phone}
                onClick={() => setSelectedPhone(conv.phone)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {loading ? null : conversations.length === 0 ? (
          <NoMessagesState />
        ) : selectedConv ? (
          <ConversationView conv={selectedConv} thread={thread} />
        ) : (
          <EmptyConversationState />
        )}
      </div>
    </div>
  );
}
