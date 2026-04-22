import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useClinic } from './useClinic';

export function useKpis() {
  const { user } = useAuth();
  const { clinic } = useClinic();
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !clinic?.id) {
      setKpis(null);
      setLoading(false);
      return;
    }

    async function fetchKpis() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: sbError } = await supabase
          .from('v_clinic_kpis_today')
          .select('total_today, confirmed_today, pending_today, reminders_sent, auto_confirmed')
          .eq('clinic_id', clinic.id)
          .single();

        if (sbError) throw sbError;
        setKpis(data);
      } catch (err) {
        setError(err);
        setKpis(null);
      } finally {
        setLoading(false);
      }
    }

    fetchKpis();
  }, [user, clinic?.id]);

  return { kpis, loading, error };
}
