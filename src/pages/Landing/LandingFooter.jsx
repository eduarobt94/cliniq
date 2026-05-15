import { Icons, MonoLabel, Divider } from '../../components/ui';
import { Reveal } from './Reveal';

export function LandingFooter({ onSignup }) {
  return (
    <>
      <section className="max-w-[1280px] mx-auto px-5 md:px-8">
        <Reveal>
          <div className="bg-[var(--cq-fg)] text-[var(--cq-bg)] rounded-[20px] p-10 md:p-16 relative overflow-hidden">
            <div className="absolute -right-20 -top-20 size-72 rounded-full bg-[var(--cq-accent)] opacity-30 blur-3xl" />
            <MonoLabel className="text-[var(--cq-bg)]/60">[ Cliniq · 2026 ]</MonoLabel>
            <h2 className="mt-4 text-[40px] md:text-[72px] leading-[0.98] tracking-[-0.03em] font-semibold max-w-[900px]">
              Tu clínica es buena.
              <br />
              <span
                className="italic font-normal"
                style={{ fontFamily: 'Instrument Serif, Geist, serif' }}
              >
                Hagámosla inevitable.
              </span>
            </h2>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <button
                onClick={onSignup}
                className="h-12 px-6 rounded-[10px] bg-[var(--cq-bg)] text-[var(--cq-fg)] font-medium hover:bg-[var(--cq-accent)] hover:text-white transition-all active:scale-[0.98] inline-flex items-center gap-2"
              >
                Activar Cliniq en mi clínica <Icons.Arrow size={14} />
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
              <Icons.Logo size={22} />
              <span className="text-[17px] font-semibold tracking-tight">Cliniq</span>
            </div>
            <p className="mt-4 text-[13.5px] text-[var(--cq-fg-muted)] max-w-[280px] leading-relaxed">
              Inteligencia automatizada para clínicas de salud en Uruguay y la región.
            </p>
          </div>
          <div>
            <MonoLabel>Producto</MonoLabel>
            <ul className="mt-3 space-y-2 text-[13.5px]">
              <li>
                <a href="#producto" className="hover:text-[var(--cq-accent)]">Automatizaciones</a>
              </li>
              <li>
                <a href="#dashboard" className="hover:text-[var(--cq-accent)]">Dashboard</a>
              </li>
              <li>
                <a href="#integraciones" className="hover:text-[var(--cq-accent)]">Integraciones</a>
              </li>
              <li>
                <a href="#precios" className="hover:text-[var(--cq-accent)]">Precios</a>
              </li>
            </ul>
          </div>
          <div>
            <MonoLabel>Legal</MonoLabel>
            <ul className="mt-3 space-y-2 text-[13.5px]">
              <li>
                <a href="/privacy" className="hover:text-[var(--cq-accent)]">Privacidad</a>
              </li>
              <li>
                <a href="/terms" className="hover:text-[var(--cq-accent)]">Términos</a>
              </li>
              <li>
                <a href="/legal" className="hover:text-[var(--cq-accent)]">LSSI / DGI</a>
              </li>
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
        <Divider className="my-10" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <MonoLabel>© 2026 Cliniq · Montevideo</MonoLabel>
          <MonoLabel>Uptime · 99.98%</MonoLabel>
        </div>
      </footer>
    </>
  );
}
