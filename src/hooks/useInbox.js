import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / 86_400_000);

  if (diffDays === 0) {
    return date.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'ayer';
  if (diffDays < 7) {
    return date.toLocaleDateString('es-UY', { weekday: 'short' });
  }
  return date.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit' });
}

export function useInbox(clinicId) {
  const [allMessages, setAllMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('whatsapp_message_log')
        .select('id, phone_number, message, direction, status, created_at, patients(full_name)')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (!cancelled) {
        setAllMessages(data ?? []);
        setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel(`inbox-all-${clinicId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_message_log',
          filter: `clinic_id=eq.${clinicId}` },
        () => load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [clinicId]);

  // Derive conversation list: one entry per phone, showing latest message
  const conversations = useMemo(() => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    // allMessages is sorted desc; first hit per phone = latest
    const seen = new Map();
    const unread = new Map();

    for (const msg of allMessages) {
      const phone = msg.phone_number;
      if (!seen.has(phone)) {
        seen.set(phone, {
          phone,
          patientName: msg.patients?.full_name ?? phone,
          lastMsg: msg.message,
          lastTime: msg.created_at,
          lastDirection: msg.direction,
        });
        unread.set(phone, 0);
      }
      if (msg.direction === 'inbound' && msg.created_at > cutoff) {
        unread.set(phone, (unread.get(phone) ?? 0) + 1);
      }
    }

    return Array.from(seen.values()).map((c) => ({
      ...c,
      unread: unread.get(c.phone) ?? 0,
      lastTimeFormatted: formatTime(c.lastTime),
    }));
  }, [allMessages]);

  // Derive thread for a selected phone (chronological)
  const getThread = (phone) => {
    if (!phone) return [];
    return allMessages
      .filter((m) => m.phone_number === phone)
      .slice()
      .reverse()
      .map((m) => ({
        id: m.id,
        direction: m.direction,
        message: m.message,
        time: formatTime(m.created_at),
      }));
  };

  return { conversations, allMessages, getThread, loading };
}
