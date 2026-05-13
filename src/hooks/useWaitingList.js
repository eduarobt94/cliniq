import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Fetches and watches the waiting list entries for a clinic.
 * Filters by status = 'waiting' by default; pass null to get all.
 */
export function useWaitingList(clinicId, statusFilter = 'waiting') {
  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const fetchEntries = useCallback(async () => {
    if (!clinicId) { setLoading(false); return; }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('waiting_list')
        .select(`
          id,
          service,
          preferred_date_from,
          preferred_date_to,
          notes,
          status,
          notified_at,
          created_at,
          patients ( id, full_name, phone_number )
        `)
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

      if (statusFilter !== null) {
        query = query.eq('status', statusFilter);
      }

      const { data, error: fetchErr } = await query;

      if (fetchErr) throw fetchErr;
      setEntries(data ?? []);
    } catch (err) {
      console.error('[useWaitingList] fetch error:', err);
      setError(err.message ?? 'Error al cargar la lista de espera');
    } finally {
      setLoading(false);
    }
  }, [clinicId, statusFilter]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // Realtime: refresh when waiting_list changes for this clinic
  useEffect(() => {
    if (!clinicId) return;

    const channel = supabase
      .channel(`waiting-list-${clinicId}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'waiting_list',
        filter: `clinic_id=eq.${clinicId}`,
      }, fetchEntries)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clinicId, fetchEntries]);

  return { entries, loading, error, refetch: fetchEntries };
}

/**
 * Returns the count of 'waiting' entries for badge display.
 */
export function useWaitlistBadge(clinicId) {
  const [count, setCount] = useState(null);

  useEffect(() => {
    if (!clinicId) return;

    async function load() {
      const { count: n } = await supabase
        .from('waiting_list')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .eq('status', 'waiting');
      setCount(n > 0 ? Math.min(n, 99) : null);
    }

    load();

    const channel = supabase
      .channel(`waitlist-badge-${clinicId}`)
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'waiting_list',
        filter: `clinic_id=eq.${clinicId}`,
      }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clinicId]);

  return count;
}
