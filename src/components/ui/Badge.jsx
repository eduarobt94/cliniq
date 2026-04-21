const tones = {
  neutral: 'bg-[var(--cq-surface-2)] text-[var(--cq-fg-muted)] border-[var(--cq-border)]',
  accent: 'bg-[var(--cq-accent-soft)] text-[var(--cq-accent)] border-transparent',
  success: 'bg-[color-mix(in_oklch,var(--cq-success)_14%,transparent)] text-[var(--cq-success)] border-transparent',
  warn: 'bg-[color-mix(in_oklch,var(--cq-warn)_14%,transparent)] text-[var(--cq-warn)] border-transparent',
  danger: 'bg-[color-mix(in_oklch,var(--cq-danger)_14%,transparent)] text-[var(--cq-danger)] border-transparent',
  outline: 'bg-transparent text-[var(--cq-fg-muted)] border-[var(--cq-border)]',
};

const dotColors = {
  neutral: 'bg-[var(--cq-fg-muted)]',
  accent: 'bg-[var(--cq-accent)]',
  success: 'bg-[var(--cq-success)]',
  warn: 'bg-[var(--cq-warn)]',
  danger: 'bg-[var(--cq-danger)]',
  outline: 'bg-[var(--cq-fg-muted)]',
};

export function Badge({ tone = 'neutral', children, dot = false, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 h-[22px] rounded-full text-[11px] font-mono uppercase tracking-wider border ${tones[tone]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[tone]}`} />}
      {children}
    </span>
  );
}
