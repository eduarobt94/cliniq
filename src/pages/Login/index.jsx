import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Icons, MonoLabel, Divider, ToastContainer, useToast } from '../../components/ui';

function Field({ label, icon, right, error, success, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--cq-fg-muted)]">
          {label}
        </span>
        {error && <span className="text-[11px] text-[var(--cq-danger)]">{error}</span>}
      </label>
      <div
        className={`flex items-center gap-2 h-12 px-4 rounded-[10px] border bg-[var(--cq-surface)] transition-all focus-within:border-[var(--cq-success)] focus-within:ring-1 focus-within:ring-[var(--cq-success)] ${
          error
            ? 'border-[var(--cq-danger)]'
            : success
            ? 'border-[var(--cq-fg)]'
            : 'border-[var(--cq-border)]'
        }`}
      >
        <span className="text-[var(--cq-fg-muted)] shrink-0">{icon}</span>
        {children}
        {success && (
          <span className="text-[var(--cq-success)] shrink-0">
            <Icons.Check size={14} />
          </span>
        )}
        {right && <span className="shrink-0">{right}</span>}
      </div>
    </div>
  );
}

const BENEFITS = [
  'Recordatorios automáticos por WhatsApp',
  'Agenda confirmada sin llamadas manuales',
  'Seguimiento de presupuestos sin esfuerzo',
  'Reporte semanal en tu correo cada lunes',
];

export function Login() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, user, clinic, needsOnboarding, loading } = useAuth();
  const { toasts, push: pushToast, dismiss } = useToast();

  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [remember,    setRemember]    = useState(true);
  const [touched,     setTouched]     = useState({ email: false, password: false });
  const [submitting,  setSubmitting]  = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Guard: si ya hay sesión con clínica, ir al dashboard
  if (!loading && user && !needsOnboarding) {
    return <Navigate to="/dashboard" replace />;
  }

  const emailValid   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;
  const emailError   = touched.email && !emailValid;
  const pwdError     = touched.password && !passwordValid;

  const onSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!emailValid || !passwordValid) return;
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(needsOnboarding ? '/onboarding' : '/dashboard');
    } catch (err) {
      pushToast(
        err.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos.'
          : err.message,
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      // La redirección la maneja el AuthCallback al volver de Google
    } catch (err) {
      pushToast('No se pudo conectar con Google. Intentá de nuevo.', 'error');
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      <main className="min-h-screen bg-[var(--cq-bg)] text-[var(--cq-fg)] grid lg:grid-cols-[1.1fr_1fr]">
        {/* Panel izquierdo */}
        <aside
          aria-hidden="true"
          className="hidden lg:flex flex-col justify-between p-10 bg-[var(--cq-fg)] text-[var(--cq-bg)] relative overflow-hidden"
        >
          <div className="absolute -left-32 -top-32 w-96 h-96 rounded-full bg-[var(--cq-accent)] opacity-30 blur-3xl" />
          <div className="absolute right-10 bottom-10 w-64 h-64 rounded-full bg-[var(--cq-accent)] opacity-15 blur-3xl" />
          <div className="relative flex items-center gap-2.5">
            <Icons.Logo size={22} color="currentColor" />
            <span className="text-[17px] font-semibold tracking-tight">Cliniq</span>
          </div>
          <div className="relative max-w-[460px]">
            <MonoLabel className="text-[var(--cq-bg)]/60">[ Tu clínica en piloto automático ]</MonoLabel>
            <h1 className="mt-5 text-[44px] lg:text-[56px] leading-[1.02] tracking-[-0.03em] font-semibold">
              Bienvenida
              <br />
              <span className="italic font-normal" style={{ fontFamily: 'Instrument Serif, Geist, serif' }}>
                a tu clínica silenciosa.
              </span>
            </h1>
            <p className="mt-6 text-[15px] text-[var(--cq-bg)]/70 leading-relaxed">
              Confirmaciones, seguimientos y reportes. Todo corre solo mientras vos atendés.
            </p>
            <ul className="mt-8 space-y-3">
              {BENEFITS.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 text-[13.5px]"
                  style={{
                    opacity: 0,
                    animation: 'cqFadeSlideUp 0.45s ease forwards',
                    animationDelay: `${0.3 + i * 0.14}s`,
                  }}
                >
                  <span
                    className="w-5 h-5 rounded-full bg-[var(--cq-accent)] flex items-center justify-center shrink-0"
                    style={{
                      opacity: 0,
                      animation: 'cqFadeSlideUp 0.35s ease forwards',
                      animationDelay: `${0.4 + i * 0.14}s`,
                    }}
                  >
                    <Icons.Check size={9} />
                  </span>
                  <span className="text-[var(--cq-bg)]/85">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative flex items-center justify-between">
            <MonoLabel className="text-[var(--cq-bg)]/50">MONTEVIDEO · UY</MonoLabel>
            <MonoLabel className="text-[var(--cq-bg)]/50">v2.5.0</MonoLabel>
          </div>
        </aside>

        {/* Formulario */}
        <section aria-labelledby="login-title" className="flex flex-col">
          <header className="flex items-center justify-between p-5 md:px-10 md:py-6">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-[14px] text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] transition-colors"
              aria-label="Volver al inicio"
            >
              <span className="rotate-180 inline-flex"><Icons.Arrow size={12} /></span> Volver
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <Icons.Logo size={20} />
              <span className="font-semibold tracking-tight">Cliniq</span>
            </div>
            <div className="text-[13px] text-[var(--cq-fg-muted)]">
              ¿Nuevo?{' '}
              <Link
                to="/signup"
                className="text-[var(--cq-fg)] underline underline-offset-4 decoration-[var(--cq-border)] hover:decoration-[var(--cq-accent)]"
              >
                Crear clínica
              </Link>
            </div>
          </header>

          <div className="flex-1 flex items-center justify-center px-6 md:px-12 py-8">
            <div className="w-full max-w-[400px]">
              <MonoLabel>[ Acceso al panel ]</MonoLabel>
              <h2
                id="login-title"
                className="mt-3 text-[32px] md:text-[40px] tracking-[-0.02em] font-semibold leading-[1.05]"
              >
                Iniciar sesión
              </h2>
              <p className="mt-2 text-[14.5px] text-[var(--cq-fg-muted)]">
                Accedé a tu panel de Cliniq.
              </p>

              {/* OAuth */}
              <div className="mt-8 grid grid-cols-1 gap-3">
                <button
                  onClick={onGoogle}
                  disabled={googleLoading || submitting}
                  className="h-11 rounded-[10px] border border-[var(--cq-border)] bg-[var(--cq-surface)] hover:bg-[var(--cq-surface-2)] hover:border-[var(--cq-fg)] disabled:opacity-60 transition-all flex items-center justify-center gap-2.5 text-[14px] font-medium cursor-pointer"
                  aria-label="Continuar con Google"
                >
                  {googleLoading ? (
                    <span className="w-4 h-4 border-2 border-[var(--cq-border)] border-t-[var(--cq-fg)] rounded-full animate-spin" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                  )}
                  Continuar con Google
                </button>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Divider className="flex-1" />
                <MonoLabel>o con correo</MonoLabel>
                <Divider className="flex-1" />
              </div>

              <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
                <fieldset disabled={submitting || googleLoading} className="contents">
                  <Field
                    label="Correo electrónico"
                    icon={<Icons.Mail size={15} />}
                    error={emailError && 'Ingresá un correo válido'}
                    success={touched.email && emailValid}
                  >
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                      placeholder="maria@clinica.uy"
                      autoComplete="email"
                      className="flex-1 bg-transparent outline-none text-[14.5px] placeholder:text-[var(--cq-fg-muted)]"
                    />
                  </Field>

                  <Field
                    label="Contraseña"
                    icon={<Icons.Lock size={15} />}
                    error={pwdError && 'Mínimo 6 caracteres'}
                    success={touched.password && passwordValid}
                    right={
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)]"
                        aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        <Icons.Eye size={15} open={!showPwd} />
                      </button>
                    }
                  >
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="flex-1 bg-transparent outline-none text-[14.5px] placeholder:text-[var(--cq-fg-muted)]"
                    />
                  </Field>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="w-4 h-4 rounded-[4px] accent-[var(--cq-fg)] cursor-pointer"
                      />
                      <span className="text-[13.5px] text-[var(--cq-fg-muted)]">
                        Mantener sesión
                      </span>
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-[13px] text-[var(--cq-fg-muted)] hover:text-[var(--cq-accent)] underline-offset-4 hover:underline transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={submitting || googleLoading}
                      className="w-full h-12 rounded-[10px] bg-[var(--cq-fg)] text-[var(--cq-bg)] font-medium hover:bg-[var(--cq-accent)] disabled:opacity-70 transition-all active:scale-[0.99] inline-flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-[var(--cq-bg)]/40 border-t-[var(--cq-bg)] rounded-full animate-spin" />
                          Verificando…
                        </>
                      ) : (
                        <>Entrar al panel <Icons.Arrow size={13} /></>
                      )}
                    </button>
                  </div>
                </fieldset>
              </form>

              <div className="mt-8 flex items-center justify-between">
                <MonoLabel>Protocolo seguro · TLS 1.3</MonoLabel>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--cq-success)] animate-pulse" />
                  <MonoLabel>Servidor UY · activo</MonoLabel>
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
