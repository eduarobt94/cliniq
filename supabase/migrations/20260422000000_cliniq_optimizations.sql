-- ============================================================
-- CLINIQ — Optimization Migration
-- PostgreSQL 15 / Supabase
-- Version : 1.1.0
-- Date    : 2026-04-22
-- ============================================================
--
-- Cambios:
--   1. fn_user_clinic_ids() — helper para deduplicar subqueries RLS
--   2. Índices adicionales para queries frecuentes del dashboard
--   3. v_today_appointments — usa timezone de la clínica en lugar de hardcoded
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. HELPER RLS: fn_user_clinic_ids()
-- ─────────────────────────────────────────────────────────────
-- Reemplaza la subquery repetida en las 12 políticas RLS de
-- patients y appointments. Al ser STABLE + SECURITY DEFINER
-- el planner puede cachear el resultado dentro de la transacción,
-- evitando re-ejecutar el SELECT por cada fila evaluada.

CREATE OR REPLACE FUNCTION fn_user_clinic_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM clinics WHERE owner_id = auth.uid();
$$;


-- ─────────────────────────────────────────────────────────────
-- 2. ACTUALIZAR POLÍTICAS RLS — patients
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "patients: select via clinic"  ON patients;
DROP POLICY IF EXISTS "patients: insert via clinic"  ON patients;
DROP POLICY IF EXISTS "patients: update via clinic"  ON patients;
DROP POLICY IF EXISTS "patients: delete via clinic"  ON patients;

CREATE POLICY "patients: select via clinic"
  ON patients FOR SELECT
  USING (clinic_id IN (SELECT fn_user_clinic_ids()));

CREATE POLICY "patients: insert via clinic"
  ON patients FOR INSERT
  WITH CHECK (clinic_id IN (SELECT fn_user_clinic_ids()));

CREATE POLICY "patients: update via clinic"
  ON patients FOR UPDATE
  USING     (clinic_id IN (SELECT fn_user_clinic_ids()))
  WITH CHECK (clinic_id IN (SELECT fn_user_clinic_ids()));

CREATE POLICY "patients: delete via clinic"
  ON patients FOR DELETE
  USING (clinic_id IN (SELECT fn_user_clinic_ids()));


-- ─────────────────────────────────────────────────────────────
-- 3. ACTUALIZAR POLÍTICAS RLS — appointments
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "appointments: select via clinic"  ON appointments;
DROP POLICY IF EXISTS "appointments: insert via clinic"  ON appointments;
DROP POLICY IF EXISTS "appointments: update via clinic"  ON appointments;
DROP POLICY IF EXISTS "appointments: delete via clinic"  ON appointments;

CREATE POLICY "appointments: select via clinic"
  ON appointments FOR SELECT
  USING (clinic_id IN (SELECT fn_user_clinic_ids()));

CREATE POLICY "appointments: insert via clinic"
  ON appointments FOR INSERT
  WITH CHECK (clinic_id IN (SELECT fn_user_clinic_ids()));

CREATE POLICY "appointments: update via clinic"
  ON appointments FOR UPDATE
  USING     (clinic_id IN (SELECT fn_user_clinic_ids()))
  WITH CHECK (clinic_id IN (SELECT fn_user_clinic_ids()));

CREATE POLICY "appointments: delete via clinic"
  ON appointments FOR DELETE
  USING (clinic_id IN (SELECT fn_user_clinic_ids()));


-- ─────────────────────────────────────────────────────────────
-- 4. ÍNDICES ADICIONALES
-- ─────────────────────────────────────────────────────────────

-- Usado por los KPI cards del dashboard: contar turnos por status del día.
-- Cubre (clinic_id, status, appointment_datetime) en un solo índice.
CREATE INDEX IF NOT EXISTS idx_appointments_status_datetime
  ON appointments(clinic_id, status, appointment_datetime);

-- Usado por la lista de pacientes paginada (orden por fecha de ingreso).
CREATE INDEX IF NOT EXISTS idx_patients_clinic_created
  ON patients(clinic_id, created_at DESC);


-- ─────────────────────────────────────────────────────────────
-- 5. ACTUALIZAR v_today_appointments — timezone por clínica
-- ─────────────────────────────────────────────────────────────
-- Reemplaza el timezone hardcoded 'America/Montevideo' por el valor
-- de clinics.timezone, soportando clínicas en cualquier zona horaria.

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
WHERE DATE(a.appointment_datetime AT TIME ZONE c.timezone)
    = CURRENT_DATE
ORDER BY a.appointment_datetime;


-- ─────────────────────────────────────────────────────────────
-- 6. ACTUALIZAR v_clinic_kpis_today — timezone por clínica
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
WHERE DATE(a.appointment_datetime AT TIME ZONE c.timezone)
    = CURRENT_DATE
GROUP BY a.clinic_id;


-- ─────────────────────────────────────────────────────────────
-- FIN DEL MIGRATION
-- ─────────────────────────────────────────────────────────────
