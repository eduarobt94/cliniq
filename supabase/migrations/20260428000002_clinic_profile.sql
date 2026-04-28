-- ============================================================
-- CLINIQ — Clinic profile fields + settings JSONB
-- PostgreSQL 15 / Supabase
-- Date: 2026-04-28
-- ============================================================

-- Add profile and settings columns to clinics table
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS email_contact TEXT,
  ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trg_clinics_updated_at ON clinics;
CREATE TRIGGER trg_clinics_updated_at
  BEFORE UPDATE ON clinics
  FOR EACH ROW
  EXECUTE FUNCTION fn_set_updated_at();

-- RLS policy: allow clinic owners (via clinic_members) to update
DROP POLICY IF EXISTS "clinics: update as member owner" ON clinics;
CREATE POLICY "clinics: update as member owner"
  ON clinics FOR UPDATE
  USING (
    id IN (
      SELECT clinic_id FROM clinic_members
      WHERE user_id = auth.uid() AND role = 'owner' AND status = 'active'
    )
  );
