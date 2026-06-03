import { lazy, Suspense }           from 'react';
import { Routes, Route, Navigate }  from 'react-router-dom';
import { ErrorBoundary }            from './components/ErrorBoundary';
import { DashboardErrorBoundary }   from './components/DashboardErrorBoundary';
import { AuthProvider }             from './context/AuthContext';
import { ProtectedRoute }           from './components/ProtectedRoute';
import { DashboardLayout }          from './layouts/DashboardLayout';

const Landing          = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const Login            = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Signup           = lazy(() => import('./pages/Signup').then(m => ({ default: m.Signup })));
const Onboarding       = lazy(() => import('./pages/Onboarding').then(m => ({ default: m.Onboarding })));
const ForgotPassword   = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword    = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const VerifyEmail      = lazy(() => import('./pages/VerifyEmail').then(m => ({ default: m.VerifyEmail })));
const AuthCallback     = lazy(() => import('./pages/AuthCallback').then(m => ({ default: m.AuthCallback })));
const AcceptInvite     = lazy(() => import('./pages/AcceptInvite').then(m => ({ default: m.AcceptInvite })));
const Dashboard        = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Agenda           = lazy(() => import('./pages/Agenda').then(m => ({ default: m.Agenda })));
const Pacientes        = lazy(() => import('./pages/Pacientes').then(m => ({ default: m.Pacientes })));
const Automatizaciones = lazy(() => import('./pages/Automatizaciones').then(m => ({ default: m.Automatizaciones })));
const Inbox            = lazy(() => import('./pages/Inbox').then(m => ({ default: m.Inbox })));
const Reportes         = lazy(() => import('./pages/Reportes').then(m => ({ default: m.Reportes })));
const Configuracion    = lazy(() => import('./pages/Configuracion').then(m => ({ default: m.Configuracion })));
const ListaEspera      = lazy(() => import('./pages/ListaEspera').then(m => ({ default: m.ListaEspera })));
const NotFound         = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

const SuspenseFallback = (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
    <span>Cargando...</span>
  </div>
);

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Suspense fallback={SuspenseFallback}>
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
        </Suspense>
      </AuthProvider>
    </ErrorBoundary>
  );
}
