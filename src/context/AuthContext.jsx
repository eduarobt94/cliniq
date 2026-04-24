import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import * as authService from '../lib/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,            setUser]            = useState(null);
  const [clinic,          setClinic]          = useState(null);
  const [role,            setRole]            = useState(null);   // 'owner' | 'staff' | 'viewer'
  const [profile,         setProfile]         = useState(null);   // { first_name, last_name }
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [networkError,    setNetworkError]    = useState(false);

  const loadAbortRef = useRef(null);

  // ── loadMembership ────────────────────────────────────────────────────────
  // Carga membership y profile en paralelo.
  // Fuente de verdad para autorización: clinic_members (no clinics.owner_id).
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

    if (memberError) {
      // Error de red o tabla inexistente — no redirigir al onboarding
      setNetworkError(true);
      return;
    }

    setNetworkError(false);

    if (profileData) {
      setProfile(profileData);
    }

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

  // ── 1. onAuthStateChange: SOLO sincrónico ────────────────────────────────
  // Nunca usar async/await aquí. Supabase dispara SIGNED_IN + TOKEN_REFRESHED
  // juntos en el re-login — si el callback es async, dos loadMembership()
  // corren en paralelo y el estado queda inconsistente.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);

        if (event === 'SIGNED_OUT') {
          if (loadAbortRef.current) loadAbortRef.current.cancelled = true;
          setClinic(null);
          setRole(null);
          setProfile(null);
          setNeedsOnboarding(false);
          setNetworkError(false);
        }

        if (event === 'INITIAL_SESSION') {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── 2. Carga de membresía reactiva a user.id ─────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    loadMembership(user.id);
  }, [user?.id, loadMembership]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── logout ────────────────────────────────────────────────────────────────
  async function logout() {
    if (loadAbortRef.current) loadAbortRef.current.cancelled = true;
    setUser(null);
    setClinic(null);
    setRole(null);
    setProfile(null);
    setNeedsOnboarding(false);
    setNetworkError(false);
    await authService.signOut();
  }

  // ── createClinic: desde el onboarding (owner sin clínica) ────────────────
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

  return (
    <AuthContext.Provider value={{
      user,
      clinic,
      role,
      profile,
      needsOnboarding,
      networkError,
      loading,
      login,
      signup,
      logout,
      createClinic,
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
