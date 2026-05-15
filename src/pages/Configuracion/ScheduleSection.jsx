import { useState, useEffect } from 'react';
import { Button, Badge, Icons, MonoLabel } from '../../components/ui';
import { DatePicker, TimePicker } from '../../components/ui/DateTimePicker';
import { useClinicSchedule } from '../../hooks/useClinicSchedule';
import { DAY_NAMES, DISPLAY_ORDER, REASON_LABELS } from '../../lib/scheduleUtils';
import { supabase } from '../../lib/supabase';

// ─── Shared styles ────────────────────────────────────────────────────────────
const inputCls =
  'h-9 px-2.5 rounded-[7px] border border-[var(--cq-border)] bg-[var(--cq-surface-2)] text-[13px] text-[var(--cq-fg)] focus:outline-none focus:ring-1 focus:ring-[var(--cq-accent)] transition-shadow disabled:opacity-50 disabled:cursor-default w-full';

function Toggle({ on, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => !disabled && onChange(!on)}
      className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-default ${
        on ? 'bg-[var(--cq-success)]' : 'bg-[var(--cq-surface-3)]'
      }`}
    >
      <span className={`size-4 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

function ToggleRow({ label, on, onChange, disabled, sublabel }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div>
        <div className="text-[13px] text-[var(--cq-fg)]">{label}</div>
        {sublabel && <div className="text-[11.5px] text-[var(--cq-fg-muted)]">{sublabel}</div>}
      </div>
      <Toggle on={on} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// ─── Weekly schedule grid ─────────────────────────────────────────────────────
function WeeklySchedule({ rows, onChange, disabled }) {
  return (
    <div className="divide-y divide-[var(--cq-border)]">
      {DISPLAY_ORDER.map(dow => {
        const row = rows.find(r => r.day_of_week === dow);
        if (!row) return null;
        return (
          <div key={dow} className="flex items-center gap-3 py-3">
            <div className="w-24 shrink-0">
              <span className={`text-[13.5px] ${row.is_open ? 'text-[var(--cq-fg)] font-medium' : 'text-[var(--cq-fg-muted)]'}`}>
                {DAY_NAMES[dow]}
              </span>
            </div>
            <Toggle
              on={row.is_open}
              onChange={v => onChange(dow, 'is_open', v)}
              disabled={disabled}
            />
            {row.is_open ? (
              <div className="flex items-center gap-2 flex-1">
                <div className="w-[130px]">
                  <TimePicker
                    value={row.open_time}
                    onChange={v => onChange(dow, 'open_time', v)}
                    disabled={disabled}
                  />
                </div>
                <span className="text-[12px] text-[var(--cq-fg-muted)] shrink-0">a</span>
                <div className="w-[130px]">
                  <TimePicker
                    value={row.close_time}
                    onChange={v => onChange(dow, 'close_time', v)}
                    disabled={disabled}
                  />
                </div>
              </div>
            ) : (
              <span className="text-[12.5px] text-[var(--cq-fg-muted)] italic">Cerrado</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Closure row ──────────────────────────────────────────────────────────────
function ClosureRow({ closure, onDelete, onNotify, notifying, isOwner }) {
  const dateLabel = new Date(closure.date + 'T12:00:00').toLocaleDateString('es-UY', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const label = closure.reason_label || REASON_LABELS[closure.reason] || 'Día cerrado';

  return (
    <div className="flex items-start gap-3 py-3 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[13px] font-medium capitalize">{dateLabel}</span>
          <Badge tone={closure.accepts_emergencies ? 'warn' : 'danger'} dot={false}>
            {REASON_LABELS[closure.reason] ?? 'Otro'}
          </Badge>
          {closure.accepts_emergencies && (
            <Badge tone="warn">Solo urgencias</Badge>
          )}
        </div>
        {closure.reason_label && closure.reason === 'other' && (
          <div className="text-[12px] text-[var(--cq-fg-muted)] mt-0.5">{closure.reason_label}</div>
        )}
        {closure.notification_sent_at && (
          <div className="text-[11.5px] text-[var(--cq-success)] mt-0.5 flex items-center gap-1">
            <Icons.Check size={10} /> Pacientes notificados
          </div>
        )}
      </div>
      {isOwner && (
        <div className="flex items-center gap-1.5 shrink-0">
          {closure.notify_patients && !closure.notification_sent_at && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNotify(closure)}
              disabled={notifying === closure.id}
              title="Enviar mensaje de cierre a pacientes con turno ese día"
            >
              {notifying === closure.id ? (
                <span className="size-3 border border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Icons.Whatsapp size={13} />
              )}
              Notificar
            </Button>
          )}
          <button
            onClick={() => onDelete(closure.id)}
            className="size-8 rounded-[6px] hover:bg-[var(--cq-danger)]/10 text-[var(--cq-fg-muted)] hover:text-[var(--cq-danger)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
            aria-label="Eliminar día cerrado"
          >
            <Icons.Close size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Add closure form ─────────────────────────────────────────────────────────
const EMPTY_FORM = {
  date:                 '',
  reason:               'holiday',
  reason_label:         '',
  accepts_emergencies:  false,
  notify_patients:      false,
};

function AddClosureForm({ onAdd, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);
  const [today,  setToday]  = useState('');

  useEffect(() => {
    setToday(new Date().toISOString().slice(0, 10));
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleAdd() {
    if (!form.date) { setError('Seleccioná una fecha.'); return; }
    setError(null);
    setSaving(true);
    try {
      await onAdd(form);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err?.message ?? 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-[var(--cq-border)] rounded-[10px] p-4 bg-[var(--cq-surface-2)] flex flex-col gap-3 mt-3">
      <MonoLabel>Nuevo día no disponible</MonoLabel>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <MonoLabel className="block mb-1">Fecha</MonoLabel>
          <DatePicker
            value={form.date}
            onChange={v => set('date', v)}
            min={today}
          />
        </div>
        <div>
          <MonoLabel className="block mb-1">Motivo</MonoLabel>
          <select
            value={form.reason}
            onChange={e => set('reason', e.target.value)}
            className={inputCls}
          >
            {Object.entries(REASON_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {form.reason === 'other' && (
        <div>
          <MonoLabel className="block mb-1">Descripción del motivo</MonoLabel>
          <input
            type="text"
            value={form.reason_label}
            onChange={e => set('reason_label', e.target.value)}
            placeholder="Ej: Reunión gremial, mudanza…"
            className={inputCls}
          />
        </div>
      )}

      <div className="border-t border-[var(--cq-border)] pt-3 flex flex-col gap-0.5">
        <ToggleRow
          label="Atender urgencias ese día"
          sublabel="Los pacientes pueden agendar solo si es urgencia"
          on={form.accepts_emergencies}
          onChange={v => set('accepts_emergencies', v)}
        />
        <ToggleRow
          label="Notificar pacientes con turno ese día"
          sublabel="Activa el botón para enviar mensaje por WhatsApp"
          on={form.notify_patients}
          onChange={v => set('notify_patients', v)}
        />
      </div>

      {error && <p className="text-[12.5px] text-[var(--cq-danger)]">{error}</p>}

      <div className="flex items-center gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button variant="primary" size="sm" onClick={handleAdd} disabled={saving}>
          {saving ? 'Guardando…' : 'Agregar'}
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ScheduleSection({ clinicId, isOwner, push }) {
  const {
    schedule, closures, loading,
    saveSchedule, addClosure, removeClosure, markNotificationSent,
  } = useClinicSchedule(clinicId);

  const [localSchedule, setLocalSchedule] = useState(null);
  const [scheduleDirty,  setScheduleDirty] = useState(false);
  const [savingSched,    setSavingSched]   = useState(false);
  const [showAddForm,    setShowAddForm]   = useState(false);
  const [notifying,      setNotifying]    = useState(null);

  useEffect(() => {
    if (schedule) { setLocalSchedule(schedule); setScheduleDirty(false); }
  }, [schedule]);

  function handleDayChange(dow, field, value) {
    if (!isOwner) return;
    setLocalSchedule(prev =>
      prev.map(r => r.day_of_week === dow ? { ...r, [field]: value } : r)
    );
    setScheduleDirty(true);
  }

  async function handleSave() {
    setSavingSched(true);
    try {
      await saveSchedule(localSchedule);
      setScheduleDirty(false);
      push?.('Horarios guardados.', 'success');
    } catch {
      push?.('No se pudo guardar el horario.', 'error');
    } finally {
      setSavingSched(false);
    }
  }

  async function handleAddClosure(form) {
    await addClosure(form);
    setShowAddForm(false);
    push?.('Día no disponible agregado.', 'success');
  }

  async function handleDelete(id) {
    try {
      await removeClosure(id);
      push?.('Día eliminado.', 'success');
    } catch {
      push?.('No se pudo eliminar.', 'error');
    }
  }

  async function handleNotify(closure) {
    setNotifying(closure.id);
    try {
      const { error } = await supabase.functions.invoke('notify-closure-patients', {
        body: { closure_id: closure.id },
      });
      if (error) throw error;
      await markNotificationSent(closure.id);
      push?.('Mensajes enviados a los pacientes.', 'success');
    } catch (err) {
      push?.('No se pudo enviar las notificaciones: ' + (err?.message ?? 'error desconocido'), 'error');
    } finally {
      setNotifying(null);
    }
  }

  if (loading || !localSchedule) {
    return (
      <div className="flex flex-col gap-3">
        {['sk-0','sk-1','sk-2','sk-3','sk-4'].map(k => (
          <div key={k} className="h-10 animate-pulse bg-[var(--cq-surface-3)] rounded-[8px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Weekly hours */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <MonoLabel>Horario semanal</MonoLabel>
          {!isOwner && <Badge tone="outline">Solo propietarios</Badge>}
        </div>
        <WeeklySchedule rows={localSchedule} onChange={handleDayChange} disabled={!isOwner} />
        {isOwner && (
          <div className="mt-4 flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              disabled={!scheduleDirty || savingSched}
              onClick={handleSave}
            >
              {savingSched ? 'Guardando…' : 'Guardar horario'}
            </Button>
            {scheduleDirty && (
              <span className="text-[12px] text-[var(--cq-fg-muted)]">Hay cambios sin guardar</span>
            )}
          </div>
        )}
      </div>

      {/* Closures */}
      <div className="border-t border-[var(--cq-border)] pt-5">
        <div className="flex items-center justify-between mb-1">
          <MonoLabel>Días no disponibles</MonoLabel>
          {isOwner && !showAddForm && (
            <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
              <Icons.Plus size={13} /> Agregar
            </Button>
          )}
        </div>
        <p className="text-[12px] text-[var(--cq-fg-muted)] mb-3">
          Feriados, vacaciones, cierres por reparación u otros motivos. No se pueden agendar turnos esos días.
        </p>

        {closures.length === 0 && !showAddForm ? (
          <p className="text-[13px] text-[var(--cq-fg-muted)] py-2 italic">Sin días no disponibles próximos.</p>
        ) : (
          <div className="divide-y divide-[var(--cq-border)]">
            {closures.map(c => (
              <ClosureRow
                key={c.id}
                closure={c}
                onDelete={handleDelete}
                onNotify={handleNotify}
                notifying={notifying}
                isOwner={isOwner}
              />
            ))}
          </div>
        )}

        {showAddForm && isOwner && (
          <AddClosureForm
            onAdd={handleAddClosure}
            onCancel={() => setShowAddForm(false)}
          />
        )}
      </div>
    </div>
  );
}
