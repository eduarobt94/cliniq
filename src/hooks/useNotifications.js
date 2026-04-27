import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_NOTIFS    = 10;
const DAILY_KEY     = 'cq_daily_v1';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function getPatientName(patientId) {
  const { data } = await supabase
    .from('patients')
    .select('full_name')
    .eq('id', patientId)
    .single();
  return data?.full_name ?? 'Paciente';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
/**
 * Manages the in-app notification system.
 * @param {string|null} clinicId - The authenticated user's clinic ID.
 * @param {function}    push     - Toast push function from useToast().
 */
export function useNotifications(clinicId, push) {
  const [notifications, setNotifications] = useState([]);
  const seenEvents = useRef(new Set());

  // ── Add a notification (internal) ─────────────────────────────────────────
  const addNotif = useCallback((message, type) => {
    const notif = {
      id:        makeId(),
      message,
      type,     // 'success' | 'error' | 'info' | 'warn'
      timestamp: new Date(),
      read:      false,
    };
    setNotifications(prev => [notif, ...prev].slice(0, MAX_NOTIFS));
    // Mirror to toast — map 'info'→'info', 'warn'→'warn' (now supported by Toast)
    push?.(message, type);
  }, [push]);

  // ── Public: mark all as read ───────────────────────────────────────────────
  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  // ── Daily summary (once per calendar day) ─────────────────────────────────
  useEffect(() => {
    if (!clinicId) return;
    const storageKey = `${DAILY_KEY}_${todayStr()}`;
    if (localStorage.getItem(storageKey)) return;

    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);

    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .gte('appointment_datetime', start.toISOString())
      .lte('appointment_datetime', end.toISOString())
      .then(({ count }) => {
        if (count == null) return;
        const msg = count === 0
          ? 'Sin turnos agendados para hoy.'
          : `Buen día — tenés ${count} turno${count !== 1 ? 's' : ''} hoy.`;
        addNotif(msg, 'info');
        localStorage.setItem(storageKey, '1');
      });
  }, [clinicId, addNotif]);

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!clinicId) return;

    const channel = supabase
      .channel(`notif-${clinicId}`)

      // New appointment created
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'appointments', filter: `clinic_id=eq.${clinicId}` },
        async ({ new: appt }) => {
          const key = `ins-${appt.id}`;
          if (seenEvents.current.has(key)) return;
          seenEvents.current.add(key);

          const name = await getPatientName(appt.patient_id);
          addNotif(`Nuevo turno: ${name}`, 'info');
        }
      )

      // Status changed — only notify for confirmed / cancelled
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'appointments', filter: `clinic_id=eq.${clinicId}` },
        async ({ new: appt }) => {
          if (appt.status !== 'confirmed' && appt.status !== 'cancelled') return;

          // Dedup: same appointment reaching the same final status only fires once per session
          const key = `upd-${appt.id}-${appt.status}`;
          if (seenEvents.current.has(key)) return;
          seenEvents.current.add(key);

          const name = await getPatientName(appt.patient_id);
          if (appt.status === 'confirmed') addNotif(`Turno confirmado: ${name}`, 'success');
          if (appt.status === 'cancelled') addNotif(`Turno cancelado: ${name}`, 'error');
        }
      )

      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          // Supabase will auto-reconnect; surface a one-time warning
          const key = 'channel-error';
          if (seenEvents.current.has(key)) return;
          seenEvents.current.add(key);
          push?.('Error de conexión en tiempo real. Reconectando…', 'warn');
          // Clear the flag after 30s so a persistent failure re-notifies
          setTimeout(() => seenEvents.current.delete(key), 30_000);
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [clinicId, addNotif, push]);

  return { notifications, unreadCount, markAllRead };
}
