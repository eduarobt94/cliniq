import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useClinic } from './useClinic';
import { Sentry } from '../lib/sentry';

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
      Sentry.captureException(err, {
        tags: { hook: 'useAppointments', clinicId: clinic?.id },
        extra: { errorMessage: err.message },
      });
      setError(err.message ?? 'Error al cargar datos');
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
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `clinic_id=eq.${clinic.id}`,
        },
        (payload) => {
          window.dispatchEvent(new CustomEvent('cq_appointment_created', { detail: payload.new }));
          fetchAppointments();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `clinic_id=eq.${clinic.id}`,
        },
        (payload) => {
          window.dispatchEvent(new CustomEvent('cq_appointment_updated', { detail: payload.new }));
          fetchAppointments();
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'appointments',
          filter: `clinic_id=eq.${clinic.id}`,
        },
        () => fetchAppointments(),
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user, clinic?.id, fetchAppointments]);

  return { appointments, loading, error, refetch: fetchAppointments };
}
