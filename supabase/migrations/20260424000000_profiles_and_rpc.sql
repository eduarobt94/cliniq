-- ============================================================
-- CLINIQ — Profiles table + Atomic clinic creation RPC
-- PostgreSQL 15 / Supabase — Version 2.1.0
-- ============================================================
-- Idempotente: usa DROP IF EXISTS + CREATE OR REPLACE.
-- Seguro de ejecutar sobre una base limpia o con objetos previos.
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- 0. LIMPIEZA
-- ─────────────────────────────────────────────────────────────

DROP TRIGGER  IF EXISTS trg_create_profile_on_signup ON auth.users;
DROP FUNCTION IF EXISTS fn_create_profile_on_signup() CASCADE;
DROP FUNCTION IF EXISTS create_clinic_with_owner(TEXT, TEXT, TEXT) CASCADE;
DROP TABLE    IF EXISTS profiles CASCADE;


-- ─────────────────────────────────────────────────────────────
-- 1. TABLA: profiles
-- ─────────────────────────────────────────────────────────────
-- Almacena nombre y apellido de cada usuario.
-- El trigger fn_create_profile_on_signup lo crea automáticamente
-- al registrarse, leyendo user_metadata del signUp.

CREATE TABLE profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT        NOT NULL DEFAULT '',
  last_name  TEXT        NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────
-- 2. ÍNDICE
-- ─────────────────────────────────────────────────────────────

CREATE INDEX idx_profiles_id ON profiles(id);


-- ─────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Cada usuario lee/escribe su propio perfil
CREATE POLICY "profiles: read own"
  ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR id IN (
      SELECT cm.user_id
      FROM   clinic_members cm
      WHERE  cm.clinic_id IN (SELECT fn_user_clinic_ids())
        AND  cm.status = 'active'
        AND  cm.user_id IS NOT NULL
    )
  );

CREATE POLICY "profiles: update own"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Los triggers SECURITY DEFINER necesitan INSERT sin RLS
CREATE POLICY "profiles: insert via trigger"
  ON profiles FOR INSERT
  WITH CHECK (true);


-- ─────────────────────────────────────────────────────────────
-- 4. TRIGGER: auto-crear perfil al registrarse
-- ─────────────────────────────────────────────────────────────
-- Lee first_name y last_name desde raw_user_meta_data,
-- que se populan en supabase.auth.signUp({ options: { data: {...} } }).

CREATE OR REPLACE FUNCTION fn_create_profile_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name',  '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_profile_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_create_profile_on_signup();


-- ─────────────────────────────────────────────────────────────
-- 5. RPC: create_clinic_with_owner
-- ─────────────────────────────────────────────────────────────
-- Creación atómica: upsert perfil + INSERT clínica.
-- El trigger trg_clinics_add_owner agrega automáticamente al
-- owner en clinic_members después del INSERT en clinics.
-- Llamar con: supabase.rpc('create_clinic_with_owner', { clinic_name, p_first_name, p_last_name })

CREATE OR REPLACE FUNCTION create_clinic_with_owner(
  clinic_name  TEXT,
  p_first_name TEXT DEFAULT '',
  p_last_name  TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinic_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado: se requiere sesión activa.';
  END IF;

  -- Upsert perfil con los nombres
  INSERT INTO profiles (id, first_name, last_name)
  VALUES (auth.uid(), p_first_name, p_last_name)
  ON CONFLICT (id) DO UPDATE
    SET first_name = EXCLUDED.first_name,
        last_name  = EXCLUDED.last_name;

  -- Crear clínica (el trigger trg_clinics_add_owner agrega al owner en clinic_members)
  INSERT INTO clinics (owner_id, name, timezone)
  VALUES (auth.uid(), clinic_name, 'America/Montevideo')
  RETURNING id INTO v_clinic_id;

  RETURN v_clinic_id;
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- 6. MIGRAR USUARIOS EXISTENTES → crear perfil vacío
-- ─────────────────────────────────────────────────────────────

INSERT INTO profiles (id, first_name, last_name)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'first_name', ''),
  COALESCE(raw_user_meta_data->>'last_name',  '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- VERIFICACIÓN — ejecutar después del Run para confirmar:
-- ─────────────────────────────────────────────────────────────
--
-- SELECT p.first_name, p.last_name, au.email
-- FROM   profiles p
-- JOIN   auth.users au ON au.id = p.id;
--
-- Resultado esperado: al menos 1 fila con email = maria@bonomi.uy
-- ─────────────────────────────────────────────────────────────
