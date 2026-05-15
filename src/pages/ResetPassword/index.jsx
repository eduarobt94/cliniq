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
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  // Si no hay sesión de recovery, redirigir al login
  useEffect(() => {
    if (!passwordRecoveryMode) {
      navigate('/login', { replace: true });
    }
  }, [passwordRecoveryMode, navigate]);

  const passwordValid = password.length >= 6;
  const passwordMatch = password === password2 && password2.length > 0;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!passwordValid || !passwordMatch) return;
    setLoading(true);
    setError('');
    try {
      await updatePassword(password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(
        err.message.includes('expired') || err.message.includes('invalid')
          ? 'El link expiró. Pedí uno nuevo desde el login.'
          : 'No se pudo actualizar la contraseña. Intentá de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

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

        <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
          <fieldset disabled={loading} className="contents">
            {/* Nueva contraseña */}
            <div className="flex flex-col gap-1">
              <label className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--cq-fg-muted)]">
                  Nueva contraseña
                </span>
                {password.length > 0 && !passwordValid && (
                  <span className="text-[11px] text-[var(--cq-danger)]">Mínimo 6 caracteres</span>
                )}
              </label>
              <div className={`flex items-center gap-2 h-12 px-4 rounded-[10px] border bg-[var(--cq-surface)] transition-all focus-within:border-[var(--cq-success)] focus-within:ring-1 focus-within:ring-[var(--cq-success)] ${
                password.length > 0 && !passwordValid ? 'border-[var(--cq-danger)]' : 'border-[var(--cq-border)]'
              }`}>
                <Icons.Lock size={15} className="text-[var(--cq-fg-muted)] shrink-0" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="flex-1 bg-transparent outline-none text-[14.5px] placeholder:text-[var(--cq-fg-muted)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)]"
                  aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <Icons.Eye size={15} open={!showPwd} />
                </button>
              </div>
            </div>

            {/* Confirmar contraseña */}
            <div className="flex flex-col gap-1">
              <label className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--cq-fg-muted)]">
                  Repetir contraseña
                </span>
                {password2.length > 0 && !passwordMatch && (
                  <span className="text-[11px] text-[var(--cq-danger)]">No coinciden</span>
                )}
              </label>
              <div className={`flex items-center gap-2 h-12 px-4 rounded-[10px] border bg-[var(--cq-surface)] transition-all focus-within:border-[var(--cq-success)] focus-within:ring-1 focus-within:ring-[var(--cq-success)] ${
                password2.length > 0 && !passwordMatch ? 'border-[var(--cq-danger)]' : passwordMatch ? 'border-[var(--cq-fg)]' : 'border-[var(--cq-border)]'
              }`}>
                <Icons.Lock size={15} className="text-[var(--cq-fg-muted)] shrink-0" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="flex-1 bg-transparent outline-none text-[14.5px] placeholder:text-[var(--cq-fg-muted)]"
                />
                {passwordMatch && (
                  <Icons.Check size={14} className="text-[var(--cq-success)] shrink-0" />
                )}
              </div>
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
              disabled={!passwordValid || !passwordMatch || loading}
              className="w-full h-12 rounded-[10px] bg-[var(--cq-fg)] text-[var(--cq-bg)] font-medium hover:bg-[var(--cq-accent)] disabled:opacity-50 transition-all active:scale-[0.99] inline-flex items-center justify-center gap-2"
            >
              {loading ? (
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
