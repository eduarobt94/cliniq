import { supabase } from './supabase';

// ─── Sign Up ────────────────────────────────────────────────────────────────
// Flujo:
//   1. Crea el usuario en auth
//   2. El trigger fn_link_invitation_on_signup() activa automáticamente
//      cualquier invitación pendiente para ese email
//   3. Si el usuario ya tiene membresía activa (fue invitado) → no crea clínica
//   4. Si no tiene membresía → crea clínica como owner
//      El trigger trg_clinics_add_owner lo agrega automáticamente a clinic_members
export async function signUp(email, password, clinicName) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  const user = data.user;
  if (!user) throw new Error('No se pudo crear el usuario.');

  // Chequear si el trigger ya activó una invitación pendiente
  const { data: membership } = await supabase
    .from('clinic_members')
    .select('clinic_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (membership) {
    // Staff invitado — ya tiene clínica asignada, no necesita onboarding
    return { user, needsOnboarding: false };
  }

  // Sin invitación → usuario nuevo que debe crear su clínica (owner flow)
  if (!clinicName?.trim()) {
    return { user, needsOnboarding: true };
  }

  const clinicError = await createClinic(user.id, clinicName);
  if (clinicError) {
    // Clínica falló pero el usuario existe → ir al onboarding a reintentarlo
    return { user, needsOnboarding: true };
  }

  return { user, needsOnboarding: false };
}

// ─── Sign In ─────────────────────────────────────────────────────────────────
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// ─── Sign Out ────────────────────────────────────────────────────────────────
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ─── Create Clinic ───────────────────────────────────────────────────────────
// El trigger trg_clinics_add_owner inserta automáticamente al owner
// en clinic_members después del INSERT en clinics.
export async function createClinic(userId, clinicName) {
  const { error } = await supabase.from('clinics').insert({
    owner_id: userId,
    name:     clinicName.trim(),
    timezone: 'America/Montevideo',
  });
  return error ?? null;
}

// ─── Invite Member ───────────────────────────────────────────────────────────
// Invita a un usuario a una clínica.
// Si el email ya tiene cuenta → busca user_id y lo activa directamente.
// Si no tiene cuenta → crea invitación pendiente (status='invited', user_id=NULL).
// Cuando el invitado se registre, el trigger fn_link_invitation_on_signup
// activará su membresía automáticamente.
export async function inviteMember(clinicId, email, role, invitedBy) {
  const normalizedEmail = email.trim().toLowerCase();

  // Chequear si el email ya tiene una cuenta activa en Supabase
  // (No podemos buscar en auth.users directamente con anon key,
  //  así que intentamos crear la membresía directamente)
  const { error } = await supabase
    .from('clinic_members')
    .insert({
      clinic_id:  clinicId,
      user_id:    null, // el trigger lo llenará cuando el usuario se registre
      email:      normalizedEmail,
      role:       role ?? 'staff',
      status:     'invited',
      invited_by: invitedBy,
    });

  return error ?? null;
}

// ─── Get Session ─────────────────────────────────────────────────────────────
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
