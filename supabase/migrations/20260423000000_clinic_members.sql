-- ============================================================
-- CLINIQ — Multi-User Architecture: clinic_members
-- PostgreSQL 15 / Supabase — Version 2.0.0
-- ============================================================
-- Script idempotente: limpia versiones anteriores y recrea todo.
-- Seguro de ejecutar aunque ya existan objetos previos.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 0. LIMPIEZA DE VERSIONES ANTERIORES
-- ─────────────────────────────────────────────────────────────
-- Elimina todo lo que pueda haber quedado de ejecuciones previas
-- parciales o incompletas. CASCADE borra triggers y políticas dependientes.

DROP TRIGGER  IF EXISTS trg_clinics_add_owner         ON clinics;
DROP TRIGGER  IF EXISTS trg_link_invitation_on_signup  ON auth.users;
DROP FUNCTION IF EXISTS fn_add_owner_as_member()      CASCADE;
DROP FUNCTION IF EXISTS fn_link_invitation_on_signup() CASCADE;
DROP TABLE    IF EXISTS clinic_members                CASCADE;


-- ─────────────────────────────────────────────────────────────
-- 1. TABLA: clinic_members
-- ─────────────────────────────────────────────────────────────
-- user_id es NULLABLE: NULL mientras la invitación está pendiente.
-- email identifica la invitación antes de que el usuario tenga cuenta.
-- UNIQUE(clinic_id, email) evita invitar el mismo email dos veces.

CREATE TABLE clinic_members (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  UUID        NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
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

CREATE INDEX idx_clinic_members_clinic_id   ON clinic_members(clinic_id);
CREATE INDEX idx_clinic_members_user_id     ON clinic_members(user_id);
CREATE INDEX idx_clinic_members_email       ON clinic_members(email);
CREATE INDEX idx_clinic_members_user_status ON clinic_members(user_id, status)
  WHERE user_id IS NOT NULL;


-- ─────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

ALTER TABLE clinic_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_members: select as member"
  ON clinic_members FOR SELECT
  USING (clinic_id IN (SELECT fn_user_clinic_ids()));

CREATE POLICY "clinic_members: insert as owner"
  ON clinic_members FOR INSERT
  WITH CHECK (
    clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM clinic_members cm
      WHERE cm.clinic_id = clinic_members.clinic_id
        AND cm.user_id   = auth.uid()
        AND cm.role      = 'owner'
        AND cm.status    = 'active'
    )
  );

CREATE POLICY "clinic_members: update as owner"
  ON clinic_members FOR UPDATE
  USING (
    clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM clinic_members cm
      WHERE cm.clinic_id = clinic_members.clinic_id
        AND cm.user_id   = auth.uid()
        AND cm.role      = 'owner'
        AND cm.status    = 'active'
    )
  );

CREATE POLICY "clinic_members: delete as owner"
  ON clinic_members FOR DELETE
  USING (
    user_id <> auth.uid()
    AND (
      clinic_id IN (SELECT id FROM clinics WHERE owner_id = auth.uid())
      OR EXISTS (
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

CREATE OR REPLACE FUNCTION fn_user_clinic_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM clinics WHERE owner_id = auth.uid()
  UNION
  SELECT clinic_id FROM clinic_members
  WHERE user_id = auth.uid() AND status = 'active';
$$;


-- ─────────────────────────────────────────────────────────────
-- 5. MIGRAR OWNERS EXISTENTES → clinic_members
-- ─────────────────────────────────────────────────────────────

INSERT INTO clinic_members (clinic_id, user_id, email, role, status)
SELECT c.id, c.owner_id, au.email, 'owner', 'active'
FROM   clinics c
JOIN   auth.users au ON au.id = c.owner_id
ON CONFLICT (clinic_id, email) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 6. TRIGGER: auto-insertar owner al crear clínica nueva
-- ─────────────────────────────────────────────────────────────

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


-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN — ejecutar después del Run para confirmar:
-- ─────────────────────────────────────────────────────────────
--
-- SELECT cm.role, cm.status, cm.email, c.name AS clinica
-- FROM clinic_members cm
-- JOIN clinics c ON c.id = cm.clinic_id;
--
-- Resultado esperado: al menos 1 fila con role='owner', status='active'
-- y el email de maria@bonomi.uy
-- ─────────────────────────────────────────────────────────────
