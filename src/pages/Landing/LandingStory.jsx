import { Avatar, MonoLabel, SectionLabel } from '../../components/ui';
import { Reveal } from './Reveal';

export function LandingStory() {
  return (
    <section id="historias" className="max-w-[1280px] mx-auto px-5 md:px-8 py-24 md:py-32">
      <Reveal>
        <SectionLabel number="04">Historias</SectionLabel>
      </Reveal>
      <Reveal delay={100}>
        <blockquote className="max-w-[960px]">
          <p
            className="text-[28px] md:text-[44px] leading-[1.15] tracking-[-0.02em] font-medium"
            style={{ textWrap: 'balance' }}
          >
            "En el primer mes recuperamos{' '}
            <span className="text-[var(--cq-accent)]">ocho turnos que se habrían perdido</span>. Eso
            son USD 480 que antes se me iban en olvidos. Y mi recepcionista dejó de llamar uno por
            uno — ahora atiende pacientes."
          </p>
          <footer className="mt-10 flex items-center gap-4">
            <Avatar name="María Bonomi" size={48} tone="mono" />
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
}
