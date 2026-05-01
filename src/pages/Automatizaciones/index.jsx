import { useState, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAutomations } from '../../hooks/useAutomations';
import { Button, MonoLabel, Icons } from '../../components/ui';

// ─── Type metadata ────────────────────────────────────────────────────────────
const TYPE_META = {
  appointment_reminder: {
    name:    'Recordatorio de turno',
    desc:    'El paciente recibe un mensaje de WhatsApp antes de su turno con la fecha y hora. Puede confirmar, cancelar o reagendar con un toque, sin llamar.',
    trigger: (a) => `${a.hours_before ?? 24}h antes del turno`,
    Icon:    Icons.Chat,
  },
  patient_reactivation: {
    name:    'Recordatorio a pacientes sin visitas',
    desc:    'Envía un mensaje a pacientes que llevan tiempo sin venir. Podés recordarles que pueden volver y facilitar el reagendado.',
    trigger: (a) => `${a.months_inactive ?? 6} meses sin visita`,
    Icon:    Icons.UserRefresh,
    note:    'Solo se envía a pacientes que ya te escribieron por WhatsApp antes. Si el paciente nunca inició una conversación, el mensaje no se podrá entregar.',
  },
  review_request: {
    name:    'Pedido de reseña después de la visita',
    desc:    'Después de cada visita, el sistema le escribe al paciente agradeciéndole y pidiéndole una reseña en Google. Más reseñas = más pacientes nuevos.',
    trigger: (a) => `${a.hours_after ?? 2}h después de la visita`,
    Icon:    Icons.Star,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function renderPreview(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

const PREVIEW_VARS = {
  patient_name: 'María García',
  clinic_name:  'Consultorio Ejemplo',
  date:         'martes 4 de junio',
  time:         '10:00',
};

// ─── EditModal ────────────────────────────────────────────────────────────────
function EditModal({ automation, onSave, onClose }) {
  const meta = TYPE_META[automation.type] ?? {};

  // Form state — initialize from automation fields
  const [hoursBefore,    setHoursBefore]    = useState(String(automation.hours_before   ?? 24));
  const [monthsInactive, setMonthsInactive] = useState(String(automation.months_inactive ?? 6));
  const [hoursAfter,     setHoursAfter]     = useState(String(automation.hours_after    ?? 2));
  const [message,        setMessage]        = useState(
    automation.message_template ??
    (automation.type === 'patient_reactivation'
      ? 'Hola {patient_name}! 👋 Hace un tiempo que no te vemos en {clinic_name}. ¿Querés agendar una consulta? Respondé este mensaje y te ayudamos.'
      : '¡Gracias por tu visita a {clinic_name}, {patient_name}! 🙏 Si te pareció bien la atención, nos ayudaría mucho una reseña en Google. ¡Muchas gracias!')
  );

  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const preview = useMemo(() => renderPreview(message, PREVIEW_VARS), [message]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');

    const fields = {};

    if (automation.type === 'appointment_reminder') {
      const h = parseInt(hoursBefore, 10);
      if (isNaN(h) || h < 1 || h > 168) { setErr('Las horas deben ser entre 1 y 168.'); return; }
      fields.hours_before = h;
    }

    if (automation.type === 'patient_reactivation') {
      const m = parseInt(monthsInactive, 10);
      if (isNaN(m) || m < 1 || m > 24) { setErr('Los meses deben ser entre 1 y 24.'); return; }
      if (!message.trim()) { setErr('El mensaje no puede estar vacío.'); return; }
      fields.months_inactive    = m;
      fields.message_template   = message.trim();
    }

    if (automation.type === 'review_request') {
      const h = parseInt(hoursAfter, 10);
      if (isNaN(h) || h < 1 || h > 72) { setErr('Las horas deben ser entre 1 y 72.'); return; }
      if (!message.trim()) { setErr('El mensaje no puede estar vacío.'); return; }
      fields.hours_after      = h;
      fields.message_template = message.trim();
    }

    setSaving(true);
    const result = await onSave(automation.id, fields);
    setSaving(false);
    if (result?.error) { setErr(result.error); return; }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[16px] w-full max-w-[520px] shadow-xl flex flex-col max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--cq-border)]">
          <div>
            <MonoLabel>Configurar automatización</MonoLabel>
            <div className="flex items-center gap-2 mt-1">
              {meta.Icon && <meta.Icon size={16} />}
              <h2 className="text-[17px] font-semibold text-[var(--cq-fg)]">{meta.name}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--cq-fg-muted)] hover:bg-[var(--cq-surface-2)]"
          >
            <Icons.Close size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-5">

          {/* ── appointment_reminder ── */}
          {automation.type === 'appointment_reminder' && (
            <>
              <div className="rounded-[10px] bg-[var(--cq-surface-2)] border border-[var(--cq-border)] px-4 py-3 flex flex-col gap-1">
                <p className="text-[12.5px] font-medium text-[var(--cq-fg)]">¿Qué recibe el paciente?</p>
                <p className="text-[12px] text-[var(--cq-fg-muted)] leading-relaxed">
                  Un mensaje de WhatsApp con la fecha y hora de su turno, con botones para confirmar, cancelar o reagendar. Se envía automáticamente X horas antes.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[var(--cq-fg-muted)] uppercase tracking-wide">
                  Horas antes del turno
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number" min={1} max={168}
                    value={hoursBefore}
                    onChange={(e) => setHoursBefore(e.target.value)}
                    className="h-9 w-24 px-3 rounded-[8px] bg-[var(--cq-surface-2)] border border-[var(--cq-border)] text-[14px] text-[var(--cq-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--cq-accent)]"
                  />
                  <span className="text-[13px] text-[var(--cq-fg-muted)]">horas (1 – 168)</span>
                </div>
                <p className="text-[11.5px] text-[var(--cq-fg-muted)]">
                  Recomendado: 24 horas para que el paciente tenga tiempo de confirmar o reagendar.
                </p>
              </div>
            </>
          )}

          {/* ── patient_reactivation ── */}
          {automation.type === 'patient_reactivation' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[var(--cq-fg-muted)] uppercase tracking-wide">
                  Meses sin visita
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number" min={1} max={24}
                    value={monthsInactive}
                    onChange={(e) => setMonthsInactive(e.target.value)}
                    className="h-9 w-24 px-3 rounded-[8px] bg-[var(--cq-surface-2)] border border-[var(--cq-border)] text-[14px] text-[var(--cq-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--cq-accent)]"
                  />
                  <span className="text-[13px] text-[var(--cq-fg-muted)]">meses (1 – 24)</span>
                </div>
                <p className="text-[11.5px] text-[var(--cq-fg-muted)]">
                  Se contactará a pacientes que no tuvieron ningún turno en los últimos {monthsInactive || '?'} meses.
                </p>
              </div>
              <MessageEditor
                value={message}
                onChange={setMessage}
                preview={preview}
                placeholders={['patient_name', 'clinic_name']}
              />
            </>
          )}

          {/* ── review_request ── */}
          {automation.type === 'review_request' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-[var(--cq-fg-muted)] uppercase tracking-wide">
                  Horas después de la visita
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number" min={1} max={72}
                    value={hoursAfter}
                    onChange={(e) => setHoursAfter(e.target.value)}
                    className="h-9 w-24 px-3 rounded-[8px] bg-[var(--cq-surface-2)] border border-[var(--cq-border)] text-[14px] text-[var(--cq-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--cq-accent)]"
                  />
                  <span className="text-[13px] text-[var(--cq-fg-muted)]">horas (1 – 72)</span>
                </div>
              </div>
              <MessageEditor
                value={message}
                onChange={setMessage}
                preview={preview}
                placeholders={['patient_name', 'clinic_name']}
              />
            </>
          )}

          {/* Note */}
          {meta.note && (
            <div className="rounded-[9px] bg-[color-mix(in_oklch,var(--cq-warn)_10%,transparent)] border border-[color-mix(in_oklch,var(--cq-warn)_30%,transparent)] px-3 py-2.5 flex items-start gap-2">
              <Icons.Info size={13} className="shrink-0 mt-0.5 text-[var(--cq-warn)]" />
              <p className="text-[11.5px] text-[var(--cq-fg)] leading-relaxed">{meta.note}</p>
            </div>
          )}

          {err && <p className="text-[12px] text-[var(--cq-danger)]">{err}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Etiquetas legibles para cada placeholder
const PLACEHOLDER_LABELS = {
  patient_name: 'Nombre del paciente',
  clinic_name:  'Nombre de la clínica',
  date:         'Fecha del turno',
  time:         'Hora del turno',
};

// ─── Message editor with preview ─────────────────────────────────────────────
function MessageEditor({ value, onChange, preview, placeholders }) {
  const remaining = 1000 - value.length;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-[12px] font-medium text-[var(--cq-fg-muted)] uppercase tracking-wide">
          Texto del mensaje
        </label>
        <span className={`text-[11px] font-mono ${remaining < 100 ? 'text-[var(--cq-warn)]' : 'text-[var(--cq-fg-muted)]'}`}>
          {remaining} caracteres restantes
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={1000}
        rows={4}
        className="w-full px-3 py-2.5 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-bg)] focus:border-[var(--cq-fg)] outline-none text-[13.5px] resize-none"
        placeholder="Escribí el mensaje que recibirá el paciente…"
      />
      {/* Insertar datos dinámicos */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[11.5px] text-[var(--cq-fg-muted)]">Insertar datos del paciente en el mensaje:</p>
        <div className="flex flex-wrap gap-1.5">
          {placeholders.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(value + `{${p}}`)}
              className="px-2.5 py-1 rounded-[6px] bg-[var(--cq-surface-2)] border border-[var(--cq-border)] text-[12px] text-[var(--cq-fg)] hover:border-[var(--cq-fg)] transition-colors"
            >
              + {PLACEHOLDER_LABELS[p] ?? p}
            </button>
          ))}
        </div>
      </div>
      {/* Preview */}
      <div>
        <p className="text-[11.5px] text-[var(--cq-fg-muted)] mb-1.5">Así lo verá el paciente:</p>
        <div className="rounded-[10px] bg-[var(--cq-surface-2)] border border-[var(--cq-border)] px-3 py-2.5 text-[13px] text-[var(--cq-fg)] leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
          {preview || <span className="opacity-40 italic">El mensaje aparecerá aquí…</span>}
        </div>
      </div>
    </div>
  );
}

// ─── AutomationCard ───────────────────────────────────────────────────────────
function AutomationCard({ automation, stats, onToggle, onEdit }) {
  const meta     = TYPE_META[automation.type] ?? { name: automation.type, desc: '', trigger: () => '', Icon: Icons.Settings };
  const isActive = automation.enabled;

  const sent     = stats?.total_sent   ?? 0;
  const ok       = stats?.ok           ?? 0;
  const rate     = stats?.success_rate ?? (sent > 0 ? Math.round(ok / sent * 100) : null);
  const lastSent = stats?.last_sent_at
    ? new Date(stats.last_sent_at).toLocaleString('es-UY', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : 'Nunca';

  const barColor = rate == null
    ? 'var(--cq-fg-muted)'
    : rate >= 95 ? 'var(--cq-success)' : 'var(--cq-warn)';

  return (
    <div className="bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[12px] p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="shrink-0 w-8 h-8 rounded-[8px] bg-[var(--cq-surface-2)] border border-[var(--cq-border)] flex items-center justify-center text-[var(--cq-fg-muted)]">
            {meta.Icon && <meta.Icon size={15} />}
          </span>
          <span className="font-medium text-[14px] text-[var(--cq-fg)] leading-snug">{meta.name}</span>
        </div>
        <button
          onClick={() => onToggle(automation.id, !automation.enabled)}
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--cq-border)] text-[12px] transition-colors hover:bg-[var(--cq-surface-2)]"
          aria-label={isActive ? 'Desactivar' : 'Activar'}
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

      {/* Trigger chip */}
      <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-full bg-[var(--cq-surface-2)] border border-[var(--cq-border)]">
        <Icons.Zap size={11} />
        <MonoLabel className="text-[10.5px]">{meta.trigger(automation)}</MonoLabel>
      </div>

      {/* Progress bar — only if there's data */}
      {sent > 0 && (
        <div className="flex flex-col gap-1">
          <div className="h-1.5 rounded-full bg-[var(--cq-surface-3)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${rate ?? 0}%`, backgroundColor: barColor }}
            />
          </div>
          <span className="text-[11px] text-[var(--cq-fg-muted)]">
            {ok} de {sent} enviados · {rate ?? 0}% entregados correctamente
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
          Configurar <Icons.Arrow size={12} />
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export function Automatizaciones() {
  const { clinic }  = useAuth();
  const { push }    = useOutletContext();
  const { automations, stats, loading, error, toggleAutomation, updateTemplate } = useAutomations(clinic?.id);

  const [editingAuto, setEditingAuto] = useState(null);

  const handleToggle = useCallback(async (id, enabled) => {
    const { error: err } = await toggleAutomation(id, enabled);
    push?.(err ? `Error: ${err}` : enabled ? 'Automatización activada.' : 'Automatización desactivada.',
          err ? 'error' : 'success');
  }, [toggleAutomation, push]);

  const handleSave = useCallback(async (id, fields) => {
    const { error: err } = await updateTemplate(id, fields);
    if (!err) push?.('Automatización actualizada.', 'success');
    return { error: err };
  }, [updateTemplate, push]);

  const activeCount   = automations.filter(a => a.enabled).length;
  const inactiveCount = automations.filter(a => !a.enabled).length;

  const statCards = [
    { label: 'Mensajes enviados',  value: stats?.total_sent   != null ? String(stats.total_sent)  : '—' },
    { label: 'Tasa de éxito',      value: stats?.success_rate != null ? `${stats.success_rate}%`  : '—' },
    {
      label: 'Último envío',
      value: stats?.last_sent_at
        ? new Date(stats.last_sent_at).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })
        : 'Sin datos',
    },
  ];

  // Preferred display order
  const ORDER = ['appointment_reminder', 'review_request', 'patient_reactivation'];
  const sorted = [...automations].sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-semibold text-[var(--cq-fg)] leading-tight">Automatizaciones</h1>
        {!loading && (
          <p className="text-[13.5px] text-[var(--cq-fg-muted)] mt-0.5">
            {activeCount} activa{activeCount !== 1 ? 's' : ''} · {inactiveCount} inactiva{inactiveCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[10px] px-4 py-3 flex flex-col gap-0.5">
            <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--cq-fg-muted)]">{s.label}</span>
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

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
          : sorted.map((auto) => (
              <AutomationCard
                key={auto.id}
                automation={auto}
                stats={auto.type === 'appointment_reminder' ? stats : null}
                onToggle={handleToggle}
                onEdit={setEditingAuto}
              />
            ))
        }
      </div>

      {/* How it works */}
      {!loading && automations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <InfoBox
            Icon={Icons.Chat}
            title="Recordatorio de turno"
            text="El paciente recibe un WhatsApp antes de su cita con botones para confirmar o cancelar. Sin llamadas, sin esfuerzo de tu parte."
          />
          <InfoBox
            Icon={Icons.Star}
            title="Pedido de reseña"
            text="Después de cada visita le pedís al paciente que deje una reseña en Google. Más reseñas = más visibilidad y más pacientes nuevos."
          />
          <InfoBox
            Icon={Icons.UserRefresh}
            title="Pacientes sin visitas"
            text="Detecta pacientes que llevan tiempo sin venir y les envía un mensaje para que puedan reagendar. Se manda como máximo una vez por período."
          />
        </div>
      )}

      {/* Edit modal */}
      {editingAuto && (
        <EditModal
          automation={editingAuto}
          onSave={handleSave}
          onClose={() => setEditingAuto(null)}
        />
      )}
    </div>
  );
}

function InfoBox({ Icon, title, text }) {
  return (
    <div className="rounded-[12px] bg-[color-mix(in_oklch,var(--cq-accent)_6%,transparent)] border border-[color-mix(in_oklch,var(--cq-accent)_20%,transparent)] px-4 py-3.5 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={13} />}
        <p className="text-[13px] font-medium text-[var(--cq-fg)]">{title}</p>
      </div>
      <p className="text-[12px] text-[var(--cq-fg-muted)] leading-relaxed">{text}</p>
    </div>
  );
}
