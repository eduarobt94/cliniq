import { useState, useEffect } from 'react';
import { Icons, Badge, Button, MonoLabel, Divider } from '../../components/ui';
import { Reveal } from './Reveal';

function PreviewCard() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 3), 2600);
    return () => clearInterval(t);
  }, []);

  const steps = [
    { t: 'Leer agenda de mañana', done: step >= 0 },
    { t: 'Generar mensaje personalizado', done: step >= 1 },
    { t: 'Enviar por WhatsApp · 12 pacientes', done: step >= 2 },
  ];

  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-[var(--cq-accent-soft)] rounded-[24px] -z-10 opacity-70 blur-xl" />
      <div className="bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[18px] overflow-hidden shadow-[0_24px_60px_-20px_rgba(0,0,0,0.18)]">
        {/* Window chrome */}
        <div className="flex items-center justify-between px-4 h-10 border-b border-[var(--cq-border)] bg-[var(--cq-surface-2)]">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[var(--cq-border)]" />
            <span className="size-2.5 rounded-full bg-[var(--cq-border)]" />
            <span className="size-2.5 rounded-full bg-[var(--cq-border)]" />
          </div>
          <MonoLabel>cliniq.uy / inbox</MonoLabel>
          <span className="w-12" />
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[13px] font-medium">Recordatorio de turno</div>
              <MonoLabel>AX-001 · WhatsApp</MonoLabel>
            </div>
            <Badge tone="success" dot>
              Activo
            </Badge>
          </div>

          <div className="space-y-2">
            {steps.map((s) => (
              <div
                key={s.t}
                className="flex items-center gap-3 px-3 h-10 rounded-lg bg-[var(--cq-surface-2)] border border-[var(--cq-border)]"
              >
                <div
                  className={`size-5 rounded-full flex items-center justify-center transition-all ${
                    s.done
                      ? 'bg-[var(--cq-success)] text-white'
                      : 'bg-[var(--cq-surface)] border border-[var(--cq-border)]'
                  }`}
                >
                  {s.done ? (
                    <Icons.Check size={11} />
                  ) : (
                    <span className="size-1.5 rounded-full bg-[var(--cq-fg-muted)]" />
                  )}
                </div>
                <span className="text-[13px] flex-1">{s.t}</span>
                {s.done && <MonoLabel>OK</MonoLabel>}
              </div>
            ))}
          </div>

          <Divider className="my-4" />

          <div className="flex items-start gap-2.5">
            <div className="size-8 rounded-full bg-[var(--cq-accent-soft)] text-[var(--cq-accent)] flex items-center justify-center shrink-0">
              <Icons.Whatsapp size={16} />
            </div>
            <div className="flex-1 bg-[var(--cq-surface-2)] border border-[var(--cq-border)] rounded-[10px] rounded-tl-sm p-3">
              <div className="text-[12.5px] leading-relaxed text-[var(--cq-fg)]">
                Hola Camila 👋 Te recordamos tu turno de{' '}
                <strong>mañana 15:30 con Dr. Santos</strong>. Respondé{' '}
                <strong>1</strong> para confirmar o <strong>2</strong> para reagendar.
              </div>
              <MonoLabel className="block mt-2">09:02 · enviado por Cliniq</MonoLabel>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -right-2 -bottom-6 bg-[var(--cq-fg)] text-[var(--cq-bg)] px-3 py-2 rounded-[8px] text-[12px] hidden md:flex items-center gap-2">
        <Icons.Sparkle size={12} />
        Corre cada mañana · 07:00 UYT
      </div>
    </div>
  );
}

export function LandingHero({ onLogin, onSignup }) {
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-12">
        <Reveal className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-10 md:mb-14">
          <MonoLabel>[ AX-001 / 2026 ]</MonoLabel>
          <MonoLabel>Montevideo · Uruguay</MonoLabel>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-[var(--cq-success)] animate-pulse" />
            <MonoLabel>Sistemas en línea</MonoLabel>
          </span>
        </Reveal>

        <div className="grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7">
            <Reveal>
              <h1
                id="hero-title"
                className="text-[44px] sm:text-[58px] md:text-[76px] leading-[0.96] tracking-[-0.03em] font-semibold text-[var(--cq-fg)]"
              >
                La clínica que
                <br />
                <span
                  className="italic font-normal"
                  style={{ fontFamily: 'Instrument Serif, Geist, serif' }}
                >
                  se opera sola
                </span>
                <br />
                mientras vos
                <br />
                atendés pacientes.
              </h1>
            </Reveal>

            <Reveal delay={120}>
              <p className="mt-8 text-[17px] md:text-[19px] text-[var(--cq-fg-muted)] max-w-[520px] leading-relaxed">
                Cliniq conecta tu agenda, tus pacientes y tu WhatsApp con inteligencia
                automatizada. Los turnos se confirman solos, los presupuestos se siguen solos, y tu
                equipo se enfoca en lo que importa:{' '}
                <strong className="text-[var(--cq-fg)] font-medium">atender pacientes</strong>.
              </p>
            </Reveal>

            <Reveal delay={220}>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Button variant="primary" size="lg" onClick={onSignup}>
                  Activar mi clínica <Icons.Arrow size={14} />
                </Button>
                <Button variant="outline" size="lg" onClick={onLogin}>
                  Ver demo · 2 min
                </Button>
                <span className="font-mono text-[11px] text-[var(--cq-fg-muted)] ml-2">
                  SIN TARJETA · SIN COMPROMISO
                </span>
              </div>
            </Reveal>
          </div>

          <Reveal delay={300} className="lg:col-span-5">
            <PreviewCard />
          </Reveal>
        </div>

        {/* Value strip */}
        <Reveal delay={400} className="mt-20 md:mt-28">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--cq-border)] border border-[var(--cq-border)] rounded-[14px] overflow-hidden">
            {[
              { Icon: Icons.Whatsapp,  l: 'Recordatorios automáticos', s: 'WhatsApp · sin intervención' },
              { Icon: Icons.Calendar,  l: 'Agenda siempre al día',      s: 'confirmaciones en tiempo real' },
              { Icon: Icons.Zap,       l: 'Seguimiento de presupuestos', s: 'sin llamadas manuales' },
              { Icon: Icons.Chart,     l: 'Reportes semanales',         s: 'en tu correo cada lunes' },
            ].map((m) => (
              <div key={m.l} className="bg-[var(--cq-bg)] p-5 md:p-6">
                <div className="size-9 rounded-[10px] bg-[var(--cq-accent-soft)] text-[var(--cq-accent)] flex items-center justify-center">
                  <m.Icon size={18} />
                </div>
                <div className="mt-4 text-[14px] font-medium text-[var(--cq-fg)]">{m.l}</div>
                <div className="mt-1 font-mono text-[10.5px] uppercase tracking-wider text-[var(--cq-fg-muted)]">
                  {m.s}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
