import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { user, emailConfirmed, needsOnboarding } = useAuth();

  if (!user)                    return <Navigate to="/login"        replace />;
  if (emailConfirmed === false)  return <Navigate to="/verify-email" replace />;
  if (needsOnboarding)          return <Navigate to="/onboarding"   replace />;

  return children;
}
