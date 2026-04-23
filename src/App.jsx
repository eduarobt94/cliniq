import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary }  from './components/ErrorBoundary';
import { AuthProvider }   from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Landing }        from './pages/Landing';
import { Login }          from './pages/Login';
import { Signup }         from './pages/Signup';
import { Onboarding }     from './pages/Onboarding';
import { Dashboard }      from './pages/Dashboard';
import { NotFound }       from './pages/NotFound';

export function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
          <Route path="/"            element={<Landing />} />
          <Route path="/login"       element={<Login />} />
          <Route path="/signup"      element={<Signup />} />
          <Route path="/onboarding"  element={<Onboarding />} />
          <Route path="/dashboard"   element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/404"         element={<NotFound />} />
          <Route path="*"            element={<Navigate to="/404" replace />} />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  );
}
