import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useClinic } from './useClinic';
import { Sentry } from '../lib/sentry';

export function usePatients() {
  const { user }   = useAuth();
  const { clinic } = useClinic();
  const [patients,    setPatients]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [totalCount,  setTotalCount]  = useState(0);

  const fetchPatients = useCallback(async () => {
    if (!user || !clinic?.id) {
      setPatients([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbError, count } = await supabase
        .from('patients')
        .select(`
          id, full_name, phone_number, created_at, email,
          appointments ( id, status, appointment_datetime )
        `, { count: 'exact' })
        .eq('clinic_id', clinic.id)
        .order('full_name', { ascending: true })
        .range(0, 99);
      if (sbError) throw sbError;
      setPatients(data ?? []);
      setTotalCount(count ?? 0);
    } catch (err) {
      Sentry.captureException(err, {
        tags: { hook: 'usePatients', clinicId: clinic?.id },
        extra: { errorMessage: err.message },
      });
      setError(err.message ?? 'Error al cargar datos');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [user, clinic?.id]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Realtime: re-fetch on any patient change in this clinic
  useEffect(() => {
    if (!user || !clinic?.id) return;
    const channel = supabase.channel(`patients-${clinic.id}`);
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'patients', filter: `clinic_id=eq.${clinic.id}` },
      fetchPatients,
    ).subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, clinic?.id, fetchPatients]);

  return { patients, loading, error, refetch: fetchPatients, totalCount, hasMore: totalCount > 100 };
}
