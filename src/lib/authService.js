import { supabase } from './supabase';

// ─── Sign Up ────────────────────────────────────────────────────────────────
// Crea el usuario en auth y luego la clínica en una sola operación.
// Si la clínica falla, retorna needsOnboarding: true para que el flujo
// lleve al usuario a completar el setup sin estado inconsistente.
export async function signUp(email, password, clinicName) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  const user = data.user;
  if (!user) throw new Error('No se pudo crear el usuario.');

  const clinicError = await createClinic(user.id, clinicName);
  if (clinicError) {
    // Usuario creado pero sin clínica — el AuthContext detecta este estado
    // y redirige al onboarding para que el usuario complete la creación.
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
// Separado para poder reusarlo desde el onboarding (retry).
export async function createClinic(userId, clinicName) {
  const { error } = await supabase.from('clinics').insert({
    owner_id:  userId,
    name:      clinicName.trim(),
    timezone:  'America/Montevideo',
  });
  return error ?? null;
}

// ─── Get Session ─────────────────────────────────────────────────────────────
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
