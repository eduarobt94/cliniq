import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getInviteByToken, acceptInvite } from '../../lib/authService';
import { Icons, MonoLabel } from '../../components/ui';

const ROLE_LABEL = { staff: 'Staff', viewer: 'Observador', owner: 'Dueño' };

export function AcceptInvite() {
  const [params]     = useSearchParams();
  const token        = params.get('token');
  const navigate     = useNavigate();
  const { user, refreshMembership } = useAuth();

  const [invite,    setInvite]    = useState(null);   // { clinic_id, clinic_name, email, role }
  const [status,    setStatus]    = useState('loading'); // loading | valid | invalid | accepting | done | error
  const [errorMsg,  setErrorMsg]  = useState('');

  // Cargar info de la invitación
  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    getInviteByToken(token)
      .then((data) => {
        if (!data) { setStatus('invalid'); return; }
        if (data.status === 'active') { setStatus('invalid'); setErrorMsg('Esta invitación ya fue aceptada.'); return; }
        setInvite(data);
        setStatus('valid');
      })
      .catch(() => setStatus('invalid'));
  }, [token]);

  // Si el usuario ya está logueado, aceptar automáticamente
  useEffect(() => {
    if (status !== 'valid' || !user || !invite) return;

    setStatus('accepting');
    acceptInvite(token)
      .then(() => refreshMembership())
      .then(() => { setStatus('done'); setTimeout(() => navigate('/dashboard', { replace: true }), 1200); })
      .catch((err) => {
        const msg = err.message?.includes('email_mismatch')
          ? `Esta invitación es para ${invite.email}. Iniciá sesión con ese correo.`
          : err.message?.includes('already_used')
          ? 'Esta invitación ya fue aceptada.'
          : 'No se pudo aceptar la invitación. Intentá de nuevo.';
        setErrorMsg(msg);
        setStatus('error');
      });
  }, [status, user, invite, token, navigate, refreshMembership]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[var(--cq-bg)] flex items-center justify-center">
        <span className="size-6 border-2 border-[var(--cq-border)] border-t-[var(--cq-fg)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--cq-bg)] text-[var(--cq-fg)] flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-[420px]">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <Icons.Logo size={22} />
          <span className="text-[17px] font-semibold tracking-tight">Cliniq</span>
        </div>

        {/* Token inválido */}
        {(status === 'invalid' || status === 'error') && (
          <div>
            <MonoLabel>[ Invitación ]</MonoLabel>
            <h1 className="mt-3 text-[28px] font-semibold tracking-tight">
              {errorMsg ? 'Invitación inválida' : 'Link inválido'}
            </h1>
            <p className="mt-2 text-[14px] text-[var(--cq-fg-muted)]">
              {errorMsg || 'Este link de invitación no existe o ya fue utilizado.'}
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-2 text-[13.5px] text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] transition-colors"
            >
              <span className="rotate-180 inline-flex"><Icons.Arrow size={12} /></span>
              Volver al inicio
            </Link>
          </div>
        )}

        {/* Aceptando (usuario logueado) */}
        {(status === 'accepting' || status === 'done') && (
          <div>
            <MonoLabel>[ Uniéndote a la clínica ]</MonoLabel>
            <h1 className="mt-3 text-[28px] font-semibold tracking-tight">
              {status === 'done' ? '¡Bienvenido!' : 'Procesando…'}
            </h1>
            <p className="mt-2 text-[14px] text-[var(--cq-fg-muted)]">
              {status === 'done'
                ? `Te uniste a ${invite?.clinic_name}. Redirigiendo al panel…`
                : 'Verificando tu invitación…'}
            </p>
            {status !== 'done' && (
              <span className="mt-6 inline-block size-5 border-2 border-[var(--cq-border)] border-t-[var(--cq-fg)] rounded-full animate-spin" />
            )}
            {status === 'done' && (
              <span className="mt-6 inline-flex items-center gap-2 text-[var(--cq-success)]">
                <Icons.Check size={16} /> Listo
              </span>
            )}
          </div>
        )}

        {/* Invitación válida, usuario no logueado */}
        {status === 'valid' && !user && invite && (
          <div>
            <MonoLabel>[ Invitación al equipo ]</MonoLabel>
            <h1 className="mt-3 text-[28px] font-semibold tracking-tight leading-tight">
              Te invitaron a unirte a
            </h1>
            <p className="mt-1 text-[28px] font-semibold tracking-tight text-[var(--cq-accent)]">
              {invite.clinic_name}
            </p>

            {/* Info card */}
            <div className="mt-6 p-4 rounded-[12px] border border-[var(--cq-border)] bg-[var(--cq-surface)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--cq-fg-muted)]">Correo</span>
                <span className="text-[13.5px] font-medium">{invite.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--cq-fg-muted)]">Rol</span>
                <span className="text-[13.5px] font-medium">{ROLE_LABEL[invite.role] ?? invite.role}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {/* Crear cuenta */}
              <Link
                to={`/signup?invite=${token}`}
                className="w-full h-12 rounded-[10px] bg-[var(--cq-fg)] text-[var(--cq-bg)] font-medium hover:bg-[var(--cq-accent)] transition-all active:scale-[0.99] inline-flex items-center justify-center gap-2 text-[14.5px]"
              >
                Crear mi cuenta <Icons.Arrow size={13} />
              </Link>

              {/* Ya tengo cuenta */}
              <Link
                to={`/login?invite=${token}`}
                className="w-full h-11 rounded-[10px] border border-[var(--cq-border)] bg-[var(--cq-surface)] hover:bg-[var(--cq-surface-2)] hover:border-[var(--cq-fg)] transition-all inline-flex items-center justify-center gap-2 text-[14px] font-medium"
              >
                Ya tengo cuenta{" — "}Iniciar sesión
              </Link>
            </div>

            <p className="mt-5 text-center text-[12px] text-[var(--cq-fg-muted)]">
              La invitación es personal y solo válida para {invite.email}.
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
