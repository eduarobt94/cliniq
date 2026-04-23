import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Hook para componentes que necesitan datos de clínica + rol.
// Usa clinic/role del AuthContext cuando están disponibles (ya cargados),
// de lo contrario los consulta directamente.
export function useClinic() {
  const { user, clinic: ctxClinic, role: ctxRole } = useAuth();
  const [clinic,  setClinic]  = useState(ctxClinic);
  const [role,    setRole]    = useState(ctxRole);
  const [loading, setLoading] = useState(!ctxClinic && !!user);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    // Si el AuthContext ya tiene la clínica cargada, sincronizar y no re-fetchar
    if (ctxClinic) {
      setClinic(ctxClinic);
      setRole(ctxRole);
      setLoading(false);
      return;
    }

    if (!user) {
      setClinic(null);
      setRole(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchMembership() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: sbError } = await supabase
          .from('clinic_members')
          .select('role, status, clinics(*)')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (cancelled) return;
        if (sbError) throw sbError;

        if (data?.clinics) {
          setClinic(data.clinics);
          setRole(data.role);
        } else {
          setClinic(null);
          setRole(null);
        }
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMembership();
    return () => { cancelled = true; };
  }, [user?.id, ctxClinic, ctxRole]);

  return { clinic, role, loading, error };
}
