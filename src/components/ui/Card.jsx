export function Card({ children, className = '', padded = true, ...props }) {
  return (
    <div
      className={`bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[14px] ${padded ? 'p-5' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
