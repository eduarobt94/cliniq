const tones = {
  neutral: 'bg-[var(--cq-surface-3)] text-[var(--cq-fg)]',
  accent: 'bg-[var(--cq-accent-soft)] text-[var(--cq-accent)]',
  mono: 'bg-[var(--cq-fg)] text-[var(--cq-bg)]',
};

export function Avatar({ name = '', size = 32, tone = 'neutral' }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      role="img"
      aria-label={name}
      className={`rounded-full flex items-center justify-center font-medium shrink-0 ${tones[tone]}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials}
    </div>
  );
}
