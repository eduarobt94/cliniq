import { Icons, Badge, MonoLabel, SectionLabel } from '../../components/ui';
import { Reveal } from './Reveal';

const plans = [
  {
    name: 'Starter',
    price: '100',
    setup: 'USD 350',
    desc: '1 automatización a tu elección. Ideal para validar el impacto.',
    includes: ['Recordatorios WhatsApp', 'Panel básico', 'Soporte por WhatsApp'],
    cta: 'Empezar',
  },
  {
    name: 'Pro',
    price: '250',
    setup: 'USD 1.200',
    desc: 'El sistema mínimo viable para una clínica que quiere crecer.',
    includes: [
      '3 automatizaciones',
      'Reportes semanales al dueño',
      'Onboarding por Loom',
      'Soporte prioritario',
    ],
    cta: 'Elegir Pro',
    highlight: true,
  },
  {
    name: 'Sistema',
    price: '380',
    setup: 'USD 2.500',
    desc: 'Todo el sistema operativo Cliniq. Para clínicas en escala.',
    includes: [
      '6+ automatizaciones',
      'CRM integrado',
      'Chatbot 24/7',
      'Facturación DGI',
      'Ejecutivo dedicado',
    ],
    cta: 'Agendar demo',
  },
];

export function LandingPricing({ onSignup }) {
  return (
    <section id="precios" className="max-w-[1280px] mx-auto px-5 md:px-8 py-24 md:py-32">
      <Reveal>
        <SectionLabel number="05">Precios</SectionLabel>
      </Reveal>
      <Reveal delay={80}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="text-[36px] md:text-[56px] leading-[1.02] tracking-[-0.03em] font-semibold max-w-[680px]">
            Se paga solo antes de que lo notes.
          </h2>
          <p className="text-[14.5px] text-[var(--cq-fg-muted)] max-w-[360px]">
            Todos los planes incluyen garantía: si en 30 días no cubre su costo, te devolvemos la
            implementación.
          </p>
        </div>
      </Reveal>

      <div className="mt-16 grid md:grid-cols-3 gap-5">
        {plans.map((p, i) => (
          <Reveal key={p.name} delay={i * 100}>
            <div
              className={`h-full flex flex-col p-7 md:p-8 rounded-[16px] border transition-all duration-300 ${
                p.highlight
                  ? 'bg-[var(--cq-fg)] text-[var(--cq-bg)] border-[var(--cq-fg)]'
                  : 'bg-[var(--cq-surface)] border-[var(--cq-border)] hover:border-[var(--cq-fg)]'
              }`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="text-[18px] font-semibold">{p.name}</div>
                {p.highlight && <Badge tone="accent">Más elegido</Badge>}
              </div>
              <div className="flex items-baseline gap-1">
                <span
                  className={`font-mono text-[12px] ${
                    p.highlight ? 'text-[var(--cq-bg)]/60' : 'text-[var(--cq-fg-muted)]'
                  }`}
                >
                  USD
                </span>
                <span className="text-[56px] font-semibold tracking-tight leading-none">
                  {p.price}
                </span>
                <span
                  className={`text-[13px] ${
                    p.highlight ? 'text-[var(--cq-bg)]/60' : 'text-[var(--cq-fg-muted)]'
                  }`}
                >
                  /mes
                </span>
              </div>
              <div
                className={`mt-2 font-mono text-[11px] uppercase tracking-wider ${
                  p.highlight ? 'text-[var(--cq-bg)]/60' : 'text-[var(--cq-fg-muted)]'
                }`}
              >
                Implementación única · {p.setup}
              </div>
              <p
                className={`mt-5 text-[14px] leading-relaxed ${
                  p.highlight ? 'text-[var(--cq-bg)]/80' : 'text-[var(--cq-fg-muted)]'
                }`}
              >
                {p.desc}
              </p>
              <ul className="mt-6 space-y-2.5 flex-1">
                {p.includes.map((it, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-[13.5px]">
                    <Icons.Check size={14} />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={onSignup}
                aria-label={`${p.cta} — plan ${p.name}`}
                className={`mt-8 h-11 rounded-[10px] font-medium transition-all active:scale-[0.98] ${
                  p.highlight
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
}
