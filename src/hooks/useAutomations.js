import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useAutomations(clinicId) {
  const [automations, setAutomations] = useState([]);
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  useEffect(() => {
    if (!clinicId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [{ data: autos, error: aErr }, { data: statsRow }] = await Promise.all([
          supabase
            .from('clinic_automations')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('created_at'),

          supabase
            .from('v_automation_stats')
            .select('total_sent, ok, success_rate, last_sent_at')
            .eq('clinic_id', clinicId)
            .maybeSingle(),
        ]);

        if (cancelled) return;
        if (aErr) { setError(aErr.message); return; }

        setAutomations(autos ?? []);
        setStats(statsRow ?? null);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err?.message ?? 'Error al cargar automatizaciones');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [clinicId]);

  const toggleAutomation = useCallback(async (id, enabled) => {
    // Optimistic update
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, enabled } : a));

    const { data, error: err } = await supabase
      .from('clinic_automations')
      .update({ enabled })
      .eq('id', id)
      .select()
      .single();

    if (err) {
      // Rollback
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, enabled: !enabled } : a));
      return { error: err.message };
    }

    setAutomations(prev => prev.map(a => a.id === id ? data : a));
    return { error: null };
  }, []);

  const updateTemplate = useCallback(async (id, fields) => {
    const { data, error: err } = await supabase
      .from('clinic_automations')
      .update(fields)
      .eq('id', id)
      .select()
      .single();

    if (err) return { error: err.message };
    setAutomations(prev => prev.map(a => a.id === id ? data : a));
    return { error: null };
  }, []);

  return { automations, stats, loading, error, toggleAutomation, updateTemplate };
}
