import { Icons, MonoLabel, SectionLabel } from '../../components/ui';
import { Reveal } from './Reveal';

const features = [
  {
    n: '01',
    title: 'Agenda que confirma sola',
    body: 'Cada noche, Cliniq lee tu agenda y envía recordatorios personalizados por WhatsApp. El paciente confirma con un 1. Se acabó la llamada de recepción.',
    label: 'AGENDA',
  },
  {
    n: '02',
    title: 'Presupuestos que no se olvidan',
    body: 'Si un paciente recibió un presupuesto y no lo aprobó en 5 días, Cliniq le escribe. Amable, preciso, con tu tono de voz. El 60% responde.',
    label: 'SEGUIMIENTO',
  },
  {
    n: '03',
    title: 'Pacientes inactivos que vuelven',
    body: 'Cliniq detecta quién no vino en 6 meses y le manda el mensaje justo. Reactivás agenda sin contratar a nadie.',
    label: 'REACTIVACIÓN',
  },
  {
    n: '04',
    title: 'Facturación electrónica DGI',
    body: 'Emitís la factura desde el turno. Cliniq se conecta con DGI Uruguay y archiva todo. Contador feliz.',
    label: 'DGI · UY',
  },
  {
    n: '05',
    title: 'Chatbot 24/7 para nuevos pacientes',
    body: 'Tu WhatsApp responde solo fuera de horario: precios, horarios, cómo llegar, agendar. Entrena con tu información.',
    label: 'IA',
  },
  {
    n: '06',
    title: 'Reporte semanal para el dueño',
    body: 'Cada lunes a las 09:00, un resumen en tu correo: facturado, turnos nuevos, dinero en riesgo, top 3 alertas. Sin entrar a ningún dashboard.',
    label: 'REPORTES',
  },
];

export function LandingProduct() {
  return (
    <section
      id="producto"
      aria-labelledby="product-title"
      className="max-w-[1280px] mx-auto px-5 md:px-8 py-24 md:py-32"
    >
      <Reveal>
        <SectionLabel number="02">Qué hace Cliniq</SectionLabel>
      </Reveal>
      <Reveal delay={80}>
        <h2
          id="product-title"
          className="text-[36px] md:text-[56px] leading-[1.02] tracking-[-0.03em] font-semibold max-w-[900px]"
        >
          Seis automatizaciones que convierten
          <br className="hidden md:block" />
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
              <h3 className="text-[22px] md:text-[24px] tracking-[-0.02em] font-semibold leading-[1.15] mb-3">
                {f.title}
              </h3>
              <p className="text-[14.5px] text-[var(--cq-fg-muted)] leading-relaxed">{f.body}</p>
              <div className="mt-8 flex items-center gap-1.5 text-[13px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Ver flujo <Icons.ArrowUpRight size={12} />
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
