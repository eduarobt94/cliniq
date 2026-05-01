-- ============================================================
-- CLINIQ — New Automation Types: patient_reactivation + review_request
-- ============================================================

-- ─── 1. Expand type constraint ────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'clinic_automations_type_valid'
      AND conrelid = 'clinic_automations'::regclass
  ) THEN
    ALTER TABLE clinic_automations DROP CONSTRAINT clinic_automations_type_valid;
  END IF;
END $$;

ALTER TABLE clinic_automations
  ADD CONSTRAINT clinic_automations_type_valid
  CHECK (type IN ('appointment_reminder', 'patient_reactivation', 'review_request'));

-- ─── 2. New config columns ────────────────────────────────────
-- months_inactive: for patient_reactivation — how long since last visit
-- hours_after:     for review_request       — how long after appointment ends
ALTER TABLE clinic_automations
  ADD COLUMN IF NOT EXISTS months_inactive INT DEFAULT 6
    CHECK (months_inactive IS NULL OR months_inactive BETWEEN 1 AND 24),
  ADD COLUMN IF NOT EXISTS hours_after INT DEFAULT 2
    CHECK (hours_after IS NULL OR hours_after BETWEEN 1 AND 72);

-- ─── 3. Tracking columns ──────────────────────────────────────
-- Prevent duplicate sends
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS review_request_sent_at TIMESTAMPTZ;

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS last_reactivation_sent_at TIMESTAMPTZ;

-- ─── 4. Fix sync trigger to also update last_message_direction ─
CREATE OR REPLACE FUNCTION fn_sync_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversations
  SET
    last_message           = NEW.content,
    last_message_at        = NEW.created_at,
    last_message_direction = NEW.direction
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- ─── 5. Update seed trigger to include all 3 types ────────────
CREATE OR REPLACE FUNCTION fn_seed_clinic_automations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recordatorio de turno (existente)
  INSERT INTO clinic_automations (clinic_id, type, enabled, hours_before)
  VALUES (NEW.id, 'appointment_reminder', true, 24)
  ON CONFLICT (clinic_id, type) DO NOTHING;

  -- Reactivación de pacientes
  INSERT INTO clinic_automations (
    clinic_id, type, enabled, months_inactive, message_template
  ) VALUES (
    NEW.id, 'patient_reactivation', false, 6,
    'Hola {patient_name}! 👋 Hace un tiempo que no te vemos en {clinic_name}. '
    '¿Querés agendar una consulta? Respondé este mensaje y te ayudamos a encontrar el mejor horario.'
  ) ON CONFLICT (clinic_id, type) DO NOTHING;

  -- Solicitud de reseña Google
  INSERT INTO clinic_automations (
    clinic_id, type, enabled, hours_after, message_template
  ) VALUES (
    NEW.id, 'review_request', false, 2,
    '¡Gracias por tu visita a {clinic_name}, {patient_name}! 🙏 '
    'Si te pareció bien la atención, nos ayudaría mucho si dejaras una reseña en Google. ¡Muchas gracias!'
  ) ON CONFLICT (clinic_id, type) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ─── 6. Backfill for existing clinics ─────────────────────────
INSERT INTO clinic_automations (
  clinic_id, type, enabled, months_inactive, message_template
)
SELECT
  id, 'patient_reactivation', false, 6,
  'Hola {patient_name}! 👋 Hace un tiempo que no te vemos en {clinic_name}. '
  '¿Querés agendar una consulta? Respondé este mensaje y te ayudamos a encontrar el mejor horario.'
FROM clinics
ON CONFLICT (clinic_id, type) DO NOTHING;

INSERT INTO clinic_automations (
  clinic_id, type, enabled, hours_after, message_template
)
SELECT
  id, 'review_request', false, 2,
  '¡Gracias por tu visita a {clinic_name}, {patient_name}! 🙏 '
  'Si te pareció bien la atención, nos ayudaría mucho si dejaras una reseña en Google. ¡Muchas gracias!'
FROM clinics
ON CONFLICT (clinic_id, type) DO NOTHING;

-- ─── 7. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_appointments_review_request
  ON appointments(clinic_id, appointment_datetime)
  WHERE review_request_sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_patients_reactivation
  ON patients(clinic_id, last_reactivation_sent_at)
  WHERE phone_number IS NOT NULL;

-- ─── 8. Cron jobs (run in SQL Editor after deploying functions) ─
--
-- SELECT cron.schedule(
--   'send-review-requests',
--   '*/15 * * * *',
--   $$ SELECT net.http_post(
--        url     := (SELECT value FROM ai_config WHERE key = 'supabase_url') || '/functions/v1/send-review-requests',
--        headers := '{"Content-Type":"application/json"}'::jsonb,
--        body    := '{}'::jsonb
--      ) $$
-- );
--
-- SELECT cron.schedule(
--   'send-patient-reactivation',
--   '0 10 * * *',
--   $$ SELECT net.http_post(
--        url     := (SELECT value FROM ai_config WHERE key = 'supabase_url') || '/functions/v1/send-patient-reactivation',
--        headers := '{"Content-Type":"application/json"}'::jsonb,
--        body    := '{}'::jsonb
--      ) $$
-- );
