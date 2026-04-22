import { useEffect } from 'react';
import { Icons, Badge, Button, MonoLabel } from '../../components/ui';

function MiniField({ label, icon, placeholder, defaultValue }) {
  return (
    <div>
      <label className="block">
        <MonoLabel>{label}</MonoLabel>
        <div className="mt-1.5 flex items-center gap-2 h-10 px-3 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-bg)] focus-within:border-[var(--cq-fg)]">
          {icon && <span className="text-[var(--cq-fg-muted)]">{icon}</span>}
          <input
            defaultValue={defaultValue}
            placeholder={placeholder}
            className="flex-1 bg-transparent outline-none text-[13.5px]"
          />
        </div>
      </label>
    </div>
  );
}

export function NewAppointmentModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-appt-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-[520px] bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[16px] p-6"
        style={{ animation: 'cqModalIn 220ms cubic-bezier(.2,.7,.2,1)' }}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <MonoLabel>Nuevo turno</MonoLabel>
            <h3
              id="new-appt-title"
              className="mt-1 text-[22px] font-semibold tracking-tight"
            >
              Agendar paciente
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[8px] hover:bg-[var(--cq-surface-2)] flex items-center justify-center"
            aria-label="Cerrar"
          >
            <Icons.Close size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <MiniField
            label="Paciente"
            icon={<Icons.Users size={14} />}
            placeholder="Buscar o crear…"
          />
          <div className="grid grid-cols-2 gap-3">
            <MiniField
              label="Fecha"
              icon={<Icons.Calendar size={14} />}
              defaultValue="Mar 21 abr"
            />
            <MiniField label="Hora" defaultValue="10:30" />
          </div>
          <MiniField label="Profesional" defaultValue="Dr. Bonomi" />
          <MiniField label="Tipo de consulta" defaultValue="Control" />
          <div className="flex items-center gap-2 pt-2">
            <span className="w-4 h-4 rounded-[4px] bg-[var(--cq-fg)] flex items-center justify-center">
              <Icons.Check size={10} />
            </span>
            <span className="text-[13px]">Enviar recordatorio automático por WhatsApp</span>
            <Badge tone="accent" className="ml-auto">
              AX-001
            </Badge>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2 justify-end">
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" size="md" onClick={onClose}>
            Agendar <Icons.Arrow size={12} />
          </Button>
        </div>
      </div>
    </div>
  );
}
