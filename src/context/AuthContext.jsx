import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import * as authService from '../lib/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,                setUser]                = useState(null);
  const [clinic,              setClinic]              = useState(null);
  const [role,                setRole]                = useState(null);   // 'owner' | 'staff' | 'viewer'
  const [profile,             setProfile]             = useState(null);   // { first_name, last_name }
  const [needsOnboarding,     setNeedsOnboarding]     = useState(false);
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(false);
  const [loading,             setLoading]             = useState(true);
  const [networkError,        setNetworkError]        = useState(false);

  const loadAbortRef = useRef(null);

  // ── loadMembership ────────────────────────────────────────────────────────
  // Fuente de verdad: clinic_members.
  // Fallback: si clinic_members no existe todavía (migración pendiente),
  // consulta clinics.owner_id directamente para no bloquear el login.
  const loadMembership = useCallback(async (userId) => {
    const abortController = { cancelled: false };
    loadAbortRef.current = abortController;

    const [{ data: memberData, error: memberError }, { data: profileData }] =
      await Promise.all([
        supabase
          .from('clinic_members')
          .select('role, status, clinics(*)')
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', userId)
          .maybeSingle(),
      ]);

    if (abortController.cancelled) return;

    // clinic_members tabla no existe → fallback a clinics.owner_id
    const tableNotFound =
      memberError?.code === '42P01' ||
      memberError?.message?.includes('does not exist') ||
      memberError?.message?.includes('relation');

    if (tableNotFound) {
      const { data: ownedClinic } = await supabase
        .from('clinics')
        .select('*')
        .eq('owner_id', userId)
        .maybeSingle();

      if (abortController.cancelled) return;

      setNetworkError(false);
      if (ownedClinic) {
        setClinic(ownedClinic);
        setRole('owner');
        setNeedsOnboarding(false);
      } else {
        setClinic(null);
        setRole(null);
        setNeedsOnboarding(true);
      }
      return;
    }

    if (memberError) {
      // Error de red real — no redirigir al onboarding
      setNetworkError(true);
      return;
    }

    setNetworkError(false);
    if (profileData) setProfile(profileData);

    if (memberData?.clinics) {
      setClinic(memberData.clinics);
      setRole(memberData.role);
      setNeedsOnboarding(false);
    } else {
      setClinic(null);
      setRole(null);
      setNeedsOnboarding(true);
    }
  }, []);

  // ── 1. onAuthStateChange: SOLO sincrónico ─────────────────────────────────
  // Nunca usar async/await aquí — Supabase dispara SIGNED_IN + TOKEN_REFRESHED
  // juntos en el re-login y causaría dos loadMembership en paralelo.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);

        if (event === 'PASSWORD_RECOVERY') {
          setPasswordRecoveryMode(true);
          setLoading(false);
          return;
        }

        if (event === 'SIGNED_OUT') {
          if (loadAbortRef.current) loadAbortRef.current.cancelled = true;
          setClinic(null);
          setRole(null);
          setProfile(null);
          setNeedsOnboarding(false);
          setNetworkError(false);
          setPasswordRecoveryMode(false);
        }

        if (event === 'INITIAL_SESSION') {
          setLoading(false);
        }

        // Salir del modo recovery al hacer login normal
        if (event === 'SIGNED_IN') {
          setPasswordRecoveryMode(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── 2. Carga de membresía reactiva a user.id ──────────────────────────────
  // Separado del listener para evitar async dentro de onAuthStateChange.
  // No corre en modo recovery (el usuario está autenticado temporalmente solo para cambiar pwd).
  useEffect(() => {
    if (!user?.id || passwordRecoveryMode) return;
    loadMembership(user.id);
  }, [user?.id, passwordRecoveryMode, loadMembership]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── signUp ────────────────────────────────────────────────────────────────
  async function signup(email, password, clinicName, firstName, lastName) {
    const result = await authService.signUp(email, password, clinicName, firstName, lastName);
    if (result.needsOnboarding) setNeedsOnboarding(true);
    return result;
  }

  // ── login ─────────────────────────────────────────────────────────────────
  async function login(email, password) {
    return authService.signIn(email, password);
  }

  // ── loginWithGoogle ───────────────────────────────────────────────────────
  async function loginWithGoogle() {
    return authService.signInWithGoogle();
  }

  // ── logout ────────────────────────────────────────────────────────────────
  async function logout() {
    if (loadAbortRef.current) loadAbortRef.current.cancelled = true;
    setUser(null);
    setClinic(null);
    setRole(null);
    setProfile(null);
    setNeedsOnboarding(false);
    setNetworkError(false);
    setPasswordRecoveryMode(false);
    await authService.signOut();
  }

  // ── createClinic ──────────────────────────────────────────────────────────
  async function createClinic(clinicName) {
    if (!user) throw new Error('No hay sesión activa.');
    const error = await authService.createClinic(
      clinicName,
      profile?.first_name,
      profile?.last_name
    );
    if (error) throw error;
    await loadMembership(user.id);
  }

  // ── sendPasswordReset ─────────────────────────────────────────────────────
  async function sendPasswordReset(email) {
    return authService.resetPasswordForEmail(email);
  }

  // ── updatePassword ────────────────────────────────────────────────────────
  async function updatePassword(newPassword) {
    await authService.updatePassword(newPassword);
    setPasswordRecoveryMode(false);
    // onAuthStateChange disparará SIGNED_IN → loadMembership → /dashboard
  }

  return (
    <AuthContext.Provider value={{
      user,
      clinic,
      role,
      profile,
      needsOnboarding,
      passwordRecoveryMode,
      networkError,
      loading,
      login,
      loginWithGoogle,
      signup,
      logout,
      createClinic,
      sendPasswordReset,
      updatePassword,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
