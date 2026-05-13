import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Avatar, Badge, Icons }        from '../../components/ui';
import { useAuth }                     from '../../context/AuthContext';
import { useConversations }            from '../../hooks/useConversations';
import { useRealtimeMessages }         from '../../hooks/useRealtimeMessages';
import { useAIReactivation }           from '../../hooks/useAIReactivation';
import { supabase }                    from '../../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normaliza acentos y mayúsculas para búsquedas tolerantes. "José" ≡ "jose" */
function norm(str) {
  return (str ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function formatTime(iso) {
  if (!iso) return '';
  const d   = new Date(iso);
  const now = new Date();
  const isToday =
    d.getDate()     === now.getDate()     &&
    d.getMonth()    === now.getMonth()    &&
    d.getFullYear() === now.getFullYear();
  if (isToday) {
    return d.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  return d.toLocaleDateString('es-UY', { day: 'numeric', month: 'short' });
}

function formatFullTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function isWindowOpen(messages) {
  if (!messages?.length) return false;
  const lastInbound = [...messages].reverse().find((m) => m.direction === 'inbound');
  if (!lastInbound) return false;
  return Date.now() - new Date(lastInbound.created_at).getTime() < 24 * 60 * 60 * 1000;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
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

// ─── Agent mode badge (small, inline) ─────────────────────────────────────────
function AgentModeBadge({ conv }) {
  const aiEnabled  = conv.patients?.ai_enabled ?? true;
  const agentMode  = conv.agent_mode ?? 'bot';
  const leadScore  = conv.agent_context?.lead_score;

  let Icon, label, accent;

  if (!aiEnabled) {
    Icon   = Icons.Pause;
    label  = 'IA pausada';
    accent = 'var(--cq-warn)';
  } else if (agentMode === 'human') {
    Icon   = Icons.Users;
    label  = 'Humano';
    accent = 'var(--cq-accent)';
  } else {
    Icon   = Icons.Bot;
    label  = 'IA activa';
    accent = 'var(--cq-success)';
  }

  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
        style={{
          backgroundColor: `color-mix(in oklch, ${accent} 13%, transparent)`,
          color: accent,
        }}
      >
        <Icon size={9} />
        {label}
      </span>
      {leadScore === 'hot'  && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--cq-danger)' }} title="Lead caliente" />}
      {leadScore === 'warm' && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--cq-warn)' }}   title="Lead tibio" />}
    </div>
  );
}

// ─── Chat list item ───────────────────────────────────────────────────────────
function ChatListItem({ conv, isActive, onClick }) {
  const name = conv.patients?.full_name ?? conv.phone_number;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-3 flex items-start gap-3 hover:bg-[var(--cq-surface-2)] transition-colors ${
        isActive ? 'bg-[var(--cq-surface-2)]' : ''
      }`}
    >
      <div className="shrink-0">
        <Avatar name={name} size={36} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className="text-[13px] font-medium text-[var(--cq-fg)] truncate">{name}</span>
          <span className="text-[11px] text-[var(--cq-fg-muted)] shrink-0">
            {formatTime(conv.last_message_at)}
          </span>
        </div>
        <span className="text-[12px] text-[var(--cq-fg-muted)] truncate block mb-1">
          {conv.last_message ?? '—'}
        </span>
        <AgentModeBadge conv={conv} />
      </div>
    </button>
  );
}

// ─── AI Toggle switch ─────────────────────────────────────────────────────────
function AIToggle({ enabled, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      role="switch"
      aria-checked={enabled}
      aria-label={enabled ? 'Desactivar asistente IA' : 'Activar asistente IA'}
      title={enabled ? 'IA activa — hacé clic para pausar' : 'IA pausada — hacé clic para reactivar'}
      className="flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {/* Track */}
      <div
        className="relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0"
        style={{ backgroundColor: enabled ? 'var(--cq-success)' : 'var(--cq-surface-3)' }}
      >
        {/* Thumb */}
        <div
          className="absolute top-0.5 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm"
          style={{
            left:            enabled ? '18px' : '2px',
            backgroundColor: 'white',
            color:           enabled ? 'var(--cq-success)' : 'var(--cq-fg-muted)',
          }}
        >
          {enabled && <Icons.Bot size={10} />}
        </div>
      </div>
      <span className="text-[11.5px] text-[var(--cq-fg-muted)] group-hover:text-[var(--cq-fg)] transition-colors whitespace-nowrap">
        Asistente IA
      </span>
    </button>
  );
}

// ─── Agent context panel ──────────────────────────────────────────────────────
const INTENT_LABELS = {
  agendar_turno:   { icon: '📅', label: 'Agendar turno' },
  cancelar_turno:  { icon: '❌', label: 'Cancelar turno' },
  reagendar:       { icon: '🔄', label: 'Reagendar turno' },
  consulta_precio: { icon: '💰', label: 'Consulta de precio' },
  consulta_general:{ icon: '💬', label: 'Consulta general' },
  urgencia:        { icon: '🚨', label: 'Urgencia' },
  otro:            { icon: '❓', label: 'Otro' },
};

function LeadScoreChip({ score }) {
  if (!score) return null;
  const cfg = {
    hot:  { label: 'HOT — quiere turno pronto',   color: 'var(--cq-danger)'  },
    warm: { label: 'WARM — interesado sin urgencia', color: 'var(--cq-warn)'  },
    cold: { label: 'COLD — solo consulta',          color: 'var(--cq-fg-muted)' },
  }[score] ?? null;
  if (!cfg) return null;
  return (
    <span className="text-[12px] font-medium" style={{ color: cfg.color }}>
      {score === 'hot' ? '🔴' : score === 'warm' ? '🟡' : '⚫'} {cfg.label}
    </span>
  );
}

function AgentContextPanel({ conv, aiEnabled, onAIToggle, togglingAI }) {
  const ctx    = conv.agent_context ?? {};
  const intent = INTENT_LABELS[ctx.intent] ?? null;
  const isEmpty = !ctx.intent && !ctx.summary && !ctx.lead_score;

  return (
    <div
      className="w-[256px] shrink-0 border-l flex flex-col overflow-y-auto"
      style={{ borderColor: 'var(--cq-border)', backgroundColor: 'var(--cq-surface)' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--cq-border)' }}
      >
        <div className="flex items-center gap-2">
          <Icons.Bot size={14} />
          <span className="text-[12px] font-semibold text-[var(--cq-fg)] uppercase tracking-wide">
            Contexto del lead
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col gap-5">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center text-center gap-2 py-6">
            <Icons.Bot size={24} />
            <p className="text-[12px] text-[var(--cq-fg-muted)] leading-relaxed">
              La IA aún no analizó esta conversación
            </p>
          </div>
        ) : (
          <>
            {/* Intent */}
            {intent && (
              <div>
                <p className="text-[10px] font-semibold text-[var(--cq-fg-muted)] uppercase tracking-wider mb-1.5">
                  Intent detectado
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">{intent.icon}</span>
                  <span className="text-[13px] font-medium text-[var(--cq-fg)]">{intent.label}</span>
                </div>
              </div>
            )}

            {/* Summary */}
            {ctx.summary && (
              <div>
                <p className="text-[10px] font-semibold text-[var(--cq-fg-muted)] uppercase tracking-wider mb-1.5">
                  Resumen
                </p>
                <p className="text-[12.5px] text-[var(--cq-fg)] leading-relaxed">{ctx.summary}</p>
              </div>
            )}

            {/* Lead score */}
            {ctx.lead_score && (
              <div>
                <p className="text-[10px] font-semibold text-[var(--cq-fg-muted)] uppercase tracking-wider mb-1.5">
                  Lead score
                </p>
                <LeadScoreChip score={ctx.lead_score} />
              </div>
            )}
          </>
        )}

        {/* AI toggle — always visible */}
        <div
          className="pt-4 border-t"
          style={{ borderColor: 'var(--cq-border)' }}
        >
          <p className="text-[10px] font-semibold text-[var(--cq-fg-muted)] uppercase tracking-wider mb-2.5">
            Estado IA
          </p>
          <AIToggle enabled={aiEnabled} onChange={onAIToggle} disabled={togglingAI} />
        </div>
      </div>
    </div>
  );
}

// ─── Reactivation banner ──────────────────────────────────────────────────────
function ReactivationBanner({ count, onReactivate, onDismiss, loading }) {
  return (
    <div
      className="mx-3 mt-3 mb-1 rounded-[10px] p-3 border flex flex-col gap-2.5"
      style={{
        backgroundColor: 'color-mix(in oklch, var(--cq-warn) 10%, var(--cq-surface))',
        borderColor:     'color-mix(in oklch, var(--cq-warn) 40%, transparent)',
      }}
    >
      <div className="flex items-start gap-2">
        <span className="text-[14px] shrink-0 mt-0.5">⚠️</span>
        <p className="text-[12px] text-[var(--cq-fg)] leading-relaxed">
          <span className="font-medium">{count} conversación{count !== 1 ? 'es' : ''}</span> sin
          asistente IA desde hace más de 12h. ¿Reactivar?
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onReactivate}
          disabled={loading}
          className="flex-1 px-2.5 py-1.5 rounded-[7px] text-[11.5px] font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-1.5"
          style={{ backgroundColor: 'var(--cq-accent)' }}
        >
          {loading ? (
            <>
              <div className="w-3 h-3 rounded-full border-2 animate-spin" style={{ borderColor: 'white', borderTopColor: 'transparent' }} />
              Reactivando…
            </>
          ) : (
            'Reactivar todas'
          )}
        </button>
        <button
          onClick={onDismiss}
          className="px-2.5 py-1.5 rounded-[7px] text-[11.5px] font-medium border transition-colors hover:bg-[var(--cq-surface-2)]"
          style={{ borderColor: 'var(--cq-border)', color: 'var(--cq-fg-muted)' }}
        >
          Ignorar
        </button>
      </div>
    </div>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────
function EmptyConversationState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--cq-surface-2)' }}>
        <Icons.Chat size={20} />
      </div>
      <div>
        <p className="text-[14px] font-medium text-[var(--cq-fg)]">Seleccioná una conversación</p>
        <p className="text-[12.5px] text-[var(--cq-fg-muted)] mt-1">Elegí un chat de la lista para ver los mensajes.</p>
      </div>
    </div>
  );
}

function NoConversationsState({ onNew }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--cq-surface-2)' }}>
        <Icons.Whatsapp size={20} />
      </div>
      <div>
        <p className="text-[14px] font-medium text-[var(--cq-fg)]">Sin conversaciones todavía</p>
        <p className="text-[12.5px] text-[var(--cq-fg-muted)] mt-1 max-w-[240px]">
          Los mensajes de WhatsApp aparecerán acá, o podés iniciar una conversación nueva.
        </p>
      </div>
      <button
        onClick={onNew}
        className="mt-1 px-4 py-2 rounded-[8px] text-[13px] text-white font-medium transition-opacity hover:opacity-80"
        style={{ backgroundColor: 'var(--cq-accent)' }}
      >
        Nueva conversación
      </button>
    </div>
  );
}

// ─── Modal nueva conversación ─────────────────────────────────────────────────
function NewConversationModal({ clinicId, onClose, onCreated }) {
  const [patients, setPatients]     = useState([]);
  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [creating, setCreating]     = useState(false);
  const [error, setError]           = useState('');
  const [result, setResult]         = useState(null);
  const searchRef = useRef(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('patients')
        .select('id, full_name, phone_number')
        .eq('clinic_id', clinicId)
        .order('full_name', { ascending: true });
      setPatients(data ?? []);
      setLoading(false);
    }
    load();
  }, [clinicId]);

  useEffect(() => { searchRef.current?.focus(); }, []);

  const filtered = useMemo(() => {
    const q = norm(search.trim());
    if (!q) return patients;
    return patients.filter(
      (p) =>
        norm(p.full_name).includes(q) ||
        (p.phone_number ?? '').includes(q),
    );
  }, [patients, search]);

  async function handleCreate() {
    if (!selected || creating) return;
    setCreating(true);
    setError('');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token ?? '';

      const res = await fetch(`${SUPABASE_URL}/functions/v1/initiate-conversation`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ patient_id: selected.id }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json?.error === 'no_phone') {
          setError('Este paciente no tiene número de teléfono registrado.');
        } else {
          setError(json?.message ?? json?.error ?? 'Error al crear la conversación.');
        }
        setCreating(false);
        return;
      }

      setResult(json);
    } catch {
      setError('Error de red. Intentá de nuevo.');
      setCreating(false);
    }
  }

  if (result) {
    return (
      <ModalShell onClose={onClose}>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'color-mix(in oklch, var(--cq-success) 15%, white)' }}
          >
            <span className="text-[22px]">✅</span>
          </div>
          <div>
            <p className="text-[15px] font-semibold text-[var(--cq-fg)]">Conversación creada</p>
            {result.template_sent ? (
              <p className="text-[13px] text-[var(--cq-fg-muted)] mt-1 max-w-[260px]">
                Se envió el recordatorio de turno a <strong>{selected.full_name}</strong>.
                Cuando responda, la ventana de 24h se abrirá.
              </p>
            ) : (
              <p className="text-[13px] text-[var(--cq-fg-muted)] mt-1 max-w-[260px]">
                Conversación lista. No hay turnos próximos, por lo que no se envió plantilla.
                Cuando el paciente te escriba, podrás responder.
              </p>
            )}
          </div>
          <button
            onClick={() => { onCreated(result.conversation); onClose(); }}
            className="w-full px-4 py-2.5 rounded-[8px] text-[13px] text-white font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--cq-accent)' }}
          >
            Ir a la conversación
          </button>
        </div>
      </ModalShell>
    );
  }

  if (!selected) {
    return (
      <ModalShell onClose={onClose} title="Nueva conversación">
        <div className="relative mb-3">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--cq-fg-muted)] pointer-events-none">
            <Icons.Search size={14} />
          </span>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente…"
            className="w-full bg-[var(--cq-surface-2)] border border-[var(--cq-border)] rounded-[8px] pl-8 pr-3 py-2 text-[13px] text-[var(--cq-fg)] placeholder:text-[var(--cq-fg-muted)] outline-none focus:border-[var(--cq-accent)] transition-colors"
          />
        </div>

        <div className="max-h-[280px] overflow-y-auto -mx-4">
          {loading ? (
            <SkeletonList />
          ) : filtered.length === 0 ? (
            <p className="text-center text-[12.5px] text-[var(--cq-fg-muted)] py-6">
              {search ? 'Sin resultados.' : 'No hay pacientes.'}
            </p>
          ) : (
            filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--cq-surface-2)] transition-colors"
              >
                <Avatar name={p.full_name} size={32} />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[var(--cq-fg)] truncate">{p.full_name}</p>
                  <p className="text-[11.5px] text-[var(--cq-fg-muted)] font-mono">
                    {p.phone_number ?? 'Sin teléfono'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} title="Nueva conversación">
      <div
        className="flex items-center gap-3 p-3 rounded-[8px] mb-4"
        style={{ backgroundColor: 'var(--cq-surface-2)' }}
      >
        <Avatar name={selected.full_name} size={36} />
        <div>
          <p className="text-[13px] font-medium text-[var(--cq-fg)]">{selected.full_name}</p>
          <p className="text-[11.5px] text-[var(--cq-fg-muted)] font-mono">{selected.phone_number}</p>
        </div>
        <button
          onClick={() => setSelected(null)}
          className="ml-auto text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] transition-colors"
        >
          <Icons.Close size={14} />
        </button>
      </div>

      <div
        className="rounded-[8px] p-3 mb-4 text-[12.5px] leading-relaxed"
        style={{ backgroundColor: 'var(--cq-surface-2)', color: 'var(--cq-fg-muted)' }}
      >
        <p className="font-medium text-[var(--cq-fg)] mb-1">¿Qué va a pasar?</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Se crea la conversación en el Inbox</li>
          <li>Si el paciente tiene un turno próximo, se le envía el recordatorio por WhatsApp</li>
          <li>Cuando responda, podrás chatear libremente</li>
        </ul>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 rounded-[8px] text-[12px] text-center" style={{ backgroundColor: 'color-mix(in oklch, var(--cq-danger) 10%, white)', color: 'var(--cq-danger)' }}>
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setSelected(null)}
          className="flex-1 px-4 py-2.5 rounded-[8px] text-[13px] font-medium border transition-colors hover:bg-[var(--cq-surface-2)]"
          style={{ borderColor: 'var(--cq-border)', color: 'var(--cq-fg)' }}
        >
          Atrás
        </button>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex-1 px-4 py-2.5 rounded-[8px] text-[13px] text-white font-medium transition-opacity hover:opacity-80 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ backgroundColor: 'var(--cq-accent)' }}
        >
          {creating ? (
            <>
              <div className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: 'white', borderTopColor: 'transparent' }} />
              Iniciando…
            </>
          ) : (
            'Iniciar conversación'
          )}
        </button>
      </div>
    </ModalShell>
  );
}

// ─── Modal shell ──────────────────────────────────────────────────────────────
function ModalShell({ children, title, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-[360px] rounded-[12px] shadow-xl p-4"
        style={{ backgroundColor: 'var(--cq-surface)' }}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-semibold text-[var(--cq-fg)]">{title}</h3>
            <button onClick={onClose} className="text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] transition-colors">
              <Icons.Close size={16} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const { direction, sender_type, content, status, created_at } = msg;

  // Internal system notice — centered text, no bubble
  if (sender_type === 'system') {
    return (
      <div className="flex justify-center my-1">
        <p
          className="text-[11px] italic px-3 py-1 rounded-full"
          style={{ color: 'var(--cq-fg-muted)', backgroundColor: 'var(--cq-surface-2)' }}
        >
          {content}
        </p>
      </div>
    );
  }

  const isOut = direction === 'outbound' || direction === 'system_template' || direction === 'outbound_ai';
  const isBot = sender_type === 'bot';
  const isFailed = status === 'failed';

  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[72%] rounded-[10px] p-3 relative"
        style={{
          backgroundColor: isOut
            ? isBot
              ? 'var(--cq-accent-soft)'
              : isFailed
              ? 'var(--cq-danger)'
              : 'var(--cq-accent)'
            : 'var(--cq-surface-2)',
          border: isBot
            ? '1px solid color-mix(in srgb, var(--cq-accent) 30%, transparent)'
            : 'none',
          color: isOut
            ? isBot    ? 'color-mix(in srgb, var(--cq-accent) 85%, black)'
            : isFailed ? 'white'
            :             'white'
            : 'inherit',
        }}
      >
        {/* Bot tag */}
        {isBot && (
          <div
            className="absolute -top-2 right-2 flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[9px] font-semibold"
            style={{
              backgroundColor: 'var(--cq-accent)',
              color: 'white',
            }}
          >
            <Icons.Bot size={8} />
            IA
          </div>
        )}

        {/* Template label */}
        {direction === 'system_template' && (
          <p className="text-[10px] opacity-60 mb-1 uppercase tracking-wide">Plantilla</p>
        )}

        <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{content}</p>
        <p
          className={`text-[11px] mt-1 opacity-60 flex items-center gap-1 ${isOut ? 'justify-end' : ''}`}
          style={{ color: isBot ? 'var(--cq-accent)' : undefined }}
        >
          {formatFullTime(created_at)}
          {isFailed && <span>· fallido</span>}
          {isBot && <span>· IA</span>}
        </p>
      </div>
    </div>
  );
}

// ─── Conversation view ────────────────────────────────────────────────────────
function ConversationView({ conv, onDelete }) {
  const { messages, loading } = useRealtimeMessages(conv.id);

  // Local state for AI toggle — optimistic
  const [aiEnabled,   setAiEnabled]   = useState(() => conv.patients?.ai_enabled ?? true);
  const [togglingAI,  setTogglingAI]  = useState(false);
  const [agentMode,   setAgentMode]   = useState(() => conv.agent_mode ?? 'bot');
  const [showPanel,   setShowPanel]   = useState(false);

  const [inputValue,     setInputValue]     = useState('');
  const [sending,        setSending]         = useState(false);
  const [sendError,      setSendError]       = useState('');
  const [showMenu,       setShowMenu]        = useState(false);
  const [confirmDelete,  setConfirmDelete]   = useState(false);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const menuRef   = useRef(null);

  const name       = conv.patients?.full_name ?? conv.phone_number;
  const windowOpen = isWindowOpen(messages);

  // Sync agentMode when Realtime updates parent conv
  useEffect(() => {
    setAgentMode(conv.agent_mode ?? 'bot');
  }, [conv.agent_mode]);

  // Sync aiEnabled when conv changes (different conversation selected)
  useEffect(() => {
    setAiEnabled(conv.patients?.ai_enabled ?? true);
    setAgentMode(conv.agent_mode ?? 'bot');
    setInputValue('');
    setSendError('');
    inputRef.current?.focus();
  }, [conv.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── AI Toggle handler ───────────────────────────────────────────────────────
  const handleAIToggle = useCallback(async (newVal) => {
    if (togglingAI) return;
    setTogglingAI(true);

    // Optimistic update
    setAiEnabled(newVal);
    setAgentMode(newVal ? 'bot' : 'human');

    try {
      const [pRes, cRes] = await Promise.all([
        conv.patient_id
          ? supabase.from('patients').update({ ai_enabled: newVal }).eq('id', conv.patient_id)
          : Promise.resolve({ error: null }),
        supabase.from('conversations').update({ agent_mode: newVal ? 'bot' : 'human' }).eq('id', conv.id),
      ]);

      if (pRes.error || cRes.error) {
        // Revert on failure
        setAiEnabled(!newVal);
        setAgentMode(!newVal ? 'bot' : 'human');
        console.error('AI toggle error:', pRes.error ?? cRes.error);
      }
    } catch (err) {
      setAiEnabled(!newVal);
      setAgentMode(!newVal ? 'bot' : 'human');
      console.error('AI toggle error:', err);
    } finally {
      setTogglingAI(false);
    }
  }, [conv.id, conv.patient_id, togglingAI]);

  // ── Send message ────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || sending) return;

    setSending(true);
    setSendError('');
    setInputValue('');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token ?? '';

      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-whatsapp-message`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ conversation_id: conv.id, content: text }),
      });

      const json = await res.json();
      if (!res.ok) {
        if (json?.error === 'window_expired') {
          setSendError('La ventana de 24 hs expiró. Solo podés enviar plantillas.');
        } else {
          setSendError(json?.message ?? json?.error ?? 'Error al enviar.');
        }
        setInputValue(text);
        // No marcar agent_mode=human si el envío falló
      } else {
        // Éxito — silenciar IA temporalmente (agent_mode → human).
        // NO toca ai_enabled: la IA puede retomar sola después de 2 min.
        setAgentMode('human');
        const now = new Date().toISOString();
        supabase.from('conversations')
          .update({ agent_mode: 'human', agent_last_human_reply_at: now })
          .eq('id', conv.id)
          .then(({ error: e }) => { if (e) console.error('agent_mode update error:', e); });
        if (conv.patient_id) {
          supabase.from('patients')
            .update({ last_human_interaction: now })
            .eq('id', conv.patient_id)
            .then(({ error: e }) => { if (e) console.error('last_human_interaction update error:', e); });
        }
        // On success: Realtime fires the INSERT and shows the message
      }
    } catch {
      setSendError('Error de red. Intentá de nuevo.');
      setInputValue(text);
    } finally {
      setSending(false);
    }
  }, [inputValue, sending, conv.id, conv.patient_id, aiEnabled]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ── Main chat area ───────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--cq-border)' }}>
          <Avatar name={name} size={36} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] font-semibold text-[var(--cq-fg)]">{name}</span>
              {windowOpen
                ? <Badge tone="success">24h ACTIVA</Badge>
                : <Badge tone="warn">VENTANA CERRADA</Badge>
              }
            </div>
            <span className="text-[11.5px] font-mono text-[var(--cq-fg-muted)]">{conv.phone_number}</span>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* AI Toggle (hidden on small screens — available in panel) */}
            <div className="hidden lg:flex">
              <AIToggle enabled={aiEnabled} onChange={handleAIToggle} disabled={togglingAI} />
            </div>

            {/* Panel toggle */}
            <button
              onClick={() => setShowPanel((v) => !v)}
              title={showPanel ? 'Cerrar panel de contexto' : 'Ver contexto del lead'}
              className={`hidden lg:flex w-8 h-8 rounded-[6px] items-center justify-center transition-colors ${
                showPanel
                  ? 'bg-[var(--cq-accent-soft)] text-[var(--cq-accent)]'
                  : 'hover:bg-[var(--cq-surface-2)] text-[var(--cq-fg-muted)]'
              }`}
            >
              <Icons.Info size={15} />
            </button>

            {/* 3-dot menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu((v) => !v)}
                className="w-8 h-8 rounded-[6px] flex items-center justify-center hover:bg-[var(--cq-surface-2)] transition-colors text-[var(--cq-fg-muted)]"
              >
                <Icons.More size={16} />
              </button>
              {showMenu && (
                <div
                  className="absolute right-0 top-9 z-20 w-48 rounded-[10px] shadow-lg border py-1"
                  style={{ backgroundColor: 'var(--cq-surface)', borderColor: 'var(--cq-border)' }}
                >
                  {/* Mobile-only AI toggle in menu */}
                  <div className="lg:hidden px-3 py-2 border-b" style={{ borderColor: 'var(--cq-border)' }}>
                    <AIToggle enabled={aiEnabled} onChange={(v) => { setShowMenu(false); handleAIToggle(v); }} disabled={togglingAI} />
                  </div>
                  <button
                    onClick={() => { setShowMenu(false); setConfirmDelete(true); }}
                    className="w-full text-left px-3 py-2 text-[13px] flex items-center gap-2 hover:bg-[var(--cq-surface-2)] transition-colors"
                    style={{ color: 'var(--cq-danger)' }}
                  >
                    <Icons.Trash size={14} />
                    Eliminar conversación
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Confirm delete dialog */}
        {confirmDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          >
            <div className="w-full max-w-[320px] rounded-[12px] shadow-xl p-5" style={{ backgroundColor: 'var(--cq-surface)' }}>
              <p className="text-[15px] font-semibold text-[var(--cq-fg)] mb-1">¿Eliminar conversación?</p>
              <p className="text-[13px] text-[var(--cq-fg-muted)] mb-4">
                Se borrarán todos los mensajes de esta conversación. Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 px-3 py-2 rounded-[8px] text-[13px] font-medium border hover:bg-[var(--cq-surface-2)] transition-colors"
                  style={{ borderColor: 'var(--cq-border)', color: 'var(--cq-fg)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { setConfirmDelete(false); onDelete(conv.id); }}
                  className="flex-1 px-3 py-2 rounded-[8px] text-[13px] font-medium text-white transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'var(--cq-danger)' }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 p-4">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div
                className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--cq-accent)', borderTopColor: 'transparent' }}
              />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-[12.5px] text-[var(--cq-fg-muted)]">Sin mensajes en esta conversación.</p>
            </div>
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
          )}
          <div ref={bottomRef} />
        </div>

        {/* Window closed banner */}
        {!windowOpen && !loading && messages.length > 0 && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-[8px] text-[12px] text-center" style={{ backgroundColor: 'var(--cq-surface-2)', color: 'var(--cq-fg-muted)' }}>
            La ventana de 24 hs expiró. Esperá que el paciente te escriba para responder.
          </div>
        )}

        {sendError && (
          <div
            className="mx-4 mb-1 px-3 py-1.5 rounded-[8px] text-[12px] text-center"
            style={{ backgroundColor: 'color-mix(in oklch, var(--cq-danger) 10%, white)', color: 'var(--cq-danger)' }}
          >
            {sendError}
          </div>
        )}

        {/* Input */}
        <div className="flex items-center gap-2 px-3 py-3 border-t shrink-0" style={{ borderColor: 'var(--cq-border)' }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={windowOpen ? 'Escribí un mensaje…' : 'Ventana de 24h cerrada'}
            disabled={!windowOpen || sending}
            className="flex-1 bg-[var(--cq-surface-2)] border border-[var(--cq-border)] rounded-[8px] px-3 py-2 text-[13px] text-[var(--cq-fg)] placeholder:text-[var(--cq-fg-muted)] outline-none focus:border-[var(--cq-accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!windowOpen || !inputValue.trim() || sending}
            className="w-9 h-9 rounded-[8px] flex items-center justify-center text-white transition-opacity hover:opacity-80 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--cq-accent)' }}
          >
            {sending
              ? <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: 'white', borderTopColor: 'transparent' }} />
              : <Icons.Arrow size={15} />
            }
          </button>
        </div>
      </div>

      {/* ── Agent context panel (desktop only) ──────────────────────────────── */}
      {showPanel && (
        <AgentContextPanel
          conv={{ ...conv, agent_mode: agentMode }}
          aiEnabled={aiEnabled}
          onAIToggle={handleAIToggle}
          togglingAI={togglingAI}
        />
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function Inbox() {
  const { clinic }                                                     = useAuth();
  const { conversations, loading, refetch, deleteConversation }        = useConversations(clinic?.id);
  const { showBanner, affectedCount, handleReactivate, handleDismiss, reactivating } =
    useAIReactivation(clinic?.id, conversations);

  const [selectedId, setSelectedId]    = useState(null);
  const [search, setSearch]            = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  const filteredConversations = useMemo(() => {
    const q = norm(search.trim());
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        norm(c.patients?.full_name).includes(q) ||
        (c.phone_number ?? '').includes(q) ||
        norm(c.last_message).includes(q),
    );
  }, [conversations, search]);

  const firstId      = conversations[0]?.id ?? null;
  const activeId     = selectedId ?? firstId;
  const selectedConv = conversations.find((c) => c.id === activeId) ?? null;

  const handleConversationCreated = useCallback((conv) => {
    refetch();
    setSelectedId(conv.id);
  }, [refetch]);

  const handleDeleteConversation = useCallback(async (convId) => {
    const err = await deleteConversation(convId);
    if (!err && selectedId === convId) setSelectedId(null);
  }, [deleteConversation, selectedId]);

  return (
    <div
      className="flex -m-5 md:-m-4 h-[calc(100vh-64px)] overflow-hidden"
      style={{ backgroundColor: 'var(--cq-bg)' }}
    >
      {/* ── Left column: conversation list ────────────────────────────────── */}
      <div
        className="w-[280px] shrink-0 border-r flex flex-col"
        style={{ borderColor: 'var(--cq-border)', backgroundColor: 'var(--cq-surface)' }}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b shrink-0" style={{ borderColor: 'var(--cq-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Icons.Whatsapp size={24} />
              <span className="text-[14px] font-semibold text-[var(--cq-fg)]">Inbox WhatsApp</span>
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              title="Nueva conversación"
              className="w-7 h-7 rounded-[6px] flex items-center justify-center text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: 'var(--cq-accent)' }}
            >
              <Icons.Plus size={14} />
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--cq-fg-muted)] pointer-events-none">
              <Icons.Search size={14} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar…"
              className="w-full bg-[var(--cq-surface-2)] border border-[var(--cq-border)] rounded-[8px] pl-8 pr-3 py-2 text-[12.5px] text-[var(--cq-fg)] placeholder:text-[var(--cq-fg-muted)] outline-none focus:border-[var(--cq-accent)] transition-colors"
            />
          </div>
        </div>

        {/* Reactivation banner */}
        {showBanner && (
          <ReactivationBanner
            count={affectedCount}
            onReactivate={handleReactivate}
            onDismiss={handleDismiss}
            loading={reactivating}
          />
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <SkeletonList />
          ) : filteredConversations.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-[12.5px] text-[var(--cq-fg-muted)]">
                {search ? 'Sin resultados.' : 'Sin conversaciones todavía.'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <ChatListItem
                key={conv.id}
                conv={conv}
                isActive={activeId === conv.id}
                onClick={() => setSelectedId(conv.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right area: conversation view or empty state ──────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {loading ? null : conversations.length === 0 ? (
          <NoConversationsState onNew={() => setShowNewModal(true)} />
        ) : selectedConv ? (
          <ConversationView
            key={selectedConv.id}
            conv={selectedConv}
            onDelete={handleDeleteConversation}
          />
        ) : (
          <EmptyConversationState />
        )}
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      {showNewModal && (
        <NewConversationModal
          clinicId={clinic?.id}
          onClose={() => setShowNewModal(false)}
          onCreated={handleConversationCreated}
        />
      )}
    </div>
  );
}
