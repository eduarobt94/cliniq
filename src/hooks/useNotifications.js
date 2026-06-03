import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_NOTIFS    = 10;
const DAILY_KEY     = 'cq_daily_v1';

// ─── Helpers ──────────────────────────────────────────────────────────────────
// CN-020: Use crypto.randomUUID() instead of Math.random() for collision-resistant IDs
function makeId() {
  return crypto.randomUUID();
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Module-level cache: survives re-renders, shared across hook instances in the same session.
// Avoids N+1 queries when multiple realtime events fire in quick succession.
// Fix CN-CACHE: bounded to MAX_CACHE_SIZE entries to prevent unbounded memory growth.
const MAX_CACHE_SIZE = 500;
const _patientNameCache = new Map();

function setPatientCache(id, name) {
  if (_patientNameCache.size >= MAX_CACHE_SIZE) {
    // Delete the oldest entry (Map preserves insertion order)
    const firstKey = _patientNameCache.keys().next().value;
    _patientNameCache.delete(firstKey);
  }
  _patientNameCache.set(id, name);
}

async function getPatientName(patientId) {
  if (_patientNameCache.has(patientId)) return _patientNameCache.get(patientId);
  const { data } = await supabase
    .from('patients')
    .select('full_name')
    .eq('id', patientId)
    .single();
  const name = data?.full_name ?? 'Paciente';
  setPatientCache(patientId, name);
  return name;
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

  // ── Custom-event subscription ──────────────────────────────────────────────
  // Listens to events dispatched by useAppointments' Realtime channel instead of
  // opening a duplicate WebSocket subscription over the same appointments table.
  useEffect(() => {
    if (!clinicId) return;

    // New appointment created
    const handleCreated = async (e) => {
      const appt = e.detail;
      if (!appt) return;

      const key = `ins-${appt.id}`;
      if (seenEvents.current.has(key)) return;
      seenEvents.current.add(key);

      const name = await getPatientName(appt.patient_id);
      addNotif(`Nuevo turno: ${name}`, 'info');
    };

    // Status changed — only notify for confirmed / cancelled
    const handleUpdated = async (e) => {
      const appt = e.detail;
      if (!appt) return;
      if (appt.status !== 'confirmed' && appt.status !== 'cancelled') return;

      // Dedup: same appointment reaching the same final status only fires once per session
      const key = `upd-${appt.id}-${appt.status}`;
      if (seenEvents.current.has(key)) return;
      seenEvents.current.add(key);

      const name = await getPatientName(appt.patient_id);
      if (appt.status === 'confirmed') addNotif(`Turno confirmado: ${name}`, 'success');
      if (appt.status === 'cancelled') addNotif(`Turno cancelado: ${name}`, 'error');
    };

    window.addEventListener('cq_appointment_created', handleCreated);
    window.addEventListener('cq_appointment_updated', handleUpdated);

    return () => {
      window.removeEventListener('cq_appointment_created', handleCreated);
      window.removeEventListener('cq_appointment_updated', handleUpdated);
    };
  }, [clinicId, addNotif]);

  return { notifications, unreadCount, markAllRead };
}
