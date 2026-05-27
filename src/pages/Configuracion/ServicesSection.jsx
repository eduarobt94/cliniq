import { useState } from 'react';
import { Button, Badge, Icons, MonoLabel } from '../../components/ui';
import { useClinicServices } from '../../hooks/useClinicServices';
import { supabase } from '../../lib/supabase';

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  'h-9 px-2.5 rounded-[7px] border border-[var(--cq-border)] bg-[var(--cq-surface-2)] ' +
  'text-[13px] text-[var(--cq-fg)] focus:outline-none focus:ring-1 focus:ring-[var(--cq-accent)] ' +
  'transition-shadow disabled:opacity-50 disabled:cursor-default w-full';

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ on, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => !disabled && onChange(!on)}
      className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-colors shrink-0
        disabled:opacity-50 disabled:cursor-default
        ${on ? 'bg-[var(--cq-success)]' : 'bg-[var(--cq-surface-3)]'}`}
    >
      <span className={`size-4 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

// ─── Precio final calculado ───────────────────────────────────────────────────

function finalPrice(price, discountType, discountValue) {
  if (price == null) return null;
  if (!discountType || !discountValue) return price;
  if (discountType === 'percent') return price * (1 - discountValue / 100);
  if (discountType === 'fixed')   return Math.max(0, price - discountValue);
  return price;
}

function PriceDisplay({ price, discountType, discountValue }) {
  if (price == null) return <span className="text-[var(--cq-fg-muted)]">{"—"}</span>;
  const original = Number(price);
  const final    = finalPrice(original, discountType, discountValue ? Number(discountValue) : null);
  const hasDisc  = final !== original && final != null;

  return (
    <span className="inline-flex items-center gap-1.5 font-mono">
      {hasDisc && (
        <span className="line-through text-[var(--cq-fg-muted)] text-[11px]">
          ${original.toFixed(2)}
        </span>
      )}
      <span className={hasDisc ? 'text-[var(--cq-success)]' : 'text-[var(--cq-fg)]'}>
        ${final.toFixed(2)}
      </span>
      {hasDisc && discountType === 'percent' && (
        <Badge tone="success">-{discountValue}%</Badge>
      )}
    </span>
  );
}

// ─── Empty FORM state ─────────────────────────────────────────────────────────

const EMPTY = {
  name:             '',
  duration_minutes: '',
  price:            '',
  discount_type:    '',
  discount_value:   '',
  is_active:        true,
};

// ─── Inline form (add / edit) ─────────────────────────────────────────────────

function ServiceForm({ initial = EMPTY, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function handleBlurName() {
    const trimmed = form.name.trim();
    if (!trimmed) {
      setFieldErrors(prev => ({ ...prev, name: 'El nombre del servicio es obligatorio.' }));
    } else if (trimmed.length < 2) {
      setFieldErrors(prev => ({ ...prev, name: 'El nombre debe tener al menos 2 caracteres.' }));
    } else if (trimmed.length > 100) {
      setFieldErrors(prev => ({ ...prev, name: 'El nombre no puede superar los 100 caracteres.' }));
    } else {
      setFieldErrors(prev => { const next = { ...prev }; delete next.name; return next; });
    }
  }

  function handleBlurDuration() {
    if (form.duration_minutes !== '' && form.duration_minutes !== null) {
      const dur = Number(form.duration_minutes);
      if (isNaN(dur) || dur <= 0) {
        setFieldErrors(prev => ({ ...prev, duration_minutes: 'La duración debe ser un número positivo.' }));
        return;
      }
    }
    setFieldErrors(prev => { const next = { ...prev }; delete next.duration_minutes; return next; });
  }

  function handleBlurPrice() {
    if (form.price !== '' && form.price !== null) {
      const pr = Number(form.price);
      if (isNaN(pr) || pr < 0) {
        setFieldErrors(prev => ({ ...prev, price: 'El precio debe ser un número no negativo.' }));
        return;
      }
    }
    setFieldErrors(prev => { const next = { ...prev }; delete next.price; return next; });
  }

  async function handleSubmit() {
    const trimmedName = form.name.trim();
    if (!trimmedName) { setError('El nombre del servicio es obligatorio.'); return; }
    if (trimmedName.length > 100) { setError('El nombre no puede superar los 100 caracteres.'); return; }
    if (form.duration_minutes !== '' && form.duration_minutes !== null) {
      const dur = Number(form.duration_minutes);
      if (isNaN(dur) || dur <= 0) { setError('La duración debe ser un número positivo.'); return; }
    }
    if (form.price !== '' && form.price !== null) {
      const pr = Number(form.price);
      if (isNaN(pr) || pr < 0) { setError('El precio debe ser un número positivo.'); return; }
    }
    if (form.discount_value && !form.discount_type) {
      setError('Seleccioná el tipo de descuento.'); return;
    }
    setError(null);
    try {
      await onSave({ ...form, name: trimmedName });
    } catch (err) {
      setError(err?.message ?? 'No se pudo guardar.');
    }
  }

  const showDiscount = !!form.discount_type;

  return (
    <div className="border border-[var(--cq-border)] rounded-[10px] p-4 bg-[var(--cq-bg)] flex flex-col gap-3">
      <MonoLabel>{initial.name ? 'Editar servicio' : 'Nuevo servicio'}</MonoLabel>

      {/* Nombre */}
      <div>
        <MonoLabel className="block mb-1">Nombre *</MonoLabel>
        <input
          className={inputCls}
          value={form.name}
          onChange={e => { set('name', e.target.value); if (fieldErrors.name) setFieldErrors(prev => { const n = { ...prev }; delete n.name; return n; }); }}
          onBlur={handleBlurName}
          placeholder="Ej: Consulta general"
          disabled={saving}
          maxLength={100}
        />
        {fieldErrors.name && <p className="text-[12.5px] text-[var(--cq-danger)] mt-1">{fieldErrors.name}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Duración */}
        <div>
          <MonoLabel className="block mb-1">Duración (min)</MonoLabel>
          <input
            type="number"
            min="5"
            max="480"
            step="5"
            autoComplete="off"
            className={inputCls}
            value={form.duration_minutes}
            onChange={e => { set('duration_minutes', e.target.value); if (fieldErrors.duration_minutes) setFieldErrors(prev => { const n = { ...prev }; delete n.duration_minutes; return n; }); }}
            onBlur={handleBlurDuration}
            placeholder="Ej: 30"
            disabled={saving}
          />
          {fieldErrors.duration_minutes && <p className="text-[12.5px] text-[var(--cq-danger)] mt-1">{fieldErrors.duration_minutes}</p>}
        </div>

        {/* Precio base */}
        <div>
          <MonoLabel className="block mb-1">Precio base ($)</MonoLabel>
          <input
            type="number"
            min="0"
            step="0.01"
            autoComplete="off"
            className={inputCls}
            value={form.price}
            onChange={e => { set('price', e.target.value); if (fieldErrors.price) setFieldErrors(prev => { const n = { ...prev }; delete n.price; return n; }); }}
            onBlur={handleBlurPrice}
            placeholder="Ej: 1200"
            disabled={saving}
          />
          {fieldErrors.price && <p className="text-[12.5px] text-[var(--cq-danger)] mt-1">{fieldErrors.price}</p>}
        </div>
      </div>

      {/* Descuento — tipo en su propia fila, valor condicional abajo */}
      <div className="flex flex-col gap-2">
        <MonoLabel>Descuento</MonoLabel>

        {/* Tipo de descuento */}
        <select
          id="svc-discount-type"
          aria-label="Tipo de descuento"
          className={inputCls}
          value={form.discount_type}
          onChange={e => {
            set('discount_type', e.target.value);
            if (!e.target.value) set('discount_value', '');
          }}
          disabled={saving}
        >
          <option value="">Sin descuento</option>
          <option value="percent">Porcentaje (%)</option>
          <option value="fixed">Monto fijo ($)</option>
        </select>

        {/* Valor del descuento — solo cuando hay tipo */}
        {form.discount_type && (
          <div>
            <MonoLabel className="block mb-1">
              {form.discount_type === 'percent' ? 'Porcentaje (0 – 100)' : 'Monto a descontar ($)'}
            </MonoLabel>
            <input
              type="number"
              min="0"
              max={form.discount_type === 'percent' ? 100 : undefined}
              step={form.discount_type === 'percent' ? 1 : 0.01}
              autoComplete="off"
              className={inputCls}
              value={form.discount_value}
              onChange={e => set('discount_value', e.target.value)}
              placeholder={form.discount_type === 'percent' ? 'Ej: 15' : 'Ej: 500'}
              disabled={saving}
            />
          </div>
        )}

        {/* Preview precio final */}
        {form.price && form.discount_type && form.discount_value && (
          <p className="text-[12px] text-[var(--cq-fg-muted)]">
            Precio final:{' '}
            <PriceDisplay
              price={form.price}
              discountType={form.discount_type}
              discountValue={form.discount_value}
            />
          </p>
        )}
      </div>

      {error && <p className="text-[12.5px] text-[var(--cq-danger)]">{error}</p>}

      <div className="flex items-center gap-2 justify-end pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button variant="primary" size="sm" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}

// ─── Service row ──────────────────────────────────────────────────────────────

function ServiceRow({ service, onEdit, onToggle, onDelete, isOwner, toggling, deleting }) {
  return (
    <div className={`flex items-center gap-3 py-3 group ${!service.is_active ? 'opacity-50' : ''}`}>
      {/* Active toggle */}
      {isOwner && (
        <Toggle
          on={service.is_active}
          onChange={v => onToggle(service.id, v)}
          disabled={toggling === service.id}
        />
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13.5px] font-medium text-[var(--cq-fg)] truncate">{service.name}</span>
          {!service.is_active && <Badge tone="outline">Inactivo</Badge>}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {service.duration_minutes && (
            <span className="text-[11.5px] text-[var(--cq-fg-muted)] flex items-center gap-1">
              <Icons.Clock size={11} />
              {service.duration_minutes} min
            </span>
          )}
          {service.price != null && (
            <span className="text-[12px]">
              <PriceDisplay
                price={service.price}
                discountType={service.discount_type}
                discountValue={service.discount_value}
              />
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {isOwner && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onEdit(service)}
            className="size-8 rounded-[6px] hover:bg-[var(--cq-surface-3)] text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] flex items-center justify-center"
            aria-label={`Editar ${service.name}`}
          >
            <Icons.Edit size={13} />
          </button>
          <button
            onClick={() => onDelete(service.id)}
            disabled={deleting === service.id}
            className="size-8 rounded-[6px] hover:bg-[var(--cq-danger)]/10 text-[var(--cq-fg-muted)] hover:text-[var(--cq-danger)] flex items-center justify-center disabled:opacity-40"
            aria-label={`Eliminar ${service.name}`}
          >
            {deleting === service.id
              ? <span className="size-3 border border-current border-t-transparent rounded-full animate-spin" />
              : <Icons.Close size={13} />
            }
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

// ─── Delete confirmation dialog ───────────────────────────────────────────────

function DeleteConfirmDialog({ hasAppointments, onConfirm, onCancel, deleting }) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-[var(--cq-fg)]/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-[380px] bg-[var(--cq-bg)] border border-[var(--cq-border)] rounded-[14px] p-5 shadow-2xl">
        <h3 id="delete-dialog-title" className="text-[16px] font-semibold text-[var(--cq-fg)] mb-2">
          {hasAppointments ? 'Servicio con citas programadas' : '¿Eliminar este servicio?'}
        </h3>
        <p id="delete-dialog-desc" className="text-[13.5px] text-[var(--cq-fg-muted)] mb-5">
          {hasAppointments
            ? 'Este servicio tiene citas programadas. Eliminarlo puede afectar la agenda. ¿Deseas continuar?'
            : 'Esta acción no se puede deshacer.'}
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={deleting} aria-label="Cancelar eliminación">
            Cancelar
          </Button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="h-8 px-3 text-[13px] font-medium rounded-[8px] bg-[var(--cq-danger)] text-white hover:opacity-90 disabled:opacity-50 transition-opacity inline-flex items-center gap-1.5"
          >
            {deleting
              ? <span className="size-3.5 border border-white border-t-transparent rounded-full animate-spin" />
              : null}
            {hasAppointments ? 'Eliminar de todas formas' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ServicesSection({ clinicId, isOwner, push }) {
  const { services, loading, error, createService, updateService, toggleActive, deleteService } =
    useClinicServices(clinicId);

  const [showForm,  setShowForm]  = useState(false);
  const [editItem,  setEditItem]  = useState(null); // service being edited
  const [saving,    setSaving]    = useState(false);
  const [toggling,  setToggling]  = useState(null);
  const [deleting,  setDeleting]  = useState(null);

  // ── Delete confirmation state ────────────────────────────────────────────────
  const [deleteDialog, setDeleteDialog] = useState(null); // { id, hasAppointments } | null

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleCreate(form) {
    setSaving(true);
    try {
      await createService(form);
      setShowForm(false);
      push?.('Servicio agregado.', 'success');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(form) {
    setSaving(true);
    try {
      await updateService(editItem.id, form);
      setEditItem(null);
      push?.('Servicio actualizado.', 'success');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id, val) {
    setToggling(id);
    try {
      await toggleActive(id, val);
    } catch {
      push?.('No se pudo actualizar el estado.', 'error');
    } finally {
      setToggling(null);
    }
  }

  async function handleDeleteRequest(id) {
    // Check for future appointments linked to this service
    try {
      const now = new Date().toISOString();
      const { count } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('service_id', id)
        .gte('datetime', now);
      setDeleteDialog({ id, hasAppointments: (count ?? 0) > 0 });
    } catch {
      // If the query fails (e.g. no service_id column), fall back to simple confirm
      setDeleteDialog({ id, hasAppointments: false });
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteDialog) return;
    const { id } = deleteDialog;
    setDeleting(id);
    try {
      await deleteService(id);
      push?.('Servicio eliminado.', 'success');
    } catch {
      push?.('No se pudo eliminar el servicio.', 'error');
    } finally {
      setDeleting(null);
      setDeleteDialog(null);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="border-t border-[var(--cq-border)] pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <MonoLabel>Servicios y prestaciones</MonoLabel>
        {isOwner && !showForm && !editItem && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Icons.Plus size={13} /> Agregar
          </Button>
        )}
      </div>
      <p className="text-[12px] text-[var(--cq-fg-muted)] mb-4">
        Los servicios aparecen al crear un turno y el bot puede mostrarlos a los pacientes.
      </p>

      {/* Error */}
      {error && (
        <p className="text-[13px] text-[var(--cq-danger)] mb-3">{error}</p>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {['sk-0', 'sk-1', 'sk-2'].map(k => (
            <div key={k} className="h-10 animate-pulse bg-[var(--cq-surface-3)] rounded-[8px]" />
          ))}
        </div>
      ) : (
        <>
          {/* List */}
          {services.length > 0 ? (
            <div className="divide-y divide-[var(--cq-border)] mb-3">
              {services.map(s =>
                editItem?.id === s.id ? (
                  <div key={s.id} className="py-3">
                    <ServiceForm
                      initial={{
                        name:             s.name,
                        duration_minutes: s.duration_minutes ?? '',
                        price:            s.price ?? '',
                        discount_type:    s.discount_type ?? '',
                        discount_value:   s.discount_value ?? '',
                        is_active:        s.is_active,
                      }}
                      onSave={handleUpdate}
                      onCancel={() => setEditItem(null)}
                      saving={saving}
                    />
                  </div>
                ) : (
                  <ServiceRow
                    key={s.id}
                    service={s}
                    onEdit={setEditItem}
                    onToggle={handleToggle}
                    onDelete={handleDeleteRequest}
                    isOwner={isOwner}
                    toggling={toggling}
                    deleting={deleting}
                  />
                )
              )}
            </div>
          ) : !showForm ? (
            <p className="text-[13px] text-[var(--cq-fg-muted)] italic py-2">
              Aún no hay servicios configurados. Agregá el primero.
            </p>
          ) : null}

          {/* Add form */}
          {showForm && (
            <ServiceForm
              onSave={handleCreate}
              onCancel={() => setShowForm(false)}
              saving={saving}
            />
          )}
        </>
      )}

      {/* Delete confirmation dialog */}
      {deleteDialog && (
        <DeleteConfirmDialog
          hasAppointments={deleteDialog.hasAppointments}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteDialog(null)}
          deleting={deleting === deleteDialog.id}
        />
      )}
    </div>
  );
}
