import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useRealtimeMessages(conversationId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  // Set of temp IDs that are still "sending"
  const pendingIds = useRef(new Set());

  const fetchMessages = useCallback(async () => {
    if (!conversationId) { setMessages([]); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (err) { setError(err.message); }
    else { pendingIds.current.clear(); setMessages(data ?? []); }
    setLoading(false);
  }, [conversationId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase.channel(`messages:conv:${conversationId}`);
    channel
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const newMsg = payload.new;
          setMessages((prev) => {
            // Already in list → skip
            if (prev.some((m) => m.id === newMsg.id)) return prev;

            if (newMsg.direction === 'outbound' || newMsg.direction === 'outbound_ai' || newMsg.direction === 'system_template') {
              // Remove ALL optimistic (sending) outbound messages with the same content,
              // then add the confirmed real message
              const withoutOptimistic = prev.filter(
                (m) => !(pendingIds.current.has(m.id) && m.content === newMsg.content)
              );
              // Clean up matched pending ids
              prev.forEach((m) => {
                if (pendingIds.current.has(m.id) && m.content === newMsg.content) {
                  pendingIds.current.delete(m.id);
                }
              });
              return [...withoutOptimistic, newMsg];
            }

            // Inbound — just append
            return [...prev, newMsg];
          });
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [conversationId]);

  const addOptimistic = useCallback((tempMsg) => {
    pendingIds.current.add(tempMsg.id);
    setMessages((prev) => [...prev, tempMsg]);
  }, []);

  const removeOptimistic = useCallback((tempId) => {
    pendingIds.current.delete(tempId);
    setMessages((prev) => prev.filter((m) => m.id !== tempId));
  }, []);

  const deleteMessage = useCallback(async (messageId) => {
    const { error: err } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);
    if (!err) {
      // Optimistically remove from UI (Realtime DELETE will confirm)
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
    return err;
  }, []);

  return { messages, loading, error, addOptimistic, removeOptimistic, deleteMessage, refetch: fetchMessages };
}
