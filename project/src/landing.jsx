// Cliniq — Landing Page
// Editorial minimal, dashboard-forward hero, mono annotations
(function(){
const { CliniqIcons, CliniqButton, CliniqBadge, CliniqCard, MonoLabel, SectionLabel, Divider, CliniqAvatar } = window;

// Fade-in-on-view wrapper (imitating framer-motion whileInView)
const Reveal = ({ children, delay = 0, y = 12, className = '' }) => {
  const ref = React.useRef(null);
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); io.disconnect(); }
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : `translateY(${y}px)`,
        transition: `opacity 700ms cubic-bezier(.2,.7,.2,1) ${delay}ms, transform 700ms cubic-bezier(.2,.7,.2,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

// Top navigation
const LandingNav = ({ onLogin, onSignup }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <nav aria-label="Navegación principal" className="sticky top-0 z-30 bg-[color-mix(in_oklch,var(--cq-bg)_82%,transparent)] backdrop-blur-md border-b border-[var(--cq-border)]">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5" aria-label="Cliniq — inicio">
          <CliniqIcons.Logo size={22} />
          <span className="text-[17px] font-semibold tracking-tight">Cliniq</span>
          <CliniqBadge tone="outline" className="ml-2 hidden sm:inline-flex">UY · Beta</CliniqBadge>
        </a>
        <div className="hidden md:flex items-center gap-7 text-[14px] text-[var(--cq-fg-muted)]">
          <a href="#producto" className="hover:text-[var(--cq-fg)] transition-colors">Producto</a>
          <a href="#automatizaciones" className="hover:text-[var(--cq-fg)] transition-colors">Automatizaciones</a>
          <a href="#precios" className="hover:text-[var(--cq-fg)] transition-colors">Precios</a>
          <a href="#historias" className="hover:text-[var(--cq-fg)] transition-colors">Historias</a>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <CliniqButton variant="ghost" size="sm" onClick={onLogin}>Iniciar sesión</CliniqButton>
          <CliniqButton variant="primary" size="sm" onClick={onSignup}>
            Probar gratis <CliniqIcons.Arrow size={12}/>
          </CliniqButton>
        </div>
        <button className="md:hidden p-2 -mr-2" onClick={() => setOpen(!open)} aria-label="Abrir menú" aria-expanded={open}>
          {open ? <CliniqIcons.Close size={18}/> : <CliniqIcons.Menu size={18}/>}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-[var(--cq-border)] px-5 py-4 flex flex-col gap-4">
          <a href="#producto" onClick={() => setOpen(false)}>Producto</a>
          <a href="#automatizaciones" onClick={() => setOpen(false)}>Automatizaciones</a>
          <a href="#precios" onClick={() => setOpen(false)}>Precios</a>
          <a href="#historias" onClick={() => setOpen(false)}>Historias</a>
          <Divider/>
          <div className="flex gap-2">
            <CliniqButton variant="outline" size="sm" onClick={onLogin} className="flex-1">Iniciar sesión</CliniqButton>
            <CliniqButton variant="primary" size="sm" onClick={onSignup} className="flex-1">Probar gratis</CliniqButton>
          </div>
        </div>
      )}
    </nav>
  );
};

// Hero — editorial statement + product UI preview
const LandingHero = ({ onLogin, onSignup }) => {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-12">
        {/* Top meta strip */}
        <Reveal className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-10 md:mb-14">
          <MonoLabel>[ AX-001 / 2026 ]</MonoLabel>
          <MonoLabel>Montevideo · Uruguay</MonoLabel>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--cq-success)] animate-pulse"/>
            <MonoLabel>Sistemas en línea</MonoLabel>
          </span>
        </Reveal>

        <div className="grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7">
            <Reveal>
              <h1 id="hero-title" className="text-[44px] sm:text-[58px] md:text-[76px] leading-[0.96] tracking-[-0.03em] font-semibold text-[var(--cq-fg)]">
                La clínica que<br/>
                <span className="italic font-normal" style={{ fontFamily: 'Instrument Serif, Geist, serif' }}>se opera sola</span><br/>
                mientras vos<br/>
                atendés pacientes.
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-8 text-[17px] md:text-[19px] text-[var(--cq-fg-muted)] max-w-[520px] leading-relaxed">
                Cliniq conecta tu agenda, tus pacientes y tu WhatsApp con inteligencia automatizada. Los turnos se confirman solos, los presupuestos se siguen solos, y vos recuperás entre un <strong className="text-[var(--cq-fg)] font-medium">20% y 35%</strong> de facturación perdida.
              </p>
            </Reveal>
            <Reveal delay={220}>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <CliniqButton variant="primary" size="lg" onClick={onSignup}>
                  Activar mi clínica <CliniqIcons.Arrow size={14}/>
                </CliniqButton>
                <CliniqButton variant="outline" size="lg" onClick={onLogin}>
                  Ver demo · 2 min
                </CliniqButton>
                <span className="font-mono text-[11px] text-[var(--cq-fg-muted)] ml-2">
                  SIN TARJETA · SIN COMPROMISO
                </span>
              </div>
            </Reveal>
          </div>

          {/* Product preview card */}
          <Reveal delay={300} className="lg:col-span-5">
            <LandingPreviewCard />
          </Reveal>
        </div>

        {/* Metric strip */}
        <Reveal delay={400} className="mt-20 md:mt-28">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--cq-border)] border border-[var(--cq-border)] rounded-[14px] overflow-hidden">
            {[
              { n: '+28%', l: 'Facturación recuperada', s: 'promedio mes 2' },
              { n: '92%', l: 'Turnos confirmados', s: 'vs. 68% manual' },
              { n: '4.2h', l: 'Ahorro por semana', s: 'por recepcionista' },
              { n: '<30d', l: 'Retorno de inversión', s: 'garantizado' },
            ].map((m, i) => (
              <div key={i} className="bg-[var(--cq-bg)] p-5 md:p-6">
                <div className="text-[32px] md:text-[40px] tracking-tight font-semibold leading-none">{m.n}</div>
                <div className="mt-2 text-[14px] text-[var(--cq-fg)]">{m.l}</div>
                <div className="mt-1 font-mono text-[10.5px] uppercase tracking-wider text-[var(--cq-fg-muted)]">{m.s}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
};

// Live-feeling product preview (fake, animated subtly)
const LandingPreviewCard = () => {
  const [step, setStep] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % 3), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-[var(--cq-accent-soft)] rounded-[24px] -z-10 opacity-70 blur-xl"/>
      <div className="bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[18px] overflow-hidden shadow-[0_24px_60px_-20px_rgba(0,0,0,0.18)]">
        {/* window chrome */}
        <div className="flex items-center justify-between px-4 h-10 border-b border-[var(--cq-border)] bg-[var(--cq-surface-2)]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--cq-border)]"/>
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--cq-border)]"/>
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--cq-border)]"/>
          </div>
          <MonoLabel>cliniq.uy / inbox</MonoLabel>
          <span className="w-12"/>
        </div>

        {/* Automation flow visualization */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[13px] font-medium">Recordatorio de turno</div>
              <MonoLabel>AX-001 · WhatsApp</MonoLabel>
            </div>
            <CliniqBadge tone="success" dot>Activo</CliniqBadge>
          </div>

          <div className="space-y-2">
            {[
              { t: 'Leer agenda de mañana', done: step >= 0 },
              { t: 'Generar mensaje personalizado', done: step >= 1 },
              { t: 'Enviar por WhatsApp · 12 pacientes', done: step >= 2 },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3 px-3 h-10 rounded-lg bg-[var(--cq-surface-2)] border border-[var(--cq-border)]">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${s.done ? 'bg-[var(--cq-success)] text-white' : 'bg-[var(--cq-surface)] border border-[var(--cq-border)]'}`}>
                  {s.done ? <CliniqIcons.Check size={11}/> : <span className="w-1.5 h-1.5 rounded-full bg-[var(--cq-fg-muted)]"/>}
                </div>
                <span className="text-[13px] flex-1">{s.t}</span>
                {s.done && <MonoLabel>OK</MonoLabel>}
              </div>
            ))}
          </div>

          <Divider className="my-4"/>

          {/* Fake message */}
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--cq-accent-soft)] text-[var(--cq-accent)] flex items-center justify-center shrink-0">
              <CliniqIcons.Whatsapp size={16}/>
            </div>
            <div className="flex-1 bg-[var(--cq-surface-2)] border border-[var(--cq-border)] rounded-[10px] rounded-tl-sm p-3">
              <div className="text-[12.5px] leading-relaxed text-[var(--cq-fg)]">
                Hola Camila 👋 Te recordamos tu turno de <strong>mañana 15:30 con Dr. Bonomi</strong>. Respondé <strong>1</strong> para confirmar o <strong>2</strong> para reagendar.
              </div>
              <MonoLabel className="block mt-2">09:02 · enviado por Cliniq</MonoLabel>
            </div>
          </div>
        </div>
      </div>

      {/* Floating annotation */}
      <div className="absolute -right-2 -bottom-6 bg-[var(--cq-fg)] text-[var(--cq-bg)] px-3 py-2 rounded-[8px] text-[12px] hidden md:flex items-center gap-2">
        <CliniqIcons.Sparkle size={12}/>
        Corre cada mañana · 07:00 UYT
      </div>
    </div>
  );
};

// Product / value section
const LandingProduct = () => {
  const features = [
    { n: '01', title: 'Agenda que confirma sola', body: 'Cada noche, Cliniq lee tu agenda y envía recordatorios personalizados por WhatsApp. El paciente confirma con un 1. Se acabó la llamada de recepción.', label: 'AGENDA' },
    { n: '02', title: 'Presupuestos que no se olvidan', body: 'Si un paciente recibió un presupuesto y no lo aprobó en 5 días, Cliniq le escribe. Amable, preciso, con tu tono de voz. El 60% responde.', label: 'SEGUIMIENTO' },
    { n: '03', title: 'Pacientes inactivos que vuelven', body: 'Cliniq detecta quién no vino en 6 meses y le manda el mensaje justo. Reactivás agenda sin contratar a nadie.', label: 'REACTIVACIÓN' },
    { n: '04', title: 'Facturación electrónica DGI', body: 'Emitís la factura desde el turno. Cliniq se conecta con DGI Uruguay y archiva todo. Contador feliz.', label: 'DGI · UY' },
    { n: '05', title: 'Chatbot 24/7 para nuevos pacientes', body: 'Tu WhatsApp responde solo fuera de horario: precios, horarios, cómo llegar, agendar. Entrena con tu información.', label: 'IA' },
    { n: '06', title: 'Reporte semanal para el dueño', body: 'Cada lunes a las 09:00, un resumen en tu correo: facturado, turnos nuevos, dinero en riesgo, top 3 alertas. Sin entrar a ningún dashboard.', label: 'REPORTES' },
  ];

  return (
    <section id="producto" aria-labelledby="product-title" className="max-w-[1280px] mx-auto px-5 md:px-8 py-24 md:py-32">
      <Reveal><SectionLabel number="02">Qué hace Cliniq</SectionLabel></Reveal>
      <Reveal delay={80}>
        <h2 id="product-title" className="text-[36px] md:text-[56px] leading-[1.02] tracking-[-0.03em] font-semibold max-w-[900px]">
          Seis automatizaciones que convierten<br className="hidden md:block"/>
          <span className="text-[var(--cq-fg-muted)]">tareas repetitivas en facturación.</span>
        </h2>
      </Reveal>

      <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--cq-border)] border border-[var(--cq-border)] rounded-[14px] overflow-hidden">
        {features.map((f, i) => (
          <Reveal key={f.n} delay={i * 60}>
            <article className="bg-[var(--cq-bg)] p-7 md:p-8 h-full group hover:bg-[var(--cq-surface-2)] transition-colors duration-300">
              <div className="flex items-center justify-between mb-8">
                <MonoLabel>[ {f.n} ]</MonoLabel>
                <MonoLabel>{f.label}</MonoLabel>
              </div>
              <h3 className="text-[22px] md:text-[24px] tracking-[-0.02em] font-semibold leading-[1.15] mb-3">{f.title}</h3>
              <p className="text-[14.5px] text-[var(--cq-fg-muted)] leading-relaxed">{f.body}</p>
              <div className="mt-8 flex items-center gap-1.5 text-[13px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Ver flujo <CliniqIcons.ArrowUpRight size={12}/>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

// How it works
const LandingHow = () => {
  const steps = [
    { n: '01', title: 'Conectás tu agenda y tu WhatsApp', body: 'Cal.com, Google Calendar o Excel. Meta Business o WhatsApp Business. Cinco minutos, un clic por integración.', tag: 'Día 1' },
    { n: '02', title: 'Elegís qué querés automatizar', body: 'Empezá con un flujo (recordatorios) o con todo el sistema. Cliniq aprende tu tono y tus protocolos.', tag: 'Día 1–3' },
    { n: '03', title: 'Medís la diferencia en 30 días', body: 'Turnos recuperados, horas ahorradas, dinero en la agenda. Si no cubre su costo, te devolvemos la plata.', tag: 'Día 30' },
  ];
  return (
    <section className="bg-[var(--cq-surface-2)] border-y border-[var(--cq-border)]">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-24 md:py-32">
        <Reveal><SectionLabel number="03">Cómo funciona</SectionLabel></Reveal>
        <Reveal delay={80}>
          <h2 className="text-[36px] md:text-[56px] leading-[1.02] tracking-[-0.03em] font-semibold max-w-[900px]">
            Tres pasos. <span className="text-[var(--cq-fg-muted)]">Sin equipo técnico, sin migraciones, sin riesgo.</span>
          </h2>
        </Reveal>

        <div className="mt-16 grid md:grid-cols-3 gap-6 md:gap-10">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 120}>
              <div>
                <div className="flex items-baseline justify-between border-b border-[var(--cq-fg)] pb-3 mb-5">
                  <span className="font-mono text-[13px]">{s.n}</span>
                  <MonoLabel>{s.tag}</MonoLabel>
                </div>
                <h3 className="text-[22px] md:text-[26px] tracking-[-0.02em] font-semibold leading-[1.1] mb-3">{s.title}</h3>
                <p className="text-[14.5px] text-[var(--cq-fg-muted)] leading-relaxed">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

// Testimonial / Quote
const LandingStory = () => (
  <section id="historias" className="max-w-[1280px] mx-auto px-5 md:px-8 py-24 md:py-32">
    <Reveal><SectionLabel number="04">Historias</SectionLabel></Reveal>
    <Reveal delay={100}>
      <blockquote className="max-w-[960px]">
        <p className="text-[28px] md:text-[44px] leading-[1.15] tracking-[-0.02em] font-medium" style={{ textWrap: 'balance' }}>
          "En el primer mes recuperamos <span className="text-[var(--cq-accent)]">ocho turnos que se habrían perdido</span>. Eso son USD 480 que antes se me iban en olvidos. Y mi recepcionista dejó de llamar uno por uno — ahora atiende pacientes."
        </p>
        <footer className="mt-10 flex items-center gap-4">
          <CliniqAvatar name="María Bonomi" size={48} tone="mono"/>
          <div>
            <div className="text-[15px] font-medium">Dra. María Bonomi</div>
            <MonoLabel>Clínica Dental Bonomi · Pocitos, Montevideo</MonoLabel>
          </div>
          <div className="ml-auto hidden md:flex items-center gap-6">
            <div>
              <div className="text-[22px] font-semibold">USD 480</div>
              <MonoLabel>Mes 1</MonoLabel>
            </div>
            <div>
              <div className="text-[22px] font-semibold">8 turnos</div>
              <MonoLabel>Recuperados</MonoLabel>
            </div>
          </div>
        </footer>
      </blockquote>
    </Reveal>
  </section>
);

// Pricing
const LandingPricing = ({ onSignup }) => {
  const plans = [
    { name: 'Starter', price: '100', setup: 'USD 350', desc: '1 automatización a tu elección. Ideal para validar el impacto.', includes: ['Recordatorios WhatsApp', 'Panel básico', 'Soporte por WhatsApp'], cta: 'Empezar' },
    { name: 'Pro', price: '250', setup: 'USD 1.200', desc: 'El sistema mínimo viable para una clínica que quiere crecer.', includes: ['3 automatizaciones', 'Reportes semanales al dueño', 'Onboarding por Loom', 'Soporte prioritario'], cta: 'Elegir Pro', highlight: true },
    { name: 'Sistema', price: '380', setup: 'USD 2.500', desc: 'Todo el sistema operativo Cliniq. Para clínicas en escala.', includes: ['6+ automatizaciones', 'CRM integrado', 'Chatbot 24/7', 'Facturación DGI', 'Ejecutivo dedicado'], cta: 'Agendar demo' },
  ];
  return (
    <section id="precios" className="max-w-[1280px] mx-auto px-5 md:px-8 py-24 md:py-32">
      <Reveal><SectionLabel number="05">Precios</SectionLabel></Reveal>
      <Reveal delay={80}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="text-[36px] md:text-[56px] leading-[1.02] tracking-[-0.03em] font-semibold max-w-[680px]">
            Se paga solo antes de que lo notes.
          </h2>
          <p className="text-[14.5px] text-[var(--cq-fg-muted)] max-w-[360px]">
            Todos los planes incluyen garantía: si en 30 días no cubre su costo, te devolvemos la implementación.
          </p>
        </div>
      </Reveal>

      <div className="mt-16 grid md:grid-cols-3 gap-5">
        {plans.map((p, i) => (
          <Reveal key={p.name} delay={i * 100}>
            <div className={`h-full flex flex-col p-7 md:p-8 rounded-[16px] border transition-all duration-300 ${p.highlight
              ? 'bg-[var(--cq-fg)] text-[var(--cq-bg)] border-[var(--cq-fg)]'
              : 'bg-[var(--cq-surface)] border-[var(--cq-border)] hover:border-[var(--cq-fg)]'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div className="text-[18px] font-semibold">{p.name}</div>
                {p.highlight && <CliniqBadge tone="accent">Más elegido</CliniqBadge>}
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`font-mono text-[12px] ${p.highlight ? 'text-[var(--cq-bg)]/60' : 'text-[var(--cq-fg-muted)]'}`}>USD</span>
                <span className="text-[56px] font-semibold tracking-tight leading-none">{p.price}</span>
                <span className={`text-[13px] ${p.highlight ? 'text-[var(--cq-bg)]/60' : 'text-[var(--cq-fg-muted)]'}`}>/mes</span>
              </div>
              <div className={`mt-2 font-mono text-[11px] uppercase tracking-wider ${p.highlight ? 'text-[var(--cq-bg)]/60' : 'text-[var(--cq-fg-muted)]'}`}>
                Implementación única · {p.setup}
              </div>
              <p className={`mt-5 text-[14px] leading-relaxed ${p.highlight ? 'text-[var(--cq-bg)]/80' : 'text-[var(--cq-fg-muted)]'}`}>
                {p.desc}
              </p>
              <ul className="mt-6 space-y-2.5 flex-1">
                {p.includes.map((it, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-[13.5px]">
                    <CliniqIcons.Check size={14}/>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={onSignup}
                aria-label={`${p.cta} — plan ${p.name}`}
                className={`mt-8 h-11 rounded-[10px] font-medium transition-all active:scale-[0.98] ${p.highlight
                  ? 'bg-[var(--cq-bg)] text-[var(--cq-fg)] hover:bg-[var(--cq-accent)] hover:text-white'
                  : 'bg-[var(--cq-fg)] text-[var(--cq-bg)] hover:bg-[var(--cq-accent)]'
                }`}
              >
                {p.cta}
              </button>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
};

// Final CTA + footer
const LandingFooter = ({ onSignup }) => (
  <>
    <section className="max-w-[1280px] mx-auto px-5 md:px-8">
      <Reveal>
        <div className="bg-[var(--cq-fg)] text-[var(--cq-bg)] rounded-[20px] p-10 md:p-16 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-[var(--cq-accent)] opacity-30 blur-3xl"/>
          <MonoLabel className="text-[var(--cq-bg)]/60">[ Cliniq · 2026 ]</MonoLabel>
          <h2 className="mt-4 text-[40px] md:text-[72px] leading-[0.98] tracking-[-0.03em] font-semibold max-w-[900px]">
            Tu clínica es buena.<br/>
            <span className="italic font-normal" style={{ fontFamily: 'Instrument Serif, Geist, serif' }}>Hagámosla inevitable.</span>
          </h2>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <button
              onClick={onSignup}
              className="h-12 px-6 rounded-[10px] bg-[var(--cq-bg)] text-[var(--cq-fg)] font-medium hover:bg-[var(--cq-accent)] hover:text-white transition-all active:scale-[0.98] inline-flex items-center gap-2"
            >
              Activar Cliniq en mi clínica <CliniqIcons.Arrow size={14}/>
            </button>
            <span className="font-mono text-[11px] text-[var(--cq-bg)]/60">
              DEMO EN VIVO · 20 MIN · SIN TARJETA
            </span>
          </div>
        </div>
      </Reveal>
    </section>

    <footer className="max-w-[1280px] mx-auto px-5 md:px-8 py-16">
      <div className="grid md:grid-cols-[1fr_auto_auto_auto] gap-10 md:gap-16">
        <div>
          <div className="flex items-center gap-2.5">
            <CliniqIcons.Logo size={22}/>
            <span className="text-[17px] font-semibold tracking-tight">Cliniq</span>
          </div>
          <p className="mt-4 text-[13.5px] text-[var(--cq-fg-muted)] max-w-[280px] leading-relaxed">
            Inteligencia automatizada para clínicas de salud en Uruguay y la región.
          </p>
        </div>
        <div>
          <MonoLabel>Producto</MonoLabel>
          <ul className="mt-3 space-y-2 text-[13.5px]">
            <li><a href="#" className="hover:text-[var(--cq-accent)]">Automatizaciones</a></li>
            <li><a href="#" className="hover:text-[var(--cq-accent)]">Dashboard</a></li>
            <li><a href="#" className="hover:text-[var(--cq-accent)]">Integraciones</a></li>
            <li><a href="#" className="hover:text-[var(--cq-accent)]">Precios</a></li>
          </ul>
        </div>
        <div>
          <MonoLabel>Legal</MonoLabel>
          <ul className="mt-3 space-y-2 text-[13.5px]">
            <li><a href="#" className="hover:text-[var(--cq-accent)]">Privacidad</a></li>
            <li><a href="#" className="hover:text-[var(--cq-accent)]">Términos</a></li>
            <li><a href="#" className="hover:text-[var(--cq-accent)]">LSSI / DGI</a></li>
          </ul>
        </div>
        <div>
          <MonoLabel>Contacto</MonoLabel>
          <ul className="mt-3 space-y-2 text-[13.5px]">
            <li>hola@cliniq.uy</li>
            <li>+598 99 000 000</li>
            <li>Pocitos, Montevideo</li>
          </ul>
        </div>
      </div>
      <Divider className="my-10"/>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <MonoLabel>© 2026 Cliniq · Montevideo</MonoLabel>
        <MonoLabel>Uptime · 99.98%</MonoLabel>
      </div>
    </footer>
  </>
);

// Exported Landing page
const CliniqLanding = ({ onNavigate }) => {
  return (
    <main className="bg-[var(--cq-bg)] text-[var(--cq-fg)]">
      <LandingNav onLogin={() => onNavigate('login')} onSignup={() => onNavigate('login')} />
      <LandingHero onLogin={() => onNavigate('login')} onSignup={() => onNavigate('login')} />
      <LandingProduct/>
      <LandingHow/>
      <LandingStory/>
      <LandingPricing onSignup={() => onNavigate('login')}/>
      <LandingFooter onSignup={() => onNavigate('login')}/>
    </main>
  );
};

window.CliniqLanding = CliniqLanding;
})();
