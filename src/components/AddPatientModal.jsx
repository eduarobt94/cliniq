import { useState, useEffect, useRef } from 'react';
import { Icons, MonoLabel } from './ui';
import { createPatient } from '../lib/appointmentService';
import { isValidPhone, filterPhoneInput } from '../lib/phoneUtils';

export function AddPatientModal({ open, onClose, onSuccess, clinicId, push, existingPatients = [] }) {
  const [name,       setName]       = useState('');
  const [phone,      setPhone]      = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState(null);
  const nameRef = useRef(null);

  useEffect(() => {
    if (open) {
      setName(''); setPhone(''); setSubmitting(false); setError(null);
      setTimeout(() => nameRef.current?.focus(), 60);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      setError('El nombre y el teléfono son obligatorios.');
      return;
    }
    if (!isValidPhone(phone)) {
      setError('El teléfono debe estar en formato internacional: +598XXXXXXXX');
      return;
    }
    const nameLower = name.trim().toLowerCase();
    const dupName = existingPatients.some(p => p.full_name.trim().toLowerCase() === nameLower);
    if (dupName) {
      setError('Ya existe un paciente con ese nombre en esta clínica.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createPatient(clinicId, name, phone);
      onSuccess?.();
      push?.('Paciente agregado correctamente.', 'success');
      onClose();
    } catch (err) {
      const msg = err?.message ?? '';
      if (msg.includes('23505') || msg.includes('unique') || msg.includes('phone')) {
        setError('Ya existe un paciente con ese número de teléfono.');
      } else {
        setError('No se pudo crear el paciente. Intentá de nuevo.');
      }
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-patient-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className="cq-modal-in relative w-full max-w-[420px] bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[16px] p-6"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <MonoLabel>Nuevo paciente</MonoLabel>
            <h3 id="add-patient-title" className="mt-1 text-[20px] font-semibold tracking-tight">
              Agregar paciente
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-[8px] hover:bg-[var(--cq-surface-2)] flex items-center justify-center"
            aria-label="Cerrar"
          >
            <Icons.Close size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <MonoLabel>Nombre completo *</MonoLabel>
            <div className="mt-1.5 flex items-center gap-2 h-11 px-3 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-bg)] focus-within:border-[var(--cq-fg)] transition-colors">
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="Nombre Apellido"
                className="flex-1 bg-transparent outline-none text-[13.5px]"
                autoComplete="name"
              />
            </div>
          </label>

          <label className="block">
            <MonoLabel>Teléfono *</MonoLabel>
            <div className="mt-1.5 flex items-center gap-2 h-11 px-3 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-bg)] focus-within:border-[var(--cq-fg)] transition-colors">
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(filterPhoneInput(e.target.value))}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="+59899123456"
                className="flex-1 bg-transparent outline-none text-[13.5px]"
                autoComplete="tel"
              />
            </div>
          </label>

          {error && (
            <p role="alert" className="text-[13px] text-[var(--cq-danger)]">{error}</p>
          )}
        </div>

        <div className="mt-6 flex items-center gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={submitting}
            className="h-9 px-4 rounded-[8px] text-[13.5px] font-medium text-[var(--cq-fg-muted)] hover:bg-[var(--cq-surface-2)] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !name.trim() || !phone.trim()}
            className="h-9 px-4 rounded-[8px] bg-[var(--cq-fg)] text-[var(--cq-bg)] text-[13.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 inline-flex items-center gap-2"
          >
            {submitting ? 'Guardando…' : 'Guardar paciente'}
          </button>
        </div>
      </div>
    </div>
  );
}
