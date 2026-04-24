import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Página de aterrizaje para OAuth (Google) y recovery de contraseña.
// Supabase redirige acá con el token en la URL (#access_token=...).
// onAuthStateChange lo detecta automáticamente y actualiza el estado.
// Este componente solo espera a que el estado se estabilice y redirige.
export function AuthCallback() {
  const navigate = useNavigate();
  const { user, needsOnboarding, passwordRecoveryMode, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (passwordRecoveryMode) {
      navigate('/auth/reset-password', { replace: true });
      return;
    }

    if (user) {
      navigate(needsOnboarding ? '/onboarding' : '/dashboard', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [loading, user, needsOnboarding, passwordRecoveryMode, navigate]);

  return (
    <div className="min-h-screen bg-[var(--cq-bg)] flex items-center justify-center">
      <span className="w-6 h-6 border-2 border-[var(--cq-border)] border-t-[var(--cq-fg)] rounded-full animate-spin" />
    </div>
  );
}
