import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary }   from './components/ErrorBoundary';
import { AuthProvider }    from './context/AuthContext';
import { ProtectedRoute }  from './components/ProtectedRoute';
import { Landing }         from './pages/Landing';
import { Login }           from './pages/Login';
import { Signup }          from './pages/Signup';
import { Onboarding }      from './pages/Onboarding';
import { ForgotPassword }  from './pages/ForgotPassword';
import { ResetPassword }   from './pages/ResetPassword';
import { VerifyEmail }     from './pages/VerifyEmail';
import { AuthCallback }    from './pages/AuthCallback';
import { Dashboard }       from './pages/Dashboard';
import { NotFound }        from './pages/NotFound';

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
          {/* Públicas */}
          <Route path="/"                    element={<Landing />} />
          <Route path="/login"               element={<Login />} />
          <Route path="/signup"              element={<Signup />} />
          <Route path="/forgot-password"     element={<ForgotPassword />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback"       element={<AuthCallback />} />
          <Route path="/verify-email"        element={<VerifyEmail />} />

          {/* Protegidas */}
          <Route path="/onboarding" element={
            <ProtectedRoute><Onboarding /></ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*"    element={<Navigate to="/404" replace />} />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  );
}
