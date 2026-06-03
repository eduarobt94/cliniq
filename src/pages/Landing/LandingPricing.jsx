import { useState } from 'react';
import { Icons, Badge, SectionLabel } from '../../components/ui';
import { Reveal } from './Reveal';

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 39,
    priceAnnual: 33,
    annualTotal: 390,
    desc: 'Para el profesional independiente que quiere organizarse.',
    limit: '1 profesional · pacientes y citas ilimitadas',
    includes: [
      'Agenda completa',
      'Gestión de pacientes ilimitados',
      'Dashboard y métricas',
      'Recordatorios automáticos WhatsApp + Email',
      'Inbox básico',
      'Historial clínico completo',
      '3 automatizaciones activas',
    ],
    excludes: [
      'IA conversacional',
      'Multiusuario',
      'Multi-sucursal',
    ],
    cta: 'Empezar',
  },
  {
    id: 'professional',
    name: 'Professional',
    priceMonthly: 79,
    priceAnnual: 66,
    annualTotal: 790,
    desc: 'El sistema mínimo viable para una clínica que quiere crecer.',
    limit: 'Hasta 5 profesionales · todo ilimitado',
    includes: [
      'Todo de Starter',
      'IA responde WhatsApp 24/7',
      'Automatizaciones ilimitadas',
      'Roles y permisos (admin / profesional)',
      'Reportes avanzados',
      'Gestión de lista de espera',
      'Recordatorios inteligentes',
      'Onboarding guiado',
    ],
    excludes: [
      'Multi-sucursal',
      'Analytics por equipo',
    ],
    cta: 'Elegir Professional',
    highlight: true,
  },
  {
    id: 'growth',
    name: 'Growth',
    priceMonthly: 149,
    priceAnnual: 124,
    annualTotal: 1490,
    desc: 'Para clínicas medianas con múltiples profesionales o sedes.',
    limit: 'Hasta 15 profesionales · múltiples sucursales',
    includes: [
      'Todo de Professional',
      'Multi-sucursal con reportes consolidados',
      'Analytics avanzados por profesional/sucursal',
      'Gestión de equipo y productividad',
      'API access e integraciones',
      'Onboarding dedicado 1:1',
      'Soporte prioritario con SLA',
      'Personalización de marca',
    ],
    excludes: [],
    cta: 'Agendar demo',
  },
];

function CheckIcon({ muted }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className={`mt-[2px] shrink-0 ${muted ? 'opacity-30' : ''}`}
    >
      <path
        d="M2.5 7.5L5.5 10.5L11.5 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className="mt-[2px] shrink-0 opacity-25"
    >
      <path
        d="M3 3L11 11M11 3L3 11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LandingPricing({ onSignup }) {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="precios" className="max-w-[1280px] mx-auto px-5 md:px-8 py-24 md:py-32">
      {/* Header */}
      <Reveal>
        <SectionLabel number="05">Precios</SectionLabel>
      </Reveal>
      <Reveal delay={80}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="text-[36px] md:text-[52px] leading-[1.02] tracking-[-0.03em] font-semibold max-w-[640px]">
            Se paga solo antes de que lo notes.
          </h2>
          <p className="text-[14.5px] text-[var(--cq-fg-muted)] max-w-[340px]">
            Todos los planes incluyen garantía: si en 30 días no cubre su costo, te devolvemos el
            importe.
          </p>
        </div>
      </Reveal>

      {/* Toggle mensual / anual */}
      <Reveal delay={140}>
        <div className="mt-10 flex items-center gap-3">
          <span
            className={`text-[13.5px] transition-colors ${
              !annual ? 'text-[var(--cq-fg)] font-medium' : 'text-[var(--cq-fg-muted)]'
            }`}
          >
            Mensual
          </span>
          <button
            onClick={() => setAnnual(v => !v)}
            aria-pressed={annual}
            aria-label="Cambiar a facturación anual"
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cq-accent)] ${
              annual ? 'bg-[var(--cq-accent)]' : 'bg-[var(--cq-border)]'
            }`}
          >
            <span
              className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
                annual ? 'translate-x-[22px]' : 'translate-x-[3px]'
              }`}
            />
          </button>
          <span
            className={`text-[13.5px] transition-colors ${
              annual ? 'text-[var(--cq-fg)] font-medium' : 'text-[var(--cq-fg-muted)]'
            }`}
          >
            Anual
          </span>
          {annual && (
            <span className="text-[11.5px] font-medium text-[var(--cq-accent)] bg-[var(--cq-accent)]/10 px-2 py-0.5 rounded-full">
              2 meses gratis
            </span>
          )}
        </div>
      </Reveal>

      {/* Cards */}
      <div className="mt-8 grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {plans.map((p, i) => {
          const price = annual ? p.priceAnnual : p.priceMonthly;
          const isHighlight = p.highlight;

          return (
            <Reveal key={p.id} delay={i * 80}>
              <div
                className={`h-full flex flex-col rounded-[16px] border transition-all duration-300 overflow-hidden ${
                  isHighlight
                    ? 'bg-[var(--cq-fg)] text-[var(--cq-bg)] border-[var(--cq-fg)] shadow-xl shadow-black/20'
                    : 'bg-[var(--cq-surface)] border-[var(--cq-border)] hover:border-[var(--cq-fg-muted)]'
                }`}
              >
                {/* Card header */}
                <div className="p-6 pb-5">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-[16px] font-semibold">{p.name}</span>
                    {isHighlight && <Badge tone="accent">Más elegido</Badge>}
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`font-mono text-[11px] ${
                        isHighlight ? 'text-[var(--cq-bg)]/50' : 'text-[var(--cq-fg-muted)]'
                      }`}
                    >
                      USD
                    </span>
                    <span className="text-[52px] font-semibold tracking-tight leading-none">
                      {price}
                    </span>
                    <span
                      className={`text-[12px] ${
                        isHighlight ? 'text-[var(--cq-bg)]/50' : 'text-[var(--cq-fg-muted)]'
                      }`}
                    >
                      /mes
                    </span>
                  </div>

                  {/* Annual total */}
                  {annual && p.annualTotal > 0 && (
                    <div
                      className={`mt-1 text-[11px] font-mono ${
                        isHighlight ? 'text-[var(--cq-bg)]/50' : 'text-[var(--cq-fg-muted)]'
                      }`}
                    >
                      USD {p.annualTotal.toLocaleString()}/año · facturado anualmente
                    </div>
                  )}

                  {/* Limit badge */}
                  <div
                    className={`mt-4 text-[11.5px] font-mono leading-relaxed ${
                      isHighlight ? 'text-[var(--cq-bg)]/60' : 'text-[var(--cq-fg-muted)]'
                    }`}
                  >
                    {p.limit}
                  </div>

                  {/* Desc */}
                  <p
                    className={`mt-3 text-[13px] leading-relaxed ${
                      isHighlight ? 'text-[var(--cq-bg)]/75' : 'text-[var(--cq-fg-muted)]'
                    }`}
                  >
                    {p.desc}
                  </p>
                </div>

                {/* Divider */}
                <div
                  className={`mx-6 border-t ${
                    isHighlight ? 'border-[var(--cq-bg)]/15' : 'border-[var(--cq-border)]'
                  }`}
                />

                {/* Features */}
                <div className="p-6 pt-5 flex-1 flex flex-col">
                  <ul className="space-y-2.5 flex-1">
                    {p.includes.map((it, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-[12.5px] leading-snug">
                        <CheckIcon muted={false} />
                        <span>{it}</span>
                      </li>
                    ))}
                    {p.excludes.map((it, j) => (
                      <li
                        key={`x-${j}`}
                        className={`flex items-start gap-2.5 text-[12.5px] leading-snug ${
                          isHighlight ? 'text-[var(--cq-bg)]/35' : 'text-[var(--cq-fg-muted)]/50'
                        }`}
                      >
                        <XIcon />
                        <span className="line-through">{it}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    onClick={onSignup}
                    aria-label={`${p.cta} — plan ${p.name}`}
                    className={`mt-7 h-11 rounded-[10px] text-[13.5px] font-medium transition-all active:scale-[0.98] ${
                      isHighlight
                        ? 'bg-[var(--cq-bg)] text-[var(--cq-fg)] hover:bg-[var(--cq-accent)] hover:text-white'
                        : 'bg-[var(--cq-fg)] text-[var(--cq-bg)] hover:bg-[var(--cq-accent)]'
                    }`}
                  >
                    {p.cta}
                  </button>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      {/* Footer note */}
      <Reveal delay={400}>
        <p className="mt-8 text-center text-[12.5px] text-[var(--cq-fg-muted)]">
          Todos los planes incluyen exportación de datos · sin permanencia · cancela cuando quieras
        </p>
      </Reveal>
    </section>
  );
}
