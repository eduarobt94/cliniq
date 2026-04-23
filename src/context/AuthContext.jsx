import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import * as authService from '../lib/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,            setUser]            = useState(null);
  const [clinic,          setClinic]          = useState(null);
  const [role,            setRole]            = useState(null);   // 'owner' | 'staff' | 'viewer'
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading,         setLoading]         = useState(true);
  const [networkError,    setNetworkError]    = useState(false);

  // Cancela cargas en vuelo si el usuario cambia antes de que terminen
  const loadAbortRef = useRef(null);

  // ── loadMembership ────────────────────────────────────────────────────────
  // Fuente de verdad: clinic_members (no clinics.owner_id).
  // Funciona para owners y staff por igual.
  // Si el usuario tiene una membresía activa → setClinic + setRole.
  // Si no tiene membresía → needsOnboarding = true (debe crear clínica).
  const loadMembership = useCallback(async (userId) => {
    const abortController = { cancelled: false };
    loadAbortRef.current = abortController;

    const { data, error } = await supabase
      .from('clinic_members')
      .select('role, status, clinics(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (abortController.cancelled) return;

    if (error) {
      // Error de red o tabla inexistente — no tocar needsOnboarding
      // para evitar falso redirect al onboarding
      setNetworkError(true);
      return;
    }

    setNetworkError(false);

    if (data?.clinics) {
      setClinic(data.clinics);
      setRole(data.role);
      setNeedsOnboarding(false);
    } else {
      // Sin membresía activa → el usuario debe crear su clínica
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

  // ── 2. Carga de membresía reactiva a user.id ─────────────────────────────
  // Separado del listener para evitar async dentro de onAuthStateChange.
  // Se dispara en: login (null→uuid), re-login (null→uuid), logout (uuid→null).
  useEffect(() => {
    if (!user?.id) return;
    loadMembership(user.id);
  }, [user?.id, loadMembership]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── signUp ────────────────────────────────────────────────────────────────
  async function signup(email, password, clinicName) {
    const result = await authService.signUp(email, password, clinicName);
    if (result.needsOnboarding) setNeedsOnboarding(true);
    return result;
  }

  // ── login ─────────────────────────────────────────────────────────────────
  async function login(email, password) {
    return authService.signIn(email, password);
  }

  // ── logout ────────────────────────────────────────────────────────────────
  async function logout() {
    // Limpiar inmediatamente para UI responsiva
    if (loadAbortRef.current) loadAbortRef.current.cancelled = true;
    setUser(null);
    setClinic(null);
    setRole(null);
    setNeedsOnboarding(false);
    setNetworkError(false);
    await authService.signOut();
  }

  // ── createClinic: usado desde el onboarding (solo para owners nuevos) ────
  async function createClinic(clinicName) {
    if (!user) throw new Error('No hay sesión activa.');
    const error = await authService.createClinic(user.id, clinicName);
    if (error) throw error;
    // Recargar membresía — el trigger trg_clinics_add_owner
    // habrá creado automáticamente la fila en clinic_members
    await loadMembership(user.id);
  }

  return (
    <AuthContext.Provider value={{
      user,
      clinic,
      role,
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
