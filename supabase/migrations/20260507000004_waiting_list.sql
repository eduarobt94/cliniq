-- Lista de espera para turnos — RECONCILIACIÓN (audit 2026-07-06, CRÍTICO-2)
--
-- ⚠️ La tabla `waiting_list` se define de forma CANÓNICA en
--    20260507000000_waiting_list.sql (columnas preferred_date_from/to,
--    status IN ('waiting','notified','booked','expired','cancelled'),
--    notified_at, updated_at, patient_id NOT NULL). Esa es la que usa el código
--    (ai-agent-reply, notify-waitlist, useWaitingList, ListaEspera).
--
--    El CREATE TABLE que había aquí definía un esquema INCOMPATIBLE
--    (date_from/to, phone_number NOT NULL, status IN ('pending','notified','cancelled'))
--    y solo NO rompió por el `IF NOT EXISTS` + el orden de los archivos. Se eliminó
--    para evitar el footgun: en un entorno nuevo, si esta migración corriera primero,
--    la tabla quedaría con el esquema equivocado y TODO insert de lista de espera
--    fallaría en silencio.
--
--    Esta migración conserva únicamente las políticas RLS `members_*`, que son las
--    que sobreviven al cleanup de 20260516000000 (ese cleanup dropea las políticas
--    de la migración 000000). Sin este bloque, `waiting_list` se quedaría sin
--    política de SELECT para usuarios autenticados y el dashboard no podría leerla.
--
-- VERIFICACIÓN EN PROD (manual): correr `\d waiting_list` en el SQL Editor.
--   Si el esquema es el incorrecto (date_from / status 'pending'), aplicar una
--   migración correctiva idempotente que agregue preferred_date_from/to, updated_at,
--   notified_at y ajuste el CHECK de status.

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
