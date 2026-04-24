import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Icons, MonoLabel } from '../../components/ui';

export function ForgotPassword() {
  const { sendPasswordReset } = useAuth();

  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!emailValid) return;
    setLoading(true);
    setError('');
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError('No se pudo enviar el email. Revisá la dirección e intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <main className="min-h-screen bg-[var(--cq-bg)] text-[var(--cq-fg)] flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] text-center">
          <div className="w-14 h-14 rounded-full bg-[color-mix(in_oklch,var(--cq-success)_15%,transparent)] flex items-center justify-center mx-auto mb-6">
            <Icons.Check size={22} className="text-[var(--cq-success)]" />
          </div>
          <MonoLabel>[ Email enviado ]</MonoLabel>
          <h1 className="mt-3 text-[28px] font-semibold tracking-tight">
            Revisá tu correo
          </h1>
          <p className="mt-3 text-[14.5px] text-[var(--cq-fg-muted)] leading-relaxed">
            Si <span className="text-[var(--cq-fg)] font-medium">{email}</span> tiene una cuenta en Cliniq,
            vas a recibir un link para restablecer tu contraseña en los próximos minutos.
          </p>
          <p className="mt-3 text-[13px] text-[var(--cq-fg-muted)]">
            El link expira en 1 hora. Revisá también la carpeta de spam.
          </p>
          <div className="mt-8 space-y-3">
            <button
              onClick={() => { setSent(false); setEmail(''); }}
              className="w-full h-11 rounded-[10px] border border-[var(--cq-border)] text-[14px] hover:border-[var(--cq-fg)] transition-colors"
            >
              Intentar con otro correo
            </button>
            <Link
              to="/login"
              className="block w-full h-11 rounded-[10px] bg-[var(--cq-fg)] text-[var(--cq-bg)] text-[14px] font-medium hover:bg-[var(--cq-accent)] transition-all inline-flex items-center justify-center"
            >
              Volver al login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--cq-bg)] text-[var(--cq-fg)] flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-[14px] text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] transition-colors mb-8"
        >
          <span className="rotate-180 inline-flex"><Icons.Arrow size={12} /></span>
          Volver al login
        </Link>

        <MonoLabel>[ Recuperar acceso ]</MonoLabel>
        <h1 className="mt-3 text-[30px] font-semibold tracking-tight leading-tight">
          ¿Olvidaste tu contraseña?
        </h1>
        <p className="mt-2 text-[14px] text-[var(--cq-fg-muted)] leading-relaxed">
          Ingresá tu correo y te enviamos un link para crear una contraseña nueva.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--cq-fg-muted)] mb-1.5">
              Correo electrónico
            </label>
            <div className="flex items-center gap-2 h-12 px-4 rounded-[10px] border border-[var(--cq-border)] bg-[var(--cq-surface)] focus-within:border-[var(--cq-fg)] focus-within:ring-2 focus-within:ring-[var(--cq-accent)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--cq-bg)] transition-all">
              <Icons.Mail size={15} className="text-[var(--cq-fg-muted)] shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="maria@clinica.uy"
                autoComplete="email"
                autoFocus
                className="flex-1 bg-transparent outline-none text-[14.5px] placeholder:text-[var(--cq-fg-muted)]"
              />
            </div>
          </div>

          {error && (
            <div role="alert" className="px-3 py-2 rounded-lg bg-[color-mix(in_oklch,var(--cq-danger)_12%,transparent)] text-[var(--cq-danger)] text-[13px] border border-[color-mix(in_oklch,var(--cq-danger)_30%,transparent)]">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!emailValid || loading}
            className="w-full h-12 rounded-[10px] bg-[var(--cq-fg)] text-[var(--cq-bg)] font-medium hover:bg-[var(--cq-accent)] disabled:opacity-50 transition-all active:scale-[0.99] inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-[var(--cq-bg)]/40 border-t-[var(--cq-bg)] rounded-full animate-spin" />
                Enviando…
              </>
            ) : (
              <>Enviar instrucciones <Icons.Arrow size={13} /></>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
