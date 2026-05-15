import { useMemo } from 'react';
import { Icons, Card, MonoLabel } from '../../components/ui';

const SERIES = [42, 48, 45, 52, 58, 54, 62, 68, 72, 69, 76, 82];
const LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function RevenueChart({ series, labels }) {
  const w = 600, h = 140, pad = 8;

  const { pts, path, area } = useMemo(() => {
    const max = Math.max(...series);
    const min = Math.min(...series) * 0.85;
    const pts = series.map((v, i) => {
      const x = (i / (series.length - 1)) * (w - pad * 2) + pad;
      const y = h - ((v - min) / (max - min)) * (h - pad * 2) - pad;
      return [x, y];
    });
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
    const area = path + ` L${w - pad} ${h} L${pad} ${h} Z`;
    return { pts, path, area };
  }, [series]);

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{ height: 140 }}
      >
        <defs>
          <linearGradient id="revenue-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--cq-accent)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--cq-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={pad}
            x2={w - pad}
            y1={h * f}
            y2={h * f}
            stroke="var(--cq-border)"
            strokeWidth="0.5"
            strokeDasharray="2 3"
          />
        ))}
        <path d={area} fill="url(#revenue-gradient)" />
        <path
          d={path}
          fill="none"
          stroke="var(--cq-accent)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map(([x, y], i) => (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r={i === pts.length - 1 ? 4 : 2.5}
            fill="var(--cq-accent)"
            stroke="var(--cq-bg)"
            strokeWidth="1.5"
          />
        ))}
      </svg>
      <div className="mt-2 grid grid-cols-12 text-[10.5px] font-mono uppercase tracking-wider text-[var(--cq-fg-muted)]">
        {labels.map((l) => (
          <span key={l} className="text-center">
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

export function RevenueBlock() {
  return (
    <Card className="lg:col-span-2">
      <div className="flex items-start justify-between mb-5">
        <div>
          <MonoLabel>Facturación · 2026</MonoLabel>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[32px] font-semibold tracking-tight leading-none">USD 82.450</span>
            <span className="text-[var(--cq-success)] text-[13px] font-medium inline-flex items-center gap-1">
              <Icons.TrendUp size={12} /> +18.4%
            </span>
          </div>
          <div className="mt-1 text-[12.5px] text-[var(--cq-fg-muted)]">
            <span className="text-[var(--cq-accent)] font-medium">USD 12.340</span> recuperados por
            Cliniq este año
          </div>
        </div>
        <div className="flex gap-1">
          {['3m', '6m', '1a'].map((p, i) => (
            <button
              key={p}
              className={`px-2.5 h-7 rounded-[6px] text-[12px] font-medium ${
                i === 2
                  ? 'bg-[var(--cq-fg)] text-[var(--cq-bg)]'
                  : 'text-[var(--cq-fg-muted)] hover:bg-[var(--cq-surface-2)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <RevenueChart series={SERIES} labels={LABELS} />
    </Card>
  );
}
