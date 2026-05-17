-- Lista de espera para turnos
-- Pacientes que quieren ser avisados cuando se libere un turno

CREATE TABLE IF NOT EXISTS waiting_list (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id     uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id    uuid REFERENCES patients(id) ON DELETE SET NULL,
  phone_number  text NOT NULL,
  full_name     text NOT NULL DEFAULT '',
  service       text,
  date_from     date,
  date_to       date,
  notes         text,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','notified','cancelled')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS waiting_list_clinic_id_idx ON waiting_list(clinic_id);
CREATE INDEX IF NOT EXISTS waiting_list_status_idx    ON waiting_list(status);

ALTER TABLE waiting_list ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_read_waiting_list"   ON waiting_list;
DROP POLICY IF EXISTS "members_insert_waiting_list" ON waiting_list;
DROP POLICY IF EXISTS "members_update_waiting_list" ON waiting_list;
DROP POLICY IF EXISTS "members_delete_waiting_list" ON waiting_list;

CREATE POLICY "members_read_waiting_list" ON waiting_list
  FOR SELECT USING (
    clinic_id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "members_insert_waiting_list" ON waiting_list
  FOR INSERT WITH CHECK (
    clinic_id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "members_update_waiting_list" ON waiting_list
  FOR UPDATE USING (
    clinic_id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "members_delete_waiting_list" ON waiting_list
  FOR DELETE USING (
    clinic_id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid() AND status = 'active')
  );

-- DELETE policy also referenced from 20260507000002 (applied before this table existed)
DROP POLICY IF EXISTS "clinic_delete_waiting_list" ON waiting_list;
CREATE POLICY "clinic_delete_waiting_list" ON waiting_list
  FOR DELETE USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid()
    )
  );
