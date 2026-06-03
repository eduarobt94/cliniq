import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * For a list of conversation IDs, returns a Map<conversationId, number>
 * where the number is how many consecutive inbound (patient) messages sit
 * at the end of the thread — i.e. messages the doctor hasn't replied to yet.
 *
 * Uses the server-side RPC get_unread_counts to avoid downloading all messages.
 * Falls back to an empty map if the RPC is not yet available (migration pending).
 * Re-runs whenever conversationIds changes.
 */
const EMPTY_IDS = [];
export function useUnreadCounts(conversationIds = EMPTY_IDS) {
  const [counts, setCounts] = useState(new Map());

  useEffect(() => {
    if (!conversationIds.length) { setCounts(new Map()); return; }

    let cancelled = false;

    async function load() {
      try {
        const { data, error } = await supabase.rpc('get_unread_counts', {
          p_conversation_ids: conversationIds,
        });

        if (error) throw error;
        if (cancelled || !data) return;

        // data: [{ conversation_id: '...', unread_count: 3 }, ...]
        const map = new Map();
        for (const row of data) {
          map.set(row.conversation_id, row.unread_count);
        }
        setCounts(map);
      } catch (err) {
        console.warn('[useUnreadCounts] RPC not available, falling back:', err.message);
        if (!cancelled) {
          // Fallback: mostrar 0 — no calcular en cliente para evitar descargar todos los mensajes
          setCounts(new Map());
        }
      }
    }

    load();
    return () => { cancelled = true; };
  // Stringify so the effect only re-runs when the actual IDs change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationIds.join(',')]);

  return counts;
}
