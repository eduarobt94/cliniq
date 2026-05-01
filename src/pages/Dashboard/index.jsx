import { useState, useEffect, memo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useKpis } from '../../hooks/useKpis';
import { useClinic } from '../../hooks/useClinic';
import { useAppointments } from '../../hooks/useAppointments';
import { Button, MonoLabel } from '../../components/ui';
import { Icons } from '../../components/ui';
import { AgendaBlock } from './AgendaBlock';
import { AutomationsBlock } from './AutomationsBlock';
import { InboxBlock } from './InboxBlock';
import { QuickActionsBlock } from './QuickActionsBlock';
import { SystemBlock } from './SystemBlock';

const KpiSkeleton = memo(function KpiSkeleton() {
  return <div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-8 w-20" />;
});

const KpiCard = memo(function KpiCard({ label, value, delta, trend, hint, loading }) {
  return (
    <div className="p-5 bg-[var(--cq-bg)]">
      <div className="flex items-center justify-between">
        <MonoLabel>{label}</MonoLabel>
        {delta && !loading && (
          <span className={`inline-flex items-center gap-1 text-[12px] font-medium ${
            trend === 'up' ? 'text-[var(--cq-success)]' : trend === 'down' ? 'text-[var(--cq-danger)]' : 'text-[var(--cq-fg-muted)]'
          }`}>
            {trend === 'up' ? <Icons.TrendUp size={12} /> : trend === 'down' ? <Icons.TrendDown size={12} /> : null}
            {delta}
          </span>
        )}
      </div>
      <div className="mt-3 text-[30px] md:text-[34px] tracking-tight font-semibold leading-none">
        {loading ? <KpiSkeleton /> : (value ?? '—')}
      </div>
      <div className="mt-2 text-[12.5px] text-[var(--cq-fg-muted)]">{hint}</div>
    </div>
  );
});

function useGreeting() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const hour   = now.getHours();
  const saludo = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
  const fecha  = now.toLocaleDateString('es-UY', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    .replace(/\./g, '').replace(/,/g, ' ·');
  const hora   = now.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' });
  return { saludo, fecha: `${fecha} · ${hora} UYT` };
}

const GreetingStrip = memo(function GreetingStrip({ clinicName, kpis, kpisLoading }) {
  const { saludo, fecha } = useGreeting();
  const subline = kpisLoading
    ? 'Cargando resumen del día…'
    : kpis && kpis.total_today > 0
    ? <><strong className="text-[var(--cq-fg)] font-medium">{kpis.total_today} turnos</strong> hoy · <strong className="text-[var(--cq-fg)] font-medium">{kpis.confirmed_today} confirmados</strong> hasta ahora.</>
    : 'Sin turnos registrados por ahora. ¡Buen momento para agregar uno!';

  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <MonoLabel>{fecha}</MonoLabel>
        <h2 className="mt-2 text-[28px] md:text-[34px] tracking-[-0.02em] font-semibold leading-tight">
          {clinicName ? `${saludo}, ${clinicName}.` : `${saludo}.`}
        </h2>
        <p className="text-[14px] text-[var(--cq-fg-muted)]">{subline}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm"><Icons.Calendar size={14} /> Agenda</Button>
        <Button variant="secondary" size="sm">Exportar reporte</Button>
      </div>
    </div>
  );
});

export function Dashboard() {
  const { openModal, openModalExpress, openInvite } = useOutletContext() ?? {};
  const { kpis, loading: kpisLoading }             = useKpis();
  const { clinic }                                  = useClinic();
  const { appointments, loading: appointmentsLoading } = useAppointments();

  const confirmedLabel = kpis ? `${kpis.confirmed_today} / ${kpis.total_today}` : null;
  const confirmRate    = kpis && kpis.total_today > 0
    ? `${Math.round((kpis.confirmed_today / kpis.total_today) * 100)}%`
    : null;

  return (
    <>
      <GreetingStrip clinicName={clinic?.name} kpis={kpis} kpisLoading={kpisLoading} />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--cq-border)] border border-[var(--cq-border)] rounded-[14px] overflow-hidden mb-5">
        <KpiCard label="Turnos confirmados"   value={confirmedLabel}       loading={kpisLoading} hint="hoy" />
        <KpiCard label="Mensajes enviados"    value={kpis?.reminders_sent} loading={kpisLoading} hint="automáticos · 24h" />
        <KpiCard label="Tasa de confirmación" value={confirmRate}          loading={kpisLoading} hint="objetivo: 90%" />
        <KpiCard label="Auto-confirmados"     value={kpis?.auto_confirmed} loading={kpisLoading} hint="sin intervención" />
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <AgendaBlock appointments={appointments} loading={appointmentsLoading} />
        <AutomationsBlock />
      </div>
      <div className="grid lg:grid-cols-2 gap-5 mt-5">
        <InboxBlock />
        <div className="flex flex-col gap-5">
          <QuickActionsBlock onNew={openModal} onNewExpress={openModalExpress} onInvite={openInvite} />
          <SystemBlock />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between text-[12px] text-[var(--cq-fg-muted)]">
        <MonoLabel>Cliniq v2.4.1 · Sistema operativo</MonoLabel>
      </div>
    </>
  );
}
