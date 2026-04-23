import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useClinic() {
  const { user } = useAuth();
  const [clinic, setClinic] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setClinic(null);
      setRole(null);
      setLoading(false);
      return;
    }

    async function fetchClinic() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: sbError } = await supabase
          .from('clinic_members')
          .select('role, clinics(*)')
          .eq('user_id', user.id);

        if (sbError) throw sbError;

        if (data && data.length > 0) {
          // Use the first clinic (or the one marked active in the future)
          const firstMembership = data[0];
          setClinic(firstMembership.clinics);
          setRole(firstMembership.role);
        } else {
          setClinic(null);
          setRole(null);
        }
      } catch (err) {
        setError(err);
        setClinic(null);
        setRole(null);
      } finally {
        setLoading(false);
      }
    }

    fetchClinic();
  }, [user]);

  return { clinic, role, loading, error };
}
