import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Loads and subscribes to the conversations list for a clinic.
 * UPDATE events are applied in-place (no full refetch) to avoid flicker.
 * INSERT events trigger a full refetch to get joined patient data.
 */
export function useConversations(clinicId) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);

  const fetch = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('conversations')
      .select(`
        id,
        clinic_id,
        patient_id,
        phone_number,
        last_message,
        last_message_at,
        created_at,
        patients ( id, full_name, phone_number )
      `)
      .eq('clinic_id', clinicId)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (err) {
      setError(err.message);
    } else {
      setConversations(data ?? []);
    }
    setLoading(false);
  }, [clinicId]);

  // Initial load
  useEffect(() => { fetch(); }, [fetch]);

  // Realtime — optimized: UPDATE in-place, INSERT refetch
  useEffect(() => {
    if (!clinicId) return;

    const channel = supabase
      .channel(`conversations:clinic:${clinicId}`)
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'conversations',
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          // Update last_message fields in-place and re-sort
          setConversations((prev) => {
            const updated = prev.map((c) =>
              c.id === payload.new.id
                ? {
                    ...c,
                    last_message:           payload.new.last_message,
                    last_message_at:        payload.new.last_message_at,
                    last_message_direction: payload.new.last_message_direction,
                  }
                : c,
            );
            return [...updated].sort((a, b) => {
              if (!a.last_message_at) return 1;
              if (!b.last_message_at) return -1;
              return new Date(b.last_message_at) - new Date(a.last_message_at);
            });
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'conversations',
          filter: `clinic_id=eq.${clinicId}`,
        },
        () => fetch(),  // Need full fetch to get joined patient data
      )
      .on(
        'postgres_changes',
        {
          event:  'DELETE',
          schema: 'public',
          table:  'conversations',
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          setConversations((prev) => prev.filter((c) => c.id !== payload.old.id));
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clinicId, fetch]);

  const deleteConversation = useCallback(async (conversationId) => {
    const { error: err } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);
    return err;
  }, []);

  return { conversations, loading, error, refetch: fetch, deleteConversation };
}
