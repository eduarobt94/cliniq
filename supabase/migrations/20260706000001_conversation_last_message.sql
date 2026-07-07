-- ═══════════════════════════════════════════════════════════════════════════════
-- ALTO-5 (audit 2026-07-06): eliminar el full-scan de `messages` en ai_followup_tick
--
-- Antes: ai_followup_tick() hacía SELECT DISTINCT ON (conversation_id) ... FROM messages
-- ORDER BY conversation_id, created_at DESC, SIN filtro de clínica → sort de TODA la
-- tabla de mensajes de todas las clínicas en cada tick del cron.
--
-- Ahora: denormalizamos el último mensaje en `conversations` con un trigger, y el cron
-- escanea solo `conversations` con un índice parcial. O(conversaciones activas).
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Columnas denormalizadas
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS last_message_at        timestamptz,
  ADD COLUMN IF NOT EXISTS last_message_direction text;

-- 2. Trigger que las mantiene al día en cada mensaje nuevo
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE conversations
     SET last_message_at        = NEW.created_at,
         last_message_direction = NEW.direction
   WHERE id = NEW.conversation_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_conversation_last_message ON messages;
CREATE TRIGGER trg_conversation_last_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- 3. Backfill del estado actual
UPDATE conversations c
   SET last_message_at        = lm.created_at,
       last_message_direction = lm.direction
FROM (
  SELECT DISTINCT ON (conversation_id) conversation_id, created_at, direction
  FROM   messages
  ORDER  BY conversation_id, created_at DESC
) lm
WHERE lm.conversation_id = c.id;

-- 4. Índice parcial para el cron (solo conversaciones cuyo último mensaje es inbound)
CREATE INDEX IF NOT EXISTS idx_conversations_followup
  ON conversations(last_message_at)
  WHERE last_message_direction = 'inbound';

-- 5. Reescribir ai_followup_tick() para usar el índice en vez del full-scan
CREATE OR REPLACE FUNCTION public.ai_followup_tick()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url    text;
  v_secret text;
  rec      RECORD;
BEGIN
  SELECT value INTO v_url    FROM public.ai_config WHERE key = 'supabase_url';
  SELECT value INTO v_secret FROM public.ai_config WHERE key = 'cron_secret';

  IF v_url IS NULL OR v_url = '' THEN
    RAISE LOG '[ai_followup_tick] SKIP: supabase_url no configurada en ai_config';
    RETURN;
  END IF;

  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE LOG '[ai_followup_tick] SKIP: cron_secret no configurada en ai_config';
    RETURN;
  END IF;

  FOR rec IN
    SELECT c.id AS conversation_id, c.clinic_id
    FROM   conversations c
    WHERE  c.last_message_direction = 'inbound'
      AND  c.last_message_at BETWEEN NOW() - INTERVAL '2 hours' AND NOW() - INTERVAL '2 minutes'
  LOOP
    PERFORM net.http_post(
      url     := v_url || '/functions/v1/ai-agent-reply',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'X-Cron-Secret', v_secret
      ),
      body    := jsonb_build_object(
        'conversationId', rec.conversation_id::text,
        'clinicId',       rec.clinic_id::text,
        'force',          true
      )
    );
    RAISE LOG '[ai_followup_tick] Follow-up para conversación %', rec.conversation_id;
  END LOOP;
END;
$$;
