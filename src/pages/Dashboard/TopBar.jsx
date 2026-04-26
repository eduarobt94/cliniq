import { useState } from 'react';
import { Icons, Button, MonoLabel } from '../../components/ui';

export function TopBar({ onMobileMenu, onNewAppointment, clinicName, activeLabel }) {
  const [q, setQ] = useState('');

  return (
    <header className="h-16 border-b border-[var(--cq-border)] bg-[var(--cq-bg)] flex items-center gap-3 px-5 lg:px-8 shrink-0">
      <button
        onClick={onMobileMenu}
        className="lg:hidden w-9 h-9 rounded-[8px] border border-[var(--cq-border)] flex items-center justify-center"
        aria-label="Abrir menú"
      >
        <Icons.Menu size={16} />
      </button>

      <div className="hidden md:flex items-center gap-2 text-[13.5px] text-[var(--cq-fg-muted)]">
        <span className="hover:text-[var(--cq-fg)] cursor-pointer">{clinicName ?? '…'}</span>
        <span className="opacity-40">/</span>
        <span className="text-[var(--cq-fg)]">{activeLabel ?? 'Resumen'}</span>
      </div>

      <div className="flex-1 max-w-[420px] mx-auto">
        <div className="flex items-center gap-2 h-9 px-3 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-surface)] hover:border-[var(--cq-fg-muted)] transition-colors focus-within:ring-2 focus-within:ring-[var(--cq-accent)]">
          <Icons.Search size={14} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar paciente, turno, automatización…"
            aria-label="Buscar"
            className="flex-1 bg-transparent outline-none text-[13.5px] placeholder:text-[var(--cq-fg-muted)]"
          />
          <MonoLabel className="hidden md:inline">⌘ K</MonoLabel>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          className="w-11 h-11 rounded-[8px] hover:bg-[var(--cq-surface-2)] flex items-center justify-center relative"
          aria-label="Notificaciones"
        >
          <Icons.Bell size={15} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--cq-accent)]" />
        </button>
        <Button variant="primary" size="sm" onClick={onNewAppointment}>
          <Icons.Plus size={12} /> Nuevo turno
        </Button>
      </div>
    </header>
  );
}
