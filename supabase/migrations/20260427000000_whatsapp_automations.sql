-- ============================================================
-- CLINIQ — WhatsApp Automations
-- PostgreSQL 15 / Supabase
-- Date: 2026-04-28
-- ============================================================
--
-- TABLAS:
--   clinic_automations   → configuración por clínica (1 fila por tipo)
--   whatsapp_message_log → auditoría de mensajes enviados/recibidos
--
-- FLUJO:
--   pg_cron → send-whatsapp-reminders (cada 5 min)
--     → busca turnos en ventana de tiempo
--     → envía via Meta Graph API
--     → actualiza reminder_sent_at + status='pending'
--     → inserta log outbound
--   Meta Webhook → whatsapp-webhook
--     → recibe respuesta del paciente
--     → actualiza status='confirmed'|'cancelled'
--     → inserta log inbound
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. TABLA: clinic_automations
-- ─────────────────────────────────────────────────────────────
-- Una fila por tipo de automatización por clínica.
-- UNIQUE(clinic_id, type) previene duplicados.
-- hours_before: cuántas horas antes del turno se envía el recordatorio.
-- message_template: texto con placeholders {patient_name}, {date}, {time}.

CREATE TABLE IF NOT EXISTS clinic_automations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id        UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  type             TEXT        NOT NULL DEFAULT 'appointment_reminder',
  enabled          BOOLEAN     NOT NULL DEFAULT true,
  hours_before     INT         NOT NULL DEFAULT 24 CHECK (hours_before BETWEEN 1 AND 168),
  message_template TEXT        NOT NULL DEFAULT
    'Hola {patient_name}! 👋 Te recordamos que tenés un turno mañana a las {time}. '
    'Respondé *1* para confirmar o *2* para cancelar.',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT clinic_automations_unique_type UNIQUE (clinic_id, type),
  CONSTRAINT clinic_automations_type_valid  CHECK (type IN ('appointment_reminder'))
);

CREATE INDEX idx_clinic_automations_clinic ON clinic_automations(clinic_id);

CREATE TRIGGER trg_clinic_automations_updated_at
  BEFORE UPDATE ON clinic_automations
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 2. TABLA: whatsapp_message_log
-- ─────────────────────────────────────────────────────────────
-- Registro de auditoría para todos los mensajes WA.
-- direction: 'outbound' (recordatorio enviado) | 'inbound' (respuesta del paciente).
-- wa_message_id: ID del mensaje en la API de Meta (para deduplicación).

CREATE TABLE IF NOT EXISTS whatsapp_message_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id     UUID        REFERENCES patients(id) ON DELETE SET NULL,
  appointment_id UUID        REFERENCES appointments(id) ON DELETE SET NULL,
  direction      TEXT        NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  phone_number   TEXT        NOT NULL,
  message        TEXT        NOT NULL,
  wa_message_id  TEXT,
  status         TEXT        NOT NULL DEFAULT 'sent'
                   CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'received')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wa_log_clinic      ON whatsapp_message_log(clinic_id);
CREATE INDEX idx_wa_log_appointment ON whatsapp_message_log(appointment_id);
CREATE INDEX idx_wa_log_wa_id       ON whatsapp_message_log(wa_message_id) WHERE wa_message_id IS NOT NULL;


-- ─────────────────────────────────────────────────────────────
-- 3. RLS — clinic_automations
-- ─────────────────────────────────────────────────────────────

ALTER TABLE clinic_automations ENABLE ROW LEVEL SECURITY;

-- Lectura: usuario es owner de la clínica o miembro activo
CREATE POLICY "clinic_automations_select"
  ON clinic_automations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE id = clinic_automations.clinic_id
        AND owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM clinic_members
      WHERE clinic_id = clinic_automations.clinic_id
        AND user_id   = auth.uid()
        AND status    = 'active'
    )
  );

-- Modificación: solo owners/staff (no viewers)
CREATE POLICY "clinic_automations_update"
  ON clinic_automations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clinic_members
      WHERE clinic_id = clinic_automations.clinic_id
        AND user_id   = auth.uid()
        AND role      IN ('owner', 'staff')
        AND status    = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinic_members
      WHERE clinic_id = clinic_automations.clinic_id
        AND user_id   = auth.uid()
        AND role      IN ('owner', 'staff')
        AND status    = 'active'
    )
  );

-- Service role puede hacer todo (necesario para Edge Functions con service key)
CREATE POLICY "clinic_automations_service_all"
  ON clinic_automations FOR ALL
  USING (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────
-- 4. RLS — whatsapp_message_log
-- ─────────────────────────────────────────────────────────────

ALTER TABLE whatsapp_message_log ENABLE ROW LEVEL SECURITY;

-- Lectura: usuario es owner de la clínica o miembro activo
CREATE POLICY "wa_log_select"
  ON whatsapp_message_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE id = whatsapp_message_log.clinic_id
        AND owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM clinic_members
      WHERE clinic_id = whatsapp_message_log.clinic_id
        AND user_id   = auth.uid()
        AND status    = 'active'
    )
  );

-- Escritura: solo service role (Edge Functions)
CREATE POLICY "wa_log_service_insert"
  ON whatsapp_message_log FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "wa_log_service_update"
  ON whatsapp_message_log FOR UPDATE
  USING (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────
-- 5. TRIGGER: auto-crear automation al crear clínica
-- ─────────────────────────────────────────────────────────────
-- Al registrarse, la clínica ya tiene el recordatorio configurado por defecto.

CREATE OR REPLACE FUNCTION fn_seed_clinic_automations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO clinic_automations (clinic_id, type, enabled, hours_before)
  VALUES (NEW.id, 'appointment_reminder', true, 24)
  ON CONFLICT (clinic_id, type) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_clinic_automations
  AFTER INSERT ON clinics
  FOR EACH ROW EXECUTE FUNCTION fn_seed_clinic_automations();

-- Backfill para clínicas ya existentes
INSERT INTO clinic_automations (clinic_id, type, enabled, hours_before)
SELECT id, 'appointment_reminder', true, 24
FROM clinics
ON CONFLICT (clinic_id, type) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 6. VISTA: v_automation_stats  (stats por clínica)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_automation_stats
WITH (security_invoker = true)
AS
SELECT
  clinic_id,
  COUNT(*)                                           AS total_sent,
  COUNT(*) FILTER (WHERE status IN ('delivered', 'read', 'sent')) AS ok,
  ROUND(
    COUNT(*) FILTER (WHERE status IN ('delivered', 'read', 'sent'))::numeric
    / NULLIF(COUNT(*), 0) * 100,
    1
  )                                                  AS success_rate,
  MAX(created_at)                                    AS last_sent_at
FROM whatsapp_message_log
WHERE direction = 'outbound'
GROUP BY clinic_id;


-- ─────────────────────────────────────────────────────────────
-- 7. COMENTARIO: pg_cron setup (ejecutar manualmente en SQL Editor)
-- ─────────────────────────────────────────────────────────────
-- Requiere extensión pg_cron (ya incluida en Supabase).
-- Reemplazar <PROJECT_URL> y <SERVICE_ROLE_KEY> con valores reales.
--
-- SELECT cron.schedule(
--   'send-whatsapp-reminders',
--   '*/5 * * * *',
--   $$
--   SELECT net.http_post(
--     url     := '<PROJECT_URL>/functions/v1/send-whatsapp-reminders',
--     headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>", "Content-Type": "application/json"}'::jsonb,
--     body    := '{}'::jsonb
--   );
--   $$
-- );
