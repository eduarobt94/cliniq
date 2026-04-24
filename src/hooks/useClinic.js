import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Retorna datos de clínica, rol y perfil del usuario autenticado.
// Usa los valores ya cargados en AuthContext cuando están disponibles.
export function useClinic() {
  const { user, clinic: ctxClinic, role: ctxRole, profile: ctxProfile } = useAuth();
  const [clinic,  setClinic]  = useState(ctxClinic);
  const [role,    setRole]    = useState(ctxRole);
  const [profile, setProfile] = useState(ctxProfile);
  const [loading, setLoading] = useState(!ctxClinic && !!user);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (ctxClinic) {
      setClinic(ctxClinic);
      setRole(ctxRole);
      setProfile(ctxProfile);
      setLoading(false);
      return;
    }

    if (!user) {
      setClinic(null);
      setRole(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchMembership() {
      setLoading(true);
      setError(null);
      try {
        const [{ data: memberData, error: sbError }, { data: profileData }] =
          await Promise.all([
            supabase
              .from('clinic_members')
              .select('role, status, clinics(*)')
              .eq('user_id', user.id)
              .eq('status', 'active')
              .maybeSingle(),
            supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', user.id)
              .maybeSingle(),
          ]);

        if (cancelled) return;
        if (sbError) throw sbError;

        setClinic(memberData?.clinics ?? null);
        setRole(memberData?.role ?? null);
        setProfile(profileData ?? null);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMembership();
    return () => { cancelled = true; };
  }, [user?.id, ctxClinic, ctxRole, ctxProfile]);

  return { clinic, role, profile, loading, error };
}
