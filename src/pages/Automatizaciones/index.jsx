import { useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAutomations } from '../../hooks/useAutomations';
import { Button, Badge, MonoLabel, Icons } from '../../components/ui';

// ─── Static type metadata ─────────────────────────────────────────────────────
const TYPE_META = {
  appointment_reminder: {
    name:    'Recordatorio de turno · WhatsApp',
    desc:    'Envía un recordatorio por WhatsApp X horas antes del turno. El paciente responde 1 para confirmar o 2 para cancelar.',
    trigger: (h) => `Automático · ${h}h antes`,
    icon:    '💬',
  },
};

// ─── EditTemplateModal ────────────────────────────────────────────────────────
function EditTemplateModal({ automation, onSave, onClose }) {
  const meta = TYPE_META[automation.type] ?? {};
  const [template, setTemplate]       = useState(automation.message_template);
  const [hoursBefore, setHoursBefore] = useState(String(automation.hours_before));
  const [saving, setSaving]           = useState(false);
  const [err, setErr]                 = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const h = parseInt(hoursBefore, 10);
    if (!template.trim()) { setErr('El mensaje no puede estar vacío.'); return; }
    if (isNaN(h) || h < 1 || h > 168) { setErr('Las horas deben ser entre 1 y 168.'); return; }
    setSaving(true);
    const result = await onSave(automation.id, { message_template: template.trim(), hours_before: h });
    setSaving(false);
    if (result?.error) { setErr(result.error); return; }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[16px] w-full max-w-[480px] shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--cq-border)]">
          <div>
            <MonoLabel>Configurar automatización</MonoLabel>
            <h2 className="mt-1 text-[17px] font-semibold text-[var(--cq-fg)]">{meta.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--cq-fg-muted)] hover:bg-[var(--cq-surface-2)] transition-colors"
          >
            <Icons.Close size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Hours before */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-[var(--cq-fg-muted)] uppercase tracking-wide">
              Horas antes del turno
            </label>
            <input
              type="number"
              min={1}
              max={168}
              value={hoursBefore}
              onChange={(e) => setHoursBefore(e.target.value)}
              className="h-9 px-3 rounded-[8px] bg-[var(--cq-surface-2)] border border-[var(--cq-border)] text-[14px] text-[var(--cq-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--cq-accent)] w-24"
            />
            <p className="text-[11.5px] text-[var(--cq-fg-muted)]">Entre 1 y 168 horas (7 días)</p>
          </div>

          {/* Message template */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-[var(--cq-fg-muted)] uppercase tracking-wide">
              Mensaje
            </label>
            <textarea
              rows={5}
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="px-3 py-2.5 rounded-[8px] bg-[var(--cq-surface-2)] border border-[var(--cq-border)] text-[13.5px] text-[var(--cq-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--cq-accent)] resize-none leading-relaxed"
            />
            <div className="flex flex-wrap gap-1.5">
              {['{patient_name}', '{date}', '{time}'].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTemplate((t) => t + v)}
                  className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-[var(--cq-surface-3)] text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] border border-[var(--cq-border)] transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {err && (
            <p className="text-[12px] text-[var(--cq-danger)]">{err}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── AutomationCard ────────────────────────────────────────────────────────────
function AutomationCard({ automation, stats, onToggle, onEdit }) {
  const meta     = TYPE_META[automation.type] ?? { name: automation.type, desc: '', trigger: () => '', icon: '⚙️' };
  const isActive = automation.enabled;

  const sent      = stats?.total_sent  ?? 0;
  const ok        = stats?.ok          ?? 0;
  const rate      = stats?.success_rate ?? (sent > 0 ? Math.round(ok / sent * 100) : null);
  const lastSent  = stats?.last_sent_at
    ? new Date(stats.last_sent_at).toLocaleString('es-UY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : 'Nunca';

  const barColor = rate == null ? 'var(--cq-fg-muted)' : rate >= 95 ? 'var(--cq-success)' : 'var(--cq-warn)';

  return (
    <div className="bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[12px] p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[18px] leading-none">{meta.icon}</span>
          <span className="font-medium text-[14px] text-[var(--cq-fg)] leading-snug truncate">{meta.name}</span>
        </div>
        <button
          onClick={() => onToggle(automation.id, !automation.enabled)}
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--cq-border)] text-[12px] transition-colors hover:bg-[var(--cq-surface-2)]"
          aria-label={isActive ? 'Desactivar automatización' : 'Activar automatización'}
        >
          <span
            className="w-2 h-2 rounded-full transition-colors"
            style={{ backgroundColor: isActive ? 'var(--cq-success)' : 'var(--cq-fg-muted)' }}
          />
          <span className="text-[var(--cq-fg-muted)]">{isActive ? 'Activo' : 'Inactivo'}</span>
        </button>
      </div>

      {/* Description */}
      <p className="text-[12.5px] text-[var(--cq-fg-muted)] leading-relaxed">{meta.desc}</p>

      {/* Trigger */}
      <MonoLabel>{meta.trigger(automation.hours_before)}</MonoLabel>

      {/* Progress bar */}
      {sent > 0 && (
        <div className="flex flex-col gap-1">
          <div className="h-1.5 rounded-full bg-[var(--cq-surface-3)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${rate ?? 0}%`, backgroundColor: barColor }}
            />
          </div>
          <span className="text-[11px] text-[var(--cq-fg-muted)]">
            {ok}/{sent} OK · {rate ?? 0}% tasa de éxito
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11.5px] text-[var(--cq-fg-muted)]">
          Último envío: {lastSent}
        </span>
        <button
          onClick={() => onEdit(automation)}
          className="text-[12px] text-[var(--cq-accent)] hover:opacity-80 transition-opacity flex items-center gap-1"
        >
          Configurar
          <Icons.Arrow size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[12px] p-4 flex flex-col gap-3 animate-pulse">
      <div className="h-5 w-2/3 rounded bg-[var(--cq-surface-3)]" />
      <div className="h-3 w-full rounded bg-[var(--cq-surface-3)]" />
      <div className="h-3 w-1/3 rounded bg-[var(--cq-surface-3)]" />
    </div>
  );
}

// ─── Automatizaciones page ────────────────────────────────────────────────────
export function Automatizaciones() {
  const { clinic }           = useAuth();
  const { push }             = useOutletContext();
  const {
    automations, stats, loading, error,
    toggleAutomation, updateTemplate,
  } = useAutomations(clinic?.id);

  const [editingAuto, setEditingAuto] = useState(null);

  const handleToggle = useCallback(async (id, enabled) => {
    const { error: err } = await toggleAutomation(id, enabled);
    if (err) {
      push?.(`Error al cambiar estado: ${err}`, 'error');
    } else {
      push?.(enabled ? 'Automatización activada.' : 'Automatización desactivada.', 'success');
    }
  }, [toggleAutomation, push]);

  const handleSaveTemplate = useCallback(async (id, fields) => {
    const { error: err } = await updateTemplate(id, fields);
    if (!err) push?.('Automatización actualizada.', 'success');
    return { error: err };
  }, [updateTemplate, push]);

  const activeCount   = automations.filter(a => a.enabled).length;
  const inactiveCount = automations.filter(a => !a.enabled).length;

  const statCards = [
    {
      label: 'Mensajes enviados',
      value: stats?.total_sent != null ? String(stats.total_sent) : '—',
    },
    {
      label: 'Tasa de éxito',
      value: stats?.success_rate != null ? `${stats.success_rate}%` : '—',
    },
    {
      label: 'Último envío',
      value: stats?.last_sent_at
        ? new Date(stats.last_sent_at).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })
        : 'Sin datos',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--cq-fg)] leading-tight">
            Automatizaciones
          </h1>
          {!loading && (
            <p className="text-[13.5px] text-[var(--cq-fg-muted)] mt-0.5">
              {activeCount} activa{activeCount !== 1 ? 's' : ''} · {inactiveCount} inactiva{inactiveCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[10px] px-4 py-3 flex flex-col gap-0.5"
          >
            <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--cq-fg-muted)]">
              {s.label}
            </span>
            <span className="text-[15px] font-semibold text-[var(--cq-fg)]">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-[10px] bg-[color-mix(in_oklch,var(--cq-danger)_12%,transparent)] border border-[color-mix(in_oklch,var(--cq-danger)_30%,transparent)] px-4 py-3 text-[13px] text-[var(--cq-danger)]">
          Error al cargar automatizaciones: {error}
        </div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading
          ? Array.from({ length: 2 }).map((_, i) => <CardSkeleton key={i} />)
          : automations.map((auto) => (
              <AutomationCard
                key={auto.id}
                automation={auto}
                stats={auto.clinic_id === clinic?.id ? stats : null}
                onToggle={handleToggle}
                onEdit={setEditingAuto}
              />
            ))
        }
      </div>

      {/* Setup info banner — WhatsApp not configured yet */}
      {!loading && automations.length > 0 && (
        <div className="rounded-[12px] bg-[color-mix(in_oklch,var(--cq-accent)_8%,transparent)] border border-[color-mix(in_oklch,var(--cq-accent)_25%,transparent)] px-5 py-4">
          <p className="text-[13px] font-medium text-[var(--cq-fg)] mb-1">
            Configuración de WhatsApp requerida
          </p>
          <p className="text-[12.5px] text-[var(--cq-fg-muted)] leading-relaxed">
            Para activar los recordatorios, necesitás configurar las variables de entorno en tu proyecto de Supabase:{' '}
            <code className="font-mono text-[var(--cq-accent)]">WHATSAPP_ACCESS_TOKEN</code>,{' '}
            <code className="font-mono text-[var(--cq-accent)]">WHATSAPP_PHONE_NUMBER_ID</code> y{' '}
            <code className="font-mono text-[var(--cq-accent)]">WHATSAPP_VERIFY_TOKEN</code>.
            También debés programar el cron job en el SQL Editor de Supabase.
          </p>
        </div>
      )}

      {/* Edit modal */}
      {editingAuto && (
        <EditTemplateModal
          automation={editingAuto}
          onSave={handleSaveTemplate}
          onClose={() => setEditingAuto(null)}
        />
      )}
    </div>
  );
}
