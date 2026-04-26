import { useState } from 'react';
import { AUTOMATIONS_MOCK } from '../../data/automations.mock.js';
import { Button, Badge, MonoLabel, Icons } from '../../components/ui';

const STATS = [
  { label: 'Ejecuciones hoy', value: '186' },
  { label: 'Tasa de éxito', value: '98.4%' },
  { label: 'Último error', value: 'ninguno' },
];

function AutomationCard({ automation }) {
  const { name, status, ok, total, lastRun, desc, trigger } = automation;
  const isActive = status === 'active';
  const ratio = total > 0 ? ok / total : 0;
  const barColor = ratio >= 0.95 ? 'var(--cq-success)' : 'var(--cq-warn)';

  return (
    <div className="bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[12px] p-4 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-[14px] text-[var(--cq-fg)] leading-snug">{name}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: isActive ? 'var(--cq-success)' : 'var(--cq-fg-muted)' }}
          />
          <span className="text-[12px] text-[var(--cq-fg-muted)]">
            {isActive ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-[12.5px] text-[var(--cq-fg-muted)] leading-relaxed">{desc}</p>

      {/* Trigger */}
      <MonoLabel>{trigger}</MonoLabel>

      {/* Progress bar */}
      <div className="flex flex-col gap-1">
        <div className="h-1.5 rounded-full bg-[var(--cq-surface-3)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: total > 0 ? `${ratio * 100}%` : '0%',
              backgroundColor: barColor,
            }}
          />
        </div>
        <span className="text-[11px] text-[var(--cq-fg-muted)]">
          {ok}/{total} OK
        </span>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11.5px] text-[var(--cq-fg-muted)]">{lastRun}</span>
        <button className="text-[12px] text-[var(--cq-accent)] hover:opacity-80 transition-opacity flex items-center gap-1">
          Ver detalles
          <Icons.Arrow size={12} />
        </button>
      </div>
    </div>
  );
}

export function Automatizaciones() {
  const activeCount = AUTOMATIONS_MOCK.filter((a) => a.status === 'active').length;
  const inactiveCount = AUTOMATIONS_MOCK.filter((a) => a.status === 'inactive').length;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--cq-fg)] leading-tight">
            Automatizaciones
          </h1>
          <p className="text-[13.5px] text-[var(--cq-fg-muted)] mt-0.5">
            {activeCount} activas · {inactiveCount} inactiva
          </p>
        </div>
        <Button size="sm" className="flex items-center gap-1.5 shrink-0">
          <Icons.Plus size={13} />
          Nueva automatización
        </Button>
      </div>

      {/* Summary stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[10px] px-4 py-3 flex flex-col gap-0.5"
          >
            <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-[var(--cq-fg-muted)]">
              {stat.label}
            </span>
            <span className="text-[15px] font-semibold text-[var(--cq-fg)]">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Automation cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AUTOMATIONS_MOCK.map((automation) => (
          <AutomationCard key={automation.id} automation={automation} />
        ))}
      </div>
    </div>
  );
}
