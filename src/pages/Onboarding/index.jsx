import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Icons, MonoLabel } from '../../components/ui';

// Pantalla de recuperación: el usuario existe en auth pero no tiene clínica.
// Ocurre si el signup falló justo después de crear el usuario.
// Guard: si ya tiene clínica, redirige al dashboard inmediatamente.
export function Onboarding() {
  const navigate      = useNavigate();
  const { createClinic, logout, user, clinic, networkError } = useAuth();

  const [clinicName,      setClinicName]      = useState('');
  const [saving,          setSaving]          = useState(false);
  const [clinicNameError, setClinicNameError] = useState('');
  const [formError,       setFormError]       = useState('');
  const [successMsg,      setSuccessMsg]      = useState('');

  // Guard: si ya tiene clínica, no mostrar esta pantalla
  useEffect(() => {
    if (clinic) navigate('/dashboard', { replace: true });
  }, [clinic, navigate]);

  const validateClinicName = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return 'El nombre de la clínica es obligatorio.';
    if (trimmed.length < 2) return 'El nombre debe tener al menos 2 caracteres.';
    if (trimmed.length > 100) return 'El nombre no puede superar los 100 caracteres.';
    return '';
  };

  const onClinicNameBlur = () => {
    setClinicNameError(validateClinicName(clinicName));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = clinicName.trim();
    const nameErr = validateClinicName(trimmedName);
    if (nameErr) {
      setClinicNameError(nameErr);
      return;
    }
    setClinicNameError('');
    setFormError('');
    setSaving(true);
    try {
      await createClinic(trimmedName);
      setSuccessMsg('¡Listo! Configurando tu clínica…');
      // navigate is triggered by the clinic guard via useEffect once createClinic resolves
      // but also navigate explicitly after a brief moment to ensure UX feedback
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (err) {
      setFormError('No se pudo crear la clínica. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (successMsg) {
    return (
      <main className="min-h-screen bg-[var(--cq-bg)] text-[var(--cq-fg)] flex items-center justify-center p-6">
        <div className="w-full max-w-[440px] text-center">
          <div className="size-14 rounded-full bg-[color-mix(in_oklch,var(--cq-success)_15%,transparent)] flex items-center justify-center mx-auto mb-6">
            <Icons.Check size={22} className="text-[var(--cq-success)]" />
          </div>
          <p className="text-[17px] font-medium">{successMsg}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--cq-bg)] text-[var(--cq-fg)] flex items-center justify-center p-6">
      <div className="w-full max-w-[440px]">
        <div className="flex items-center gap-2.5 mb-8">
          <Icons.Logo size={22} />
          <span className="text-[17px] font-semibold tracking-tight">Cliniq</span>
        </div>

        {networkError && (
          <div role="alert" className="mb-6 px-4 py-3 rounded-[10px] bg-[color-mix(in_oklch,var(--cq-warn)_12%,transparent)] text-[var(--cq-warn)] text-[13px] leading-relaxed border border-[color-mix(in_oklch,var(--cq-warn)_30%,transparent)]">
            <strong className="font-semibold">Sin conexión con el servidor.</strong> El proyecto de Supabase puede estar pausado.
            Entrá a <span className="font-mono">app.supabase.com</span> y hacé clic en <em>Restore project</em>.
          </div>
        )}

        <MonoLabel>[ Último paso ]</MonoLabel>
        <h1 className="mt-3 text-[30px] font-semibold tracking-tight leading-tight">
          Poné el nombre de tu clínica
        </h1>
        <p className="mt-2 text-[14px] text-[var(--cq-fg-muted)]">
          Tu cuenta fue creada. Solo falta esto para entrar al dashboard.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate aria-label="Configuración inicial de la clínica">
          <fieldset disabled={saving} className="contents">
            <div>
              <label htmlFor="onboarding-clinic-name" className="block font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--cq-fg-muted)] mb-1.5">
                Nombre de la clínica
              </label>
              <div className={`flex items-center gap-2 h-12 px-4 rounded-[10px] border bg-[var(--cq-surface)] focus-within:border-[var(--cq-fg)] transition-colors ${clinicNameError ? 'border-[var(--cq-danger)]' : 'border-[var(--cq-border)]'}`}>
                <Icons.Home size={16} className="text-[var(--cq-fg-muted)] shrink-0" />
                <input
                  id="onboarding-clinic-name"
                  type="text"
                  value={clinicName}
                  onChange={(e) => { setClinicName(e.target.value); if (clinicNameError) setClinicNameError(validateClinicName(e.target.value)); }}
                  onBlur={onClinicNameBlur}
                  placeholder="Nombre de tu clínica"
                  autoFocus
                  maxLength={100}
                  aria-invalid={clinicNameError ? 'true' : undefined}
                  aria-describedby={clinicNameError ? 'onboarding-clinic-name-error' : undefined}
                  className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-[var(--cq-fg-muted)]"
                />
              </div>
              {clinicNameError && (
                <p id="onboarding-clinic-name-error" role="alert" className="text-[12.5px] text-[var(--cq-danger)] mt-1">
                  {clinicNameError}
                </p>
              )}
              {!clinicNameError && (
                <p className="text-[12px] text-[var(--cq-fg-muted)] mt-0.5">Podés cambiarlo después.</p>
              )}
            </div>

            {formError && (
              <div role="alert" className="px-3 py-2 rounded-lg bg-[color-mix(in_oklch,var(--cq-danger)_12%,transparent)] text-[var(--cq-danger)] text-[13px] border border-[color-mix(in_oklch,var(--cq-danger)_30%,transparent)]">
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={clinicName.trim().length < 2 || saving}
              className="w-full h-12 rounded-[10px] bg-[var(--cq-fg)] text-[var(--cq-bg)] font-medium hover:bg-[var(--cq-accent)] disabled:opacity-50 transition-all inline-flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span className="size-4 border-2 border-[var(--cq-bg)]/40 border-t-[var(--cq-bg)] rounded-full animate-spin" />
                  Guardando…
                </>
              ) : (
                <>Entrar al dashboard <Icons.Arrow size={13} /></>
              )}
            </button>
          </fieldset>
        </form>

        <button
          onClick={logout}
          className="mt-6 w-full text-[13px] text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] text-center transition-colors cursor-pointer"
        >
          Cerrar sesión ({user?.email})
        </button>
      </div>
    </main>
  );
}
