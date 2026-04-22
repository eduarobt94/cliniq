import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useClinic } from './useClinic';

export function usePatients() {
  const { user } = useAuth();
  const { clinic } = useClinic();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !clinic?.id) {
      setPatients([]);
      setLoading(false);
      return;
    }

    async function fetchPatients() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: sbError } = await supabase
          .from('patients')
          .select('*')
          .eq('clinic_id', clinic.id)
          .limit(50);

        if (sbError) throw sbError;
        setPatients(data ?? []);
      } catch (err) {
        setError(err);
        setPatients([]);
      } finally {
        setLoading(false);
      }
    }

    fetchPatients();
  }, [user, clinic?.id]);

  return { patients, loading, error };
}
