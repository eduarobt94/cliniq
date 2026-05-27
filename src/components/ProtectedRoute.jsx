import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { user, emailConfirmed, needsOnboarding, loading } = useAuth();
  const { pathname } = useLocation();

  // While session is hydrating, render nothing — prevents race-condition redirect to /login
  if (loading) return null;

  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(pathname)}`} replace />;
  if (emailConfirmed === false)                        return <Navigate to="/verify-email" replace />;
  if (needsOnboarding && pathname !== '/onboarding')  return <Navigate to="/onboarding"   replace />;

  return children;
}
