import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const OUTBOUND = new Set(['outbound', 'outbound_ai', 'system_template']);

/**
 * For a list of conversation IDs, returns a Map<conversationId, number>
 * where the number is how many consecutive inbound (patient) messages sit
 * at the end of the thread — i.e. messages the doctor hasn't replied to yet.
 *
 * Uses a single query (all conversations at once) and computes client-side.
 * Re-runs whenever conversationIds changes.
 */
export function useUnreadCounts(conversationIds = []) {
  const [counts, setCounts] = useState(new Map());

  useEffect(() => {
    if (!conversationIds.length) { setCounts(new Map()); return; }

    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from('messages')
        .select('conversation_id, direction, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: true });

      if (cancelled || !data) return;

      // Group by conversation
      const byConv = {};
      for (const msg of data) {
        (byConv[msg.conversation_id] ??= []).push(msg);
      }

      const map = new Map();
      for (const [convId, msgs] of Object.entries(byConv)) {
        // Walk backwards from the end; count inbound until we hit an outbound
        let n = 0;
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (OUTBOUND.has(msgs[i].direction)) break;
          if (msgs[i].direction === 'inbound') n++;
        }
        map.set(convId, n);
      }

      setCounts(map);
    }

    load();
    return () => { cancelled = true; };
  // Stringify so the effect only re-runs when the actual IDs change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationIds.join(',')]);

  return counts;
}
