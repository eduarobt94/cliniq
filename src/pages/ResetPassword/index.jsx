import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Icons, MonoLabel } from '../../components/ui';

export function ResetPassword() {
  const navigate = useNavigate();
  const { passwordRecoveryMode, updatePassword } = useAuth();

  const [password,  setPassword]  = useState('');
  const [password2, setPassword2] = useState('');
  const [showPwd,   setShowPwd]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState(false);

  // Inline field-level errors
  const [pwdError,  setPwdError]  = useState('');
  const [pwd2Error, setPwd2Error] = useState('');

  // Si no hay sesión de recovery Y no acabamos de guardar, redirigir al login
  useEffect(() => {
    if (!passwordRecoveryMode && !success) {
      navigate('/login', { replace: true });
    }
  }, [passwordRecoveryMode, success, navigate]);

  // Redirect after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => navigate('/login', { replace: true }), 2000);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  // Validation helpers (uses trimmed length for whitespace check)
  const validatePassword = (val) => {
    if (val.length === 0) return 'La contraseña es obligatoria.';
    if (val.trim().length === 0) return 'La contraseña no puede ser solo espacios en blanco.';
    if (val.trim().length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
    return '';
  };

  const passwordValid = password.trim().length >= 6;
  const passwordMatch = password === password2 && password2.length > 0;

  // Blur handlers
  const onPwdBlur = () => {
    setPwdError(validatePassword(password));
  };

  const onPwd2Blur = () => {
    if (password2.length > 0 && password !== password2) {
      setPwd2Error('Las contraseñas no coinciden.');
    } else {
      setPwd2Error('');
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    // Run all validations on submit
    const pwdErr = validatePassword(password);
    let pwd2Err = '';
    if (password2.length === 0) {
      pwd2Err = 'La contraseña es obligatoria.';
    } else if (password !== password2) {
      pwd2Err = 'Las contraseñas no coinciden.';
    }

    setPwdError(pwdErr);
    setPwd2Error(pwd2Err);

    if (pwdErr || pwd2Err) return;

    setSaving(true);
    setError('');
    try {
      setSuccess(true); // Previene redirect a /login cuando passwordRecoveryMode se limpia
      await updatePassword(password); // send untrimmed — user may intentionally have spaces
    } catch (err) {
      setSuccess(false);
      const msg = err?.message ?? '';
      if (msg.includes('expired') || msg.includes('invalid') || msg.includes('token')) {
        setError('El link de recuperación expiró. Solicitá uno nuevo.');
      } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('NetworkError')) {
        setError('Error de conexión. Verificá tu internet.');
      } else {
        setError('No se pudo actualizar la contraseña. Intentá de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-[var(--cq-bg)] text-[var(--cq-fg)] flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] text-center space-y-4">
          <div className="flex items-center justify-center gap-2.5 mb-8">
            <Icons.Logo size={22} />
            <span className="text-[17px] font-semibold tracking-tight">Cliniq</span>
          </div>
          <div
            role="status"
            className="px-4 py-5 rounded-[10px] bg-[color-mix(in_oklch,var(--cq-success)_12%,transparent)] border border-[color-mix(in_oklch,var(--cq-success)_30%,transparent)] text-[var(--cq-success)] text-[14px]"
          >
            ¡Contraseña actualizada! Redirigiendo al inicio de sesión…
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--cq-bg)] text-[var(--cq-fg)] flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center gap-2.5 mb-8">
          <Icons.Logo size={22} />
          <span className="text-[17px] font-semibold tracking-tight">Cliniq</span>
        </div>

        <MonoLabel>[ Nueva contraseña ]</MonoLabel>
        <h1 className="mt-3 text-[30px] font-semibold tracking-tight leading-tight">
          Crear nueva contraseña
        </h1>
        <p className="mt-2 text-[14px] text-[var(--cq-fg-muted)]">
          Elegí una contraseña segura para tu cuenta.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate aria-label="Formulario de nueva contraseña">
          <fieldset disabled={saving} className="contents">
            {/* Nueva contraseña */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="new-password"
                className="flex items-center justify-between"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--cq-fg-muted)]">
                  Nueva contraseña
                </span>
                {password.length > 0 && !passwordValid && !pwdError && (
                  <span className="text-[11px] text-[var(--cq-danger)]">Mínimo 6 caracteres</span>
                )}
              </label>
              <div className={`flex items-center gap-2 h-12 px-4 rounded-[10px] border bg-[var(--cq-surface)] transition-all focus-within:border-[var(--cq-success)] focus-within:ring-1 focus-within:ring-[var(--cq-success)] ${
                pwdError ? 'border-[var(--cq-danger)]' : 'border-[var(--cq-border)]'
              }`}>
                <Icons.Lock size={15} className="text-[var(--cq-fg-muted)] shrink-0" />
                <input
                  id="new-password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  maxLength={72}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (pwdError) setPwdError('');
                  }}
                  onBlur={onPwdBlur}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  autoFocus
                  aria-invalid={pwdError ? 'true' : undefined}
                  aria-describedby={pwdError ? 'new-password-error' : undefined}
                  className="flex-1 bg-transparent outline-none text-[14.5px] placeholder:text-[var(--cq-fg-muted)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)]"
                  aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPwd}
                >
                  <Icons.Eye size={15} open={!showPwd} />
                </button>
              </div>
              {pwdError && (
                <p id="new-password-error" className="text-[12.5px] text-[var(--cq-danger)] mt-1">
                  {pwdError}
                </p>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div className="flex flex-col gap-1">
              <label
                htmlFor="confirm-password"
                className="flex items-center justify-between"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--cq-fg-muted)]">
                  Repetir contraseña
                </span>
                {password2.length > 0 && !passwordMatch && !pwd2Error && (
                  <span className="text-[11px] text-[var(--cq-danger)]">No coinciden</span>
                )}
              </label>
              <div className={`flex items-center gap-2 h-12 px-4 rounded-[10px] border bg-[var(--cq-surface)] transition-all focus-within:border-[var(--cq-success)] focus-within:ring-1 focus-within:ring-[var(--cq-success)] ${
                pwd2Error ? 'border-[var(--cq-danger)]' : passwordMatch ? 'border-[var(--cq-fg)]' : 'border-[var(--cq-border)]'
              }`}>
                <Icons.Lock size={15} className="text-[var(--cq-fg-muted)] shrink-0" />
                <input
                  id="confirm-password"
                  type={showPwd ? 'text' : 'password'}
                  value={password2}
                  maxLength={72}
                  onChange={(e) => {
                    setPassword2(e.target.value);
                    if (pwd2Error) setPwd2Error('');
                  }}
                  onBlur={onPwd2Blur}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-invalid={pwd2Error ? 'true' : undefined}
                  aria-describedby={pwd2Error ? 'confirm-password-error' : undefined}
                  className="flex-1 bg-transparent outline-none text-[14.5px] placeholder:text-[var(--cq-fg-muted)]"
                />
                {passwordMatch && (
                  <Icons.Check size={14} className="text-[var(--cq-success)] shrink-0" />
                )}
              </div>
              {pwd2Error && (
                <p id="confirm-password-error" className="text-[12.5px] text-[var(--cq-danger)] mt-1">
                  {pwd2Error}
                </p>
              )}
            </div>

            {error && (
              <div role="alert" className="px-3 py-2 rounded-lg bg-[color-mix(in_oklch,var(--cq-danger)_12%,transparent)] text-[var(--cq-danger)] text-[13px] border border-[color-mix(in_oklch,var(--cq-danger)_30%,transparent)]">
                {error}{' '}
                {error.includes('expiró') && (
                  <Link to="/forgot-password" className="underline font-medium">
                    Pedir nuevo link
                  </Link>
                )}
              </div>
            )}

            <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full h-12 rounded-[10px] bg-[var(--cq-fg)] text-[var(--cq-bg)] font-medium hover:bg-[var(--cq-accent)] disabled:opacity-50 transition-all active:scale-[0.99] inline-flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span className="size-4 border-2 border-[var(--cq-bg)]/40 border-t-[var(--cq-bg)] rounded-full animate-spin" />
                  Guardando…
                </>
              ) : (
                <>Guardar contraseña <Icons.Arrow size={13} /></>
              )}
            </button>
            </div>
          </fieldset>
        </form>
      </div>
    </main>
  );
}
