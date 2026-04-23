-- ============================================================
-- CLINIQ — Clinic Members Migration
-- PostgreSQL 15 / Supabase
-- Version : 1.2.0
-- Date    : 2026-04-23
-- ============================================================
--
-- OBJETIVO: Soporte para múltiples usuarios por clínica.
--
-- ARQUITECTURA MULTI-USUARIO:
-- ─────────────────────────────────────────────────────────────
-- Antes de esta migración, solo el owner_id de clinics podía
-- acceder a los datos de una clínica. Esta migración agrega
-- la tabla clinic_members para que el owner pueda invitar
-- usuarios con distintos roles (staff, viewer).
--
-- IMPACTO EN RLS EXISTENTE:
-- fn_user_clinic_ids() se actualiza para incluir clínicas donde
-- el usuario es miembro. Todas las políticas existentes de
-- patients y appointments automáticamente soportan multi-usuario
-- sin ningún cambio adicional.
--
-- ROLES DISPONIBLES:
--   owner  → Acceso total. Puede invitar/remover miembros.
--   staff  → Puede ver y operar pacientes y turnos.
--   viewer → Solo lectura (futuro uso en dashboards compartidos).
--
-- FLUJO DE INVITACIÓN (Fase 2):
--   owner invita email → INSERT en clinic_members con invited_by
--   → usuario acepta → ya puede acceder a la clínica
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. TABLA: clinic_members
-- ─────────────────────────────────────────────────────────────
-- Tabla pivot entre clinics y auth.users.
--
-- UNIQUE(clinic_id, user_id): un usuario solo puede tener un rol
-- por clínica. Para cambiar el rol, UPDATE en lugar de INSERT.
--
-- invited_by: auditoría de quién invitó al miembro. NULL para el
-- owner original (insertado por el trigger de auto-membership).
--
-- No tiene updated_at porque los cambios de rol son raros y
-- se auditarán via logs en Fase 2. Si se necesita, agregar en
-- una migración futura con ALTER TABLE.

CREATE TABLE clinic_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'staff'
             CHECK (role IN ('owner', 'staff', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinic_id, user_id)
);


-- ─────────────────────────────────────────────────────────────
-- 2. ÍNDICES
-- ─────────────────────────────────────────────────────────────
-- idx_clinic_members_clinic_id: usado en las políticas RLS para
-- encontrar los miembros de una clínica dada (ej: listar miembros).
--
-- idx_clinic_members_user_id: usado en fn_user_clinic_ids() para
-- encontrar las clínicas a las que pertenece un usuario.
-- Este índice es CRÍTICO para el rendimiento de todas las queries
-- que pasan por las políticas RLS de patients y appointments.

CREATE INDEX idx_clinic_members_clinic_id ON clinic_members(clinic_id);
CREATE INDEX idx_clinic_members_user_id   ON clinic_members(user_id);


-- ─────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY — clinic_members
-- ─────────────────────────────────────────────────────────────
-- Estrategia:
--   SELECT → cualquier miembro (o owner) de la clínica puede ver
--            el listado de miembros.
--   INSERT → solo el owner puede agregar miembros.
--   DELETE → solo el owner puede eliminar miembros.
--   UPDATE → no hay política de UPDATE: para cambiar roles se debe
--            DELETE + INSERT (simplifica la lógica de auditoría).
--
-- DEFINICIÓN DE "ES OWNER":
--   Un usuario es owner si:
--     a) clinics.owner_id = auth.uid()  (owner original de la tabla clinics)
--     b) tiene una fila en clinic_members con role = 'owner'
--   Ambas condiciones se unen con OR para garantizar retrocompatibilidad.

ALTER TABLE clinic_members ENABLE ROW LEVEL SECURITY;


-- ── 3.1 SELECT: miembros visibles para cualquier miembro de la clínica ──

CREATE POLICY "clinic_members: select as member"
  ON clinic_members FOR SELECT
  USING (
    -- El usuario es member de esta clínica (cualquier rol)
    clinic_id IN (SELECT fn_user_clinic_ids())
  );


-- ── 3.2 INSERT: solo el owner puede agregar miembros ─────────────────────

CREATE POLICY "clinic_members: insert as owner"
  ON clinic_members FOR INSERT
  WITH CHECK (
    -- El usuario que inserta es owner de la clínica (via clinics.owner_id)
    clinic_id IN (
      SELECT id FROM clinics WHERE owner_id = auth.uid()
    )
    OR
    -- O tiene role='owner' en clinic_members de esa clínica
    EXISTS (
      SELECT 1 FROM clinic_members cm
      WHERE cm.clinic_id = clinic_members.clinic_id
        AND cm.user_id   = auth.uid()
        AND cm.role      = 'owner'
    )
  );


-- ── 3.3 DELETE: solo el owner puede eliminar miembros ────────────────────

CREATE POLICY "clinic_members: delete as owner"
  ON clinic_members FOR DELETE
  USING (
    -- El usuario es owner via clinics.owner_id
    clinic_id IN (
      SELECT id FROM clinics WHERE owner_id = auth.uid()
    )
    OR
    -- O tiene role='owner' en clinic_members de esa clínica
    EXISTS (
      SELECT 1 FROM clinic_members cm
      WHERE cm.clinic_id = clinic_members.clinic_id
        AND cm.user_id   = auth.uid()
        AND cm.role      = 'owner'
    )
  );


-- ─────────────────────────────────────────────────────────────
-- 4. ACTUALIZAR fn_user_clinic_ids()
-- ─────────────────────────────────────────────────────────────
-- CAMBIO CLAVE: la función ahora devuelve clínicas donde el usuario
-- es owner (via clinics.owner_id) UNION clínicas donde es miembro
-- (via clinic_members).
--
-- Esto hace que TODAS las políticas RLS existentes de patients y
-- appointments soporten multi-usuario automáticamente, sin modificar
-- ninguna política individual.
--
-- STABLE + SECURITY DEFINER: el planner puede cachear el resultado
-- dentro de la transacción, evitando re-ejecutar por cada fila.
-- SET search_path = public: protección contra search_path hijacking.

CREATE OR REPLACE FUNCTION fn_user_clinic_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM clinics WHERE owner_id = auth.uid()
  UNION
  SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid();
$$;


-- ─────────────────────────────────────────────────────────────
-- 5. MIGRAR OWNERS EXISTENTES A clinic_members
-- ─────────────────────────────────────────────────────────────
-- Inserta al owner de cada clínica existente como miembro con
-- role='owner'. Esto garantiza consistencia: el owner siempre
-- aparece en clinic_members.
--
-- ON CONFLICT DO NOTHING: idempotente, seguro de re-ejecutar.
-- invited_by queda NULL para el owner original (se auto-invitó
-- al crear la clínica).

INSERT INTO clinic_members (clinic_id, user_id, role)
SELECT id, owner_id, 'owner'
FROM clinics
ON CONFLICT (clinic_id, user_id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 6. TRIGGER: auto-insertar owner al crear clínica nueva
-- ─────────────────────────────────────────────────────────────
-- Cuando se inserta una nueva fila en clinics, el trigger
-- automáticamente agrega al owner como miembro con role='owner'.
--
-- Esto elimina la responsabilidad de la aplicación de hacer dos
-- inserts separados (clinics + clinic_members) y garantiza que
-- nunca haya una clínica sin un owner en clinic_members.
--
-- AFTER INSERT: se ejecuta después de que la fila en clinics existe,
-- lo que permite la FK clinic_members.clinic_id → clinics.id.

CREATE OR REPLACE FUNCTION fn_add_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO clinic_members (clinic_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (clinic_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_clinics_add_owner
  AFTER INSERT ON clinics
  FOR EACH ROW EXECUTE FUNCTION fn_add_owner_as_member();


-- ─────────────────────────────────────────────────────────────
-- FIN DEL MIGRATION
-- ─────────────────────────────────────────────────────────────


-- ============================================================
-- INSTRUCCIONES PARA EJECUTAR EN SUPABASE SQL EDITOR
-- ============================================================
--
-- 1. Ir a: https://supabase.com/dashboard/project/jmpyygecgqkeuwwaioew/sql/new
--
-- 2. Copiar TODO el contenido de este archivo (desde el inicio
--    hasta esta línea) y pegarlo en el editor SQL.
--
-- 3. Hacer clic en "Run" (o Ctrl+Enter / Cmd+Enter).
--
-- 4. Verificar que no haya errores en el panel inferior.
--    Resultado esperado: "Success. No rows returned."
--
-- 5. Verificar la migración ejecutando estas queries de comprobación:
--
--    -- Comprobar que la tabla existe con la estructura correcta
--    SELECT column_name, data_type, is_nullable
--    FROM information_schema.columns
--    WHERE table_name = 'clinic_members'
--    ORDER BY ordinal_position;
--
--    -- Comprobar que el owner fue migrado como miembro
--    SELECT cm.clinic_id, cm.user_id, cm.role, c.name AS clinic_name
--    FROM clinic_members cm
--    JOIN clinics c ON c.id = cm.clinic_id;
--
--    -- Comprobar los índices
--    SELECT indexname, indexdef
--    FROM pg_indexes
--    WHERE tablename = 'clinic_members';
--
--    -- Comprobar que fn_user_clinic_ids() fue actualizada
--    SELECT prosrc FROM pg_proc WHERE proname = 'fn_user_clinic_ids';
--
-- 6. ⚠️  IMPORTANTE: Esta migración es IDEMPOTENTE en el INSERT
--    de owners (ON CONFLICT DO NOTHING), pero NO es seguro
--    ejecutarla más de una vez completa porque CREATE TABLE,
--    CREATE TRIGGER y CREATE INDEX fallarían en duplicados.
--    Si se necesita re-ejecutar, usar DROP TABLE clinic_members CASCADE
--    primero (solo en desarrollo, NUNCA en producción con datos).
--
-- ============================================================
