-- ============================================================
-- CLINIQ — Multi-User Architecture: clinic_members
-- PostgreSQL 15 / Supabase
-- Version : 2.0.0
-- ============================================================
--
-- OBJETIVO: Sistema completo de membresías con invitaciones.
--
-- MODELO:
--   clinics.owner_id  → quién creó la clínica (metadata)
--   clinic_members    → fuente de verdad para autorización
--
-- FLUJOS:
--   Owner signup  → crea clinic → trigger inserta owner en clinic_members
--   Staff invite  → INSERT clinic_members (user_id NULL, status='invited')
--   Staff signup  → trigger fn_link_invitation_on_signup lo activa automáticamente
--   Post-login    → query clinic_members WHERE user_id=auth.uid() AND status='active'
--
-- ROLES:
--   owner  → acceso total, puede invitar y remover miembros
--   staff  → puede ver y operar pacientes y turnos
--   viewer → solo lectura (para dashboards compartidos)
--
-- STATUS:
--   invited → invitación enviada, usuario aún no registrado
--   active  → miembro activo con acceso
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 1. TABLA: clinic_members
-- ─────────────────────────────────────────────────────────────
--
-- user_id es NULLABLE: es NULL mientras la invitación está pendiente
-- (el usuario todavía no tiene cuenta). Se llena automáticamente
-- cuando el usuario se registra con el email invitado (trigger).
--
-- email es la clave de identificación para invitaciones.
-- UNIQUE(clinic_id, email) evita invitar al mismo email dos veces.

CREATE TABLE clinic_members (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL si invitación pendiente
  email      TEXT        NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'staff'
             CHECK (role IN ('owner', 'staff', 'viewer')),
  status     TEXT        NOT NULL DEFAULT 'invited'
             CHECK (status IN ('invited', 'active')),
  invited_by UUID        REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinic_id, email)
);


-- ─────────────────────────────────────────────────────────────
-- 2. ÍNDICES
-- ─────────────────────────────────────────────────────────────
-- idx_clinic_members_user_status: usado en fn_user_clinic_ids() y
-- en loadClinic del frontend — la query más frecuente de toda la app.

CREATE INDEX idx_clinic_members_clinic_id   ON clinic_members(clinic_id);
CREATE INDEX idx_clinic_members_user_id     ON clinic_members(user_id);
CREATE INDEX idx_clinic_members_email       ON clinic_members(email);
CREATE INDEX idx_clinic_members_user_status ON clinic_members(user_id, status)
  WHERE user_id IS NOT NULL;


-- ─────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

ALTER TABLE clinic_members ENABLE ROW LEVEL SECURITY;


-- SELECT: cualquier miembro activo de la clínica puede ver el equipo
CREATE POLICY "clinic_members: select as member"
  ON clinic_members FOR SELECT
  USING (
    clinic_id IN (SELECT fn_user_clinic_ids())
  );


-- INSERT: solo el owner puede invitar miembros
CREATE POLICY "clinic_members: insert as owner"
  ON clinic_members FOR INSERT
  WITH CHECK (
    -- Owner via clinics.owner_id (retrocompatibilidad)
    clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
    OR
    -- Owner via clinic_members
    EXISTS (
      SELECT 1 FROM clinic_members cm
      WHERE cm.clinic_id = clinic_members.clinic_id
        AND cm.user_id   = auth.uid()
        AND cm.role      = 'owner'
        AND cm.status    = 'active'
    )
  );


-- UPDATE: solo el owner puede cambiar roles
CREATE POLICY "clinic_members: update as owner"
  ON clinic_members FOR UPDATE
  USING (
    clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM clinic_members cm
      WHERE cm.clinic_id = clinic_members.clinic_id
        AND cm.user_id   = auth.uid()
        AND cm.role      = 'owner'
        AND cm.status    = 'active'
    )
  );


-- DELETE: solo el owner puede eliminar miembros (no puede eliminarse a sí mismo)
CREATE POLICY "clinic_members: delete as owner"
  ON clinic_members FOR DELETE
  USING (
    user_id <> auth.uid() -- no puede auto-eliminarse
    AND (
      clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
      OR
      EXISTS (
        SELECT 1 FROM clinic_members cm
        WHERE cm.clinic_id = clinic_members.clinic_id
          AND cm.user_id   = auth.uid()
          AND cm.role      = 'owner'
          AND cm.status    = 'active'
      )
    )
  );


-- ─────────────────────────────────────────────────────────────
-- 4. ACTUALIZAR fn_user_clinic_ids()
-- ─────────────────────────────────────────────────────────────
-- Ahora incluye membresías activas además de ownership directo.
-- Todas las políticas RLS de patients y appointments ganan
-- soporte multi-usuario sin modificar ninguna política individual.

CREATE OR REPLACE FUNCTION fn_user_clinic_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Owner directo (retrocompatibilidad + performance)
  SELECT id FROM clinics WHERE owner_id = auth.uid()
  UNION
  -- Membresías activas (owner, staff, viewer)
  SELECT clinic_id FROM clinic_members
  WHERE user_id = auth.uid() AND status = 'active';
$$;


-- ─────────────────────────────────────────────────────────────
-- 5. MIGRAR OWNERS EXISTENTES → clinic_members
-- ─────────────────────────────────────────────────────────────
-- Inserta al owner de cada clínica existente como miembro activo.
-- ON CONFLICT DO NOTHING: idempotente.

INSERT INTO clinic_members (clinic_id, user_id, email, role, status)
SELECT c.id, c.owner_id, au.email, 'owner', 'active'
FROM   clinics c
JOIN   auth.users au ON au.id = c.owner_id
ON CONFLICT (clinic_id, email) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 6. TRIGGER: auto-insertar owner al crear clínica nueva
-- ─────────────────────────────────────────────────────────────
-- Cuando se inserta en clinics, el trigger agrega al owner como
-- miembro activo. Elimina la responsabilidad del frontend de hacer
-- dos INSERTs separados y garantiza consistencia.

CREATE OR REPLACE FUNCTION fn_add_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = NEW.owner_id;

  INSERT INTO clinic_members (clinic_id, user_id, email, role, status)
  VALUES (NEW.id, NEW.owner_id, v_email, 'owner', 'active')
  ON CONFLICT (clinic_id, email) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_clinics_add_owner
  AFTER INSERT ON clinics
  FOR EACH ROW EXECUTE FUNCTION fn_add_owner_as_member();


-- ─────────────────────────────────────────────────────────────
-- 7. TRIGGER: auto-activar invitación al registrarse
-- ─────────────────────────────────────────────────────────────
-- Cuando alguien se registra con un email que tiene invitación
-- pendiente, el trigger automáticamente:
--   1. Llena user_id con el nuevo auth.uid()
--   2. Cambia status de 'invited' a 'active'
--
-- Resultado: el staff puede iniciar sesión inmediatamente después
-- del signup sin ningún paso manual adicional.

CREATE OR REPLACE FUNCTION fn_link_invitation_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE clinic_members
  SET    user_id = NEW.id,
         status  = 'active'
  WHERE  email   = NEW.email
    AND  status  = 'invited'
    AND  user_id IS NULL;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_link_invitation_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_link_invitation_on_signup();


-- ============================================================
-- INSTRUCCIONES PARA EJECUTAR
-- ============================================================
--
-- 1. Ir a: supabase.com/dashboard → proyecto → SQL Editor → New query
--
-- 2. Pegar TODO el contenido de este archivo y ejecutar (Ctrl+Enter)
--
-- 3. Verificar con estas queries:
--
--    -- Estructura de la tabla
--    SELECT column_name, data_type, is_nullable
--    FROM information_schema.columns
--    WHERE table_name = 'clinic_members'
--    ORDER BY ordinal_position;
--
--    -- Owners migrados (debe mostrar al menos 1 fila)
--    SELECT cm.role, cm.status, cm.email, c.name
--    FROM clinic_members cm
--    JOIN clinics c ON c.id = cm.clinic_id;
--
--    -- Función actualizada
--    SELECT prosrc FROM pg_proc WHERE proname = 'fn_user_clinic_ids';
--
-- ============================================================
