import { memo } from 'react';
import { Icons, Button, Card, MonoLabel, Divider } from '../../components/ui';

const FLOWS = [
  { id: 'ax001', code: 'AX-001', name: 'Recordatorio de turno · WhatsApp', runs: 142, ok: 138, status: 'active', last: 'hace 2 min'  },
  { id: 'ax002', code: 'AX-002', name: 'Seguimiento de presupuestos',       runs: 23,  ok: 22,  status: 'active', last: 'hace 14 min' },
  { id: 'ax003', code: 'AX-003', name: 'Reactivación pacientes inactivos',  runs: 18,  ok: 17,  status: 'active', last: 'hace 1 h'   },
  { id: 'ax004', code: 'AX-004', name: 'Reseñas en Google',                 runs: 9,   ok: 8,   status: 'warn',   last: 'hace 3 h'   },
  { id: 'ax005', code: 'AX-005', name: 'Reporte semanal al dueño',          runs: 1,   ok: 1,   status: 'idle',   last: 'ayer 09:00' },
];

const dotClass = {
  active: 'bg-[var(--cq-success)] animate-pulse',
  warn:   'bg-[var(--cq-warn)]',
  idle:   'bg-[var(--cq-fg-muted)]',
};

const AutomationRow = memo(({ flow }) => {
  const pct = Math.round((flow.ok / flow.runs) * 100);
  return (
    <li className="px-5 py-3 hover:bg-[var(--cq-surface-2)] transition-colors cursor-pointer">
      <div className="flex items-center gap-3 mb-1.5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass[flow.status] ?? dotClass.idle}`} />
        <MonoLabel>{flow.code}</MonoLabel>
        <MonoLabel className="ml-auto">{flow.last}</MonoLabel>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-medium truncate">{flow.name}</div>
          <div className="mt-1 flex items-center gap-2">
            <div
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Tasa de éxito: ${pct}%`}
              className="flex-1 h-1 rounded-full bg-[var(--cq-surface-3)] overflow-hidden max-w-[120px]"
            >
              <div className="h-full bg-[var(--cq-success)]" style={{ width: `${pct}%` }} />
            </div>
            <MonoLabel>{flow.ok}/{flow.runs} OK</MonoLabel>
          </div>
        </div>
      </div>
    </li>
  );
});

export function AutomationsBlock() {
  return (
    <Card padded={false}>
      <div className="flex items-center justify-between p-5 pb-4">
        <div>
          <MonoLabel>Automatizaciones</MonoLabel>
          <h3 className="mt-1 text-[18px] font-semibold tracking-tight">Estado del sistema</h3>
        </div>
        <Button variant="ghost" size="sm">
          <Icons.Plus size={12} /> Nueva
        </Button>
      </div>
      <Divider />
      <ul className="divide-y divide-[var(--cq-border)]">
        {FLOWS.map((f) => <AutomationRow key={f.id} flow={f} />)}
      </ul>
      <div className="p-4">
        <button className="w-full h-9 text-[13px] font-medium text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] inline-flex items-center justify-center gap-1">
          Ver todas las automatizaciones <Icons.Arrow size={12} />
        </button>
      </div>
    </Card>
  );
}
