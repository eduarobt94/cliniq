import { Badge, Card, MonoLabel } from '../../components/ui';

const SERVICES = [
  { n: 'WhatsApp API · Meta', v: '99.9%' },
  { n: 'Google Calendar', v: 'sincronizado' },
  { n: 'Backup diario', v: '02:14 UYT' },
];

export function SystemBlock() {
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <MonoLabel>Estado del sistema</MonoLabel>
        <Badge tone="success" dot>
          Todo OK
        </Badge>
      </div>
      <ul className="space-y-2.5">
        {SERVICES.map((s) => (
          <li key={s.n} className="flex items-center justify-between text-[12.5px]">
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[var(--cq-success)]" />
              {s.n}
            </span>
            <MonoLabel>{s.v}</MonoLabel>
          </li>
        ))}
      </ul>
    </Card>
  );
}
