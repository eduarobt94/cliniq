import { Icons, Card, MonoLabel } from '../../components/ui';

const RISK_ITEMS = [
  { name: 'Presupuestos sin respuesta', amount: 'USD 3.240', count: '8 pacientes', tone: 'warn' },
  { name: 'Pacientes inactivos >6m', amount: 'USD 5.800', count: '23 pacientes', tone: 'danger' },
  { name: 'Turnos no confirmados', amount: 'USD 560', count: '3 turnos', tone: 'warn' },
];

export function RiskBlock() {
  return (
    <Card>
      <div className="flex items-start justify-between mb-5">
        <div>
          <MonoLabel>Dinero en riesgo</MonoLabel>
          <div className="mt-2 text-[26px] font-semibold tracking-tight leading-none">USD 9.600</div>
          <div className="mt-1.5 text-[12.5px] text-[var(--cq-fg-muted)]">
            Cliniq puede recuperar ~
            <span className="text-[var(--cq-accent)] font-medium">USD 4.100</span>
          </div>
        </div>
        <span className="size-8 rounded-[8px] bg-[var(--cq-accent-soft)] text-[var(--cq-accent)] flex items-center justify-center">
          <Icons.Pulse size={16} />
        </span>
      </div>
      <ul className="space-y-2">
        {RISK_ITEMS.map((it) => (
          <li key={it.name} className="flex items-center gap-3 py-2">
            <span
              className={`w-1 h-8 rounded-full ${
                it.tone === 'danger' ? 'bg-[var(--cq-danger)]' : 'bg-[var(--cq-warn)]'
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate">{it.name}</div>
              <MonoLabel>{it.count}</MonoLabel>
            </div>
            <div className="text-[13px] font-mono font-semibold">{it.amount}</div>
          </li>
        ))}
      </ul>
      <button className="mt-4 w-full h-11 rounded-[8px] bg-[var(--cq-fg)] text-[var(--cq-bg)] text-[13px] font-medium hover:bg-[var(--cq-accent)] transition-colors inline-flex items-center justify-center gap-1.5">
        Activar recuperación <Icons.Sparkle size={11} />
      </button>
    </Card>
  );
}
