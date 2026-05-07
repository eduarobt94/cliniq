import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary }          from './components/ErrorBoundary';
import { DashboardErrorBoundary } from './components/DashboardErrorBoundary';
import { AuthProvider }           from './context/AuthContext';
import { ProtectedRoute }  from './components/ProtectedRoute';
import { Landing }         from './pages/Landing';
import { Login }           from './pages/Login';
import { Signup }          from './pages/Signup';
import { Onboarding }      from './pages/Onboarding';
import { ForgotPassword }  from './pages/ForgotPassword';
import { ResetPassword }   from './pages/ResetPassword';
import { VerifyEmail }     from './pages/VerifyEmail';
import { AuthCallback }    from './pages/AuthCallback';
import { AcceptInvite }    from './pages/AcceptInvite';
import { DashboardLayout } from './layouts/DashboardLayout';
import { Dashboard }       from './pages/Dashboard';
import { Agenda }          from './pages/Agenda';
import { Pacientes }       from './pages/Pacientes';
import { Automatizaciones }from './pages/Automatizaciones';
import { Inbox }           from './pages/Inbox';
import { Reportes }        from './pages/Reportes';
import { Configuracion }   from './pages/Configuracion';
import { ListaEspera }     from './pages/ListaEspera';
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
          <Route path="/accept-invite"       element={<AcceptInvite />} />

          {/* Onboarding */}
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

          {/* Dashboard — layout compartido con subrutas */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index                   element={<DashboardErrorBoundary><Dashboard /></DashboardErrorBoundary>} />
            <Route path="agenda"           element={<DashboardErrorBoundary><Agenda /></DashboardErrorBoundary>} />
            <Route path="pacientes"        element={<DashboardErrorBoundary><Pacientes /></DashboardErrorBoundary>} />
            <Route path="automatizaciones" element={<DashboardErrorBoundary><Automatizaciones /></DashboardErrorBoundary>} />
            <Route path="inbox"            element={<DashboardErrorBoundary><Inbox /></DashboardErrorBoundary>} />
            <Route path="reportes"         element={<DashboardErrorBoundary><Reportes /></DashboardErrorBoundary>} />
            <Route path="lista-espera"     element={<DashboardErrorBoundary><ListaEspera /></DashboardErrorBoundary>} />
            <Route path="configuracion"    element={<DashboardErrorBoundary><Configuracion /></DashboardErrorBoundary>} />
          </Route>

          {/* Fallback */}
          <Route path="/404" element={<NotFound />} />
          <Route path="*"    element={<Navigate to="/404" replace />} />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  );
}
