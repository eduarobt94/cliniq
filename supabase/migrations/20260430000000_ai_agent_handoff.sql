-- ============================================================
-- CLINIQ — AI Agent Handoff
-- Adds agent control columns to patients, conversations, messages.
-- Run ONCE in Supabase SQL Editor. Never re-run.
-- ============================================================

-- ── patients: control granular por paciente ───────────────────
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS last_human_interaction TIMESTAMPTZ;

COMMENT ON COLUMN patients.ai_enabled IS
  'Si es false, el agente IA no responde a este paciente — el humano tiene el control total';
COMMENT ON COLUMN patients.last_human_interaction IS
  'Timestamp de la última vez que un staff member escribió manualmente. Usado para reactivación automática a las 12h.';

-- ── conversations: estado del agente ─────────────────────────
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS agent_mode TEXT NOT NULL DEFAULT 'bot'
  CHECK (agent_mode IN ('bot', 'human', 'pending'));

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS agent_last_human_reply_at TIMESTAMPTZ;

-- Contexto del lead generado por la IA (intent, resumen, lead score)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS agent_context JSONB DEFAULT '{}';

COMMENT ON COLUMN conversations.agent_mode IS
  'bot=IA responde automáticamente | human=staff tomó control, bot silenciado | pending=esperando, timer corriendo';

-- Índice para queries de reactivación
CREATE INDEX IF NOT EXISTS idx_conversations_agent_mode
  ON conversations(clinic_id, agent_mode, agent_last_human_reply_at);

CREATE INDEX IF NOT EXISTS idx_patients_ai_reactivation
  ON patients(clinic_id, ai_enabled, last_human_interaction)
  WHERE ai_enabled = false;

-- ── messages: dirección outbound_ai + sender_type ─────────────
-- Agregar sender_type para distinguir: 'bot' | 'staff' | 'system' | null (legacy)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS sender_type TEXT;

ALTER TABLE messages
  ADD CONSTRAINT messages_sender_type_check
  CHECK (sender_type IS NULL OR sender_type IN ('bot', 'staff', 'system'));

COMMENT ON COLUMN messages.sender_type IS
  'bot=enviado por IA | staff=enviado por operador humano | system=mensaje interno del sistema (escalaciones, avisos)';

-- Ampliar el CHECK de direction para incluir 'outbound_ai' y 'system'
-- outbound_ai → respuesta generada por Claude y enviada al paciente
-- system     → aviso interno del sistema (escalaciones, etc.) — NO se envía al paciente
DO $$
DECLARE
  v_constraint text;
BEGIN
  SELECT conname INTO v_constraint
  FROM pg_constraint
  WHERE conrelid = 'messages'::regclass
    AND contype   = 'c'
    AND conname LIKE '%direction%';

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE messages DROP CONSTRAINT %I', v_constraint);
  END IF;
END $$;

ALTER TABLE messages ADD CONSTRAINT messages_direction_check
  CHECK (direction IN ('inbound', 'outbound', 'system_template', 'outbound_ai', 'system'));

-- ── Verificar trigger ─────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_messages_sync_conversation'
  ) THEN
    RAISE NOTICE 'Trigger trg_messages_sync_conversation no encontrado — verificar que fn_sync_conversation_last_message está activo';
  END IF;
END $$;
