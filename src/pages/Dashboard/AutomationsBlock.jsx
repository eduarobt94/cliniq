import { Icons, Button, Card, MonoLabel, Divider } from '../../components/ui';

const FLOWS = [
  { code: 'AX-001', name: 'Recordatorio de turno · WhatsApp', runs: 142, ok: 138, status: 'active', last: 'hace 2 min' },
  { code: 'AX-002', name: 'Seguimiento de presupuestos', runs: 23, ok: 22, status: 'active', last: 'hace 14 min' },
  { code: 'AX-003', name: 'Reactivación pacientes inactivos', runs: 18, ok: 17, status: 'active', last: 'hace 1 h' },
  { code: 'AX-004', name: 'Reseñas en Google', runs: 9, ok: 8, status: 'warn', last: 'hace 3 h' },
  { code: 'AX-005', name: 'Reporte semanal al dueño', runs: 1, ok: 1, status: 'idle', last: 'ayer 09:00' },
];

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
        {FLOWS.map((f) => (
          <li
            key={f.code}
            className="px-5 py-3 hover:bg-[var(--cq-surface-2)] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-1.5">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  f.status === 'active'
                    ? 'bg-[var(--cq-success)] animate-pulse'
                    : f.status === 'warn'
                    ? 'bg-[var(--cq-warn)]'
                    : 'bg-[var(--cq-fg-muted)]'
                }`}
              />
              <MonoLabel>{f.code}</MonoLabel>
              <MonoLabel className="ml-auto">{f.last}</MonoLabel>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-medium truncate">{f.name}</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-[var(--cq-surface-3)] overflow-hidden max-w-[120px]">
                    <div
                      className="h-full bg-[var(--cq-success)]"
                      style={{ width: `${(f.ok / f.runs) * 100}%` }}
                    />
                  </div>
                  <MonoLabel>
                    {f.ok}/{f.runs} OK
                  </MonoLabel>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="p-4">
        <button className="w-full h-9 text-[13px] font-medium text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] inline-flex items-center justify-center gap-1">
          Ver todas las automatizaciones <Icons.Arrow size={12} />
        </button>
      </div>
    </Card>
  );
}
