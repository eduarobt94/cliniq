import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Icons, MonoLabel } from '../../components/ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotPassword() {
  const { sendPasswordReset } = useAuth();

  const [email,      setEmail]      = useState('');
  const [saving,     setSaving]     = useState(false);
  const [sent,       setSent]       = useState(false);
  const [emailError, setEmailError] = useState('');
  const [formError,  setFormError]  = useState('');

  const validateEmail = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return 'Ingresá tu correo electrónico.';
    if (!EMAIL_RE.test(trimmed)) return 'Ingresá un email válido.';
    return '';
  };

  const onEmailBlur = () => {
    setEmailError(validateEmail(email));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    const err = validateEmail(trimmed);
    if (err) {
      setEmailError(err);
      return;
    }
    setEmailError('');
    setFormError('');
    setSaving(true);
    try {
      await sendPasswordReset(trimmed);
      setSent(true);
    } catch (networkErr) {
      const msg = networkErr?.message ?? '';
      if (
        msg.toLowerCase().includes('network') ||
        msg.toLowerCase().includes('fetch') ||
        msg.toLowerCase().includes('connection')
      ) {
        setFormError('Error de conexión. Verificá tu internet.');
      } else {
        setFormError('No se pudo procesar la solicitud. Intentá de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (sent) {
    return (
      <main className="min-h-screen bg-[var(--cq-bg)] text-[var(--cq-fg)] flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] text-center">
          <div className="size-14 rounded-full bg-[color-mix(in_oklch,var(--cq-success)_15%,transparent)] flex items-center justify-center mx-auto mb-6">
            <Icons.Check size={22} className="text-[var(--cq-success)]" />
          </div>
          <MonoLabel>[ Email enviado ]</MonoLabel>
          <h1 className="mt-3 text-[28px] font-semibold tracking-tight">
            Revisá tu correo
          </h1>
          <p className="mt-3 text-[14.5px] text-[var(--cq-fg-muted)] leading-relaxed">
            Si el email está registrado, recibirás un enlace para restablecer tu contraseña.
          </p>
          <p className="mt-3 text-[13px] text-[var(--cq-fg-muted)]">
            El link expira en 1 hora. Revisá también la carpeta de spam.
          </p>
          <div className="mt-8 space-y-3">
            <button
              onClick={() => { setSent(false); setEmail(''); setFormError(''); setEmailError(''); }}
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

        <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate aria-label="Formulario de recuperación de contraseña">
          <div>
            <label htmlFor="forgot-email" className="block font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--cq-fg-muted)] mb-1.5">
              Correo electrónico
            </label>
            <div className={`flex items-center gap-2 h-12 px-4 rounded-[10px] border bg-[var(--cq-surface)] focus-within:border-[var(--cq-fg)] focus-within:ring-2 focus-within:ring-[var(--cq-accent)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--cq-bg)] transition-all ${emailError ? 'border-[var(--cq-danger)]' : 'border-[var(--cq-border)]'}`}>
              <Icons.Mail size={15} className="text-[var(--cq-fg-muted)] shrink-0" />
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(validateEmail(e.target.value)); }}
                onBlur={onEmailBlur}
                placeholder="tu@email.com"
                autoComplete="email"
                autoFocus
                maxLength={254}
                aria-invalid={emailError ? 'true' : undefined}
                aria-describedby={emailError ? 'forgot-email-error' : undefined}
                className="flex-1 bg-transparent outline-none text-[14.5px] placeholder:text-[var(--cq-fg-muted)]"
              />
            </div>
            {emailError && (
              <p id="forgot-email-error" role="alert" className="text-[12.5px] text-[var(--cq-danger)] mt-1">
                {emailError}
              </p>
            )}
          </div>

          {formError && (
            <div role="alert" className="px-3 py-2 rounded-lg bg-[color-mix(in_oklch,var(--cq-danger)_12%,transparent)] text-[var(--cq-danger)] text-[13px] border border-[color-mix(in_oklch,var(--cq-danger)_30%,transparent)]">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full h-12 rounded-[10px] bg-[var(--cq-fg)] text-[var(--cq-bg)] font-medium hover:bg-[var(--cq-accent)] disabled:opacity-50 transition-all active:scale-[0.99] inline-flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <span className="size-4 border-2 border-[var(--cq-bg)]/40 border-t-[var(--cq-bg)] rounded-full animate-spin" />
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
