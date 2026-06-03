import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useClinic } from './useClinic';

export function useKpis() {
  const { user } = useAuth();
  const { clinic } = useClinic();
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchKpis = useCallback(async () => {
    if (!user || !clinic?.id) {
      setKpis(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbError } = await supabase
        .from('v_clinic_kpis_today')
        .select('total_today, confirmed_today, pending_today, reminders_sent, auto_confirmed')
        .eq('clinic_id', clinic.id)
        .maybeSingle();

      if (sbError) throw sbError;
      // maybeSingle() returns null when the view yields no row (no appointments today)
      setKpis(data ?? {
        total_today: 0, confirmed_today: 0, pending_today: 0,
        reminders_sent: 0, auto_confirmed: 0,
      });
    } catch (err) {
      setError(err);
      setKpis(null);
    } finally {
      setLoading(false);
    }
  }, [user, clinic?.id]);

  // Initial load
  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  // Revalidar al recuperar el foco y en eventos de citas
  useEffect(() => {
    const handler = () => fetchKpis();
    window.addEventListener('focus', handler);
    window.addEventListener('cq_appointment_created', handler);
    window.addEventListener('cq_appointment_updated', handler);
    return () => {
      window.removeEventListener('focus', handler);
      window.removeEventListener('cq_appointment_created', handler);
      window.removeEventListener('cq_appointment_updated', handler);
    };
  }, [fetchKpis]);

  return { kpis, loading, error };
}
