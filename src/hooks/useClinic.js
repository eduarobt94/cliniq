import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useClinic() {
  const { user } = useAuth();
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setClinic(null);
      setLoading(false);
      return;
    }

    async function fetchClinic() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: sbError } = await supabase
          .from('clinics')
          .select('*')
          .single();

        if (sbError) throw sbError;
        setClinic(data);
      } catch (err) {
        setError(err);
        setClinic(null);
      } finally {
        setLoading(false);
      }
    }

    fetchClinic();
  }, [user]);

  return { clinic, loading, error };
}
