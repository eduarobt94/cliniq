import { useState, useEffect, useRef } from 'react';
import { Button, Icons, MonoLabel } from './ui';
import { updateAppointment } from '../lib/appointmentService';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function currentTimeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

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
  const [fieldErrors,  setFieldErrors]  = useState({});
  const containerRef   = useRef(null);
  const submittingRef  = useRef(false);

  useEffect(() => {
    if (!appt) return;
    setDate(toLocalDate(appt.appointment_datetime));
    setTime(toLocalTime(appt.appointment_datetime));
    setType(appt.appointment_type ?? '');
    setProfessional(appt.professional_name ?? '');
    setNotes(appt.notes ?? '');
    setError(null);
    setFieldErrors({});
    setSubmitting(false);
    submittingRef.current = false;
  }, [appt]);

  useEffect(() => {
    if (!appt) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !containerRef.current) return;
      const focusable = Array.from(
        containerRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
        )
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    containerRef.current?.querySelector('input,select,textarea,button')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [appt, onClose]);

  if (!appt) return null;

  // Supports both v_today_appointments shape (patient_name) and Agenda shape (patients.full_name)
  const patientName = appt.patients?.full_name ?? appt.patient_name ?? '—';

  const handleSubmit = async () => {
    // Double-submit guard (ref-based, no 1-frame window)
    if (submittingRef.current) return;

    // Field-level validation
    const errs = {};
    if (!date)  errs.date = 'La fecha es obligatoria.';
    if (!time)  errs.time = 'El horario es obligatorio.';

    if (date && date < todayStr()) {
      errs.date = 'No podés agendar una cita en una fecha pasada.';
    }

    if (date && time && date === todayStr() && time < currentTimeStr()) {
      errs.time = 'La hora seleccionada ya pasó. Elegí un horario futuro.';
    }

    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    setFieldErrors({});
    setError(null);
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const datetime = new Date(`${date}T${time}:00`).toISOString();
      await updateAppointment(appt.id, {
        datetime,
        type,
        professionalName: professional,
        notes: notes.trim(),
      });
      onSuccess?.();
    } catch (err) {
      const msg = err?.message ?? '';
      if (msg.includes('23505') || msg.includes('unique') || msg.includes('duplicate')) {
        setError('Ya existe una cita en ese horario.');
      } else if (msg.includes('fetch') || msg.includes('network') || msg.includes('NetworkError')) {
        setError('Error de conexión. Verificá tu internet.');
      } else {
        setError('No se pudo guardar la cita. Intentá de nuevo.');
      }
    } finally {
      submittingRef.current = false;
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
      <div className="cq-backdrop-in absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
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
            aria-label="Cerrar modal"
          >
            <Icons.Close size={15} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block">
                <MonoLabel>Fecha *</MonoLabel>
                <div className={`mt-1.5 flex items-center gap-2 h-11 px-3 rounded-[9px] border bg-[var(--cq-bg)] focus-within:border-[var(--cq-fg)] ${fieldErrors.date ? 'border-[var(--cq-danger)]' : 'border-[var(--cq-border)]'}`}>
                  <span className="text-[var(--cq-fg-muted)] shrink-0"><Icons.Calendar size={14} /></span>
                  <input
                    type="date"
                    value={date}
                    min={todayStr()}
                    onChange={e => { setDate(e.target.value); setFieldErrors(prev => ({ ...prev, date: undefined })); }}
                    onBlur={() => {
                      if (!date) {
                        setFieldErrors(prev => ({ ...prev, date: 'La fecha es obligatoria.' }));
                      } else if (date < todayStr()) {
                        setFieldErrors(prev => ({ ...prev, date: 'No podés agendar en una fecha pasada.' }));
                      }
                    }}
                    className="flex-1 bg-transparent outline-none text-[13.5px]"
                  />
                </div>
              </label>
              {fieldErrors.date && (
                <p className="text-[12.5px] text-[var(--cq-danger)] mt-1">{fieldErrors.date}</p>
              )}
            </div>
            <div>
              <label className="block">
                <MonoLabel>Hora *</MonoLabel>
                <div className={`mt-1.5 flex items-center h-11 px-3 rounded-[9px] border bg-[var(--cq-bg)] focus-within:border-[var(--cq-fg)] ${fieldErrors.time ? 'border-[var(--cq-danger)]' : 'border-[var(--cq-border)]'}`}>
                  <input
                    type="time"
                    value={time}
                    onChange={e => { setTime(e.target.value); setFieldErrors(prev => ({ ...prev, time: undefined })); }}
                    onBlur={() => {
                      if (!time) {
                        setFieldErrors(prev => ({ ...prev, time: 'El horario es obligatorio.' }));
                      }
                    }}
                    className="flex-1 bg-transparent outline-none text-[13.5px]"
                  />
                </div>
              </label>
              {fieldErrors.time && (
                <p className="text-[12.5px] text-[var(--cq-danger)] mt-1">{fieldErrors.time}</p>
              )}
            </div>
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
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notas adicionales sobre la cita (opcional)"
              rows={3}
              maxLength={500}
              className="mt-1.5 w-full px-3 py-2.5 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-bg)] focus:border-[var(--cq-fg)] outline-none text-[13.5px] resize-none"
            />
          </label>

          {error && <p role="alert" className="text-[13px] text-[var(--cq-danger)]">{error}</p>}
        </div>

        <div className="mt-5 flex items-center gap-2 justify-end">
          <Button variant="ghost" size="md" onClick={onClose} disabled={submitting}>Cancelar</Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={submitting}
            title={!date ? 'Seleccioná una fecha' : !time ? 'Seleccioná un horario' : ''}
          >
            {submitting ? <SpinnerIcon /> : <Icons.Check size={14} />}
            {submitting ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}
