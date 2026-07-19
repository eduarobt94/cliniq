import { useState } from 'react';
import { Icons, MonoLabel } from '../../components/ui';
import { inviteMember, sendInviteEmail } from '../../lib/authService';
import { useClinic } from '../../hooks/useClinic';
import { supabase } from '../../lib/supabase';

const ROLES = [
  { value: 'staff',  label: 'Staff',      desc: 'Puede ver y gestionar turnos y pacientes' },
  { value: 'viewer', label: 'Observador', desc: 'Solo puede ver, no puede modificar' },
];

export function InviteMemberModal({ open, onClose, clinicId }) {
  const { clinic } = useClinic();
  const [email,       setEmail]       = useState('');
  const [role,        setRole]        = useState('staff');
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');
  const [emailBlurError, setEmailBlurError] = useState('');
  const [inviteLink,  setInviteLink]  = useState('');
  const [copied,      setCopied]      = useState(false);
  const [emailSent,   setEmailSent]   = useState(false);

  const trimmedEmail = email.trim();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

  function handleEmailBlur() {
    const t = email.trim();
    if (!t) {
      setEmailBlurError('Ingresá un email para enviar la invitación.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
      setEmailBlurError('Ingresá un email válido.');
    } else {
      setEmailBlurError('');
    }
  }

  const reset = () => {
    setEmail('');
    setRole('staff');
    setError('');
    setEmailBlurError('');
    setInviteLink('');
    setCopied(false);
    setEmailSent(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Email validation
    if (!trimmedEmail) {
      setError('Ingresá un email válido para enviar la invitación.');
      return;
    }
    if (!emailValid) {
      setError('Ingresá un email válido para enviar la invitación.');
      return;
    }

    // Role validation
    if (!role) {
      setError('Seleccioná un rol para el miembro.');
      return;
    }

    if (!clinicId) return;

    // Self-invite prevention
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email && user.email.toLowerCase() === trimmedEmail.toLowerCase()) {
        setError('No podés invitarte a vos mismo.');
        return;
      }
    } catch {
      // ignore auth check failure
    }

    setError('');
    setSubmitting(true);
    try {
      const token    = await inviteMember(clinicId, trimmedEmail, role);
      const link     = `${window.location.origin}/accept-invite?token=${token}`;
      setInviteLink(link);

      // Enviar correo automáticamente
      try {
        await sendInviteEmail(clinicId, trimmedEmail, clinic?.name ?? 'la clínica', role, link);
        setEmailSent(true);
      } catch {
        // Si el correo falla, igual mostramos el link para compartir manualmente
        setEmailSent(false);
      }
    } catch (err) {
      const rawMsg = err.message ?? '';
      const msg = rawMsg.includes('permission_denied')
        ? 'Solo los dueños pueden invitar miembros.'
        : rawMsg.includes('invalid_role')
        ? 'Rol inválido.'
        : rawMsg.includes('duplicate') || rawMsg.includes('already') || rawMsg.includes('unique')
        ? `Ya existe una invitación pendiente para este email.`
        : 'No se pudo crear la invitación. Intentá de nuevo.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        role="button"
        tabIndex={0}
        className="absolute inset-0 bg-[var(--cq-fg)]/40 backdrop-blur-sm"
        onClick={handleClose}
        onKeyDown={(e) => { if (e.key === 'Escape') handleClose(); }}
        aria-label="Cerrar modal"
      />

      {/* Modal */}
      <div className="relative w-full max-w-[460px] bg-[var(--cq-bg)] border border-[var(--cq-border)] rounded-[18px] p-6 shadow-2xl animate-[cqFadeSlideUp_0.25s_ease]">

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <MonoLabel>[ Equipo ]</MonoLabel>
            <h2 id="invite-modal-title" className="mt-1.5 text-[20px] font-semibold tracking-tight">Invitar miembro</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] transition-colors -mt-0.5"
            aria-label="Cerrar modal"
          >
            <Icons.Close size={18} />
          </button>
        </div>

        {/* Invite link generado */}
        {inviteLink ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-[10px] bg-[color-mix(in_oklch,var(--cq-success)_10%,transparent)] border border-[color-mix(in_oklch,var(--cq-success)_25%,transparent)]">
              <Icons.Check size={15} />
              <p className="text-[13px] text-[var(--cq-fg)]">
                {emailSent
                  ? <>Invitación enviada a <strong>{trimmedEmail}</strong>.</>
                  : <>Invitación creada para <strong>{trimmedEmail}</strong>. Compartí el link manualmente.</>
                }
              </p>
            </div>

            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--cq-fg-muted)] mb-2">
                Link de invitación
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 overflow-hidden px-3 py-2.5 rounded-[8px] border border-[var(--cq-border)] bg-[var(--cq-surface)]">
                  <p className="text-[12px] text-[var(--cq-fg-muted)] truncate font-mono">{inviteLink}</p>
                </div>
                <button
                  onClick={handleCopy}
                  className={`shrink-0 h-10 px-3 rounded-[8px] border transition flex items-center gap-1.5 text-[13px] font-medium ${
                    copied
                      ? 'border-[var(--cq-success)] text-[var(--cq-success)] bg-[color-mix(in_oklch,var(--cq-success)_8%,transparent)]'
                      : 'border-[var(--cq-border)] hover:border-[var(--cq-fg)] hover:bg-[var(--cq-surface-2)]'
                  }`}
                  aria-label="Copiar link"
                >
                  {copied ? <Icons.Check size={13} /> : <Icons.Copy size={13} />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <p className="mt-2 text-[11.5px] text-[var(--cq-fg-muted)]">
                Compartí este link con {trimmedEmail}. Es válido hasta que lo use.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={reset}
                className="flex-1 h-10 rounded-[10px] border border-[var(--cq-border)] hover:bg-[var(--cq-surface-2)] transition text-[13.5px] font-medium"
              >
                Invitar otro
              </button>
              <button
                onClick={handleClose}
                className="flex-1 h-10 rounded-[10px] bg-[var(--cq-fg)] text-[var(--cq-bg)] hover:bg-[var(--cq-accent)] transition text-[13.5px] font-medium"
              >
                Listo
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="flex flex-col gap-1">
              <label htmlFor="invite-email" className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--cq-fg-muted)]">
                Correo electrónico
              </label>
              <div className={`flex items-center gap-2 h-11 px-3.5 rounded-[10px] border bg-[var(--cq-surface)] transition focus-within:border-[var(--cq-success)] focus-within:ring-1 focus-within:ring-[var(--cq-success)] ${
                (email && !emailValid) || emailBlurError ? 'border-[var(--cq-danger)]' : 'border-[var(--cq-border)]'
              }`}>
                <span className="text-[var(--cq-fg-muted)] shrink-0"><Icons.Mail size={14} /></span>
                <input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (emailBlurError) setEmailBlurError(''); }}
                  onBlur={handleEmailBlur}
                  placeholder="correo@ejemplo.com"
                  autoComplete="email"
                  autoFocus
                  className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--cq-fg-muted)]"
                  required
                  maxLength={254}
                />
              </div>
              {emailBlurError && (
                <p className="text-[12.5px] text-[var(--cq-danger)] mt-1">{emailBlurError}</p>
              )}
            </div>

            {/* Rol */}
            <div className="flex flex-col gap-1.5">
              <span id="invite-role-label" className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--cq-fg-muted)]">
                Rol
              </span>
              <div role="group" aria-labelledby="invite-role-label" className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`text-left p-3 rounded-[10px] border transition ${
                      role === r.value
                        ? 'border-[var(--cq-fg)] bg-[var(--cq-surface-2)]'
                        : 'border-[var(--cq-border)] hover:border-[var(--cq-fg-muted)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-medium">{r.label}</span>
                      {role === r.value && <Icons.Check size={12} />}
                    </div>
                    <p className="text-[11.5px] text-[var(--cq-fg-muted)] leading-snug">{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div role="alert" className="px-3 py-2 rounded-[8px] bg-[color-mix(in_oklch,var(--cq-danger)_10%,transparent)] text-[var(--cq-danger)] text-[12.5px] border border-[color-mix(in_oklch,var(--cq-danger)_25%,transparent)]">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 h-11 rounded-[10px] border border-[var(--cq-border)] hover:bg-[var(--cq-surface-2)] transition text-[13.5px] font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!emailValid || submitting}
                className="flex-1 h-11 rounded-[10px] bg-[var(--cq-fg)] text-[var(--cq-bg)] hover:bg-[var(--cq-accent)] disabled:opacity-60 transition active:scale-[0.99] inline-flex items-center justify-center gap-2 text-[13.5px] font-medium"
              >
                {submitting ? (
                  <><span className="size-4 border-2 border-[var(--cq-bg)]/40 border-t-[var(--cq-bg)] rounded-full animate-spin" /> Enviando invitación…</>
                ) : (
                  <><Icons.UserPlus size={14} /> Crear invitación</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
