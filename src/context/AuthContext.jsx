import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import * as authService from '../lib/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,                setUser]                = useState(null);
  const [clinic,              setClinic]              = useState(null);
  const [role,                setRole]                = useState(null);   // 'owner' | 'staff' | 'viewer'
  const [profile,             setProfile]             = useState(null);   // { first_name, last_name }
  const [needsOnboarding,     setNeedsOnboarding]     = useState(false);
  const [emailConfirmed,      setEmailConfirmed]      = useState(null);   // null=desconocido, true, false
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(false);
  const [loading,             setLoading]             = useState(true);
  const [networkError,        setNetworkError]        = useState(false);

  const loadAbortRef = useRef(null);

  // ── loadMembership ────────────────────────────────────────────────────────
  // Fuente de verdad: clinic_members.
  // Fallback: si clinic_members no existe todavía (migración pendiente),
  // consulta clinics.owner_id directamente para no bloquear el login.
  const loadMembership = useCallback(async (userId, userMeta = {}) => {
    // Synchronous guards before any await — avoids unnecessary DB calls
    if (!userId) return;

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

    // Perfil: DB first, luego metadata del signup como fallback
    const resolvedProfile = profileData ?? (
      userMeta?.first_name
        ? { first_name: userMeta.first_name, last_name: userMeta.last_name ?? '' }
        : null
    );

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
      if (resolvedProfile) setProfile(resolvedProfile);
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
    if (resolvedProfile) setProfile(resolvedProfile);

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
          setEmailConfirmed(null);
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

  // ── 2. Verificación de email + carga de membresía ────────────────────────
  // Corre cuando cambia user.id o email_confirmed_at (Supabase actualiza el
  // objeto user cuando el usuario confirma su email → EMAIL_VERIFIED).
  // En modo recovery el usuario está temporalmente autenticado solo para
  // cambiar contraseña, no cargar membresía.
  useEffect(() => {
    if (!user?.id || passwordRecoveryMode) {
      if (!user) setEmailConfirmed(null);
      return;
    }

    const confirmed = !!user.email_confirmed_at;
    setEmailConfirmed(confirmed);

    // Solo cargar membresía si el email está verificado
    if (confirmed) {
      loadMembership(user.id, user.user_metadata);
    }
  }, [user?.id, user?.email_confirmed_at, passwordRecoveryMode, loadMembership]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── signUp ────────────────────────────────────────────────────────────────
  const signup = useCallback(async (email, password, clinicName, firstName, lastName) => {
    const result = await authService.signUp(email, password, clinicName, firstName, lastName);
    if (result.needsOnboarding) setNeedsOnboarding(true);
    return result;
  }, []);

  // ── login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    return authService.signIn(email, password);
  }, []);

  // ── loginWithGoogle ───────────────────────────────────────────────────────
  const loginWithGoogle = useCallback(async () => {
    return authService.signInWithGoogle();
  }, []);

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    if (loadAbortRef.current) loadAbortRef.current.cancelled = true;
    setUser(null);
    setClinic(null);
    setRole(null);
    setProfile(null);
    setNeedsOnboarding(false);
    setNetworkError(false);
    setPasswordRecoveryMode(false);
    await authService.signOut();
  }, []);

  // ── createClinic ──────────────────────────────────────────────────────────
  const createClinic = useCallback(async (clinicName) => {
    if (!user) throw new Error('No hay sesión activa.');
    const error = await authService.createClinic(
      clinicName,
      profile?.first_name,
      profile?.last_name
    );
    if (error) throw error;
    await loadMembership(user.id, user.user_metadata);
  }, [user, profile, loadMembership]);

  // ── refreshMembership ─────────────────────────────────────────────────────
  // Fuerza recarga de membresía (útil después de aceptar una invitación).
  const refreshMembership = useCallback(async () => {
    if (user?.id) await loadMembership(user.id, user.user_metadata);
  }, [user?.id, user?.user_metadata, loadMembership]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── resendConfirmation ────────────────────────────────────────────────────
  const resendConfirmation = useCallback(async (email) => {
    return authService.resendConfirmationEmail(email);
  }, []);

  // ── sendPasswordReset ─────────────────────────────────────────────────────
  const sendPasswordReset = useCallback(async (email) => {
    return authService.resetPasswordForEmail(email);
  }, []);

  // ── updatePassword ────────────────────────────────────────────────────────
  const updatePassword = useCallback(async (newPassword) => {
    await authService.updatePassword(newPassword);
    setPasswordRecoveryMode(false);
    // onAuthStateChange disparará SIGNED_IN → loadMembership → /dashboard
  }, []);

  // ── context value (memoized) ──────────────────────────────────────────────
  const contextValue = useMemo(() => ({
    user,
    clinic,
    role,
    profile,
    needsOnboarding,
    emailConfirmed,
    passwordRecoveryMode,
    networkError,
    loading,
    login,
    loginWithGoogle,
    signup,
    logout,
    createClinic,
    refreshMembership,
    resendConfirmation,
    sendPasswordReset,
    updatePassword,
  }), [
    user,
    clinic,
    role,
    profile,
    needsOnboarding,
    emailConfirmed,
    passwordRecoveryMode,
    networkError,
    loading,
    login,
    loginWithGoogle,
    signup,
    logout,
    createClinic,
    refreshMembership,
    resendConfirmation,
    sendPasswordReset,
    updatePassword,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
