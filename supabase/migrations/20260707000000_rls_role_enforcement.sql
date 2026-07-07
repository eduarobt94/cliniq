-- ═══════════════════════════════════════════════════════════════════════════════
-- REP-ALTO-6 (re-audit 2026-07-07): RLS por roles — viewer de solo lectura
--
-- Problema: 20260530000000 unificó las políticas a fn_user_clinic_ids(), que solo
-- chequea MEMBRESÍA. Un usuario con rol 'viewer' podía INSERT/UPDATE/DELETE
-- pacientes, turnos, conversaciones y lista de espera vía API directa (la UI solo
-- esconde botones). Además debilitó clinic_services/schedule/closures DELETE de
-- owner-only a cualquier miembro.
--
-- Modelo de permisos resultante:
--   SELECT  → cualquier miembro activo (owner/staff/viewer)  [sin cambios]
--   WRITE   → owner/staff en datos operativos (patients, appointments,
--             conversations, messages, waiting_list)
--   WRITE   → solo owner en configuración (services, schedule, closures)
--
-- Bonus: conversations no tenía política UPDATE para usuarios → el toggle IA
-- (agent_mode) del Inbox se no-opeaba en silencio. Se agrega conversations_update.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Helper: clínicas donde el usuario puede ESCRIBIR (owner/staff) ─────────────
CREATE OR REPLACE FUNCTION fn_user_clinic_ids_writer()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT clinic_id
  FROM   clinic_members
  WHERE  user_id = auth.uid()
    AND  status  = 'active'
    AND  role IN ('owner', 'staff');
$$;

-- ─── Helper: clínicas donde el usuario es OWNER ─────────────────────────────────
CREATE OR REPLACE FUNCTION fn_user_clinic_ids_owner()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT clinic_id
  FROM   clinic_members
  WHERE  user_id = auth.uid()
    AND  status  = 'active'
    AND  role    = 'owner';
$$;

-- ─── patients: escritura solo owner/staff ───────────────────────────────────────
DROP POLICY IF EXISTS "patients: insert via clinic" ON patients;
CREATE POLICY "patients: insert via clinic"
  ON patients FOR INSERT
  WITH CHECK (clinic_id IN (SELECT fn_user_clinic_ids_writer()));

DROP POLICY IF EXISTS "patients: update via clinic" ON patients;
CREATE POLICY "patients: update via clinic"
  ON patients FOR UPDATE
  USING     (clinic_id IN (SELECT fn_user_clinic_ids_writer()))
  WITH CHECK (clinic_id IN (SELECT fn_user_clinic_ids_writer()));

DROP POLICY IF EXISTS "patients: delete via clinic" ON patients;
CREATE POLICY "patients: delete via clinic"
  ON patients FOR DELETE
  USING (clinic_id IN (SELECT fn_user_clinic_ids_writer()));

-- ─── appointments: escritura solo owner/staff ───────────────────────────────────
DROP POLICY IF EXISTS "appointments: insert via clinic" ON appointments;
CREATE POLICY "appointments: insert via clinic"
  ON appointments FOR INSERT
  WITH CHECK (clinic_id IN (SELECT fn_user_clinic_ids_writer()));

DROP POLICY IF EXISTS "appointments: update via clinic" ON appointments;
CREATE POLICY "appointments: update via clinic"
  ON appointments FOR UPDATE
  USING     (clinic_id IN (SELECT fn_user_clinic_ids_writer()))
  WITH CHECK (clinic_id IN (SELECT fn_user_clinic_ids_writer()));

DROP POLICY IF EXISTS "appointments: delete via clinic" ON appointments;
CREATE POLICY "appointments: delete via clinic"
  ON appointments FOR DELETE
  USING (clinic_id IN (SELECT fn_user_clinic_ids_writer()));

-- ─── conversations: UPDATE (nuevo — faltaba) + DELETE solo owner/staff ──────────
DROP POLICY IF EXISTS "conversations_update" ON conversations;
CREATE POLICY "conversations_update"
  ON conversations FOR UPDATE
  USING     (clinic_id IN (SELECT fn_user_clinic_ids_writer()))
  WITH CHECK (clinic_id IN (SELECT fn_user_clinic_ids_writer()));

DROP POLICY IF EXISTS "conversations_delete" ON conversations;
CREATE POLICY "conversations_delete"
  ON conversations FOR DELETE
  USING (clinic_id IN (SELECT fn_user_clinic_ids_writer()));

-- ─── messages: DELETE solo owner/staff (borrado desde Inbox) ────────────────────
DROP POLICY IF EXISTS "messages_delete" ON messages;
CREATE POLICY "messages_delete"
  ON messages FOR DELETE
  USING (clinic_id IN (SELECT fn_user_clinic_ids_writer()));

-- ─── waiting_list: escritura solo owner/staff ───────────────────────────────────
DROP POLICY IF EXISTS "members_insert_waiting_list" ON waiting_list;
CREATE POLICY "members_insert_waiting_list"
  ON waiting_list FOR INSERT
  WITH CHECK (clinic_id IN (SELECT fn_user_clinic_ids_writer()));

DROP POLICY IF EXISTS "members_update_waiting_list" ON waiting_list;
CREATE POLICY "members_update_waiting_list"
  ON waiting_list FOR UPDATE
  USING     (clinic_id IN (SELECT fn_user_clinic_ids_writer()))
  WITH CHECK (clinic_id IN (SELECT fn_user_clinic_ids_writer()));

DROP POLICY IF EXISTS "members_delete_waiting_list" ON waiting_list;
CREATE POLICY "members_delete_waiting_list"
  ON waiting_list FOR DELETE
  USING (clinic_id IN (SELECT fn_user_clinic_ids_writer()));

-- ─── Configuración: restaurar owner-only en DELETE ──────────────────────────────
-- (20260530000000 los había debilitado a cualquier miembro; insert/update ya
--  eran owner-only en sus migraciones originales)
DROP POLICY IF EXISTS "clinic_services_delete" ON public.clinic_services;
CREATE POLICY "clinic_services_delete"
  ON public.clinic_services FOR DELETE
  USING (clinic_id IN (SELECT fn_user_clinic_ids_owner()));

DROP POLICY IF EXISTS "clinic_schedule_delete" ON public.clinic_schedule;
CREATE POLICY "clinic_schedule_delete"
  ON public.clinic_schedule FOR DELETE
  USING (clinic_id IN (SELECT fn_user_clinic_ids_owner()));

DROP POLICY IF EXISTS "clinic_closures_delete" ON public.clinic_closures;
CREATE POLICY "clinic_closures_delete"
  ON public.clinic_closures FOR DELETE
  USING (clinic_id IN (SELECT fn_user_clinic_ids_owner()));
