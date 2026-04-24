import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Icons, MonoLabel } from '../../components/ui';

export function VerifyEmail() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, emailConfirmed, needsOnboarding, resendConfirmation } = useAuth();

  // El email puede venir del state de navigate (justo después del signup)
  // o del objeto user si el usuario ya tiene sesión pero sin confirmar.
  const email = location.state?.email ?? user?.email ?? '';

  const [cooldown,  setCooldown]  = useState(0);
  const [sending,   setSending]   = useState(false);
  const [sentOnce,  setSentOnce]  = useState(false);
  const [sendError, setSendError] = useState('');

  // Si el email se confirma (en otra pestaña o en ésta), redirigir
  useEffect(() => {
    if (emailConfirmed === true) {
      navigate(needsOnboarding ? '/onboarding' : '/dashboard', { replace: true });
    }
  }, [emailConfirmed, needsOnboarding, navigate]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 6)) + c)
    : '';

  const onResend = async () => {
    if (!email || cooldown > 0 || sending) return;
    setSending(true);
    setSendError('');
    try {
      await resendConfirmation(email);
      setSentOnce(true);
      setCooldown(60);
    } catch (err) {
      setSendError('No se pudo reenviar. Intentá de nuevo en unos segundos.');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--cq-bg)] text-[var(--cq-fg)] flex items-center justify-center p-6">
      <div className="w-full max-w-[420px]">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <Icons.Logo size={22} />
          <span className="text-[17px] font-semibold tracking-tight">Cliniq</span>
        </div>

        {/* Ícono */}
        <div className="w-14 h-14 rounded-2xl bg-[color-mix(in_oklch,var(--cq-success)_12%,transparent)] border border-[color-mix(in_oklch,var(--cq-success)_25%,transparent)] flex items-center justify-center mb-6">
          <Icons.Mail size={24} className="text-[var(--cq-success)]" />
        </div>

        <MonoLabel>[ Verificación pendiente ]</MonoLabel>
        <h1 className="mt-3 text-[28px] font-semibold tracking-tight leading-tight">
          Revisá tu casilla
        </h1>
        <p className="mt-3 text-[14.5px] text-[var(--cq-fg-muted)] leading-relaxed">
          Te enviamos un link de confirmación a{' '}
          {maskedEmail
            ? <strong className="text-[var(--cq-fg)]">{maskedEmail}</strong>
            : 'tu correo'
          }.
          {' '}Hacé clic en el link para activar tu cuenta.
        </p>

        {sentOnce && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-[color-mix(in_oklch,var(--cq-success)_10%,transparent)] border border-[color-mix(in_oklch,var(--cq-success)_25%,transparent)] text-[13px] text-[var(--cq-success)]">
            Correo reenviado. Revisá también la carpeta de spam.
          </div>
        )}

        {sendError && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-[color-mix(in_oklch,var(--cq-danger)_10%,transparent)] border border-[color-mix(in_oklch,var(--cq-danger)_25%,transparent)] text-[13px] text-[var(--cq-danger)]">
            {sendError}
          </div>
        )}

        <div className="mt-8 space-y-3">
          <button
            onClick={onResend}
            disabled={cooldown > 0 || sending || !email}
            className="w-full h-11 rounded-[10px] bg-[var(--cq-fg)] text-[var(--cq-bg)] text-[14px] font-medium hover:bg-[var(--cq-accent)] disabled:opacity-50 transition-all inline-flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <span className="w-4 h-4 border-2 border-[var(--cq-bg)]/40 border-t-[var(--cq-bg)] rounded-full animate-spin" />
                Enviando…
              </>
            ) : cooldown > 0 ? (
              `Reenviar en ${cooldown}s`
            ) : (
              sentOnce ? 'Reenviar de nuevo' : 'Reenviar correo'
            )}
          </button>

          <Link
            to="/login"
            className="w-full h-11 rounded-[10px] border border-[var(--cq-border)] text-[14px] text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] hover:border-[var(--cq-fg)] transition-all inline-flex items-center justify-center"
          >
            Volver al login
          </Link>
        </div>

        <p className="mt-8 text-[12px] text-[var(--cq-fg-muted)] leading-relaxed">
          Si el correo tarda, revisá la carpeta de spam o correo no deseado.
          El link expira en 24 horas.
        </p>
      </div>
    </main>
  );
}
