import { useState, useEffect, useRef } from 'react';
import { Icons, MonoLabel } from './ui';
import { createPatient } from '../lib/appointmentService';
import { filterPhoneInput } from '../lib/phoneUtils';

const NAME_RE  = /^[a-zA-ZÀ-ÿ\s'\-]+$/;
const PHONE_RE = /^\+?[0-9]{7,15}$/;

function validateName(value) {
  const v = value.trim();
  if (v.length === 0)   return 'El nombre es obligatorio.';
  if (v.length < 2)     return 'El nombre debe tener al menos 2 caracteres.';
  if (v.length > 100)   return 'El nombre no puede superar los 100 caracteres.';
  if (!NAME_RE.test(v)) return 'El nombre solo puede contener letras.';
  return null;
}

function validatePhone(value) {
  const v = value.trim();
  if (v.length === 0) return null; // optional — presence handled by caller
  if (!PHONE_RE.test(v)) return 'Ingresá un teléfono válido (7-15 dígitos, puede empezar con +).';
  return null;
}

const EMPTY_PATIENTS = [];
export function AddPatientModal({ open, onClose, onSuccess, clinicId, push, existingPatients = EMPTY_PATIENTS }) {
  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [nameErr, setNameErr] = useState(null);
  const [phoneErr,setPhoneErr]= useState(null);
  const [formErr, setFormErr] = useState(null);
  const nameRef = useRef(null);

  useEffect(() => {
    if (open) {
      setName(''); setPhone('');
      setSaving(false);
      setNameErr(null); setPhoneErr(null); setFormErr(null);
      const t = setTimeout(() => nameRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  const handleSubmit = async () => {
    const nErr = validateName(name);
    const pErr = phone.trim() ? validatePhone(phone) : 'El teléfono es obligatorio.';
    setNameErr(nErr);
    setPhoneErr(pErr);
    if (nErr || pErr) return;

    const nameLower = name.trim().toLowerCase();
    const dupName = existingPatients.some(p => p.full_name.trim().toLowerCase() === nameLower);
    if (dupName) {
      setFormErr('Ya existe un paciente con ese nombre en esta clínica.');
      return;
    }

    setFormErr(null);
    setSaving(true);
    try {
      await createPatient(clinicId, name.trim(), phone.trim());
      onSuccess?.();
      push?.('Paciente agregado correctamente.', 'success');
      onClose();
    } catch (err) {
      const msg = err?.message ?? '';
      if (msg.includes('23505') || msg.includes('unique') || msg.includes('phone')) {
        setFormErr('Ya existe un paciente con ese número de teléfono.');
      } else {
        setFormErr('No se pudo crear el paciente. Intentá de nuevo.');
      }
      setSaving(false);
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
      <div className="cq-backdrop-in absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
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
            className="size-11 rounded-[8px] hover:bg-[var(--cq-surface-2)] flex items-center justify-center"
            aria-label="Cerrar modal"
          >
            <Icons.Close size={16} />
          </button>
        </div>

        <div className="space-y-3">
          {/* Name */}
          <div>
            <label htmlFor="add-patient-name">
              <MonoLabel>Nombre completo *</MonoLabel>
            </label>
            <div className={`mt-1.5 flex items-center gap-2 h-11 px-3 rounded-[9px] border bg-[var(--cq-bg)] focus-within:border-[var(--cq-fg)] transition-colors ${nameErr ? 'border-[var(--cq-danger)]' : 'border-[var(--cq-border)]'}`}>
              <input
                id="add-patient-name"
                ref={nameRef}
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setNameErr(null); setFormErr(null); }}
                onBlur={e => { const err = validateName(e.target.value); if (err) setNameErr(err); }}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="Nombre completo del paciente"
                maxLength={100}
                autoComplete="name"
                autoFocus
                aria-invalid={nameErr ? 'true' : 'false'}
                aria-describedby={nameErr ? 'add-patient-name-err' : undefined}
                className="flex-1 bg-transparent outline-none text-[13.5px]"
              />
            </div>
            {nameErr && (
              <p id="add-patient-name-err" role="alert" className="text-[12.5px] text-[var(--cq-danger)] mt-1">
                {nameErr}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="add-patient-phone">
              <MonoLabel>Teléfono *</MonoLabel>
            </label>
            <div className={`mt-1.5 flex items-center gap-2 h-11 px-3 rounded-[9px] border bg-[var(--cq-bg)] focus-within:border-[var(--cq-fg)] transition-colors ${phoneErr ? 'border-[var(--cq-danger)]' : 'border-[var(--cq-border)]'}`}>
              <input
                id="add-patient-phone"
                type="tel"
                value={phone}
                onChange={e => { setPhone(filterPhoneInput(e.target.value)); setPhoneErr(null); setFormErr(null); }}
                onBlur={e => { const v = e.target.value.trim(); if (v) { const err = validatePhone(v); if (err) setPhoneErr(err); } }}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="+598 99 123 456"
                maxLength={16}
                autoComplete="tel"
                aria-invalid={phoneErr ? 'true' : 'false'}
                aria-describedby={phoneErr ? 'add-patient-phone-err' : undefined}
                className="flex-1 bg-transparent outline-none text-[13.5px]"
              />
            </div>
            {phoneErr && (
              <p id="add-patient-phone-err" role="alert" className="text-[12.5px] text-[var(--cq-danger)] mt-1">
                {phoneErr}
              </p>
            )}
          </div>

          {formErr && (
            <p role="alert" className="text-[12.5px] text-[var(--cq-danger)] mt-1">{formErr}</p>
          )}
        </div>

        <div className="mt-6 flex items-center gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={saving}
            className="h-9 px-4 rounded-[8px] text-[13.5px] font-medium text-[var(--cq-fg-muted)] hover:bg-[var(--cq-surface-2)] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="h-9 px-4 rounded-[8px] bg-[var(--cq-fg)] text-[var(--cq-bg)] text-[13.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 inline-flex items-center gap-2"
          >
            {saving ? 'Guardando…' : 'Guardar paciente'}
          </button>
        </div>
      </div>
    </div>
  );
}
