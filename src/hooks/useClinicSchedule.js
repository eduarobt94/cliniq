import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Default weekly schedule: Mon–Fri open 09:00–18:00, Sat–Sun closed
const DEFAULT_SCHEDULE = [0, 1, 2, 3, 4, 5, 6].map(dow => ({
  day_of_week: dow,
  is_open:     dow >= 1 && dow <= 5,
  open_time:   '09:00',
  close_time:  '18:00',
}));

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function useClinicSchedule(clinicId) {
  const [schedule, setSchedule] = useState(null);
  const [closures, setClosures] = useState([]);
  const [loading,  setLoading]  = useState(true);

  const refetch = useCallback(async () => {
    if (!clinicId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [{ data: sched }, { data: cls }] = await Promise.all([
        supabase
          .from('clinic_schedule')
          .select('*')
          .eq('clinic_id', clinicId)
          .order('day_of_week'),
        supabase
          .from('clinic_closures')
          .select('*')
          .eq('clinic_id', clinicId)
          .gte('date', todayISO())
          .order('date'),
      ]);

      // Merge DB rows with defaults so all 7 days are always present
      const merged = DEFAULT_SCHEDULE.map(def => {
        const row = sched?.find(s => s.day_of_week === def.day_of_week);
        return row ?? def;
      });
      setSchedule(merged);
      setClosures(cls ?? []);
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => { refetch(); }, [refetch]);

  async function saveSchedule(rows) {
    const upsertData = rows.map(r => ({
      clinic_id:   clinicId,
      day_of_week: r.day_of_week,
      is_open:     r.is_open,
      open_time:   r.open_time,
      close_time:  r.close_time,
      ...(r.id ? { id: r.id } : {}),
    }));
    const { error } = await supabase
      .from('clinic_schedule')
      .upsert(upsertData, { onConflict: 'clinic_id,day_of_week' });
    if (error) throw error;
    await refetch();
  }

  async function addClosure(closure) {
    const { error } = await supabase
      .from('clinic_closures')
      .upsert({ ...closure, clinic_id: clinicId }, { onConflict: 'clinic_id,date' });
    if (error) throw error;
    await refetch();
  }

  async function removeClosure(id) {
    const { error } = await supabase
      .from('clinic_closures')
      .delete()
      .eq('id', id);
    if (error) throw error;
    await refetch();
  }

  async function markNotificationSent(id) {
    const { error } = await supabase
      .from('clinic_closures')
      .update({ notification_sent_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    await refetch();
  }

  return { schedule, closures, loading, saveSchedule, addClosure, removeClosure, markNotificationSent, refetch };
}
