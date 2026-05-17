-- ──────────────────────────────────────────────────────────────────────────────
-- Migration: Security hardening + performance indexes
-- Created: 2026-05-07
-- ──────────────────────────────────────────────────────────────────────────────

-- ─── 1. RLS on ai_config ──────────────────────────────────────────────────────
-- The ai_config table stores the service_role key and OpenAI API key.
-- Without RLS any authenticated user can read it via the REST API.

ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;

-- Only service-role (Edge Functions) may read/write. No anon / authed policy.
-- This effectively blocks all client-side access while keeping Edge Functions working.
-- Edge Functions use the service_role key in their Supabase client, which bypasses RLS.

-- ─── 2. DELETE policy for waiting_list ───────────────────────────────────────
-- waiting_list already has SELECT / INSERT / UPDATE policies (from the migration
-- that created the table). Add the missing DELETE so the dashboard can remove entries.
-- NOTE: the waiting_list table may not exist yet when this migration runs (it is
-- created by 20260507000004). The policy is created here only if the table exists;
-- otherwise 20260507000004 adds it after creating the table.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'waiting_list'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'waiting_list'
      AND policyname = 'clinic_delete_waiting_list'
  ) THEN
    CREATE POLICY clinic_delete_waiting_list ON public.waiting_list
      FOR DELETE
      USING (
        clinic_id IN (
          SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ─── 3. DELETE policy for clinic_automations ─────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'clinic_automations'
      AND policyname = 'clinic_delete_automations'
  ) THEN
    CREATE POLICY clinic_delete_automations ON public.clinic_automations
      FOR DELETE
      USING (
        clinic_id IN (
          SELECT clinic_id FROM public.clinic_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ─── 4. Composite index — messages ───────────────────────────────────────────
-- Supports the Inbox realtime listener query pattern:
--   WHERE clinic_id = $1 AND direction = $2 ORDER BY created_at

CREATE INDEX IF NOT EXISTS idx_messages_clinic_direction_date
  ON public.messages (clinic_id, direction, created_at DESC);

-- ─── 5. Composite index — whatsapp_message_log ───────────────────────────────
-- Same pattern for the message log table used by automations stats view

CREATE INDEX IF NOT EXISTS idx_wa_log_clinic_direction_date
  ON public.whatsapp_message_log (clinic_id, direction, created_at DESC);

-- ─── 6. Drop redundant single-column profiles index ──────────────────────────
-- The primary key already covers id; a duplicate btree index on id wastes space.
-- Use IF EXISTS so the migration doesn't fail if the index was already dropped.

DROP INDEX IF EXISTS public.idx_profiles_id;
