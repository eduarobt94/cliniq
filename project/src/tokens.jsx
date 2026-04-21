// Cliniq — design tokens & shared primitives
// Aesthetic: editorial minimal, warm off-white, near-black, muted terracotta accent

const CliniqIcons = {
  Logo: ({ size = 20, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2.5L3.5 7.5V16.5L12 21.5L20.5 16.5V7.5L12 2.5Z" stroke={color} strokeWidth="1.4"/>
      <circle cx="12" cy="12" r="3.2" fill={color}/>
    </svg>
  ),
  Dot: ({ size = 8, color = 'currentColor' }) => (
    <svg width={size} height={size} viewBox="0 0 8 8" aria-hidden="true">
      <circle cx="4" cy="4" r="4" fill={color}/>
    </svg>
  ),
  Arrow: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 7h8m0 0L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  ArrowUpRight: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M4 10L10 4M10 4H5M10 4V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Check: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Home: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.5 7L8 2.5L13.5 7V13.5H2.5V7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  ),
  Calendar: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2.5" y="3.5" width="11" height="10" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5 2V5M11 2V5M2.5 6.5H13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  Users: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M2 13C2 10.8 3.8 9.5 6 9.5C8.2 9.5 10 10.8 10 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M11 4.5C12.4 4.5 13.5 5.6 13.5 7C13.5 8.4 12.4 9.5 11 9.5M11.5 13H14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  Zap: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M9 2L3.5 9H8L7 14L12.5 7H8L9 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  ),
  Chat: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.5 3.5H13.5V11H6L3 13.5V11H2.5V3.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  ),
  Chart: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 13.5H14M4 11V8M7 11V4M10 11V7M13 11V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  Settings: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 1.5V3M8 13V14.5M1.5 8H3M13 8H14.5M3.5 3.5L4.5 4.5M11.5 11.5L12.5 12.5M3.5 12.5L4.5 11.5M11.5 4.5L12.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  Search: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  Bell: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 7C4 4.8 5.8 3 8 3C10.2 3 12 4.8 12 7V10L13 11.5H3L4 10V7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M6.5 13C6.7 13.6 7.3 14 8 14C8.7 14 9.3 13.6 9.5 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  Whatsapp: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.5 13.5L3.5 10.5C2.9 9.6 2.5 8.6 2.5 7.5C2.5 4.7 4.7 2.5 7.5 2.5C10.3 2.5 12.5 4.7 12.5 7.5C12.5 10.3 10.3 12.5 7.5 12.5C6.4 12.5 5.4 12.1 4.5 11.5L2.5 13.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M5.5 6.5C5.5 7.9 6.6 9.5 8 9.5M6 6.2C6.3 5.8 6.5 5.2 6 5C5.5 4.8 5 5.3 5 5.8M8.2 8.8C8.8 9 9.5 9 9.8 8.5C10 8 9.3 7.5 9 7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  ),
  Plus: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  Menu: ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3 5.5H15M3 9H15M3 12.5H15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  Close: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  Eye: ({ size = 16, open = true }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      {open ? (
        <>
          <path d="M1.5 8C3 5 5.3 3.5 8 3.5C10.7 3.5 13 5 14.5 8C13 11 10.7 12.5 8 12.5C5.3 12.5 3 11 1.5 8Z" stroke="currentColor" strokeWidth="1.3"/>
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
        </>
      ) : (
        <>
          <path d="M1.5 8C3 5 5.3 3.5 8 3.5C10.7 3.5 13 5 14.5 8C13 11 10.7 12.5 8 12.5C5.3 12.5 3 11 1.5 8Z" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M2 2L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </>
      )}
    </svg>
  ),
  Lock: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5 7V5C5 3.3 6.3 2 8 2C9.7 2 11 3.3 11 5V7" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  ),
  Mail: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3.5" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M2.5 4.5L8 8.5L13.5 4.5" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  ),
  Sparkle: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1.5L8.2 5.8L12.5 7L8.2 8.2L7 12.5L5.8 8.2L1.5 7L5.8 5.8L7 1.5Z" fill="currentColor"/>
    </svg>
  ),
  TrendUp: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 10L6 6L8.5 8.5L12 5M12 5H9M12 5V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  TrendDown: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 5L6 9L8.5 6.5L12 10M12 10H9M12 10V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Circle: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  ),
  More: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="4" cy="8" r="1" fill="currentColor"/>
      <circle cx="8" cy="8" r="1" fill="currentColor"/>
      <circle cx="12" cy="8" r="1" fill="currentColor"/>
    </svg>
  ),
  Pulse: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1 8H4L5.5 3.5L8.5 12.5L10.5 8H15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

// Button primitive (Atomic Design: atom)
const CliniqButton = ({ variant = 'primary', size = 'md', children, className = '', ...props }) => {
  const base = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--cq-accent)] focus-visible:ring-offset-[var(--cq-bg)] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';
  const sizes = {
    sm: 'text-[13px] px-3 h-8 rounded-[7px]',
    md: 'text-[14px] px-4 h-10 rounded-[9px]',
    lg: 'text-[15px] px-5 h-12 rounded-[10px]',
  };
  const variants = {
    primary: 'bg-[var(--cq-fg)] text-[var(--cq-bg)] hover:bg-[var(--cq-accent)] active:scale-[0.98]',
    accent: 'bg-[var(--cq-accent)] text-white hover:brightness-110 active:scale-[0.98]',
    secondary: 'bg-[var(--cq-surface-2)] text-[var(--cq-fg)] hover:bg-[var(--cq-surface-3)] border border-[var(--cq-border)]',
    ghost: 'text-[var(--cq-fg)] hover:bg-[var(--cq-surface-2)]',
    outline: 'border border-[var(--cq-border)] text-[var(--cq-fg)] hover:bg-[var(--cq-surface-2)] hover:border-[var(--cq-fg)]',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

// Badge primitive
const CliniqBadge = ({ tone = 'neutral', children, dot = false, className = '' }) => {
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
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 h-[22px] rounded-full text-[11px] font-mono uppercase tracking-wider border ${tones[tone]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[tone]}`}/>}
      {children}
    </span>
  );
};

// Card primitive
const CliniqCard = ({ children, className = '', padded = true, ...props }) => (
  <div className={`bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[14px] ${padded ? 'p-5' : ''} ${className}`} {...props}>
    {children}
  </div>
);

// Mono-label — used everywhere for editorial tagging
const MonoLabel = ({ children, className = '' }) => (
  <span className={`font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--cq-fg-muted)] ${className}`}>
    {children}
  </span>
);

// Section label (Landing)
const SectionLabel = ({ number, children }) => (
  <div className="flex items-center gap-3 mb-6">
    <span className="font-mono text-[11px] tracking-[0.14em] text-[var(--cq-fg-muted)]">[{number}]</span>
    <span className="h-px flex-1 bg-[var(--cq-border)]"/>
    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--cq-fg-muted)]">{children}</span>
  </div>
);

// Divider
const Divider = ({ className = '' }) => (
  <div className={`h-px bg-[var(--cq-border)] ${className}`}/>
);

// Placeholder avatar (initials-based, no emoji, no fake photos)
const CliniqAvatar = ({ name = '', size = 32, tone = 'neutral' }) => {
  const initials = name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const tones = {
    neutral: 'bg-[var(--cq-surface-3)] text-[var(--cq-fg)]',
    accent: 'bg-[var(--cq-accent-soft)] text-[var(--cq-accent)]',
    mono: 'bg-[var(--cq-fg)] text-[var(--cq-bg)]',
  };
  return (
    <div
      className={`rounded-full flex items-center justify-center font-medium shrink-0 ${tones[tone]}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-label={name}
    >
      {initials}
    </div>
  );
};

Object.assign(window, {
  CliniqIcons, CliniqButton, CliniqBadge, CliniqCard, MonoLabel, SectionLabel, Divider, CliniqAvatar,
});
