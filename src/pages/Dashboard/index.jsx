import { useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useKpis } from '../../hooks/useKpis';
import { useClinic } from '../../hooks/useClinic';
import { useAppointments } from '../../hooks/useAppointments';
import { Button, MonoLabel } from '../../components/ui';
import { Icons } from '../../components/ui';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { AgendaBlock } from './AgendaBlock';
import { AutomationsBlock } from './AutomationsBlock';
import { RevenueBlock } from './RevenueBlock';
import { InboxBlock } from './InboxBlock';
import { RiskBlock } from './RiskBlock';
import { QuickActionsBlock } from './QuickActionsBlock';
import { SystemBlock } from './SystemBlock';
import { NewAppointmentModal } from './NewAppointmentModal';

const KpiSkeleton = memo(function KpiSkeleton() {
  return (
    <div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-8 w-20" />
  );
});

const KpiCard = memo(function KpiCard({ label, value, delta, trend, hint, loading }) {
  return (
    <div className="p-5 bg-[var(--cq-bg)]">
      <div className="flex items-center justify-between">
        <MonoLabel>{label}</MonoLabel>
        {delta && !loading && (
          <span
            className={`inline-flex items-center gap-1 text-[12px] font-medium ${
              trend === 'up'
                ? 'text-[var(--cq-success)]'
                : trend === 'down'
                ? 'text-[var(--cq-danger)]'
                : 'text-[var(--cq-fg-muted)]'
            }`}
          >
            {trend === 'up' ? (
              <Icons.TrendUp size={12} />
            ) : trend === 'down' ? (
              <Icons.TrendDown size={12} />
            ) : null}
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

const GreetingStrip = memo(function GreetingStrip({ onNewAppointment, clinicName }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <MonoLabel>Lun · 20 abr · 2026 · 09:14 UYT</MonoLabel>
        <h2 className="mt-2 text-[28px] md:text-[34px] tracking-[-0.02em] font-semibold leading-tight">
          {clinicName ? `Buen día, ${clinicName}.` : 'Buen día.'}
        </h2>
        <p className="text-[14px] text-[var(--cq-fg-muted)]">
          Mientras desayunabas, Cliniq confirmó{' '}
          <strong className="text-[var(--cq-fg)] font-medium">11 turnos</strong> y agendó{' '}
          <strong className="text-[var(--cq-fg)] font-medium">2 consultas nuevas</strong>.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          <Icons.Calendar size={14} /> Agenda
        </Button>
        <Button variant="secondary" size="sm">
          Exportar reporte
        </Button>
      </div>
    </div>
  );
});

export function Dashboard({ sidebarVariant = 'expanded', density = 'comfortable' }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [active, setActive] = useState('overview');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const { kpis, loading: kpisLoading } = useKpis();
  const { clinic } = useClinic();
  const { appointments, loading: appointmentsLoading } = useAppointments();

  const openModal  = useCallback(() => setModalOpen(true),  []);
  const closeModal = useCallback(() => setModalOpen(false), []);
  const openMobileMenu = useCallback(() => setMobileOpen(true), []);

  const gapClass = density === 'compact' ? 'gap-3' : 'gap-5';
  const padClass = density === 'compact' ? 'p-5 md:p-6' : 'p-5 md:p-8';

  const confirmedLabel = kpis
    ? `${kpis.confirmed_today} / ${kpis.total_today}`
    : null;
  const confirmRate = kpis && kpis.total_today > 0
    ? `${Math.round((kpis.confirmed_today / kpis.total_today) * 100)}%`
    : null;

  return (
    <div className="min-h-screen bg-[var(--cq-surface-2)] text-[var(--cq-fg)] flex">
      <Sidebar
        active={active}
        setActive={setActive}
        variant={sidebarVariant}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          onMobileMenu={openMobileMenu}
          onNewAppointment={openModal}
        />
        <main className={`flex-1 overflow-y-auto ${padClass}`}>
          <GreetingStrip onNewAppointment={openModal} clinicName={clinic?.name} />

          {/* KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--cq-border)] border border-[var(--cq-border)] rounded-[14px] overflow-hidden mb-5">
            <KpiCard label="Turnos confirmados" value={confirmedLabel} loading={kpisLoading} delta="+23%" trend="up" hint="vs. semana pasada" />
            <KpiCard label="Mensajes enviados" value={kpis?.reminders_sent} loading={kpisLoading} delta="+12" trend="up" hint="automáticos · 24h" />
            <KpiCard label="Tasa de confirmación" value={confirmRate} loading={kpisLoading} delta="+6 pts" trend="up" hint="objetivo: 90%" />
            <KpiCard label="Auto-confirmados" value={kpis?.auto_confirmed} loading={kpisLoading} delta="hoy" trend="flat" hint="sin intervención" />
          </div>

          {/* Main grid */}
          <div className={`grid lg:grid-cols-3 ${gapClass} mb-5`}>
            <AgendaBlock appointments={appointments} loading={appointmentsLoading} />
            <AutomationsBlock />
          </div>
          <div className={`grid lg:grid-cols-3 ${gapClass}`}>
            <RevenueBlock />
            <InboxBlock />
          </div>
          <div className={`grid lg:grid-cols-3 ${gapClass} mt-5`}>
            <RiskBlock />
            <QuickActionsBlock onNew={() => setModalOpen(true)} />
            <SystemBlock />
          </div>

          <div className="mt-8 flex items-center justify-between text-[12px] text-[var(--cq-fg-muted)]">
            <MonoLabel>Cliniq v2.4.1 · Sistema operativo</MonoLabel>
            <button onClick={() => { logout(); navigate('/'); }} className="hover:text-[var(--cq-fg)]">
              Cerrar sesión
            </button>
          </div>
        </main>
      </div>
      <NewAppointmentModal open={modalOpen} onClose={closeModal} />
    </div>
  );
}
