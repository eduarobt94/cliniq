// Cliniq — Login
// Centered card with validation, visual states
(function(){
const { CliniqIcons, CliniqButton, CliniqBadge, MonoLabel, Divider } = window;

const CliniqLogin = ({ onNavigate }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPwd, setShowPwd] = React.useState(false);
  const [remember, setRemember] = React.useState(true);
  const [touched, setTouched] = React.useState({ email: false, password: false });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;

  const onSubmit = (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setError('');
    if (!emailValid || !passwordValid) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onNavigate('dashboard');
    }, 900);
  };

  const fillDemo = () => {
    setEmail('maria@bonomi.uy');
    setPassword('demo1234');
    setTouched({ email: false, password: false });
  };

  const emailError = touched.email && !emailValid;
  const pwdError = touched.password && !passwordValid;

  return (
    <main className="min-h-screen bg-[var(--cq-bg)] text-[var(--cq-fg)] grid lg:grid-cols-[1.1fr_1fr]">
      {/* Left — branded panel */}
      <aside aria-hidden="true" className="hidden lg:flex flex-col justify-between p-10 bg-[var(--cq-fg)] text-[var(--cq-bg)] relative overflow-hidden">
        <div className="absolute -left-32 -top-32 w-96 h-96 rounded-full bg-[var(--cq-accent)] opacity-30 blur-3xl"/>
        <div className="absolute right-10 bottom-10 w-64 h-64 rounded-full bg-[var(--cq-accent)] opacity-15 blur-3xl"/>

        <div className="relative flex items-center gap-2.5">
          <CliniqIcons.Logo size={22} color="currentColor"/>
          <span className="text-[17px] font-semibold tracking-tight">Cliniq</span>
        </div>

        <div className="relative max-w-[460px]">
          <MonoLabel className="text-[var(--cq-bg)]/60">[ Sistema en línea · 99.98% ]</MonoLabel>
          <h1 className="mt-5 text-[44px] lg:text-[56px] leading-[1.02] tracking-[-0.03em] font-semibold">
            Bienvenida<br/>
            <span className="italic font-normal" style={{ fontFamily: 'Instrument Serif, Geist, serif' }}>a tu clínica silenciosa.</span>
          </h1>
          <p className="mt-6 text-[15px] text-[var(--cq-bg)]/70 leading-relaxed">
            Mientras dormías, Cliniq envió 18 recordatorios, confirmó 14 turnos y agendó 2 consultas nuevas.
          </p>
          {/* micro activity feed */}
          <div className="mt-8 space-y-2">
            {[
              { t: '02:14', m: 'Reporte semanal generado' },
              { t: '07:00', m: 'Recordatorios WhatsApp enviados · 18' },
              { t: '08:42', m: 'Turno confirmado · Camila A.' },
            ].map((e, i) => (
              <div key={i} className="flex items-center gap-3 text-[13px]">
                <span className="font-mono text-[var(--cq-bg)]/50 w-10">{e.t}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--cq-accent)]"/>
                <span className="text-[var(--cq-bg)]/85">{e.m}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-between">
          <MonoLabel className="text-[var(--cq-bg)]/50">MONTEVIDEO · UY</MonoLabel>
          <MonoLabel className="text-[var(--cq-bg)]/50">v2.4.1</MonoLabel>
        </div>
      </aside>

      {/* Right — form */}
      <section aria-labelledby="login-title" className="flex flex-col">
        <header className="flex items-center justify-between p-5 md:px-10 md:py-6">
          <button onClick={() => onNavigate('landing')} className="flex items-center gap-2 text-[14px] text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] transition-colors" aria-label="Volver al inicio">
            <span className="rotate-180 inline-flex"><CliniqIcons.Arrow size={12}/></span> Volver
          </button>
          <div className="flex items-center gap-2 lg:hidden">
            <CliniqIcons.Logo size={20}/>
            <span className="font-semibold tracking-tight">Cliniq</span>
          </div>
          <div className="text-[13px] text-[var(--cq-fg-muted)]">
            ¿Nuevo? <a href="#" className="text-[var(--cq-fg)] underline underline-offset-4 decoration-[var(--cq-border)] hover:decoration-[var(--cq-accent)]">Crear clínica</a>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-5 md:px-10 py-6">
          <div className="w-full max-w-[420px]">
            <MonoLabel>[ Sesión / 2026.04 ]</MonoLabel>
            <h2 id="login-title" className="mt-3 text-[32px] md:text-[40px] tracking-[-0.02em] font-semibold leading-[1.05]">
              Iniciar sesión
            </h2>
            <p className="mt-2 text-[14.5px] text-[var(--cq-fg-muted)]">
              Acceso seguro a tu panel de Cliniq.
            </p>

            {/* SSO */}
            <div className="mt-8 grid grid-cols-2 gap-2.5">
              <button className="h-11 rounded-[10px] border border-[var(--cq-border)] bg-[var(--cq-surface)] hover:bg-[var(--cq-surface-2)] hover:border-[var(--cq-fg)] transition-all flex items-center justify-center gap-2 text-[13.5px] font-medium" aria-label="Continuar con Google">
                <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true">
                  <circle cx="7.5" cy="7.5" r="7" fill="none" stroke="currentColor" strokeWidth="1"/>
                  <text x="7.5" y="10.5" textAnchor="middle" fontSize="9" fontWeight="600" fontFamily="Geist, sans-serif">G</text>
                </svg>
                Google
              </button>
              <button className="h-11 rounded-[10px] border border-[var(--cq-border)] bg-[var(--cq-surface)] hover:bg-[var(--cq-surface-2)] hover:border-[var(--cq-fg)] transition-all flex items-center justify-center gap-2 text-[13.5px] font-medium" aria-label="Continuar con WhatsApp Business">
                <CliniqIcons.Whatsapp size={15}/>
                WhatsApp
              </button>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Divider className="flex-1"/>
              <MonoLabel>o con correo</MonoLabel>
              <Divider className="flex-1"/>
            </div>

            <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
              <Field
                label="Correo electrónico"
                icon={<CliniqIcons.Mail size={15}/>}
                error={emailError && 'Ingresá un correo válido'}
                success={touched.email && emailValid}
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, email: true }))}
                  placeholder="maria@clinica.uy"
                  autoComplete="email"
                  aria-label="Correo electrónico"
                  className="flex-1 bg-transparent outline-none text-[14.5px] placeholder:text-[var(--cq-fg-muted)]"
                />
              </Field>

              <Field
                label="Contraseña"
                icon={<CliniqIcons.Lock size={15}/>}
                error={pwdError && 'Mínimo 6 caracteres'}
                success={touched.password && passwordValid}
                right={
                  <button type="button" onClick={() => setShowPwd(v => !v)} className="text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)]" aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                    <CliniqIcons.Eye size={15} open={!showPwd}/>
                  </button>
                }
              >
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, password: true }))}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-label="Contraseña"
                  className="flex-1 bg-transparent outline-none text-[14.5px] placeholder:text-[var(--cq-fg-muted)]"
                />
              </Field>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span
                    onClick={() => setRemember(!remember)}
                    className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${remember ? 'bg-[var(--cq-fg)] border-[var(--cq-fg)]' : 'border-[var(--cq-border)] bg-[var(--cq-surface)]'}`}
                    aria-checked={remember}
                    role="checkbox"
                    tabIndex={0}
                  >
                    {remember && <CliniqIcons.Check size={10}/>}
                  </span>
                  <span className="text-[13.5px] text-[var(--cq-fg-muted)]">Mantener sesión iniciada</span>
                </label>
                <a href="#" className="text-[13px] text-[var(--cq-fg-muted)] hover:text-[var(--cq-accent)] underline-offset-4 hover:underline">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              {error && (
                <div role="alert" className="px-3 py-2 rounded-lg bg-[color-mix(in_oklch,var(--cq-danger)_12%,transparent)] text-[var(--cq-danger)] text-[13px] border border-[color-mix(in_oklch,var(--cq-danger)_30%,transparent)]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-[10px] bg-[var(--cq-fg)] text-[var(--cq-bg)] font-medium hover:bg-[var(--cq-accent)] disabled:opacity-70 transition-all active:scale-[0.99] inline-flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[var(--cq-bg)]/40 border-t-[var(--cq-bg)] rounded-full animate-spin"/>
                    Verificando…
                  </>
                ) : (
                  <>Entrar al panel <CliniqIcons.Arrow size={13}/></>
                )}
              </button>

              <button
                type="button"
                onClick={fillDemo}
                className="w-full h-10 rounded-[10px] border border-dashed border-[var(--cq-border)] text-[13px] text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] hover:border-[var(--cq-fg)] transition-all inline-flex items-center justify-center gap-2"
              >
                <CliniqIcons.Sparkle size={12}/> Probar con cuenta demo
              </button>
            </form>

            <div className="mt-8 flex items-center justify-between">
              <MonoLabel>Protocolo seguro · TLS 1.3</MonoLabel>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--cq-success)] animate-pulse"/>
                <MonoLabel>Servidor UY · activo</MonoLabel>
              </span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

// Field primitive local to login
const Field = ({ label, icon, right, error, success, children }) => (
  <div>
    <label className="flex items-center justify-between mb-1.5">
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--cq-fg-muted)]">{label}</span>
      {error && <span className="text-[11px] text-[var(--cq-danger)]">{error}</span>}
    </label>
    <div className={`flex items-center gap-2 h-11 px-3.5 rounded-[10px] border bg-[var(--cq-surface)] transition-all focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[var(--cq-accent)] focus-within:ring-offset-[var(--cq-bg)] ${
      error ? 'border-[var(--cq-danger)]' :
      success ? 'border-[var(--cq-fg)]' : 'border-[var(--cq-border)]'
    }`}>
      <span className="text-[var(--cq-fg-muted)] shrink-0">{icon}</span>
      {children}
      {success && <span className="text-[var(--cq-success)] shrink-0"><CliniqIcons.Check size={14}/></span>}
      {right && <span className="shrink-0">{right}</span>}
    </div>
  </div>
);

window.CliniqLogin = CliniqLogin;
})();
