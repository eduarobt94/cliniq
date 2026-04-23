import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import * as authService from '../lib/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,            setUser]            = useState(null);
  const [clinic,          setClinic]          = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [networkError,    setNetworkError]    = useState(false);

  // Carga la clínica del usuario. Si no tiene → needsOnboarding = true.
  // Si hay error de red, no modifica needsOnboarding para evitar falso onboarding.
  const loadClinic = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('owner_id', userId)
      .maybeSingle();

    if (error) {
      setNetworkError(true);
      return;
    }

    setNetworkError(false);
    setClinic(data ?? null);
    setNeedsOnboarding(!data);
  }, []);

  // onAuthStateChange dispara INITIAL_SESSION al montar — no necesitamos getSession()
  // separado (evita race condition de dos loadClinic() simultáneos).
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          await loadClinic(u.id);
        } else {
          setClinic(null);
          setNeedsOnboarding(false);
        }
        if (event === 'INITIAL_SESSION') setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [loadClinic]);

  // ── signUp: crea usuario + clínica ───────────────────────────────────────
  async function signup(email, password, clinicName) {
    const result = await authService.signUp(email, password, clinicName);
    if (result.needsOnboarding) setNeedsOnboarding(true);
    return result;
  }

  // ── login ─────────────────────────────────────────────────────────────────
  async function login(email, password) {
    return authService.signIn(email, password);
    // onAuthStateChange actualiza user + clinic automáticamente
  }

  // ── logout ────────────────────────────────────────────────────────────────
  async function logout() {
    await authService.signOut();
    setUser(null);
    setClinic(null);
    setNeedsOnboarding(false);
  }

  // ── createClinic: usado desde el onboarding (retry) ──────────────────────
  async function createClinic(clinicName) {
    if (!user) throw new Error('No hay sesión activa.');
    const error = await authService.createClinic(user.id, clinicName);
    if (error) throw error;
    await loadClinic(user.id);
  }

  return (
    <AuthContext.Provider value={{
      user,
      clinic,
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
