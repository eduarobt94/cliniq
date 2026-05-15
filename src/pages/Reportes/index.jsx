import { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Cell,
} from 'recharts';
import { useAuth }     from '../../context/AuthContext';
import { useReportes } from '../../hooks/useReportes';
import { Card, MonoLabel, Icons } from '../../components/ui';

// ─── Config ───────────────────────────────────────────────────────────────────

const RANGES = [
  { id: '3m', label: '3M' },
  { id: '6m', label: '6M' },
  { id: '1a', label: '1A' },
  { id: '2a', label: '2A' },
];

const STATUS_CONFIG = [
  { key: 'confirmed',   label: 'Confirmado',  color: '#34d399' },
  { key: 'pending',     label: 'Pendiente',   color: '#f59e0b' },
  { key: 'new',         label: 'Nuevo',       color: '#60a5fa' },
  { key: 'rescheduled', label: 'Reagendado',  color: '#a78bfa' },
  { key: 'cancelled',   label: 'Cancelado',   color: '#f87171' },
];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const entry    = payload[0]?.payload;
  const fullLabel = entry?.fullLabel ?? label;
  const total    = entry?.total ?? 0;

  return (
    <div style={{
      background: '#1e2330',
      border:     '1px solid #2d3548',
      borderRadius: 10,
      padding:    '12px 16px',
      minWidth:   160,
      boxShadow:  '0 4px 20px rgba(0,0,0,0.4)',
    }}>
      <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10, fontWeight: 600, textTransform: 'capitalize' }}>
        {fullLabel}
      </p>
      {STATUS_CONFIG.map(({ key, label: sLabel, color }) => {
        const val = entry?.[key] ?? 0;
        if (!val) return null;
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#94a3b8', flex: 1 }}>{sLabel}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc', fontVariantNumeric: 'tabular-nums' }}>
              {val}
            </span>
          </div>
        );
      })}
      <div style={{ borderTop: '1px solid #2d3548', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#64748b' }}>Total</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>{total}</span>
      </div>
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function ChartLegend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center mt-4">
      {STATUS_CONFIG.map(({ key, label, color }) => (
        <div key={key} className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
          <span className="text-[11px] text-[var(--cq-fg-muted)]">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main chart component ─────────────────────────────────────────────────────

function ApptChart({ monthSeries, quarterSeries, range }) {
  const [granularity, setGranularity] = useState('mes');

  // Auto-switch to quarter when 2A selected (too many bars otherwise)
  useEffect(() => {
    if (range === '2a') setGranularity('trimestre');
    else                setGranularity('mes');
  }, [range]);

  const series = granularity === 'trimestre' ? quarterSeries : monthSeries;

  if (!series?.length) {
    return (
      <p className="text-[13px] text-[var(--cq-fg-muted)] py-6 text-center">
        Sin datos para el período.
      </p>
    );
  }

  const maxVal = Math.max(...series.map(s => s.total), 1);
  const yMax   = Math.ceil(maxVal * 1.2 / 5) * 5;

  return (
    <div>
      {/* Granularity toggle */}
      <div className="flex items-center gap-1 mb-5">
        {[{ id: 'mes', label: 'Por mes' }, { id: 'trimestre', label: 'Por trimestre' }].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setGranularity(id)}
            className={`px-3 h-7 rounded-[6px] text-[12px] font-medium transition-colors duration-150 ${
              granularity === id
                ? 'bg-[var(--cq-fg)] text-[var(--cq-bg)]'
                : 'text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] hover:bg-[var(--cq-surface-2)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={series}
          margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
          barCategoryGap="30%"
        >
          <CartesianGrid
            vertical={false}
            stroke="#2d3548"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="label"
            tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
            axisLine={false}
            tickLine={false}
            interval={range === '2a' && granularity === 'mes' ? 1 : 0}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, yMax]}
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: 'rgba(255,255,255,0.04)', radius: 4 }}
          />

          {STATUS_CONFIG.map(({ key, color }, i) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="stack"
              fill={color}
              radius={i === STATUS_CONFIG.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              maxBarSize={48}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      <ChartLegend />
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-[var(--cq-surface-3)] rounded ${className}`} />;
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, hint, loading, accent }) {
  const valueColor = accent === 'warn'
    ? 'text-[var(--cq-warn)]'
    : 'text-[var(--cq-fg)]';
  return (
    <div className="bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[12px] p-5 flex flex-col gap-3">
      <MonoLabel>{label}</MonoLabel>
      <div className={`text-[30px] font-semibold leading-none ${valueColor}`}>
        {loading ? <Skeleton className="h-8 w-20" /> : (value ?? '—')}
      </div>
      <p className="text-[12px] text-[var(--cq-fg-muted)]">{hint}</p>
    </div>
  );
}

// ─── Reportes page ────────────────────────────────────────────────────────────

export function Reportes() {
  const { clinic } = useAuth();
  const [range, setRange] = useState('1a');
  const { data, loading, error } = useReportes(clinic?.id, range);

  const rangeLabel = { '3m': 'últimos 3 meses', '6m': 'últimos 6 meses', '1a': 'último año', '2a': 'últimos 2 años' }[range];

  const confirmRateStr = data ? `${data.confirmRate}%`        : null;
  const cancelledStr   = data ? String(data.cancelled)         : null;
  const msgCountStr    = data ? data.msgCount.toLocaleString() : null;
  const noShowStr      = data ? String(data.noShows)           : null;
  const noShowRateStr  = data ? `${data.noShowRate}%`          : null;
  const autoSentStr    = data?.autoStats?.total_sent != null  ? String(data.autoStats.total_sent)   : null;
  const autoRateStr    = data?.autoStats?.success_rate != null ? `${data.autoStats.success_rate}%` : null;
  const autoLastSentStr = data?.autoStats?.last_sent_at
    ? new Date(data.autoStats.last_sent_at).toLocaleString('es-UY', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        timeZone: 'America/Montevideo',
      })
    : null;

  return (
    <div className="flex flex-col gap-6 max-w-[1200px] mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--cq-fg)]">Reportes</h1>
          <p className="text-[13.5px] text-[var(--cq-fg-muted)] mt-0.5 capitalize">{rangeLabel}</p>
        </div>
        <div className="flex items-center gap-1 bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[9px] p-1">
          {RANGES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setRange(id)}
              className={`px-3 h-8 rounded-[6px] text-[13px] font-mono uppercase tracking-wider transition-colors duration-150 ${
                range === id
                  ? 'bg-[var(--cq-fg)] text-[var(--cq-bg)]'
                  : 'text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-[10px] bg-[color-mix(in_oklch,var(--cq-danger)_12%,transparent)] border border-[color-mix(in_oklch,var(--cq-danger)_30%,transparent)] px-4 py-3 text-[13px] text-[var(--cq-danger)]">
          Error al cargar reportes: {error}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Tasa de confirmación"
          value={confirmRateStr}
          hint={`${data?.confirmed ?? '—'} de ${data?.total ?? '—'} turnos confirmados`}
          loading={loading}
        />
        <KpiCard
          label="Turnos cancelados"
          value={cancelledStr}
          hint="en el período seleccionado"
          loading={loading}
        />
        <KpiCard
          label="No-shows"
          value={noShowStr}
          hint={noShowRateStr ? `${noShowRateStr} del total — sin presentarse ni cancelar` : 'sin presentarse ni cancelar'}
          loading={loading}
          accent={data?.noShows > 0 ? 'warn' : undefined}
        />
        <KpiCard
          label="Mensajes enviados"
          value={msgCountStr}
          hint="outbound vía WhatsApp"
          loading={loading}
        />
      </div>

      {/* Turnos por mes — chart */}
      <Card padded={false} className="p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[15px] font-semibold text-[var(--cq-fg)]">Turnos por mes</h2>
          {data?.total != null && (
            <span className="text-[12px] font-mono text-[var(--cq-fg-muted)]">
              {data.total} total
            </span>
          )}
        </div>
        {loading ? (
          <Skeleton className="h-[280px] w-full mt-4" />
        ) : (
          <ApptChart
            monthSeries={data?.monthSeries ?? []}
            quarterSeries={data?.quarterSeries ?? []}
            range={range}
          />
        )}
      </Card>

      {/* Bottom: top pacientes + automatizaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Top pacientes */}
        <Card padded={false} className="p-5">
          <h2 className="text-[15px] font-semibold text-[var(--cq-fg)] mb-4">Top pacientes</h2>
          {loading ? (
            <div className="flex flex-col gap-2">
              {['sk-1','sk-2','sk-3','sk-4','sk-5'].map(k => <Skeleton key={k} className="h-8 w-full" />)}
            </div>
          ) : !data?.topPatients?.length ? (
            <p className="text-[13px] text-[var(--cq-fg-muted)]">Sin datos para el período.</p>
          ) : (
            <table className="w-full text-[13.5px]">
              <thead>
                <tr>
                  <th scope="col" className="text-left pb-2"><MonoLabel>Nombre</MonoLabel></th>
                  <th scope="col" className="text-center pb-2"><MonoLabel>Visitas</MonoLabel></th>
                  <th scope="col" className="text-right pb-2"><MonoLabel>Próximo turno</MonoLabel></th>
                </tr>
              </thead>
              <tbody>
                {data.topPatients.map((p, i) => (
                  <tr key={p.id} className={i % 2 === 1 ? 'bg-[var(--cq-surface-2)]' : ''}>
                    <td className="py-2 pl-2 rounded-l-[6px] text-[var(--cq-fg)]">{p.name}</td>
                    <td className="py-2 text-center text-[var(--cq-fg-muted)] font-mono">{p.visits}</td>
                    <td className="py-2 pr-2 text-right rounded-r-[6px] text-[var(--cq-fg-muted)]">{p.next}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Automatizaciones */}
        <Card padded={false} className="p-5">
          <h2 className="text-[15px] font-semibold text-[var(--cq-fg)] mb-4">
            Rendimiento de automatizaciones
          </h2>
          {loading ? (
            <div className="flex flex-col gap-2">
              {['sk-1','sk-2','sk-3'].map(k => <Skeleton key={k} className="h-8 w-full" />)}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--cq-surface-2)] rounded-[8px] px-3 py-2.5">
                  <p className="text-[10.5px] font-mono uppercase tracking-wider text-[var(--cq-fg-muted)]">
                    Recordatorios enviados
                  </p>
                  <p className="text-[20px] font-semibold text-[var(--cq-fg)] mt-0.5">
                    {autoSentStr ?? '—'}
                  </p>
                </div>
                <div className="bg-[var(--cq-surface-2)] rounded-[8px] px-3 py-2.5">
                  <p className="text-[10.5px] font-mono uppercase tracking-wider text-[var(--cq-fg-muted)]">
                    Tasa de éxito
                  </p>
                  <p className={`text-[20px] font-semibold mt-0.5 ${
                    data?.autoStats?.success_rate >= 95 ? 'text-[var(--cq-success)]' : 'text-[var(--cq-warn)]'
                  }`}>
                    {autoRateStr ?? '—'}
                  </p>
                </div>
              </div>

              {autoLastSentStr && (
                <div className="flex items-center gap-2 text-[12.5px] text-[var(--cq-fg-muted)]">
                  <Icons.Calendar size={13} />
                  Último envío:{' '}
                  {autoLastSentStr}
                </div>
              )}

              {!data?.autoStats && (
                <p className="text-[13px] text-[var(--cq-fg-muted)]">
                  Sin estadísticas de automatizaciones todavía.
                </p>
              )}
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
