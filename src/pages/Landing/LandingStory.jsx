import { MonoLabel, SectionLabel } from '../../components/ui';
import { Reveal } from './Reveal';

const antes = [
  'Recepcionista llama uno por uno para confirmar turnos',
  'Presupuestos que se pierden sin seguimiento',
  'Pacientes inactivos que nunca vuelven a llamar',
  'Reportes manuales que nadie tiene tiempo de hacer',
];

const despues = [
  'Cliniq envía el recordatorio y el paciente confirma con un 1',
  'Seguimiento automático a los 5 días sin intervención',
  'Reactivación de pacientes inactivos en piloto automático',
  'Reporte semanal en tu correo cada lunes a las 09:00',
];

export function LandingStory() {
  return (
    <section id="historias" className="max-w-[1280px] mx-auto px-5 md:px-8 py-24 md:py-32">
      <Reveal>
        <SectionLabel number="04">Antes y después</SectionLabel>
      </Reveal>
      <Reveal delay={80}>
        <h2 className="mt-4 text-[36px] md:text-[56px] leading-[1.02] tracking-[-0.03em] font-semibold max-w-[900px]">
          Lo que cambia cuando{' '}
          <span className="text-[var(--cq-fg-muted)]">la clínica trabaja sola.</span>
        </h2>
      </Reveal>

      <div className="mt-16 grid md:grid-cols-2 gap-px bg-[var(--cq-border)] border border-[var(--cq-border)] rounded-[14px] overflow-hidden">
        {/* Antes */}
        <Reveal delay={100}>
          <div className="bg-[var(--cq-bg)] p-8 md:p-10 h-full">
            <MonoLabel className="mb-6 block">[ Antes de Cliniq ]</MonoLabel>
            <ul className="space-y-4">
              {antes.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] text-[var(--cq-fg-muted)]">
                  <span className="mt-1 size-4 rounded-full border border-[var(--cq-border)] shrink-0 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--cq-border)]" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        {/* Después */}
        <Reveal delay={180}>
          <div className="bg-[var(--cq-surface-2)] p-8 md:p-10 h-full">
            <MonoLabel className="mb-6 block">[ Con Cliniq ]</MonoLabel>
            <ul className="space-y-4">
              {despues.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] text-[var(--cq-fg)]">
                  <span className="mt-1 size-4 rounded-full bg-[var(--cq-accent)] shrink-0 flex items-center justify-center">
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
