import { useState, useEffect, useRef } from 'react';
import { Button, Icons, MonoLabel } from './ui';
import { updateAppointment } from '../lib/appointmentService';

const APPOINTMENT_TYPES = [
  'Control', 'Primera consulta', 'Seguimiento', 'Urgencia', 'Procedimiento', 'Laboratorio',
];

function toLocalDate(isoUtc) {
  const d = new Date(isoUtc);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toLocalTime(isoUtc) {
  const d = new Date(isoUtc);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function EditApptModal({ appt, onClose, onSuccess }) {
  const [date,         setDate]         = useState('');
  const [time,         setTime]         = useState('');
  const [type,         setType]         = useState('');
  const [professional, setProfessional] = useState('');
  const [notes,        setNotes]        = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!appt) return;
    setDate(toLocalDate(appt.appointment_datetime));
    setTime(toLocalTime(appt.appointment_datetime));
    setType(appt.appointment_type ?? '');
    setProfessional(appt.professional_name ?? '');
    setNotes(appt.notes ?? '');
    setError(null);
    setSubmitting(false);
  }, [appt]);

  useEffect(() => {
    if (!appt) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    containerRef.current?.querySelector('input,select,textarea,button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [appt, onClose]);

  if (!appt) return null;

  // Supports both v_today_appointments shape (patient_name) and Agenda shape (patients.full_name)
  const patientName = appt.patients?.full_name ?? appt.patient_name ?? '—';

  const handleSubmit = async () => {
    if (!date || !time) { setError('Completá la fecha y hora.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const datetime = new Date(`${date}T${time}:00`).toISOString();
      await updateAppointment(appt.id, { datetime, type, professionalName: professional, notes });
      onSuccess?.();
    } catch {
      setError('No se pudo guardar el turno. Intentá de nuevo.');
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-appt-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={containerRef}
        className="cq-modal-in relative w-full max-w-[480px] bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[16px] p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <MonoLabel>Editar turno</MonoLabel>
            <h3 id="edit-appt-title" className="mt-1 text-[20px] font-semibold tracking-tight truncate max-w-[320px]">
              {patientName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="size-10 rounded-[8px] hover:bg-[var(--cq-surface-2)] flex items-center justify-center"
            aria-label="Cerrar"
          >
            <Icons.Close size={15} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <MonoLabel>Fecha *</MonoLabel>
              <div className="mt-1.5 flex items-center gap-2 h-11 px-3 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-bg)] focus-within:border-[var(--cq-fg)]">
                <span className="text-[var(--cq-fg-muted)] shrink-0"><Icons.Calendar size={14} /></span>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="flex-1 bg-transparent outline-none text-[13.5px]" />
              </div>
            </label>
            <label className="block">
              <MonoLabel>Hora *</MonoLabel>
              <div className="mt-1.5 flex items-center h-11 px-3 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-bg)] focus-within:border-[var(--cq-fg)]">
                <input type="time" value={time} onChange={e => setTime(e.target.value)} className="flex-1 bg-transparent outline-none text-[13.5px]" />
              </div>
            </label>
          </div>

          <label className="block">
            <MonoLabel>Tipo de consulta</MonoLabel>
            <div className="mt-1.5 h-11 px-3 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-bg)] focus-within:border-[var(--cq-fg)] flex items-center">
              <select value={type} onChange={e => setType(e.target.value)} className="flex-1 bg-transparent outline-none text-[13.5px] cursor-pointer">
                <option value="">Seleccionar…</option>
                {APPOINTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </label>

          <label className="block">
            <MonoLabel>Profesional</MonoLabel>
            <div className="mt-1.5 flex items-center gap-2 h-11 px-3 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-bg)] focus-within:border-[var(--cq-fg)]">
              <input type="text" value={professional} onChange={e => setProfessional(e.target.value)} placeholder="Dr. / Dra. …" className="flex-1 bg-transparent outline-none text-[13.5px]" />
            </div>
          </label>

          <label className="block">
            <MonoLabel>Notas</MonoLabel>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones internas…" rows={2} className="mt-1.5 w-full px-3 py-2.5 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-bg)] focus:border-[var(--cq-fg)] outline-none text-[13.5px] resize-none" />
          </label>

          {error && <p role="alert" className="text-[13px] text-[var(--cq-danger)]">{error}</p>}
        </div>

        <div className="mt-5 flex items-center gap-2 justify-end">
          <Button variant="ghost" size="md" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button variant="primary" size="md" onClick={handleSubmit} disabled={submitting || !date || !time}>
            {submitting ? <SpinnerIcon /> : <Icons.Check size={14} />}
            {submitting ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}
