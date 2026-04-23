import { useEffect, useState } from 'react';
import { Icons } from './Icons';

export function Toast({ message, type = 'error', duration = 4000, onDismiss }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const hideTimer = setTimeout(() => setExiting(true), duration - 350);
    const removeTimer = setTimeout(onDismiss, duration);
    return () => { clearTimeout(hideTimer); clearTimeout(removeTimer); };
  }, [duration, onDismiss]);

  const colors =
    type === 'error'
      ? 'bg-[var(--cq-danger)] text-white'
      : 'bg-[var(--cq-success)] text-white';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex items-center gap-3 px-4 py-3 rounded-[10px] shadow-lg text-[13.5px] font-medium min-w-[260px] max-w-[340px] ${colors}`}
      style={{
        animation: exiting
          ? 'cqToastOut 0.3s ease forwards'
          : 'cqToastIn 0.3s ease forwards',
      }}
    >
      {type === 'error' && (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true" className="shrink-0 opacity-70">
          <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M7.5 4.5V8M7.5 10.5V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      <span className="flex-1">{message}</span>
      <button
        onClick={() => setExiting(true)}
        className="opacity-50 hover:opacity-100 transition-opacity shrink-0"
        aria-label="Cerrar"
      >
        <Icons.Close size={13} />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-5 right-5 z-[200] flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

let _nextId = 0;
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const push = (message, type = 'error') =>
    setToasts((prev) => [...prev, { id: ++_nextId, message, type }]);

  const dismiss = (id) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return { toasts, push, dismiss };
}
