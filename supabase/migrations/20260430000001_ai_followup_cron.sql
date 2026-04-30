-- ═══════════════════════════════════════════════════════════════════════════════
-- AI FOLLOW-UP CRON: reactiva la IA si el staff no responde en 3 minutos
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- PASO PREVIO (ejecutar UNA VEZ en el SQL Editor de Supabase):
--
--   INSERT INTO public.ai_config (key, value)
--   VALUES ('supabase_url', 'https://TUPROYECTO.supabase.co')
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
--
-- No se necesita guardar el service_role_key porque ai-agent-reply
-- usa --no-verify-jwt y acepta llamadas sin autenticación.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Habilitar extensiones (activarlas primero en Dashboard → Database → Extensions)
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ─── Tabla de configuración (solo guarda la URL, no secrets sensibles) ────────
CREATE TABLE IF NOT EXISTS public.ai_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

-- ─── Función principal ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ai_followup_tick()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  rec   RECORD;
BEGIN
  -- Leer URL desde tabla de config
  SELECT value INTO v_url FROM public.ai_config WHERE key = 'supabase_url';

  IF v_url IS NULL OR v_url = '' THEN
    RAISE LOG '[ai_followup_tick] SKIP: supabase_url no configurada en ai_config';
    RETURN;
  END IF;

  -- Buscar conversaciones donde:
  --   · El mensaje más reciente es inbound (paciente esperando respuesta)
  --   · Ese mensaje tiene entre 3 min y 2 horas de antigüedad
  FOR rec IN
    WITH last_msg AS (
      SELECT DISTINCT ON (conversation_id)
        conversation_id,
        direction,
        created_at
      FROM messages
      ORDER BY conversation_id, created_at DESC
    ),
    convs_needing_reply AS (
      SELECT c.id AS conversation_id, c.clinic_id
      FROM conversations c
      JOIN last_msg lm ON lm.conversation_id = c.id
      WHERE lm.direction = 'inbound'
        AND lm.created_at BETWEEN NOW() - INTERVAL '2 hours' AND NOW() - INTERVAL '2 minutes'
    )
    SELECT * FROM convs_needing_reply
  LOOP
    -- No necesita Authorization porque ai-agent-reply usa --no-verify-jwt
    PERFORM net.http_post(
      url     := v_url || '/functions/v1/ai-agent-reply',
      headers := '{"Content-Type": "application/json"}'::jsonb,
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

-- ─── Programar cada 2 minutos ─────────────────────────────────────────────────
SELECT cron.schedule(
  'ai-followup-tick',
  '*/2 * * * *',
  'SELECT public.ai_followup_tick()'
);
