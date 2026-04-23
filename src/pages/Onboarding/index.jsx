import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Icons, MonoLabel } from '../../components/ui';

// Pantalla de recuperación cuando el usuario existe pero no tiene clínica.
// Puede pasar si el signup falló justo después de crear el usuario en auth.
export function Onboarding() {
  const navigate      = useNavigate();
  const { createClinic, logout, user } = useAuth();

  const [clinicName, setClinicName] = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    if (clinicName.trim().length < 2) return;
    setLoading(true);
    setError('');
    try {
      await createClinic(clinicName);
      navigate('/dashboard');
    } catch (err) {
      setError('No se pudo crear la clínica. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--cq-bg)] text-[var(--cq-fg)] flex items-center justify-center p-6">
      <div className="w-full max-w-[440px]">
        <div className="flex items-center gap-2.5 mb-8">
          <Icons.Logo size={22} />
          <span className="text-[17px] font-semibold tracking-tight">Cliniq</span>
        </div>

        <MonoLabel>[ Último paso ]</MonoLabel>
        <h1 className="mt-3 text-[30px] font-semibold tracking-tight leading-tight">
          Poné el nombre de tu clínica
        </h1>
        <p className="mt-2 text-[14px] text-[var(--cq-fg-muted)]">
          Tu cuenta fue creada. Solo falta esto para entrar al dashboard.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <fieldset disabled={loading} className="contents">
            <div className="flex items-center gap-2 h-12 px-4 rounded-[10px] border border-[var(--cq-border)] bg-[var(--cq-surface)] focus-within:border-[var(--cq-fg)] transition-colors">
              <Icons.Home size={16} className="text-[var(--cq-fg-muted)] shrink-0" />
              <input
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="Clínica Bonomi"
                autoFocus
                className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-[var(--cq-fg-muted)]"
              />
            </div>

            {error && (
              <div role="alert" className="px-3 py-2 rounded-lg bg-[color-mix(in_oklch,var(--cq-danger)_12%,transparent)] text-[var(--cq-danger)] text-[13px]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={clinicName.trim().length < 2}
              className="w-full h-12 rounded-[10px] bg-[var(--cq-fg)] text-[var(--cq-bg)] font-medium hover:bg-[var(--cq-accent)] disabled:opacity-50 transition-all inline-flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-[var(--cq-bg)]/40 border-t-[var(--cq-bg)] rounded-full animate-spin" />
                  Creando…
                </>
              ) : (
                <>Entrar al dashboard <Icons.Arrow size={13} /></>
              )}
            </button>
          </fieldset>
        </form>

        <button
          onClick={logout}
          className="mt-6 w-full text-[13px] text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] text-center transition-colors"
        >
          Cerrar sesión ({user?.email})
        </button>
      </div>
    </main>
  );
}
