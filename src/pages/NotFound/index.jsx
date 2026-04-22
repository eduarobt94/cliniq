import { useNavigate } from 'react-router-dom';
import { Icons, MonoLabel } from '../../components/ui';

export function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--cq-bg)] text-[var(--cq-fg)]">
      <div className="text-center max-w-sm p-8">
        <div className="inline-flex w-14 h-14 rounded-[14px] bg-[var(--cq-surface-2)] items-center justify-center mb-6">
          <Icons.Search size={24} />
        </div>
        <MonoLabel>Error 404</MonoLabel>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight">Página no encontrada</h1>
        <p className="mt-3 text-[13.5px] text-[var(--cq-fg-muted)]">
          La dirección que ingresaste no existe o fue movida.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="px-4 h-9 rounded-[8px] border border-[var(--cq-border)] text-[13px] font-medium hover:bg-[var(--cq-surface-2)] transition-colors"
          >
            Volver
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-4 h-9 rounded-[8px] bg-[var(--cq-fg)] text-[var(--cq-bg)] text-[13px] font-medium hover:bg-[var(--cq-accent)] transition-colors"
          >
            Ir al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
