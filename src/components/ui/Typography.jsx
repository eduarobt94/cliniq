export function MonoLabel({ children, className = '' }) {
  return (
    <span
      className={`font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--cq-fg-muted)] ${className}`}
    >
      {children}
    </span>
  );
}

export function SectionLabel({ number, children }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span className="font-mono text-[11px] tracking-[0.14em] text-[var(--cq-fg-muted)]">
        [{number}]
      </span>
      <span className="h-px flex-1 bg-[var(--cq-border)]" />
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--cq-fg-muted)]">
        {children}
      </span>
    </div>
  );
}

export function Divider({ className = '' }) {
  return <div className={`h-px bg-[var(--cq-border)] ${className}`} />;
}
