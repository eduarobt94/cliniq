import { useState, useEffect, useRef, useCallback } from 'react';
import { Icons, Button, MonoLabel } from '../../components/ui';
import { DatePicker, TimePicker } from '../../components/ui/DateTimePicker';
import { searchPatients, createPatient, createAppointment } from '../../lib/appointmentService';
import { isValidPhone, filterPhoneInput } from '../../lib/phoneUtils';
import { useClinicSchedule } from '../../hooks/useClinicSchedule';
import { isDatetimeAllowed, getScheduleError, getScheduleWarning } from '../../lib/scheduleUtils';
import { supabase } from '../../lib/supabase';

const APPOINTMENT_TYPES = [
  'Control',
  'Primera consulta',
  'Seguimiento',
  'Urgencia',
  'Procedimiento',
  'Laboratorio',
];

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Round up to the nearest 15-minute slot */
function nowRounded15() {
  const d = new Date();
  const m = Math.ceil(d.getMinutes() / 15) * 15;
  const h = m === 60 ? d.getHours() + 1 : d.getHours();
  const mm = m === 60 ? 0 : m;
  return `${String(h % 24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function WarnBanner({ children }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 text-[12.5px] rounded-[8px] px-3 py-2"
      style={{
        color:      'var(--cq-warn)',
        background: 'color-mix(in oklch, var(--cq-warn) 10%, transparent)',
        border:     '1px solid color-mix(in oklch, var(--cq-warn) 28%, transparent)',
      }}
    >
      <Icons.Alert size={13} style={{ marginTop: 1, flexShrink: 0 }} />
      {children}
    </div>
  );
}

export function NewAppointmentModal({ open, onClose, clinicId, defaultDate, onSuccess, express = false }) {
  const containerRef = useRef(null);

  const [query,          setQuery]          = useState('');
  const [results,        setResults]        = useState([]);
  const [searching,      setSearching]      = useState(false);
  const [showDropdown,   setShowDropdown]   = useState(false);
  const [selectedPatient,setSelectedPatient]= useState(null);
  const [creatingPatient,setCreatingPatient]= useState(false);
  const [newPhone,       setNewPhone]       = useState('');

  const [date,           setDate]           = useState('');
  const [time,           setTime]           = useState('09:00');
  const [type,           setType]           = useState('');
  const [professional,   setProfessional]   = useState('');
  const [notes,          setNotes]          = useState('');
  const [showExtras,     setShowExtras]     = useState(false);

  const [submitting,     setSubmitting]     = useState(false);
  const [success,        setSuccess]        = useState(false);
  const [error,          setError]          = useState(null);

  const { schedule, closures } = useClinicSchedule(clinicId);

  const [slotConflicts, setSlotConflicts] = useState(0);
  const debouncedDate = useDebounce(date, 300);
  const debouncedTime = useDebounce(time, 300);

  useEffect(() => {
    if (!clinicId || !debouncedDate || !debouncedTime) { setSlotConflicts(0); return; }
    let cancelled = false;
    const datetime = `${debouncedDate}T${debouncedTime}:00`;
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('appointment_datetime', new Date(datetime).toISOString())
      .not('status', 'eq', 'cancelled')
      .then(({ count }) => { if (!cancelled) setSlotConflicts(count ?? 0); });
    return () => { cancelled = true; };
  }, [clinicId, debouncedDate, debouncedTime]);

  const debouncedQuery = useDebounce(query, 280);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    setSelectedPatient(null);
    setCreatingPatient(false);
    setNewPhone('');
    setDate(defaultDate ?? todayISO());
    setTime(express ? nowRounded15() : '09:00');
    setType('');
    setProfessional('');
    setNotes('');
    setShowExtras(false);
    setSubmitting(false);
    setSuccess(false);
    setError(null);
    setSlotConflicts(0);
  }, [open, defaultDate, express]);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2 || !clinicId || selectedPatient) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    searchPatients(clinicId, debouncedQuery)
      .then(data => {
        if (!cancelled) { setResults(data); setShowDropdown(true); setSearching(false); }
      })
      .catch(() => { if (!cancelled) setSearching(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery, clinicId, selectedPatient]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const firstFocusable = containerRef.current?.querySelector(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleKeyDown = (e) => {
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

  const handleSelectPatient = useCallback((patient) => {
    setSelectedPatient(patient);
    setQuery(patient.full_name);
    setShowDropdown(false);
    setCreatingPatient(false);
  }, []);

  const handleCreateNew = useCallback(() => {
    setCreatingPatient(true);
    setShowDropdown(false);
    setSelectedPatient(null);
  }, []);

  const handleClearPatient = useCallback(() => {
    setSelectedPatient(null);
    setCreatingPatient(false);
    setQuery('');
    setNewPhone('');
  }, []);

  const handleSubmit = async () => {
    if (!clinicId) return;
    setError(null);

    if (!query.trim()) {
      setError('Ingresá el nombre del paciente.');
      return;
    }
    if (!date || !time) {
      setError('Completá la fecha y hora del turno.');
      return;
    }

    setSubmitting(true);
    try {
      let patientId = selectedPatient?.id;

      if (creatingPatient) {
        if (!newPhone.trim()) {
          setError('El teléfono es requerido para crear un paciente.');
          setSubmitting(false);
          return;
        }
        if (!isValidPhone(newPhone)) {
          setError('El teléfono debe estar en formato internacional: +598XXXXXXXX');
          setSubmitting(false);
          return;
        }
        const created = await createPatient(clinicId, query, newPhone);
        patientId = created.id;
      }

      if (!patientId) {
        setError('Seleccioná un paciente de la lista o creá uno nuevo.');
        setSubmitting(false);
        return;
      }

      const datetime = new Date(`${date}T${time}:00`).toISOString();
      await createAppointment(clinicId, {
        patientId, datetime, type, professionalName: professional, notes,
        status: express ? 'confirmed' : 'new',
      });

      onSuccess?.();
      setSuccess(true);
      setTimeout(onClose, 1400);
    } catch (err) {
      const msg = err?.message ?? '';
      if (msg.includes('23505') || msg.includes('unique') || msg.includes('duplicate')) {
        if (msg.includes('phone')) {
          setError('Ya existe un paciente con ese número de teléfono.');
        } else {
          setError('Ya hay un turno en ese horario para este paciente.');
        }
      } else {
        setError('No se pudo guardar el turno. Intentá de nuevo.');
      }
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const scheduleCheck = (date && time && schedule)
    ? isDatetimeAllowed(`${date}T${time}`, schedule, closures)
    : { allowed: true };
  const scheduleError   = getScheduleError(scheduleCheck);
  const scheduleWarning = getScheduleWarning(scheduleCheck);

  const canSubmit = !submitting && date && time && !scheduleError &&
    (selectedPatient || (creatingPatient && query.trim() && newPhone.trim()));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-appt-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={containerRef}
        className="relative w-full max-w-[520px] bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[16px] p-6 max-h-[90vh] overflow-y-auto"
        style={{ animation: 'cqModalIn 220ms cubic-bezier(.2,.7,.2,1)' }}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <MonoLabel>{express ? 'Turno express' : 'Nuevo turno'}</MonoLabel>
            <h3 id="new-appt-title" className="mt-1 text-[22px] font-semibold tracking-tight">
              {express ? 'Confirmar al instante' : 'Agendar paciente'}
            </h3>
            {express && (
              <p className="text-[12.5px] text-[var(--cq-fg-muted)] mt-0.5">
                El turno queda confirmado directamente, sin pasar por pendiente.
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-[8px] hover:bg-[var(--cq-surface-2)] flex items-center justify-center"
            aria-label="Cerrar"
          >
            <Icons.Close size={16} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-14 h-14 rounded-full bg-[var(--cq-success)]/15 flex items-center justify-center">
              <Icons.Check size={28} />
            </div>
            <p className="text-[15px] font-medium">Turno agendado</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {/* Patient search */}
              <div>
                <label className="block">
                  <MonoLabel>Paciente *</MonoLabel>
                  <div className="relative mt-1.5">
                    <div className={`flex items-center gap-2 h-11 px-3 rounded-[9px] border bg-[var(--cq-bg)] transition-colors focus-within:border-[var(--cq-fg)] ${
                      selectedPatient ? 'border-[var(--cq-success)]' : 'border-[var(--cq-border)]'
                    }`}>
                      <span className="text-[var(--cq-fg-muted)] shrink-0">
                        {searching ? <SpinnerIcon /> : <Icons.Users size={14} />}
                      </span>
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                          setQuery(e.target.value);
                          if (selectedPatient) setSelectedPatient(null);
                        }}
                        placeholder="Buscar por nombre…"
                        disabled={!!selectedPatient}
                        className="flex-1 bg-transparent outline-none text-[13.5px] disabled:opacity-60"
                      />
                      {(selectedPatient || creatingPatient) && (
                        <button
                          type="button"
                          onClick={handleClearPatient}
                          className="text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] p-0.5 shrink-0"
                          aria-label="Limpiar paciente"
                        >
                          <Icons.Close size={12} />
                        </button>
                      )}
                    </div>

                    {showDropdown && (
                      <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[10px] shadow-lg overflow-hidden">
                        {results.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectPatient(p)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--cq-surface-2)] transition-colors"
                          >
                            <span className="text-[13.5px] font-medium">{p.full_name}</span>
                            <span className="text-[12px] text-[var(--cq-fg-muted)] ml-auto shrink-0">{p.phone_number}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={handleCreateNew}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-left border-t border-[var(--cq-border)] hover:bg-[var(--cq-surface-2)] transition-colors text-[var(--cq-accent)]"
                        >
                          <Icons.Plus size={13} />
                          <span className="text-[13px] font-medium">Crear &ldquo;{query}&rdquo;</span>
                        </button>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* New patient phone */}
              {creatingPatient && (
                <div>
                  <label className="block">
                    <MonoLabel>Teléfono (nuevo paciente) *</MonoLabel>
                    <div className="mt-1.5 flex items-center gap-2 h-11 px-3 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-bg)] focus-within:border-[var(--cq-fg)]">
                      <input
                        type="tel"
                        value={newPhone}
                        onChange={(e) => setNewPhone(filterPhoneInput(e.target.value))}
                        placeholder="+59899123456"
                        className="flex-1 bg-transparent outline-none text-[13.5px]"
                        autoComplete="tel"
                      />
                    </div>
                  </label>
                </div>
              )}

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <MonoLabel className="block mb-1.5">Fecha *</MonoLabel>
                  <DatePicker
                    value={date}
                    onChange={setDate}
                    min={new Date().toISOString().slice(0, 10)}
                    schedule={schedule}
                    closures={closures}
                  />
                </div>
                <div>
                  <MonoLabel className="block mb-1.5">Hora *</MonoLabel>
                  <TimePicker value={time} onChange={setTime} />
                </div>
              </div>

              {/* Optional fields — collapsed in express mode */}
              {express && (
                <button
                  type="button"
                  onClick={() => setShowExtras(v => !v)}
                  className="flex items-center gap-1.5 text-[12.5px] text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: showExtras ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms' }}>
                    <path d="M4 2.5L7.5 6L4 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {showExtras ? 'Ocultar opciones' : 'Más opciones (tipo, profesional, notas)'}
                </button>
              )}

              {(!express || showExtras) && (
                <>
                  {/* Type */}
                  <div>
                    <label className="block">
                      <MonoLabel>Tipo de consulta</MonoLabel>
                      <div className="mt-1.5 h-11 px-3 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-bg)] focus-within:border-[var(--cq-fg)] flex items-center">
                        <select
                          value={type}
                          onChange={(e) => setType(e.target.value)}
                          className="flex-1 bg-transparent outline-none text-[13.5px] cursor-pointer"
                        >
                          <option value="">Seleccionar…</option>
                          {APPOINTMENT_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </label>
                  </div>

                  {/* Professional */}
                  <div>
                    <label className="block">
                      <MonoLabel>Profesional</MonoLabel>
                      <div className="mt-1.5 flex items-center gap-2 h-11 px-3 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-bg)] focus-within:border-[var(--cq-fg)]">
                        <input
                          type="text"
                          value={professional}
                          onChange={(e) => setProfessional(e.target.value)}
                          placeholder="Dr. / Dra. …"
                          className="flex-1 bg-transparent outline-none text-[13.5px]"
                        />
                      </div>
                    </label>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block">
                      <MonoLabel>Notas</MonoLabel>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Observaciones internas…"
                        rows={2}
                        className="mt-1.5 w-full px-3 py-2.5 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-bg)] focus:border-[var(--cq-fg)] outline-none text-[13.5px] resize-none"
                      />
                    </label>
                  </div>
                </>
              )}

              {slotConflicts > 0 && (
                <WarnBanner>
                  Ya hay {slotConflicts === 1 ? '1 turno' : `${slotConflicts} turnos`} a esa hora. Verificá que no haya superposición.
                </WarnBanner>
              )}
              {scheduleWarning && <WarnBanner>{scheduleWarning}</WarnBanner>}
              {scheduleError && (
                <div role="alert" className="flex items-start gap-2 text-[12.5px] rounded-[8px] px-3 py-2" style={{ color: 'var(--cq-danger)', background: 'color-mix(in oklch, var(--cq-danger) 8%, transparent)', border: '1px solid color-mix(in oklch, var(--cq-danger) 22%, transparent)' }}>
                  <Icons.Alert size={13} style={{ marginTop: 1, flexShrink: 0 }} />
                  {scheduleError}
                </div>
              )}
              {error && (
                <p role="alert" className="text-[13px] text-[var(--cq-danger)]">{error}</p>
              )}
            </div>

            <div className="mt-6 flex items-center gap-2 justify-end">
              <Button variant="ghost" size="md" onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                {submitting ? <SpinnerIcon /> : express ? <Icons.Zap size={14} /> : <Icons.Calendar size={14} />}
                {submitting ? 'Agendando…' : express ? 'Confirmar turno' : 'Agendar'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
