import { supabase } from './supabase';

// ─── Sign Up ─────────────────────────────────────────────────────────────────
export async function signUp(email, password, clinicName, firstName, lastName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Después de confirmar email, el link redirige a /auth/callback
      // que ya maneja la sesión y redirige a onboarding o dashboard.
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        first_name: firstName?.trim() ?? '',
        last_name:  lastName?.trim()  ?? '',
      },
    },
  });
  if (error) throw error;

  const user = data.user;
  if (!user) throw new Error('No se pudo crear el usuario.');

  // Supabase devuelve session=null cuando la confirmación de email está activa.
  // En ese caso NO intentamos crear la clínica todavía — lo haremos post-confirmación.
  if (!data.session) {
    return { user, session: null, needsEmailVerification: true, needsOnboarding: false };
  }

  // Chequear si el trigger activó una invitación pendiente (staff invitado)
  const { data: membership } = await supabase
    .from('clinic_members')
    .select('clinic_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (membership) return { user, session: data.session, needsEmailVerification: false, needsOnboarding: false };

  if (!clinicName?.trim()) return { user, session: data.session, needsEmailVerification: false, needsOnboarding: true };

  const clinicError = await createClinic(clinicName, firstName, lastName);
  return { user, session: data.session, needsEmailVerification: false, needsOnboarding: !!clinicError };
}

// ─── Sign In ─────────────────────────────────────────────────────────────────
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// ─── Sign In con Google ───────────────────────────────────────────────────────
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
}

// ─── Sign Out ────────────────────────────────────────────────────────────────
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ─── Create Clinic ────────────────────────────────────────────────────────────
// Intenta la RPC atómica primero. Si no existe (migración pendiente),
// hace un INSERT directo como fallback para que el signup no quede bloqueado.
export async function createClinic(clinicName, firstName, lastName) {
  // Intentar RPC atómica (profiles + clinics + clinic_members en una transacción)
  const { error: rpcError } = await supabase.rpc('create_clinic_with_owner', {
    clinic_name:  clinicName.trim(),
    p_first_name: firstName?.trim() ?? '',
    p_last_name:  lastName?.trim()  ?? '',
  });

  if (!rpcError) return null;

  // Fallback: INSERT directo si la RPC no existe todavía
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return new Error('Sin sesión activa');

  const { error } = await supabase.from('clinics').insert({
    owner_id: userId,
    name:     clinicName.trim(),
    timezone: 'America/Montevideo',
  });
  return error ?? null;
}

// ─── Reset Password (enviar email) ───────────────────────────────────────────
export async function resetPasswordForEmail(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  if (error) throw error;
}

// ─── Update Password (desde sesión de recovery) ──────────────────────────────
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// ─── Reenviar email de confirmación ──────────────────────────────────────────
export async function resendConfirmationEmail(email) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
}

// ─── Invite Member ───────────────────────────────────────────────────────────
// Crea o renueva una invitación pendiente. Devuelve el invite_token UUID.
export async function inviteMember(clinicId, email, role) {
  const { data, error } = await supabase.rpc('create_member_invite', {
    p_clinic_id: clinicId,
    p_email:     email,
    p_role:      role ?? 'staff',
  });
  if (error) throw error;
  return data; // UUID del invite_token
}

// ─── Get Invite By Token ──────────────────────────────────────────────────────
// Pública (anon). Devuelve { clinic_id, clinic_name, email, role, status } o null.
export async function getInviteByToken(token) {
  const { data, error } = await supabase.rpc('get_invite_by_token', { p_token: token });
  if (error) throw error;
  return data?.[0] ?? null;
}

// ─── Accept Invite ────────────────────────────────────────────────────────────
// Vincula auth.uid() a la invitación. El email del usuario debe coincidir.
export async function acceptInvite(token) {
  const { data, error } = await supabase.rpc('accept_member_invite', { p_token: token });
  if (error) throw error;
  return data;
}

// ─── Send Invite Email ────────────────────────────────────────────────────────
// Llama a la Edge Function que envía el correo de invitación via Resend.
export async function sendInviteEmail(clinicId, email, clinicName, role, inviteUrl) {
  const { error } = await supabase.functions.invoke('send-invite-email', {
    body: { clinicId, email, clinicName, role, inviteUrl },
  });
  if (error) throw error;
}
