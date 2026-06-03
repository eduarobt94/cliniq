-- ============================================================
-- CLINIQ — Scalability Fixes
-- PostgreSQL 15 / Supabase
-- Version : 3.0.0
-- Date    : 2026-05-30
-- ============================================================
--
-- Idempotent: safe to run multiple times.
-- Sections:
--   1. Generated column + index for appointment_date_uy
--   2. Rewrite v_today_appointments / v_clinic_kpis_today
--   3. pg_trgm extension + patient search indexes
--   4. Additional appointment indexes
--   5. Message inbound indexes
--   6. whatsapp_message_log outbound index
--   7. Drop duplicate waiting_list indexes
--   8. Unify RLS with fn_user_clinic_ids()
--   9. RPC get_unread_counts
--  10. RPC get_report_summary
--  11. Update v_automation_stats with 90-day filter
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- Fix: Generated column for UY date — eliminates full table scan
--      in Dashboard views (v_today_appointments, v_clinic_kpis_today)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS appointment_date_uy date
  GENERATED ALWAYS AS (
    (appointment_datetime AT TIME ZONE 'America/Montevideo')::date
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date_uy
  ON appointments(clinic_id, appointment_date_uy);


-- ─────────────────────────────────────────────────────────────
-- Fix: Rewrite v_today_appointments to use appointment_date_uy
--      (index scan instead of full table scan)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_today_appointments
WITH (security_invoker = true)
AS
SELECT
  a.id,
  a.clinic_id,
  a.appointment_datetime,
  a.status,
  a.professional_name,
  a.appointment_type,
  a.notes,
  a.reminder_sent_at,
  a.confirmed_at,
  p.full_name    AS patient_name,
  p.phone_number AS patient_phone,
  c.timezone     AS clinic_timezone
FROM  appointments a
JOIN  patients     p ON p.id = a.patient_id
JOIN  clinics      c ON c.id = a.clinic_id
WHERE a.appointment_date_uy = (CURRENT_TIMESTAMP AT TIME ZONE c.timezone)::date
ORDER BY a.appointment_datetime;


-- ─────────────────────────────────────────────────────────────
-- Fix: Rewrite v_clinic_kpis_today to use appointment_date_uy
--      (index scan instead of full table scan)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_clinic_kpis_today
WITH (security_invoker = true)
AS
SELECT
  a.clinic_id,
  COUNT(*)                                                    AS total_today,
  COUNT(*) FILTER (WHERE a.status = 'confirmed')             AS confirmed_today,
  COUNT(*) FILTER (WHERE a.status = 'pending')               AS pending_today,
  COUNT(*) FILTER (WHERE a.status = 'cancelled')             AS cancelled_today,
  COUNT(*) FILTER (WHERE a.status = 'rescheduled')           AS rescheduled_today,
  COUNT(*) FILTER (WHERE a.reminder_sent_at IS NOT NULL)     AS reminders_sent,
  COUNT(*) FILTER (WHERE a.confirmed_at IS NOT NULL)         AS auto_confirmed
FROM  appointments a
JOIN  clinics      c ON c.id = a.clinic_id
WHERE a.appointment_date_uy = (CURRENT_TIMESTAMP AT TIME ZONE c.timezone)::date
GROUP BY a.clinic_id;


-- ─────────────────────────────────────────────────────────────
-- Fix: pg_trgm extension + trigram indexes for patient search
-- ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_patients_name_trgm
  ON patients USING gin(full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_patients_phone_trgm
  ON patients USING gin(phone_number gin_trgm_ops);


-- ─────────────────────────────────────────────────────────────
-- Fix: Additional appointment indexes for reports / filters
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_appointments_professional
  ON appointments(clinic_id, professional_name)
  WHERE professional_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_type
  ON appointments(clinic_id, appointment_type)
  WHERE appointment_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_report
  ON appointments(clinic_id, appointment_datetime DESC, status, patient_id);


-- ─────────────────────────────────────────────────────────────
-- Fix: Message inbound indexes for ai_followup_tick cron
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_messages_inbound_recent
  ON messages(conversation_id, created_at DESC)
  WHERE direction = 'inbound';

CREATE INDEX IF NOT EXISTS idx_messages_conv_dir_created
  ON messages(conversation_id, created_at DESC)
  INCLUDE (direction);


-- ─────────────────────────────────────────────────────────────
-- Fix: whatsapp_message_log outbound index for automation stats
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_wa_log_clinic_outbound
  ON whatsapp_message_log(clinic_id, created_at DESC)
  WHERE direction = 'outbound';


-- ─────────────────────────────────────────────────────────────
-- Fix: Drop duplicate single-column indexes on waiting_list
--      (superseded by idx_waiting_list_clinic and idx_waiting_list_active)
-- ─────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS public.waiting_list_clinic_id_idx;
DROP INDEX IF EXISTS public.waiting_list_status_idx;


-- ─────────────────────────────────────────────────────────────
-- Fix: Unify RLS policies to use fn_user_clinic_ids() helper
--      Replaces ad-hoc EXISTS() subqueries for SELECT/DELETE policies
-- ─────────────────────────────────────────────────────────────

-- ── conversations ─────────────────────────────────────────────

DROP POLICY IF EXISTS "conversations_select" ON conversations;
CREATE POLICY "conversations_select"
  ON conversations FOR SELECT
  USING (clinic_id IN (SELECT fn_user_clinic_ids()));

DROP POLICY IF EXISTS "conversations_delete" ON conversations;
CREATE POLICY "conversations_delete"
  ON conversations FOR DELETE
  USING (clinic_id IN (SELECT fn_user_clinic_ids()));

-- ── messages ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select"
  ON messages FOR SELECT
  USING (clinic_id IN (SELECT fn_user_clinic_ids()));

-- ── clinic_automations ────────────────────────────────────────

DROP POLICY IF EXISTS "clinic_automations_select" ON clinic_automations;
CREATE POLICY "clinic_automations_select"
  ON clinic_automations FOR SELECT
  USING (clinic_id IN (SELECT fn_user_clinic_ids()));

-- ── whatsapp_message_log ──────────────────────────────────────

DROP POLICY IF EXISTS "wa_log_select" ON whatsapp_message_log;
CREATE POLICY "wa_log_select"
  ON whatsapp_message_log FOR SELECT
  USING (clinic_id IN (SELECT fn_user_clinic_ids()));

-- ── clinic_schedule ───────────────────────────────────────────

DROP POLICY IF EXISTS "clinic_schedule_select" ON public.clinic_schedule;
CREATE POLICY "clinic_schedule_select"
  ON public.clinic_schedule FOR SELECT
  USING (clinic_id IN (SELECT fn_user_clinic_ids()));

DROP POLICY IF EXISTS "clinic_schedule_delete" ON public.clinic_schedule;
CREATE POLICY "clinic_schedule_delete"
  ON public.clinic_schedule FOR DELETE
  USING (clinic_id IN (SELECT fn_user_clinic_ids()));

-- ── clinic_closures ───────────────────────────────────────────

DROP POLICY IF EXISTS "clinic_closures_select" ON public.clinic_closures;
CREATE POLICY "clinic_closures_select"
  ON public.clinic_closures FOR SELECT
  USING (clinic_id IN (SELECT fn_user_clinic_ids()));

DROP POLICY IF EXISTS "clinic_closures_delete" ON public.clinic_closures;
CREATE POLICY "clinic_closures_delete"
  ON public.clinic_closures FOR DELETE
  USING (clinic_id IN (SELECT fn_user_clinic_ids()));

-- ── clinic_services ───────────────────────────────────────────

DROP POLICY IF EXISTS "clinic_services_select" ON public.clinic_services;
CREATE POLICY "clinic_services_select"
  ON public.clinic_services FOR SELECT
  USING (clinic_id IN (SELECT fn_user_clinic_ids()));

DROP POLICY IF EXISTS "clinic_services_delete" ON public.clinic_services;
CREATE POLICY "clinic_services_delete"
  ON public.clinic_services FOR DELETE
  USING (clinic_id IN (SELECT fn_user_clinic_ids()));

-- ── waiting_list ──────────────────────────────────────────────

DROP POLICY IF EXISTS "members_read_waiting_list" ON waiting_list;
CREATE POLICY "members_read_waiting_list"
  ON waiting_list FOR SELECT
  USING (clinic_id IN (SELECT fn_user_clinic_ids()));

DROP POLICY IF EXISTS "members_delete_waiting_list" ON waiting_list;
CREATE POLICY "members_delete_waiting_list"
  ON waiting_list FOR DELETE
  USING (clinic_id IN (SELECT fn_user_clinic_ids()));


-- ─────────────────────────────────────────────────────────────
-- Fix: RPC get_unread_counts — efficient unread count per conversation
--      Counts inbound messages with no subsequent outbound/system reply
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_unread_counts(p_conversation_ids UUID[])
RETURNS TABLE(conversation_id UUID, unread_count INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH ranked AS (
    SELECT
      m.conversation_id,
      m.direction,
      SUM(CASE WHEN m.direction IN ('outbound','outbound_ai','system_template','system')
               THEN 1 ELSE 0 END)
        OVER (PARTITION BY m.conversation_id ORDER BY m.created_at DESC
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS outbound_seen
    FROM messages m
    WHERE m.conversation_id = ANY(p_conversation_ids)
  )
  SELECT conversation_id, COUNT(*)::int AS unread_count
  FROM ranked
  WHERE direction = 'inbound' AND outbound_seen = 0
  GROUP BY conversation_id;
$$;

GRANT EXECUTE ON FUNCTION get_unread_counts(UUID[]) TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- Fix: RPC get_report_summary — single-query report aggregation
--      Replaces N+1 client queries for the reports page
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_report_summary(p_clinic_id UUID, p_since TIMESTAMPTZ)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_totals   JSON;
  v_by_month JSON;
  v_top      JSON;
BEGIN
  -- Totals aggregate
  SELECT row_to_json(t) INTO v_totals FROM (
    SELECT
      COUNT(*)                                                                           AS total,
      COUNT(*) FILTER (WHERE status = 'confirmed')                                      AS confirmed,
      COUNT(*) FILTER (WHERE status = 'cancelled')                                      AS cancelled,
      COUNT(*) FILTER (WHERE status = 'rescheduled')                                    AS rescheduled,
      COUNT(*) FILTER (WHERE status IN ('pending','new')
                         AND appointment_datetime < NOW() - INTERVAL '2 hours')         AS no_shows
    FROM appointments
    WHERE clinic_id = p_clinic_id AND appointment_datetime >= p_since
  ) t;

  -- Monthly breakdown
  SELECT json_agg(m ORDER BY m.month) INTO v_by_month FROM (
    SELECT
      TO_CHAR(DATE_TRUNC('month', appointment_datetime AT TIME ZONE 'America/Montevideo'), 'YYYY-MM') AS month,
      COUNT(*)                                               AS total,
      COUNT(*) FILTER (WHERE status = 'confirmed')          AS confirmed,
      COUNT(*) FILTER (WHERE status = 'cancelled')          AS cancelled,
      COUNT(*) FILTER (WHERE status = 'pending')            AS pending,
      COUNT(*) FILTER (WHERE status = 'new')                AS new,
      COUNT(*) FILTER (WHERE status = 'rescheduled')        AS rescheduled
    FROM appointments
    WHERE clinic_id = p_clinic_id AND appointment_datetime >= p_since
    GROUP BY DATE_TRUNC('month', appointment_datetime AT TIME ZONE 'America/Montevideo')
  ) m;

  -- Top 5 patients
  SELECT json_agg(tp ORDER BY tp.visit_count DESC) INTO v_top FROM (
    SELECT patient_id, COUNT(*) AS visit_count
    FROM appointments
    WHERE clinic_id = p_clinic_id
      AND appointment_datetime >= p_since
      AND status NOT IN ('cancelled','rescheduled')
    GROUP BY patient_id
    ORDER BY visit_count DESC
    LIMIT 5
  ) tp;

  RETURN json_build_object(
    'total',        (v_totals->>'total')::int,
    'confirmed',    (v_totals->>'confirmed')::int,
    'cancelled',    (v_totals->>'cancelled')::int,
    'rescheduled',  (v_totals->>'rescheduled')::int,
    'no_shows',     (v_totals->>'no_shows')::int,
    'by_month',     COALESCE(v_by_month, '[]'::json),
    'top_patients', COALESCE(v_top, '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_report_summary(UUID, TIMESTAMPTZ) TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- Fix: v_automation_stats — add 90-day window to avoid full scan
--      on large whatsapp_message_log tables
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_automation_stats
WITH (security_invoker = true)
AS
SELECT
  clinic_id,
  COUNT(*)                                                          AS total_sent,
  COUNT(*) FILTER (WHERE status IN ('delivered', 'read', 'sent'))  AS ok,
  ROUND(
    COUNT(*) FILTER (WHERE status IN ('delivered', 'read', 'sent'))::numeric
    / NULLIF(COUNT(*), 0) * 100,
    1
  )                                                                 AS success_rate,
  MAX(created_at)                                                   AS last_sent_at
FROM whatsapp_message_log
WHERE direction = 'outbound'
  AND created_at >= NOW() - INTERVAL '90 days'
GROUP BY clinic_id;


-- ─────────────────────────────────────────────────────────────
-- FIN DEL MIGRATION
-- ─────────────────────────────────────────────────────────────
