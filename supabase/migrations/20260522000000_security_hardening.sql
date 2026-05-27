-- ═══════════════════════════════════════════════════════════════════════════════
-- Security Hardening — Cyber Neo findings CN-001, CN-014, CN-023
-- 2026-05-22
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── CN-014: Fix profiles INSERT RLS policy ───────────────────────────────────
-- The original policy used WITH CHECK (true) allowing any authenticated user
-- to insert any profile row. SECURITY DEFINER triggers bypass RLS automatically
-- so they are unaffected by this stricter policy.
DROP POLICY IF EXISTS "profiles: insert via trigger" ON public.profiles;
CREATE POLICY "profiles: insert own"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ─── CN-023: Add missing INSERT policy for clinic_automations ─────────────────
-- Only owners and admins can create new automation entries.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'clinic_automations'
      AND policyname = 'clinic_automations_insert'
  ) THEN
    CREATE POLICY "clinic_automations_insert"
      ON public.clinic_automations FOR INSERT
      WITH CHECK (
        clinic_id IN (
          SELECT clinic_id FROM public.clinic_members
          WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
      );
  END IF;
END $$;

-- ─── CN-001: Migrate cron functions from service_role_key to cron_secret ──────
--
-- PREREQUISITE (run ONCE in Supabase Dashboard → Edge Functions → Secrets):
--   Add secret: CRON_SECRET = <generate a random 32+ char secret>
--
-- Then run this in the SQL Editor:
--   INSERT INTO public.ai_config (key, value)
--   VALUES ('cron_secret', '<same value as above>')
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
--
-- After deploying the updated edge functions that validate X-Cron-Secret,
-- delete the service_role_key from the DB:
--   DELETE FROM public.ai_config WHERE key = 'service_role_key';
-- ─────────────────────────────────────────────────────────────────────────────

-- Update notify_waitlist_tick() to use cron_secret instead of service_role_key.
-- The edge function is deployed with --no-verify-jwt and validates X-Cron-Secret.
CREATE OR REPLACE FUNCTION public.notify_waitlist_tick()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url    text;
  v_secret text;
BEGIN
  SELECT value INTO v_url    FROM public.ai_config WHERE key = 'supabase_url';
  SELECT value INTO v_secret FROM public.ai_config WHERE key = 'cron_secret';

  IF v_url IS NULL OR v_url = '' THEN
    RAISE LOG '[notify_waitlist_tick] SKIP: supabase_url no configurada en ai_config';
    RETURN;
  END IF;

  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE LOG '[notify_waitlist_tick] SKIP: cron_secret no configurada en ai_config';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_url || '/functions/v1/notify-waitlist',
    headers := jsonb_build_object(
      'Content-Type',   'application/json',
      'X-Cron-Secret',  v_secret
    ),
    body    := '{}'::jsonb
  );

  RAISE LOG '[notify_waitlist_tick] Invocada notify-waitlist';
END;
$$;

-- Update ai_followup_tick() to use cron_secret for ai-agent-reply.
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
