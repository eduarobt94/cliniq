-- ═══════════════════════════════════════════════════════════════════════════════
-- LISTA DE ESPERA AUTOMÁTICA
-- Cuando se cancela un turno, el sistema notifica automáticamente a los
-- pacientes que están en lista de espera para esa clínica.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Tabla principal ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waiting_list (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id            UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id           UUID        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  service              TEXT,                          -- NULL = acepta cualquier servicio
  preferred_date_from  DATE,                          -- NULL = sin preferencia de fecha
  preferred_date_to    DATE,
  notes                TEXT,
  status               TEXT        NOT NULL DEFAULT 'waiting'
                         CHECK (status IN ('waiting','notified','booked','expired','cancelled')),
  notified_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Columna en appointments: evita notificar doble ──────────────────────────
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS waitlist_notified_at TIMESTAMPTZ;

-- ─── Trigger updated_at ───────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_waiting_list_updated_at ON waiting_list;
CREATE TRIGGER trg_waiting_list_updated_at
  BEFORE UPDATE ON waiting_list
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ─── Índices ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_waiting_list_clinic  ON waiting_list(clinic_id);
CREATE INDEX idx_waiting_list_patient ON waiting_list(patient_id);

-- Índice parcial: el cron job solo necesita entradas 'waiting'
CREATE INDEX idx_waiting_list_active
  ON waiting_list(clinic_id, created_at DESC)
  WHERE status = 'waiting';

-- Índice parcial: citas canceladas sin notificar (usadas por el cron)
CREATE INDEX idx_appointments_waitlist_pending
  ON appointments(clinic_id, appointment_datetime, waitlist_notified_at)
  WHERE status = 'cancelled' AND waitlist_notified_at IS NULL;

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE waiting_list ENABLE ROW LEVEL SECURITY;

-- Staff/owner puede leer su lista
CREATE POLICY "waiting_list_select"
  ON waiting_list FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clinics
      WHERE id = waiting_list.clinic_id
        AND owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM clinic_members
      WHERE clinic_id = waiting_list.clinic_id
        AND user_id   = auth.uid()
        AND status    = 'active'
    )
  );

-- Solo el service_role (edge functions) puede insertar
CREATE POLICY "waiting_list_insert"
  ON waiting_list FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Owner/staff pueden actualizar (ej: marcar como 'cancelled' desde el dashboard)
-- El service_role también puede actualizar (marcar 'notified' o 'booked')
CREATE POLICY "waiting_list_update"
  ON waiting_list FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM clinics
      WHERE id = waiting_list.clinic_id
        AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM clinic_members
      WHERE clinic_id = waiting_list.clinic_id
        AND user_id   = auth.uid()
        AND status    = 'active'
    )
  );
