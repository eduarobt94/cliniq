import { supabase } from './supabase';

// ─── Sign Up ────────────────────────────────────────────────────────────────
// Flujo para owners nuevos:
//   1. Crea el usuario en auth (con first_name/last_name en user_metadata)
//      → trigger fn_create_profile_on_signup crea automáticamente la fila en profiles
//      → trigger fn_link_invitation_on_signup activa invitaciones pendientes
//   2. Si ya tiene membresía activa (fue invitado) → no crea clínica
//   3. Si no tiene membresía → crea clínica con RPC atómica
//      → RPC upserta perfil + crea clínica
//      → trigger trg_clinics_add_owner lo agrega a clinic_members como owner
export async function signUp(email, password, clinicName, firstName, lastName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName?.trim() ?? '',
        last_name:  lastName?.trim()  ?? '',
      },
    },
  });
  if (error) throw error;

  const user = data.user;
  if (!user) throw new Error('No se pudo crear el usuario.');

  // Chequear si el trigger ya activó una invitación pendiente (staff invitado)
  const { data: membership } = await supabase
    .from('clinic_members')
    .select('clinic_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (membership) {
    return { user, needsOnboarding: false };
  }

  // Sin invitación → usuario nuevo que debe crear su clínica (owner flow)
  if (!clinicName?.trim()) {
    return { user, needsOnboarding: true };
  }

  const clinicError = await createClinic(clinicName, firstName, lastName);
  if (clinicError) {
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

// ─── Create Clinic (via RPC atómica) ─────────────────────────────────────────
// Upserta perfil con los nombres + crea clínica en una sola transacción.
// El trigger trg_clinics_add_owner inserta al owner en clinic_members.
export async function createClinic(clinicName, firstName, lastName) {
  const { error } = await supabase.rpc('create_clinic_with_owner', {
    clinic_name:  clinicName.trim(),
    p_first_name: firstName?.trim() ?? '',
    p_last_name:  lastName?.trim()  ?? '',
  });
  return error ?? null;
}

// ─── Invite Member ───────────────────────────────────────────────────────────
// Crea una invitación pendiente. Cuando el invitado se registre,
// el trigger fn_link_invitation_on_signup activará su membresía.
export async function inviteMember(clinicId, email, role, invitedBy) {
  const normalizedEmail = email.trim().toLowerCase();
  const { error } = await supabase
    .from('clinic_members')
    .insert({
      clinic_id:  clinicId,
      user_id:    null,
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
