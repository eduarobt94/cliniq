-- ============================================================
-- CLINIQ — Invite Flow: token-based member invitations
-- Depende de: 20260423000000_clinic_members.sql (debe ejecutarse primero)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Agregar invite_token a clinic_members
-- ─────────────────────────────────────────────────────────────

ALTER TABLE clinic_members
  ADD COLUMN IF NOT EXISTS invite_token UUID DEFAULT gen_random_uuid() UNIQUE;

CREATE INDEX IF NOT EXISTS idx_clinic_members_invite_token
  ON clinic_members(invite_token)
  WHERE invite_token IS NOT NULL;


-- ─────────────────────────────────────────────────────────────
-- 2. Actualizar trigger para limpiar invite_token al activar
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_link_invitation_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE clinic_members
  SET    user_id      = NEW.id,
         status       = 'active',
         invite_token = NULL
  WHERE  email   = NEW.email
    AND  status  = 'invited'
    AND  user_id IS NULL;
  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- 3. RPC: create_member_invite
-- Solo owners pueden invitar. Hace upsert y devuelve el token.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_member_invite(
  p_clinic_id UUID,
  p_email     TEXT,
  p_role      TEXT DEFAULT 'staff'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token    UUID;
  v_is_owner BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM clinic_members
    WHERE clinic_id = p_clinic_id
      AND user_id   = auth.uid()
      AND role      IN ('owner')
      AND status    = 'active'
  ) OR EXISTS (
    SELECT 1 FROM clinics
    WHERE id = p_clinic_id AND owner_id = auth.uid()
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'permission_denied: solo los dueños pueden invitar miembros';
  END IF;

  IF p_role NOT IN ('staff', 'viewer') THEN
    RAISE EXCEPTION 'invalid_role: role debe ser staff o viewer';
  END IF;

  INSERT INTO clinic_members (clinic_id, user_id, email, role, status, invited_by, invite_token)
  VALUES (p_clinic_id, NULL, LOWER(TRIM(p_email)), p_role, 'invited', auth.uid(), gen_random_uuid())
  ON CONFLICT (clinic_id, email) DO UPDATE
    SET role         = EXCLUDED.role,
        invite_token = gen_random_uuid(),
        invited_by   = EXCLUDED.invited_by,
        status       = 'invited',
        user_id      = NULL
  RETURNING invite_token INTO v_token;

  RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION create_member_invite(UUID, TEXT, TEXT) TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- 4. RPC: get_invite_by_token
-- Pública (anon): muestra info de la invitación antes del login.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_invite_by_token(p_token UUID)
RETURNS TABLE (
  clinic_id   UUID,
  clinic_name TEXT,
  email       TEXT,
  role        TEXT,
  status      TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.clinic_id,
    c.name   AS clinic_name,
    cm.email,
    cm.role,
    cm.status
  FROM clinic_members cm
  JOIN clinics c ON c.id = cm.clinic_id
  WHERE cm.invite_token = p_token;
END;
$$;

GRANT EXECUTE ON FUNCTION get_invite_by_token(UUID) TO anon, authenticated;


-- ─────────────────────────────────────────────────────────────
-- 5. RPC: accept_member_invite
-- Autenticado: vincula auth.uid() a la invitación.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION accept_member_invite(p_token UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite     clinic_members%ROWTYPE;
  v_user_email TEXT;
BEGIN
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();

  SELECT * INTO v_invite
  FROM clinic_members
  WHERE invite_token = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_token: invitación no encontrada o ya fue usada';
  END IF;

  -- Idempotente: ya fue aceptada por este usuario
  IF v_invite.status = 'active' AND v_invite.user_id = auth.uid() THEN
    RETURN TRUE;
  END IF;

  IF v_invite.status = 'active' THEN
    RAISE EXCEPTION 'already_used: la invitación ya fue aceptada';
  END IF;

  IF LOWER(v_invite.email) <> LOWER(v_user_email) THEN
    RAISE EXCEPTION 'email_mismatch: esta invitación es para otro correo';
  END IF;

  UPDATE clinic_members
  SET user_id      = auth.uid(),
      status       = 'active',
      invite_token = NULL
  WHERE id = v_invite.id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION accept_member_invite(UUID) TO authenticated;


-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN:
-- SELECT invite_token, email, role, status FROM clinic_members;
-- Debe mostrar invite_token no nulo para las filas con status='invited'.
-- ─────────────────────────────────────────────────────────────
