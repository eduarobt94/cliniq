import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useClinic } from './useClinic';

export function useAgendaRange(startDateStr, endDateStr) {
  const { user }   = useAuth();
  const { clinic } = useClinic();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchAppointments = useCallback(async () => {
    if (!user || !clinic?.id || !startDateStr || !endDateStr) {
      setAppointments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const start = new Date(`${startDateStr}T00:00:00`).toISOString();
      const end   = new Date(`${endDateStr}T23:59:59.999`).toISOString();
      const { data, error: sbError } = await supabase
        .from('appointments')
        .select('*, patients(full_name, phone_number)')
        .eq('clinic_id', clinic.id)
        .gte('appointment_datetime', start)
        .lte('appointment_datetime', end)
        .order('appointment_datetime');
      if (sbError) throw sbError;
      setAppointments(data ?? []);
    } catch (err) {
      setError(err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [user, clinic?.id, startDateStr, endDateStr]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    if (!user || !clinic?.id) return;
    const channel = supabase.channel(`agenda-range-${clinic.id}-${startDateStr}-${endDateStr}`);
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'appointments', filter: `clinic_id=eq.${clinic.id}` },
      fetchAppointments,
    ).subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, clinic?.id, startDateStr, endDateStr, fetchAppointments]);

  return { appointments, loading, error, refetch: fetchAppointments };
}
