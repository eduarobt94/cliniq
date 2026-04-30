import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

/**
 * Detecta conversaciones donde la IA lleva más de 12 horas inactiva
 * (agent_mode='human' o ai_enabled=false) y sugiere reactivar en bloque.
 *
 * El chequeo corre UNA SOLA VEZ por sesión de usuario para no spamear.
 *
 * @param {string|null} clinicId
 * @param {Array} conversations - lista de conversaciones del hook useConversations
 * @returns {{ showBanner, affectedCount, handleReactivate, handleDismiss, reactivating }}
 */
export function useAIReactivation(clinicId, conversations) {
  const [showBanner, setShowBanner]     = useState(false);
  const [affectedCount, setAffectedCount] = useState(0);
  const [reactivating, setReactivating] = useState(false);
  const checkedRef  = useRef(false); // solo chequear una vez por sesión
  const affectedRef = useRef([]);    // { conversationId, patientId }

  useEffect(() => {
    // Solo correr si hay datos y no se checqueó antes
    if (checkedRef.current || !clinicId || conversations.length === 0) return;
    checkedRef.current = true;

    const now = Date.now();
    const affected = [];

    for (const conv of conversations) {
      if (conv.agent_mode !== 'human') continue;

      const lastHuman = conv.agent_last_human_reply_at;
      if (!lastHuman) continue;

      const elapsedMs = now - new Date(lastHuman).getTime();
      if (elapsedMs > TWELVE_HOURS_MS) {
        affected.push({
          conversationId: conv.id,
          patientId:      conv.patient_id,
        });
      }
    }

    if (affected.length > 0) {
      affectedRef.current = affected;
      setAffectedCount(affected.length);
      setShowBanner(true);
    }
  }, [clinicId, conversations]);

  const handleReactivate = useCallback(async () => {
    if (!clinicId || reactivating) return;
    setReactivating(true);

    try {
      const conversationIds = affectedRef.current.map((a) => a.conversationId);
      const patientIds      = affectedRef.current.map((a) => a.patientId).filter(Boolean);

      // Reactivar IA en conversations
      if (conversationIds.length > 0) {
        await supabase
          .from('conversations')
          .update({ agent_mode: 'bot' })
          .in('id', conversationIds);
      }

      // Reactivar ai_enabled en patients
      if (patientIds.length > 0) {
        await supabase
          .from('patients')
          .update({ ai_enabled: true })
          .in('id', patientIds);
      }
    } catch (err) {
      console.error('[useAIReactivation] Error reactivating:', err);
    } finally {
      setReactivating(false);
      setShowBanner(false);
    }
  }, [clinicId, reactivating]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
  }, []);

  return { showBanner, affectedCount, handleReactivate, handleDismiss, reactivating };
}
