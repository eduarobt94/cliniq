import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Icons, MonoLabel, Divider } from '../../components/ui';

function Field({ label, icon, error, success, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--cq-fg-muted)]">
          {label}
        </span>
        {error && <span className="text-[11px] text-[var(--cq-danger)]">{error}</span>}
      </label>
      <div className={`flex items-center gap-2 h-11 px-3.5 rounded-[10px] border bg-[var(--cq-surface)] transition-all focus-within:border-[var(--cq-success)] focus-within:ring-1 focus-within:ring-[var(--cq-success)] ${
        error ? 'border-[var(--cq-danger)]' : success ? 'border-[var(--cq-fg)]' : 'border-[var(--cq-border)]'
      }`}>
        {icon && <span className="text-[var(--cq-fg-muted)] shrink-0">{icon}</span>}
        {children}
        {success && <span className="text-[var(--cq-success)] shrink-0"><Icons.Check size={14} /></span>}
      </div>
    </div>
  );
}

export function Signup() {
  const navigate  = useNavigate();
  const { signup, user, clinic, needsOnboarding, loading } = useAuth();

  // Guard: si ya tiene sesión y clínica, ir al dashboard
  if (!loading && user && !needsOnboarding) {
    return <Navigate to="/dashboard" replace />;
  }

  const [firstName,  setFirstName]  = useState('');
  const [lastName,   setLastName]   = useState('');
  const [clinicName, setClinicName] = useState('');
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [showPwd,    setShowPwd]    = useState(false);
  const [touched,    setTouched]    = useState({
    firstName: false, lastName: false, clinic: false, email: false, password: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const firstNameValid = firstName.trim().length >= 2;
  const lastNameValid  = lastName.trim().length >= 2;
  const clinicValid    = clinicName.trim().length >= 2;
  const emailValid     = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid  = password.length >= 6;

  const allValid = firstNameValid && lastNameValid && clinicValid && emailValid && passwordValid;

  const onSubmit = async (e) => {
    e.preventDefault();
    setTouched({ firstName: true, lastName: true, clinic: true, email: true, password: true });
    setError('');
    if (!allValid) return;

    setSubmitting(true);
    try {
      const { needsOnboarding } = await signup(email, password, clinicName, firstName, lastName);
      navigate(needsOnboarding ? '/onboarding' : '/dashboard');
    } catch (err) {
      setError(
        err.message.includes('already registered')
          ? 'Ya existe una cuenta con ese correo.'
          : err.message
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--cq-bg)] text-[var(--cq-fg)] grid lg:grid-cols-[1.1fr_1fr]">
      {/* Panel izquierdo */}
      <aside aria-hidden="true" className="hidden lg:flex flex-col justify-between p-10 bg-[var(--cq-fg)] text-[var(--cq-bg)] relative overflow-hidden">
        <div className="absolute -left-32 -top-32 w-96 h-96 rounded-full bg-[var(--cq-accent)] opacity-30 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <Icons.Logo size={22} color="currentColor" />
          <span className="text-[17px] font-semibold tracking-tight">Cliniq</span>
        </div>
        <div className="relative max-w-[460px]">
          <MonoLabel className="text-[var(--cq-bg)]/60">[ Para dueños de clínica ]</MonoLabel>
          <h1 className="mt-5 text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.03em] font-semibold">
            Tu clínica en
            <br />
            <span className="italic font-normal" style={{ fontFamily: 'Instrument Serif, serif' }}>
              piloto automático.
            </span>
          </h1>
          <p className="mt-6 text-[15px] text-[var(--cq-bg)]/70 leading-relaxed">
            Registrate como dueño y administrá tu clínica. Invitá a tu equipo desde el dashboard.
          </p>
          <div className="mt-8 space-y-3">
            {[
              'Recordatorios automáticos por WhatsApp',
              'Dashboard con KPIs en tiempo real',
              'Invitá a tu equipo sin costo adicional',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-[13.5px]">
                <span className="w-5 h-5 rounded-full bg-[var(--cq-accent)] flex items-center justify-center shrink-0">
                  <Icons.Check size={10} />
                </span>
                <span className="text-[var(--cq-bg)]/85">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <MonoLabel className="text-[var(--cq-bg)]/50">14 días gratis · Sin compromiso</MonoLabel>
        </div>
      </aside>

      {/* Formulario */}
      <section className="flex flex-col">
        <header className="flex items-center justify-between p-5 md:px-10 md:py-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[14px] text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] transition-colors">
            <span className="rotate-180 inline-flex"><Icons.Arrow size={12} /></span> Volver
          </button>
          <div className="text-[13px] text-[var(--cq-fg-muted)]">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="text-[var(--cq-fg)] underline underline-offset-4 decoration-[var(--cq-border)] hover:decoration-[var(--cq-accent)]">
              Iniciar sesión
            </Link>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-5 md:px-10 py-6">
          <div className="w-full max-w-[420px]">
            <MonoLabel>[ Registro de clínica ]</MonoLabel>
            <h2 className="mt-3 text-[30px] md:text-[36px] tracking-[-0.02em] font-semibold leading-[1.05]">
              Crear cuenta
            </h2>
            <p className="mt-2 text-[14px] text-[var(--cq-fg-muted)]">
              Tu clínica queda lista al instante.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
              <fieldset disabled={submitting} className="contents">

                {/* Nombre y apellido en fila */}
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="Nombre"
                    error={touched.firstName && !firstNameValid ? 'Requerido' : ''}
                    success={touched.firstName && firstNameValid}
                  >
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, firstName: true }))}
                      placeholder="María"
                      autoComplete="given-name"
                      className="flex-1 bg-transparent outline-none text-[14.5px] placeholder:text-[var(--cq-fg-muted)] min-w-0"
                    />
                  </Field>
                  <Field
                    label="Apellido"
                    error={touched.lastName && !lastNameValid ? 'Requerido' : ''}
                    success={touched.lastName && lastNameValid}
                  >
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, lastName: true }))}
                      placeholder="Bonomi"
                      autoComplete="family-name"
                      className="flex-1 bg-transparent outline-none text-[14.5px] placeholder:text-[var(--cq-fg-muted)] min-w-0"
                    />
                  </Field>
                </div>

                <Field
                  label="Nombre de la clínica"
                  icon={<Icons.Home size={15} />}
                  error={touched.clinic && !clinicValid ? 'Mínimo 2 caracteres' : ''}
                  success={touched.clinic && clinicValid}
                >
                  <input
                    type="text"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, clinic: true }))}
                    placeholder="Clínica Bonomi"
                    className="flex-1 bg-transparent outline-none text-[14.5px] placeholder:text-[var(--cq-fg-muted)]"
                  />
                </Field>

                <Divider />

                <Field
                  label="Correo electrónico"
                  icon={<Icons.Mail size={15} />}
                  error={touched.email && !emailValid ? 'Correo inválido' : ''}
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
                  error={touched.password && !passwordValid ? 'Mínimo 6 caracteres' : ''}
                  success={touched.password && passwordValid}
                >
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="flex-1 bg-transparent outline-none text-[14.5px] placeholder:text-[var(--cq-fg-muted)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] shrink-0"
                    aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    <Icons.Eye size={15} open={!showPwd} />
                  </button>
                </Field>

                {error && (
                  <div role="alert" className="px-3 py-2 rounded-lg bg-[color-mix(in_oklch,var(--cq-danger)_12%,transparent)] text-[var(--cq-danger)] text-[13px] border border-[color-mix(in_oklch,var(--cq-danger)_30%,transparent)]">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full h-12 mt-4 rounded-[10px] bg-[var(--cq-fg)] text-[var(--cq-bg)] font-medium hover:bg-[var(--cq-accent)] disabled:opacity-70 transition-all active:scale-[0.99] inline-flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[var(--cq-bg)]/40 border-t-[var(--cq-bg)] rounded-full animate-spin" />
                      Creando tu clínica…
                    </>
                  ) : (
                    <>Crear cuenta gratis <Icons.Arrow size={13} /></>
                  )}
                </button>
              </fieldset>
            </form>

            <p className="mt-5 text-center text-[12px] text-[var(--cq-fg-muted)]">
              ¿Tu clínica ya usa Cliniq y te invitaron?{' '}
              <Link to="/login" className="underline underline-offset-2 hover:text-[var(--cq-fg)]">
                Iniciá sesión acá.
              </Link>
            </p>
            <p className="mt-3 text-center text-[12px] text-[var(--cq-fg-muted)]">
              Al registrarte aceptás los{' '}
              <a href="#" className="underline underline-offset-2 hover:text-[var(--cq-fg)]">Términos de servicio</a>
              {' '}y la{' '}
              <a href="#" className="underline underline-offset-2 hover:text-[var(--cq-fg)]">Política de privacidad</a>.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
