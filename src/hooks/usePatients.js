import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useClinic } from './useClinic';

export function usePatients() {
  const { user }   = useAuth();
  const { clinic } = useClinic();
  const [patients, setPatients] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const fetchPatients = useCallback(async () => {
    if (!user || !clinic?.id) {
      setPatients([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbError } = await supabase
        .from('patients')
        .select('id, full_name, phone_number, created_at, appointments(appointment_datetime, status, appointment_type)')
        .eq('clinic_id', clinic.id)
        .order('full_name');
      if (sbError) throw sbError;
      setPatients(data ?? []);
    } catch (err) {
      setError(err);
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
    const channel = supabase
      .channel(`patients-${clinic.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'patients', filter: `clinic_id=eq.${clinic.id}` },
        fetchPatients,
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, clinic?.id, fetchPatients]);

  return { patients, loading, error, refetch: fetchPatients };
}
