import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useClinic } from './useClinic';

// dateStr: 'YYYY-MM-DD'  — uses browser local time (correct for Uruguay users)
function dayBounds(dateStr) {
  const start = new Date(`${dateStr}T00:00:00`);
  const end   = new Date(`${dateStr}T23:59:59.999`);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function useAgenda(dateStr) {
  const { user }   = useAuth();
  const { clinic } = useClinic();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetchAppointments = useCallback(async () => {
    if (!user || !clinic?.id) {
      setAppointments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { start, end } = dayBounds(dateStr);
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
  }, [user, clinic?.id, dateStr]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Realtime: refetch when any appointment in this clinic changes
  useEffect(() => {
    if (!user || !clinic?.id) return;
    const channel = supabase
      .channel(`agenda-${clinic.id}-${dateStr}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `clinic_id=eq.${clinic.id}` },
        fetchAppointments,
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, clinic?.id, dateStr, fetchAppointments]);

  return { appointments, loading, error, refetch: fetchAppointments };
}
