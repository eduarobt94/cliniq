-- ============================================================
-- CLINIQ — MVP Schema Migration
-- PostgreSQL 15 / Supabase
-- Version : 1.0.0
-- Date    : 2026-04-20
-- ============================================================
--
-- ARQUITECTURA: Multi-tenant por clinic_id
-- ─────────────────────────────────────────
-- Cada fila en patients y appointments lleva clinic_id.
-- RLS garantiza que auth.uid() solo ve sus propias clínicas.
-- El service_role (usado por n8n / webhooks) bypasea RLS.
--
-- FLUJO PRINCIPAL:
--   appointment(new) → reminder sent → pending
--   → patient confirms (WhatsApp "1") → confirmed
--   → dashboard KPI actualiza en tiempo real (Supabase Realtime)
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 0. TIPOS PERSONALIZADOS
-- ─────────────────────────────────────────────────────────────
-- Enum en lugar de CHECK constraint: más seguro (el motor rechaza
-- valores inválidos antes de llegar a la aplicación) y más fácil
-- de extender con ALTER TYPE ... ADD VALUE.

CREATE TYPE appointment_status AS ENUM (
  'new',        -- Turno creado, sin recordatorio enviado
  'pending',    -- Recordatorio enviado, esperando respuesta del paciente
  'confirmed',  -- Paciente confirmó via WhatsApp (respuesta: 1)
  'rescheduled',-- Paciente pidió reagendar (respuesta: 2)
  'cancelled'   -- Cancelado manualmente o no-show
);


-- ─────────────────────────────────────────────────────────────
-- 1. FUNCIÓN REUTILIZABLE: updated_at automático
-- ─────────────────────────────────────────────────────────────
-- Una sola función que se reutiliza en todos los triggers.
-- Supabase Realtime detecta cambios via updated_at.

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- 2. TABLA: clinics  (raíz del tenant)
-- ─────────────────────────────────────────────────────────────
-- owner_id = auth.users.id de Supabase.
-- Toda política RLS de las tablas hijas pasa por esta tabla.
--
-- timezone: crítico para calcular "turnos de HOY" correctamente.
-- Clínicas en Uruguay usan America/Montevideo (UTC-3 / UTC-2 DST).
--
-- whatsapp_number: el número Business de la clínica desde donde
-- se envían los recordatorios. Se guarda aquí para configuración
-- por tenant (cada clínica puede tener su propio número).

CREATE TABLE IF NOT EXISTS clinics (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  whatsapp_number   TEXT,                              -- E.164: +59899000000
  timezone          TEXT        NOT NULL DEFAULT 'America/Montevideo',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT clinics_name_not_empty CHECK (TRIM(name) <> '')
);

-- Índice crítico: usado en EVERY RLS policy de patients y appointments.
-- Sin esto, cada query hace un seq scan de clinics.
CREATE INDEX idx_clinics_owner_id ON clinics(owner_id);

CREATE TRIGGER trg_clinics_updated_at
  BEFORE UPDATE ON clinics
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 3. TABLA: patients
-- ─────────────────────────────────────────────────────────────
-- phone_number en formato E.164 (+598XXXXXXXX).
-- Normalizar el formato antes de insertar (en la app o con trigger).
--
-- UNIQUE(clinic_id, phone_number): evita duplicar el mismo paciente
-- dentro de una clínica. Un paciente puede existir en múltiples
-- clínicas (distintos clinic_id) sin problema.
--
-- email y notes: opcionales en MVP, se usan en Fase 2
-- (notificaciones por email, historial clínico).

CREATE TABLE IF NOT EXISTS patients (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  full_name       TEXT        NOT NULL,
  phone_number    TEXT        NOT NULL,  -- E.164: +59899000000
  email           TEXT,                 -- Futuro: canal email
  notes           TEXT,                 -- Notas internas del staff
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT patients_name_not_empty  CHECK (TRIM(full_name)    <> ''),
  CONSTRAINT patients_phone_not_empty CHECK (TRIM(phone_number) <> ''),
  CONSTRAINT patients_phone_unique    UNIQUE (clinic_id, phone_number)
);

-- Índice: todas las queries de pacientes filtran por clinic_id
CREATE INDEX idx_patients_clinic_id ON patients(clinic_id);

-- Índice: el webhook de WhatsApp necesita encontrar al paciente
-- por número de teléfono para actualizar el status del turno
CREATE INDEX idx_patients_phone_number ON patients(phone_number);

CREATE TRIGGER trg_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 4. TABLA: appointments
-- ─────────────────────────────────────────────────────────────
-- Tabla central del producto. Alimenta toda la automatización.
--
-- clinic_id se desnormaliza aquí (en vez de solo llevar patient_id)
-- por dos razones:
--   1. Las políticas RLS pueden filtrar directamente sin join extra.
--   2. Un paciente podría moverse de clínica en el futuro.
--
-- professional_name: desnormalizado intencionalmente para MVP.
-- Cuando se implemente multi-profesional, se migra a FK.
--
-- reminder_sent_at / confirmed_at: timestamps de auditoría del flujo.
-- Permiten calcular KPIs sin una tabla de logs separada en Fase 1.
--
-- UNIQUE(clinic_id, patient_id, appointment_datetime):
-- previene doble-booking del mismo paciente en el mismo horario.

CREATE TABLE IF NOT EXISTS appointments (
  id                    UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id             UUID               NOT NULL REFERENCES clinics(id)  ON DELETE CASCADE,
  patient_id            UUID               NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_datetime  TIMESTAMPTZ        NOT NULL,
  status                appointment_status NOT NULL DEFAULT 'new',
  professional_name     TEXT,              -- MVP: string libre. Fase 2: FK a professionals
  appointment_type      TEXT,              -- 'control', 'limpieza', 'ortodoncia', etc.
  notes                 TEXT,              -- Notas internas del turno
  reminder_sent_at      TIMESTAMPTZ,       -- NULL = recordatorio aún no enviado
  confirmed_at          TIMESTAMPTZ,       -- NULL = paciente no confirmó todavía
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT appointments_no_duplicate
    UNIQUE (clinic_id, patient_id, appointment_datetime)
);

-- Índice primario: agenda del día (clinic_id + rango de fechas)
-- Query típica: "dame los turnos de hoy para la clínica X"
CREATE INDEX idx_appointments_clinic_datetime
  ON appointments(clinic_id, appointment_datetime);

-- Índice para la automatización: n8n busca turnos de mañana que
-- estén en status 'new' o 'pending' para enviar recordatorio.
-- Partial index: solo incluye filas accionables (menor tamaño).
CREATE INDEX idx_appointments_reminder_queue
  ON appointments(appointment_datetime, clinic_id)
  WHERE status IN ('new', 'pending');

-- Índice: historial de turnos de un paciente
CREATE INDEX idx_appointments_patient_id
  ON appointments(patient_id);

-- Trigger: updated_at (Realtime necesita este campo para detectar cambios)
CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Trigger: auto-setear confirmed_at cuando el status pasa a 'confirmed'.
-- Esto evita que la aplicación tenga que calcular este campo manualmente
-- y garantiza consistencia aunque el update venga del webhook de n8n.
CREATE OR REPLACE FUNCTION fn_set_confirmed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status <> 'confirmed' THEN
    NEW.confirmed_at = NOW();
  END IF;

  -- Si vuelve a pending (ej: reagendó y se reabre), limpiar confirmed_at
  IF NEW.status <> 'confirmed' AND OLD.status = 'confirmed' THEN
    NEW.confirmed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appointments_confirmed_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION fn_set_confirmed_at();


-- ─────────────────────────────────────────────────────────────
-- 5. SUPABASE REALTIME
-- ─────────────────────────────────────────────────────────────
-- Habilitar Realtime solo en appointments.
-- El dashboard escucha cambios de status en tiempo real:
-- cuando el webhook de WhatsApp confirma un turno, el KPI
-- del dashboard se actualiza sin polling.
--
-- NO habilitar Realtime en clinics/patients (no hay necesidad
-- de UI reactiva para esas tablas en MVP).

ALTER PUBLICATION supabase_realtime ADD TABLE appointments;


-- ─────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────
-- Estrategia: todas las políticas validan via auth.uid().
--
-- Para clinics: directo (owner_id = auth.uid()).
-- Para patients/appointments: subquery a clinics.
--   La subquery es O(1) gracias a idx_clinics_owner_id.
--
-- El service_role key (usado por n8n y webhooks backend)
-- bypasea RLS automáticamente — no necesita políticas extra.

ALTER TABLE clinics      ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients     ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;


-- ── 6.1 Policies: clinics ────────────────────────────────────

CREATE POLICY "clinics: select own"
  ON clinics FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "clinics: insert own"
  ON clinics FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "clinics: update own"
  ON clinics FOR UPDATE
  USING     (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "clinics: delete own"
  ON clinics FOR DELETE
  USING (owner_id = auth.uid());


-- ── 6.2 Policies: patients ───────────────────────────────────
-- Acceso via membership en clinics (subquery).
-- Se repite el patrón en INSERT/UPDATE/DELETE para garantizar
-- que un usuario no pueda insertar pacientes en clínicas ajenas.

CREATE POLICY "patients: select via clinic"
  ON patients FOR SELECT
  USING (
    clinic_id IN (
      SELECT id FROM clinics WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "patients: insert via clinic"
  ON patients FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT id FROM clinics WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "patients: update via clinic"
  ON patients FOR UPDATE
  USING (
    clinic_id IN (
      SELECT id FROM clinics WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT id FROM clinics WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "patients: delete via clinic"
  ON patients FOR DELETE
  USING (
    clinic_id IN (
      SELECT id FROM clinics WHERE owner_id = auth.uid()
    )
  );


-- ── 6.3 Policies: appointments ───────────────────────────────
-- Mismo patrón que patients.
-- IMPORTANTE: clinic_id en appointments permite que la subquery
-- sea directa sin doble join (appointments → patients → clinics).

CREATE POLICY "appointments: select via clinic"
  ON appointments FOR SELECT
  USING (
    clinic_id IN (
      SELECT id FROM clinics WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "appointments: insert via clinic"
  ON appointments FOR INSERT
  WITH CHECK (
    clinic_id IN (
      SELECT id FROM clinics WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "appointments: update via clinic"
  ON appointments FOR UPDATE
  USING (
    clinic_id IN (
      SELECT id FROM clinics WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    clinic_id IN (
      SELECT id FROM clinics WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "appointments: delete via clinic"
  ON appointments FOR DELETE
  USING (
    clinic_id IN (
      SELECT id FROM clinics WHERE owner_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────
-- 7. VIEWS PARA EL DASHBOARD
-- ─────────────────────────────────────────────────────────────
-- PostgreSQL 15+: las views son SECURITY INVOKER por defecto,
-- lo que significa que respetan el RLS del usuario que las consulta.
-- No es necesario aplicar filtros adicionales.

-- Vista: turnos de hoy con datos del paciente
-- Usada por el bloque AgendaBlock del dashboard.
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
  p.phone_number AS patient_phone
FROM  appointments a
JOIN  patients     p ON p.id = a.patient_id
WHERE DATE(a.appointment_datetime AT TIME ZONE 'America/Montevideo')
    = CURRENT_DATE
ORDER BY a.appointment_datetime;


-- Vista: KPIs del día por clínica
-- Usada por las tarjetas KPI del dashboard (confirmados, pendientes, etc.)
CREATE OR REPLACE VIEW v_clinic_kpis_today
WITH (security_invoker = true)
AS
SELECT
  clinic_id,
  COUNT(*)                                                    AS total_today,
  COUNT(*) FILTER (WHERE status = 'confirmed')               AS confirmed_today,
  COUNT(*) FILTER (WHERE status = 'pending')                 AS pending_today,
  COUNT(*) FILTER (WHERE status = 'cancelled')               AS cancelled_today,
  COUNT(*) FILTER (WHERE status = 'rescheduled')             AS rescheduled_today,
  COUNT(*) FILTER (WHERE reminder_sent_at IS NOT NULL)       AS reminders_sent,
  COUNT(*) FILTER (WHERE confirmed_at IS NOT NULL)           AS auto_confirmed
FROM  appointments
WHERE DATE(appointment_datetime AT TIME ZONE 'America/Montevideo')
    = CURRENT_DATE
GROUP BY clinic_id;


-- ─────────────────────────────────────────────────────────────
-- 8. DATOS SEED (solo para desarrollo local)
-- ─────────────────────────────────────────────────────────────
-- Descomentar solo en entorno de desarrollo.
-- En producción, el primer usuario crea su clínica via onboarding.

/*
INSERT INTO clinics (id, owner_id, name, whatsapp_number)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  auth.uid(),  -- reemplazar con UUID real del usuario de prueba
  'Clínica Bonomi Demo',
  '+59899000001'
);
*/


-- ─────────────────────────────────────────────────────────────
-- NOTAS PARA FASE 2
-- ─────────────────────────────────────────────────────────────
-- Las siguientes tablas NO están en este migration pero el
-- schema actual las soporta sin cambios breaking:
--
-- professionals (id, clinic_id, name, specialty)
--   → appointments.professional_name se migra a professional_id FK
--
-- whatsapp_messages (id, clinic_id, appointment_id, direction,
--                    body, wa_message_id, sent_at)
--   → auditoría completa de mensajes enviados/recibidos
--
-- automation_logs (id, clinic_id, automation_type, status,
--                  triggered_at, result_json)
--   → reemplaza reminder_sent_at con log completo
--
-- clinic_members (id, clinic_id, user_id, role)
--   → múltiples usuarios por clínica (recepcionistas, socios)
--   → requiere actualizar políticas RLS para validar membership
--
-- ─────────────────────────────────────────────────────────────
-- FIN DEL MIGRATION
-- ─────────────────────────────────────────────────────────────
