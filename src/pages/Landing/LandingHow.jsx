import { MonoLabel, SectionLabel } from '../../components/ui';
import { Reveal } from './Reveal';

const steps = [
  {
    n: '01',
    title: 'Conectás tu agenda y tu WhatsApp',
    body: 'Cal.com, Google Calendar o Excel. Meta Business o WhatsApp Business. Cinco minutos, un clic por integración.',
    tag: 'Día 1',
  },
  {
    n: '02',
    title: 'Elegís qué querés automatizar',
    body: 'Empezá con un flujo (recordatorios) o con todo el sistema. Cliniq aprende tu tono y tus protocolos.',
    tag: 'Día 1–3',
  },
  {
    n: '03',
    title: 'Medís la diferencia en 30 días',
    body: 'Turnos recuperados, horas ahorradas, dinero en la agenda. Si no cubre su costo, te devolvemos la plata.',
    tag: 'Día 30',
  },
];

export function LandingHow() {
  return (
    <section className="bg-[var(--cq-surface-2)] border-y border-[var(--cq-border)]">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-24 md:py-32">
        <Reveal>
          <SectionLabel number="03">Cómo funciona</SectionLabel>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="text-[36px] md:text-[56px] leading-[1.02] tracking-[-0.03em] font-semibold max-w-[900px]">
            Tres pasos.{' '}
            <span className="text-[var(--cq-fg-muted)]">
              Sin equipo técnico, sin migraciones, sin riesgo.
            </span>
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
                <h3 className="text-[22px] md:text-[26px] tracking-[-0.02em] font-semibold leading-[1.1] mb-3">
                  {s.title}
                </h3>
                <p className="text-[14.5px] text-[var(--cq-fg-muted)] leading-relaxed">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
