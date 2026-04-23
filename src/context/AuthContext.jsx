import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import * as authService from '../lib/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,            setUser]            = useState(null);
  const [clinic,          setClinic]          = useState(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [networkError,    setNetworkError]    = useState(false);

  // Ref para cancelar loadClinic si el usuario cambia antes de que termine.
  const loadAbortRef = useRef(null);

  const loadClinic = useCallback(async (userId) => {
    // Cancela cualquier carga previa en vuelo
    const abortController = { cancelled: false };
    loadAbortRef.current = abortController;

    const { data, error } = await supabase
      .from('clinics')
      .select('*')
      .eq('owner_id', userId)
      .maybeSingle();

    // Si el usuario cambió mientras esperábamos, descartamos el resultado
    if (abortController.cancelled) return;

    if (error) {
      setNetworkError(true);
      return;
    }

    setNetworkError(false);
    setClinic(data ?? null);
    setNeedsOnboarding(!data);
  }, []);

  // ── 1. onAuthStateChange: SOLO sincrónico — nunca async/await aquí ──────────
  // Si poné async acá, Supabase dispara SIGNED_IN + TOKEN_REFRESHED juntos en
  // re-login y dos loadClinic() corren en paralelo con race condition de estado.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const u = session?.user ?? null;
        setUser(u);

        if (event === 'SIGNED_OUT') {
          // Cancela cualquier loadClinic en vuelo
          if (loadAbortRef.current) loadAbortRef.current.cancelled = true;
          setClinic(null);
          setNeedsOnboarding(false);
          setNetworkError(false);
        }

        if (event === 'INITIAL_SESSION') {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []); // Sin dependencias: se registra una sola vez

  // ── 2. Carga de clínica: reacciona a cambios de user.id — separado del listener
  // Esto garantiza que loadClinic siempre corre con una sola instancia a la vez
  // y que se re-ejecuta en cada login (cambio de user.id: null → uuid → null → uuid)
  useEffect(() => {
    if (!user?.id) return;
    loadClinic(user.id);
  }, [user?.id, loadClinic]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── signUp ────────────────────────────────────────────────────────────────
  async function signup(email, password, clinicName) {
    const result = await authService.signUp(email, password, clinicName);
    if (result.needsOnboarding) setNeedsOnboarding(true);
    return result;
  }

  // ── login ─────────────────────────────────────────────────────────────────
  async function login(email, password) {
    // onAuthStateChange maneja el estado automáticamente al dispararse SIGNED_IN
    return authService.signIn(email, password);
  }

  // ── logout ────────────────────────────────────────────────────────────────
  async function logout() {
    // Limpia el estado ANTES del await para que la UI sea inmediata
    if (loadAbortRef.current) loadAbortRef.current.cancelled = true;
    setUser(null);
    setClinic(null);
    setNeedsOnboarding(false);
    setNetworkError(false);
    // El signOut dispara SIGNED_OUT en onAuthStateChange (redundante pero correcto)
    await authService.signOut();
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
