import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useWaitingList(clinicId) {
  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const refetch = useCallback(async () => {
    if (!clinicId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('waiting_list')
        .select('*, patients(full_name, phone_number)')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });
      if (err) throw err;
      setEntries(data ?? []);
    } catch (err) {
      setError(err?.message ?? 'Error al cargar lista de espera');
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => { refetch(); }, [refetch]);

  async function updateStatus(id, status) {
    const { error: err } = await supabase
      .from('waiting_list').update({ status }).eq('id', id);
    if (err) throw err;
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status } : e));
  }

  async function deleteEntry(id) {
    const { error: err } = await supabase
      .from('waiting_list').delete().eq('id', id);
    if (err) throw err;
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  return { entries, loading, error, refetch, updateStatus, deleteEntry };
}
