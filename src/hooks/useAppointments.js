import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useClinic } from './useClinic';

export function useAppointments() {
  const { user } = useAuth();
  const { clinic } = useClinic();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAppointments = useCallback(async () => {
    if (!user || !clinic?.id) {
      setAppointments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: sbError } = await supabase
        .from('v_today_appointments')
        .select('*')
        .eq('clinic_id', clinic.id);

      if (sbError) throw sbError;
      setAppointments(data ?? []);
    } catch (err) {
      setError(err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [user, clinic?.id]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    if (!user || !clinic?.id) return;

    const channel = supabase.channel(`appointments-clinic-${clinic.id}`);
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `clinic_id=eq.${clinic.id}`,
      },
      () => fetchAppointments(),
    ).subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, clinic?.id, fetchAppointments]);

  return { appointments, loading, error, refetch: fetchAppointments };
}
