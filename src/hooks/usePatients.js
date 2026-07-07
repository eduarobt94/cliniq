import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useClinic } from './useClinic';
import { Sentry } from '../lib/sentry';

const PAGE_LIMIT = 100;

/**
 * MEDIO-10: búsqueda server-side + paginación.
 * `searchTerm` filtra en el servidor (ilike nombre/teléfono) para poder encontrar
 * pacientes más allá de los primeros 100. Sin término, trae la primera página.
 */
export function usePatients(searchTerm = '') {
  const { user }   = useAuth();
  const { clinic } = useClinic();
  const [patients,    setPatients]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [totalCount,  setTotalCount]  = useState(0);

  const term = (searchTerm ?? '').trim();

  const fetchPatients = useCallback(async () => {
    if (!user || !clinic?.id) {
      setPatients([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('patients')
        .select(`
          id, full_name, phone_number, created_at, email,
          appointments ( id, status, appointment_datetime )
        `, { count: 'exact' })
        .eq('clinic_id', clinic.id);

      if (term) {
        // PostgREST safe search (mismo patrón que el resto del proyecto)
        const safe = term.replace(/[(),"]/g, '').replace(/\s+/g, ' ').trim();
        if (safe) query = query.or(`full_name.ilike.%${safe}%,phone_number.ilike.%${safe}%`);
      }

      const { data, error: sbError, count } = await query
        .order('full_name', { ascending: true })
        .range(0, PAGE_LIMIT - 1);
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
  }, [user, clinic?.id, term]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Realtime: canal estable por clínica (no re-suscribe al cambiar la búsqueda)
  const fetchRef = useRef(fetchPatients);
  useEffect(() => { fetchRef.current = fetchPatients; }, [fetchPatients]);

  useEffect(() => {
    if (!user || !clinic?.id) return;
    const channel = supabase.channel(`patients-${clinic.id}`);
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'patients', filter: `clinic_id=eq.${clinic.id}` },
      () => fetchRef.current(),
    ).subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, clinic?.id]);

  return {
    patients,
    loading,
    error,
    refetch:   fetchPatients,
    totalCount,
    searching: !!term,
    // Cuando se busca, count = matches; el aviso de "primeros 100" solo aplica sin búsqueda
    hasMore:   !term && totalCount > PAGE_LIMIT,
  };
}
