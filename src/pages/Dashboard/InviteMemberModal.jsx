import { useState } from 'react';
import { Icons, MonoLabel } from '../../components/ui';
import { inviteMember, sendInviteEmail } from '../../lib/authService';
import { useClinic } from '../../hooks/useClinic';

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
  const [inviteLink,  setInviteLink]  = useState('');
  const [copied,      setCopied]      = useState(false);
  const [emailSent,   setEmailSent]   = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const reset = () => {
    setEmail('');
    setRole('staff');
    setError('');
    setInviteLink('');
    setCopied(false);
    setEmailSent(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailValid || !clinicId) return;
    setError('');
    setSubmitting(true);
    try {
      const token    = await inviteMember(clinicId, email, role);
      const link     = `${window.location.origin}/accept-invite?token=${token}`;
      setInviteLink(link);

      // Enviar correo automáticamente
      try {
        await sendInviteEmail(clinicId, email, clinic?.name ?? 'la clínica', role, link);
        setEmailSent(true);
      } catch {
        // Si el correo falla, igual mostramos el link para compartir manualmente
        setEmailSent(false);
      }
    } catch (err) {
      const msg = err.message?.includes('permission_denied')
        ? 'Solo los dueños pueden invitar miembros.'
        : err.message?.includes('invalid_role')
        ? 'Rol inválido.'
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
      aria-label="Invitar miembro al equipo"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--cq-fg)]/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[460px] bg-[var(--cq-bg)] border border-[var(--cq-border)] rounded-[18px] p-6 shadow-2xl animate-[cqFadeSlideUp_0.25s_ease]">

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <MonoLabel>[ Equipo ]</MonoLabel>
            <h2 className="mt-1.5 text-[20px] font-semibold tracking-tight">Invitar miembro</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] transition-colors -mt-0.5"
            aria-label="Cerrar"
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
                  ? <>Correo enviado a <strong>{email}</strong>.</>
                  : <>Invitación creada para <strong>{email}</strong>. Compartí el link manualmente.</>
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
                  className={`shrink-0 h-10 px-3 rounded-[8px] border transition-all flex items-center gap-1.5 text-[13px] font-medium ${
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
                Compartí este link con {email}. Es válido hasta que lo use.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={reset}
                className="flex-1 h-10 rounded-[10px] border border-[var(--cq-border)] hover:bg-[var(--cq-surface-2)] transition-all text-[13.5px] font-medium"
              >
                Invitar otro
              </button>
              <button
                onClick={handleClose}
                className="flex-1 h-10 rounded-[10px] bg-[var(--cq-fg)] text-[var(--cq-bg)] hover:bg-[var(--cq-accent)] transition-all text-[13.5px] font-medium"
              >
                Listo
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--cq-fg-muted)]">
                Correo electrónico
              </label>
              <div className={`flex items-center gap-2 h-11 px-3.5 rounded-[10px] border bg-[var(--cq-surface)] transition-all focus-within:border-[var(--cq-success)] focus-within:ring-1 focus-within:ring-[var(--cq-success)] ${
                email && !emailValid ? 'border-[var(--cq-danger)]' : 'border-[var(--cq-border)]'
              }`}>
                <span className="text-[var(--cq-fg-muted)] shrink-0"><Icons.Mail size={14} /></span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@clinica.uy"
                  autoComplete="off"
                  className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-[var(--cq-fg-muted)]"
                  required
                />
              </div>
            </div>

            {/* Rol */}
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--cq-fg-muted)]">
                Rol
              </span>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`text-left p-3 rounded-[10px] border transition-all ${
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
                className="flex-1 h-11 rounded-[10px] border border-[var(--cq-border)] hover:bg-[var(--cq-surface-2)] transition-all text-[13.5px] font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!emailValid || submitting}
                className="flex-1 h-11 rounded-[10px] bg-[var(--cq-fg)] text-[var(--cq-bg)] hover:bg-[var(--cq-accent)] disabled:opacity-60 transition-all active:scale-[0.99] inline-flex items-center justify-center gap-2 text-[13.5px] font-medium"
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-[var(--cq-bg)]/40 border-t-[var(--cq-bg)] rounded-full animate-spin" />
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
