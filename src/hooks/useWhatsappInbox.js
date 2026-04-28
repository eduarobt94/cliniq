import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useWhatsappInbox(clinicId, limit = 4) {
  const [messages,    setMessages]    = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    if (!clinicId) return;
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from('whatsapp_message_log')
        .select('id, phone_number, message, created_at, patients(full_name)')
        .eq('clinic_id', clinicId)
        .eq('direction', 'inbound')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (cancelled) return;

      const rows = data ?? [];
      setMessages(rows);

      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      setUnreadCount(rows.filter(m => m.created_at > cutoff).length);
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel(`wa-inbox-${clinicId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_message_log',
          filter: `clinic_id=eq.${clinicId}` },
        () => load()
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [clinicId, limit]);

  return { messages, unreadCount, loading };
}
