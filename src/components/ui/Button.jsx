const base =
  'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--cq-accent)] focus-visible:ring-offset-[var(--cq-bg)] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap';

const sizes = {
  sm: 'text-[13px] px-3 h-9 rounded-[7px]',
  md: 'text-[14px] px-4 h-11 rounded-[9px]',
  lg: 'text-[15px] px-5 h-12 rounded-[10px]',
};

const variants = {
  primary: 'bg-[var(--cq-fg)] text-[var(--cq-bg)] hover:bg-[var(--cq-accent)] active:scale-[0.98]',
  accent: 'bg-[var(--cq-accent)] text-white hover:brightness-110 active:scale-[0.98]',
  secondary: 'bg-[var(--cq-surface-2)] text-[var(--cq-fg)] hover:bg-[var(--cq-surface-3)] border border-[var(--cq-border)]',
  ghost: 'text-[var(--cq-fg)] hover:bg-[var(--cq-surface-2)]',
  outline: 'border border-[var(--cq-border)] text-[var(--cq-fg)] hover:bg-[var(--cq-surface-2)] hover:border-[var(--cq-fg)]',
};

export function Button({ variant = 'primary', size = 'md', children, className = '', ...props }) {
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
