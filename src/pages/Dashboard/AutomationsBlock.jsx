import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAutomations } from '../../hooks/useAutomations';
import { Icons, Card, MonoLabel, Divider } from '../../components/ui';

const TYPE_LABEL = {
  appointment_reminder: 'Recordatorio de turno · WhatsApp',
};

const DOT = {
  active: 'bg-[var(--cq-success)] animate-pulse',
  warn:   'bg-[var(--cq-warn)]',
  idle:   'bg-[var(--cq-fg-muted)]',
};

const RowSkeleton = memo(function RowSkeleton() {
  return (
    <li className="px-5 py-3 animate-pulse flex flex-col gap-2">
      <div className="h-3 w-1/2 rounded bg-[var(--cq-surface-3)]" />
      <div className="h-2 w-1/3 rounded bg-[var(--cq-surface-3)]" />
    </li>
  );
});

const AutomationRow = memo(function AutomationRow({ auto, stats, code }) {
  const runs = stats?.total_sent ?? 0;
  const ok   = stats?.ok        ?? 0;
  const pct  = runs > 0 ? Math.round((ok / runs) * 100) : null;
  const status = !auto.enabled ? 'idle' : (pct !== null && pct < 90 ? 'warn' : 'active');

  const lastStr = stats?.last_sent_at
    ? new Date(stats.last_sent_at).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' })
    : 'Sin envíos';

  return (
    <li className="px-5 py-3 hover:bg-[var(--cq-surface-2)] transition-colors cursor-pointer">
      <div className="flex items-center gap-3 mb-1.5">
        <span className={`size-2 rounded-full shrink-0 ${DOT[status]}`} />
        <MonoLabel>{code}</MonoLabel>
        <MonoLabel className="ml-auto">{lastStr}</MonoLabel>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] font-medium truncate">
            {TYPE_LABEL[auto.type] ?? auto.type}
          </div>
          <div className="mt-1 flex items-center gap-2">
            {pct !== null ? (
              <>
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
                <MonoLabel>{ok}/{runs} OK</MonoLabel>
              </>
            ) : (
              <MonoLabel>{auto.enabled ? 'Activo · sin envíos aún' : 'Inactivo'}</MonoLabel>
            )}
          </div>
        </div>
      </div>
    </li>
  );
});

export function AutomationsBlock() {
  const navigate  = useNavigate();
  const { clinic } = useAuth();
  const { automations, stats, loading } = useAutomations(clinic?.id);

  return (
    <Card padded={false}>
      <div className="flex items-center justify-between p-5 pb-4">
        <div>
          <MonoLabel>Automatizaciones</MonoLabel>
          <h3 className="mt-1 text-[18px] font-semibold tracking-tight">Estado del sistema</h3>
        </div>
        <button
          onClick={() => navigate('/dashboard/automatizaciones')}
          className="text-[12px] font-medium text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] inline-flex items-center gap-1 transition-colors"
        >
          Ver todo <Icons.Arrow size={12} />
        </button>
      </div>
      <Divider />

      <ul className="divide-y divide-[var(--cq-border)]">
        {loading
          ? Array.from({ length: 2 }).map((_, i) => <RowSkeleton key={i} />)
          : automations.length === 0
          ? (
            <li className="px-5 py-6 text-[13px] text-[var(--cq-fg-muted)] text-center">
              Sin automatizaciones configuradas.
            </li>
          )
          : automations.map((auto, i) => (
              <AutomationRow
                key={auto.id}
                auto={auto}
                stats={stats}
                code={`AX-${String(i + 1).padStart(3, '0')}`}
              />
            ))
        }
      </ul>

      <div className="p-4">
        <button
          onClick={() => navigate('/dashboard/automatizaciones')}
          className="w-full h-9 text-[13px] font-medium text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] inline-flex items-center justify-center gap-1 transition-colors"
        >
          Ver todas las automatizaciones <Icons.Arrow size={12} />
        </button>
      </div>
    </Card>
  );
}
