import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { user, emailConfirmed, needsOnboarding } = useAuth();
  const { pathname } = useLocation();

  if (!user)                                          return <Navigate to="/login"        replace />;
  if (emailConfirmed === false)                        return <Navigate to="/verify-email" replace />;
  if (needsOnboarding && pathname !== '/onboarding')  return <Navigate to="/onboarding"   replace />;

  return children;
}
