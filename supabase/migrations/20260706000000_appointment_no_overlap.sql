-- ═══════════════════════════════════════════════════════════════════════════════
-- CRÍTICO-1 (audit 2026-07-06): Anti-solapamiento de turnos
--
-- Antes: la única unicidad era UNIQUE(clinic_id, patient_id, appointment_datetime),
-- que solo evita que EL MISMO paciente tenga dos filas al mismo instante. Dos
-- pacientes distintos (o la recepción + el bot) podían reservar el mismo
-- profesional a la misma hora. Este constraint lo impide a nivel DB.
--
-- Nota técnica: `ends_at` NO puede ser una columna GENERATED porque
-- `timestamptz + interval` es STABLE (no IMMUTABLE) en Postgres. Se mantiene con
-- un trigger BEFORE INSERT/UPDATE, y el constraint indexa dos columnas planas.
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Duración del turno (default 30 min)
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS duration_minutes int NOT NULL DEFAULT 30;

-- 2. ends_at como columna normal mantenida por trigger
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS ends_at timestamptz;

CREATE OR REPLACE FUNCTION set_appointment_ends_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.ends_at := NEW.appointment_datetime + make_interval(mins => COALESCE(NEW.duration_minutes, 30));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_appointment_ends_at ON appointments;
CREATE TRIGGER trg_appointment_ends_at
  BEFORE INSERT OR UPDATE OF appointment_datetime, duration_minutes ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_appointment_ends_at();

-- 3. Backfill de turnos existentes
UPDATE appointments
SET ends_at = appointment_datetime + make_interval(mins => COALESCE(duration_minutes, 30))
WHERE ends_at IS NULL;

ALTER TABLE appointments ALTER COLUMN ends_at SET NOT NULL;

-- 4. Constraint anti-solapamiento (idempotente)
-- ⚠ Si la tabla ya contiene turnos que se solapan (p.ej. seed demo), este ADD falla.
--   Limpieza previa (cancelar el "perdedor" de cada par solapado):
--
--   WITH activos AS (
--     SELECT id, clinic_id, professional_name, appointment_datetime, ends_at
--     FROM appointments WHERE status IN ('new','pending','confirmed')
--   ), perdedores AS (
--     SELECT b.id AS loser_id
--     FROM activos a JOIN activos b
--       ON a.clinic_id = b.clinic_id
--      AND a.professional_name IS NOT DISTINCT FROM b.professional_name
--      AND tstzrange(a.appointment_datetime, a.ends_at) && tstzrange(b.appointment_datetime, b.ends_at)
--      AND ( a.appointment_datetime < b.appointment_datetime
--         OR (a.appointment_datetime = b.appointment_datetime AND a.id < b.id) )
--   )
--   UPDATE appointments SET status = 'cancelled'
--   WHERE id IN (SELECT DISTINCT loser_id FROM perdedores);
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_no_overlap'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_no_overlap
      EXCLUDE USING gist (
        clinic_id         WITH =,
        professional_name WITH =,
        tstzrange(appointment_datetime, ends_at) WITH &&
      ) WHERE (status IN ('new','pending','confirmed'));
  END IF;
END $$;
