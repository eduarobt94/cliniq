import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Icons } from '../../components/ui';

export function AuthCallback() {
  const navigate = useNavigate();
  const { user, needsOnboarding, passwordRecoveryMode } = useAuth();

  // Detectar error en query params (Supabase redirige con ?error=... cuando falla OAuth)
  const params = new URLSearchParams(window.location.search);
  const oauthError = params.get('error');
  const oauthErrorDesc = params.get('error_description');

  // Fallback: si pasados 10s no hay sesión, redirigir al login
  useEffect(() => {
    if (oauthError) return;
    const t = setTimeout(() => {
      navigate('/login', { replace: true });
    }, 10000);
    return () => clearTimeout(t);
  }, [oauthError, navigate]);

  useEffect(() => {
    if (oauthError) return;
    if (!user) return;

    if (passwordRecoveryMode) {
      navigate('/auth/reset-password', { replace: true });
      return;
    }

    navigate(needsOnboarding ? '/onboarding' : '/dashboard', { replace: true });
  }, [user, needsOnboarding, passwordRecoveryMode, navigate, oauthError]);

  // Error de OAuth (credenciales mal configuradas, secret incorrecto, etc.)
  if (oauthError) {
    return (
      <main className="min-h-screen bg-[var(--cq-bg)] text-[var(--cq-fg)] flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] text-center">
          <div className="size-14 rounded-full bg-[color-mix(in_oklch,var(--cq-danger)_12%,transparent)] flex items-center justify-center mx-auto mb-6">
            <Icons.Alert size={22} className="text-[var(--cq-danger)]" />
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            Error al conectar con Google
          </h1>
          <p className="mt-2 text-[14px] text-[var(--cq-fg-muted)] leading-relaxed">
            {oauthError === 'server_error'
              ? 'El servidor no pudo verificar tu cuenta de Google. Puede ser un problema de configuración.'
              : oauthErrorDesc?.replace(/\+/g, ' ') ?? 'Error desconocido.'}
          </p>
          {oauthError === 'server_error' && (
            <p className="mt-2 text-[12px] text-[var(--cq-fg-muted)] font-mono">
              {oauthErrorDesc?.replace(/\+/g, ' ')}
            </p>
          )}
          <div className="mt-8 space-y-3">
            <Link
              to="/login"
              className="block w-full h-11 rounded-[10px] bg-[var(--cq-fg)] text-[var(--cq-bg)] text-[14px] font-medium hover:bg-[var(--cq-accent)] transition-all inline-flex items-center justify-center"
            >
              Volver al login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--cq-bg)] flex flex-col items-center justify-center gap-3">
      <span className="size-6 border-2 border-[var(--cq-border)] border-t-[var(--cq-fg)] rounded-full animate-spin" />
      <p className="text-[13px] text-[var(--cq-fg-muted)]">Conectando con Google…</p>
    </div>
  );
}
