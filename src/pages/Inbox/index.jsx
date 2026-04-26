import { useState } from 'react';
import { CHATS_MOCK } from '../../data/chats.mock.js';
import { Avatar, Badge, Icons } from '../../components/ui';

function ChatListItem({ chat, isActive, onClick }) {
  const { name, time, unread, online, lastMsg, tag } = chat;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-3 flex items-start gap-3 hover:bg-[var(--cq-surface-2)] transition-colors ${
        isActive ? 'bg-[var(--cq-surface-2)]' : ''
      }`}
    >
      {/* Avatar with online dot */}
      <div className="relative shrink-0">
        <Avatar name={name} size={36} />
        {online && (
          <span
            className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--cq-bg)]"
            style={{ backgroundColor: 'var(--cq-success)' }}
          />
        )}
      </div>

      {/* Chat info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[13px] font-medium text-[var(--cq-fg)] truncate">{name}</span>
            {tag && (
              <Badge tone="outline" className="shrink-0 text-[10px] h-[18px] px-1.5">
                {tag}
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-[var(--cq-fg-muted)] shrink-0">{time}</span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <span className="text-[12px] text-[var(--cq-fg-muted)] truncate">{lastMsg}</span>
          {unread > 0 && (
            <span
              className="shrink-0 w-[18px] h-[18px] rounded-full text-white text-[10px] font-semibold flex items-center justify-center"
              style={{ backgroundColor: 'var(--cq-accent)' }}
            >
              {unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function EmptyState() {
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

function ConversationView({ chat }) {
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="flex flex-col h-full">
      {/* Conversation header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--cq-border)' }}
      >
        <div className="relative">
          <Avatar name={chat.name} size={36} />
          {chat.online && (
            <span
              className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[var(--cq-bg)]"
              style={{ backgroundColor: 'var(--cq-success)' }}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-[var(--cq-fg)]">{chat.name}</span>
            <Badge tone="success">BOT ACTIVO</Badge>
          </div>
          <span className="text-[11.5px] text-[var(--cq-fg-muted)]">
            {chat.online ? 'En línea' : 'Desconectado'}
          </span>
        </div>
        <button className="p-1.5 rounded-md hover:bg-[var(--cq-surface-2)] transition-colors text-[var(--cq-fg-muted)]">
          <Icons.More size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 p-4">
        {chat.messages.map((msg) => {
          const isBot = msg.from === 'bot';
          return (
            <div
              key={msg.id}
              className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[72%] rounded-[10px] p-3 ${
                  isBot ? '' : 'text-white'
                }`}
                style={{
                  backgroundColor: isBot
                    ? 'var(--cq-surface-2)'
                    : 'var(--cq-accent)',
                }}
              >
                <p className="text-[13px] leading-relaxed">{msg.text}</p>
                <p
                  className={`text-[11px] mt-1 opacity-60 ${
                    isBot ? '' : 'text-right'
                  }`}
                >
                  {msg.time}
                </p>
              </div>
            </div>
          );
        })}
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
  const [selectedId, setSelectedId] = useState(CHATS_MOCK[0]?.id ?? null);
  const [search, setSearch] = useState('');

  const totalUnread = CHATS_MOCK.reduce((acc, c) => acc + c.unread, 0);
  const selectedChat = CHATS_MOCK.find((c) => c.id === selectedId) ?? null;

  const filteredChats = search.trim()
    ? CHATS_MOCK.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.lastMsg.toLowerCase().includes(search.toLowerCase())
      )
    : CHATS_MOCK;

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
        {/* Left header */}
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
          {/* Search */}
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
          {filteredChats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              isActive={selectedId === chat.id}
              onClick={() => setSelectedId(chat.id)}
            />
          ))}
        </div>
      </div>

      {/* Right column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedChat ? (
          <ConversationView chat={selectedChat} />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
