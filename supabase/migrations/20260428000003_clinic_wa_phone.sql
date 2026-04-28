-- ============================================================
-- CLINIQ — Per-clinic WhatsApp Phone Number ID
-- Allows each clinic to send reminders from its own WA number.
-- The access token stays global (shared Business Manager).
-- ============================================================

ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS wa_phone_number_id TEXT;
