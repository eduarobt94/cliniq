import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Página de aterrizaje para OAuth (Google) y recovery de contraseña.
// Supabase redirige acá con el token en la URL (#access_token=...).
// No navega hasta que el usuario esté confirmado o expire el timeout.
export function AuthCallback() {
  const navigate = useNavigate();
  const { user, needsOnboarding, passwordRecoveryMode } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  // Dar hasta 10s para que Supabase procese el token OAuth antes de rendirse
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 10000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // Esperar a que llegue el usuario o que expire el timeout
    if (!user && !timedOut) return;

    if (passwordRecoveryMode) {
      navigate('/auth/reset-password', { replace: true });
      return;
    }

    if (user) {
      navigate(needsOnboarding ? '/onboarding' : '/dashboard', { replace: true });
      return;
    }

    // Timeout sin usuario → OAuth falló
    navigate('/login', { replace: true });
  }, [user, needsOnboarding, passwordRecoveryMode, navigate, timedOut]);

  return (
    <div className="min-h-screen bg-[var(--cq-bg)] flex flex-col items-center justify-center gap-3">
      <span className="w-6 h-6 border-2 border-[var(--cq-border)] border-t-[var(--cq-fg)] rounded-full animate-spin" />
      <p className="text-[13px] text-[var(--cq-fg-muted)]">Conectando con Google…</p>
    </div>
  );
}
