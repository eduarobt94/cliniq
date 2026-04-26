import { useState } from 'react';
import { Card, MonoLabel, Badge, Icons, Divider } from '../../components/ui';

const kpis = [
  {
    category: 'Tasa de confirmación',
    value: '87%',
    delta: '+6 pts',
    trend: 'up',
    hint: 'objetivo: 90%',
  },
  {
    category: 'Turnos perdidos',
    value: '14',
    delta: '-3',
    trend: 'down-good',
    hint: 'vs. mes anterior',
  },
  {
    category: 'Mensajes enviados',
    value: '1.240',
    delta: '+18%',
    trend: 'up',
    hint: 'vía WhatsApp',
  },
  {
    category: 'Ingresos estimados',
    value: 'USD 18.400',
    delta: '+12%',
    trend: 'up',
    hint: 'basado en turnos',
  },
];

const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

const topPatients = [
  { name: 'Camila Álvarez', visits: 8, next: '2 may' },
  { name: 'Roberto Castro', visits: 6, next: '6 may' },
  { name: 'Sofía Torres', visits: 5, next: '4 may' },
  { name: 'Valentina Núñez', visits: 5, next: '9 may' },
  { name: 'Martín Pérez', visits: 4, next: '—' },
];

const automations = [
  { name: 'Recordatorio turno', runs: 142, rate: '97%' },
  { name: 'Seguimiento presupuestos', runs: 23, rate: '96%' },
  { name: 'Reactivación inactivos', runs: 18, rate: '94%' },
  { name: 'Reseñas Google', runs: 9, rate: '89%' },
  { name: 'Reporte semanal', runs: 4, rate: '100%' },
];

const ranges = ['3m', '6m', '1a'];

export function Reportes() {
  const [range, setRange] = useState('1a');

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--cq-fg)]">Reportes</h1>
          <p className="text-[13.5px] text-[var(--cq-fg-muted)] mt-0.5">Abril 2026</p>
        </div>
        <div className="flex items-center gap-1 bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[9px] p-1">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 h-8 rounded-[6px] text-[13px] font-mono uppercase tracking-wider transition-colors duration-150 ${
                range === r
                  ? 'bg-[var(--cq-fg)] text-[var(--cq-bg)]'
                  : 'text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.category}
            className="bg-[var(--cq-bg)] border border-[var(--cq-border)] rounded-[12px] p-5 flex flex-col gap-3"
          >
            <MonoLabel>{kpi.category}</MonoLabel>
            <div className="text-[28px] font-semibold leading-none text-[var(--cq-fg)]">
              {kpi.value}
            </div>
            <div className="flex items-center gap-2">
              {kpi.trend === 'up' && (
                <span className="inline-flex items-center gap-1 text-[12px] font-mono text-[var(--cq-accent)]">
                  <Icons.TrendUp size={13} />
                  {kpi.delta}
                </span>
              )}
              {kpi.trend === 'down-good' && (
                <span className="inline-flex items-center gap-1 text-[12px] font-mono text-[var(--cq-success)]">
                  <Icons.TrendDown size={13} />
                  {kpi.delta}
                </span>
              )}
            </div>
            <p className="text-[12px] text-[var(--cq-fg-muted)]">{kpi.hint}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <Card padded={false} className="p-5">
        <h2 className="text-[15px] font-semibold text-[var(--cq-fg)] mb-4">Facturación mensual</h2>
        <div className="w-full overflow-hidden">
          <svg
            width="100%"
            height="160"
            viewBox="0 0 600 160"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--cq-accent)" stopOpacity="0.15" />
                <stop offset="100%" stopColor="var(--cq-accent)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[40, 70, 100, 130].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="600"
                y2={y}
                stroke="var(--cq-border)"
                strokeWidth="1"
              />
            ))}

            {/* Fill area */}
            <path
              d="M 0,120 C 50,115 100,110 150,100 S 250,95 300,85 S 400,70 450,60 S 550,45 600,30 L 600,160 L 0,160 Z"
              fill="url(#chartGrad)"
            />

            {/* Line */}
            <path
              d="M 0,120 C 50,115 100,110 150,100 S 250,95 300,85 S 400,70 450,60 S 550,45 600,30"
              stroke="var(--cq-accent)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {/* Month labels */}
        <div className="flex justify-between mt-2 px-0">
          {months.map((m) => (
            <span key={m} className="font-mono text-[10px] uppercase tracking-wider text-[var(--cq-fg-muted)]">
              {m}
            </span>
          ))}
        </div>
      </Card>

      {/* Bottom two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top patients */}
        <Card padded={false} className="p-5">
          <h2 className="text-[15px] font-semibold text-[var(--cq-fg)] mb-4">Top pacientes</h2>
          <table className="w-full text-[13.5px]">
            <thead>
              <tr>
                <th className="text-left pb-2">
                  <MonoLabel>Nombre</MonoLabel>
                </th>
                <th className="text-center pb-2">
                  <MonoLabel>Visitas</MonoLabel>
                </th>
                <th className="text-right pb-2">
                  <MonoLabel>Próximo turno</MonoLabel>
                </th>
              </tr>
            </thead>
            <tbody>
              {topPatients.map((p, i) => (
                <tr
                  key={p.name}
                  className={i % 2 === 1 ? 'bg-[var(--cq-surface-2)]' : ''}
                >
                  <td className="py-2 pl-2 rounded-l-[6px] text-[var(--cq-fg)]">{p.name}</td>
                  <td className="py-2 text-center text-[var(--cq-fg-muted)] font-mono">{p.visits}</td>
                  <td className="py-2 pr-2 text-right rounded-r-[6px] text-[var(--cq-fg-muted)]">{p.next}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Automation performance */}
        <Card padded={false} className="p-5">
          <h2 className="text-[15px] font-semibold text-[var(--cq-fg)] mb-4">
            Rendimiento de automatizaciones
          </h2>
          <table className="w-full text-[13.5px]">
            <thead>
              <tr>
                <th className="text-left pb-2">
                  <MonoLabel>Automatización</MonoLabel>
                </th>
                <th className="text-center pb-2">
                  <MonoLabel>Ejecuciones</MonoLabel>
                </th>
                <th className="text-right pb-2">
                  <MonoLabel>Tasa</MonoLabel>
                </th>
              </tr>
            </thead>
            <tbody>
              {automations.map((a, i) => (
                <tr
                  key={a.name}
                  className={i % 2 === 1 ? 'bg-[var(--cq-surface-2)]' : ''}
                >
                  <td className="py-2 pl-2 rounded-l-[6px] text-[var(--cq-fg)]">{a.name}</td>
                  <td className="py-2 text-center text-[var(--cq-fg-muted)] font-mono">{a.runs}</td>
                  <td className="py-2 pr-2 text-right rounded-r-[6px] font-mono text-[var(--cq-success)]">{a.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
