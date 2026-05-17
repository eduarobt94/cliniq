-- ============================================================
-- CLINIQ — Clinic Schedule & Closures
-- Run ONCE in Supabase SQL Editor. Never re-run.
-- ============================================================

-- ── clinic_schedule: weekly working hours per day ─────────────
CREATE TABLE IF NOT EXISTS public.clinic_schedule (
  id           uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id    uuid    NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  day_of_week  smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun … 6=Sat
  is_open      boolean NOT NULL DEFAULT true,
  open_time    time    NOT NULL DEFAULT '09:00',
  close_time   time    NOT NULL DEFAULT '18:00',
  UNIQUE (clinic_id, day_of_week)
);

-- ── clinic_closures: specific date overrides ──────────────────
CREATE TABLE IF NOT EXISTS public.clinic_closures (
  id                    uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id             uuid        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  date                  date        NOT NULL,
  reason                text        NOT NULL DEFAULT 'other'
    CHECK (reason IN ('holiday','vacation','repair','remodeling','emergency_close','other')),
  reason_label          text,
  accepts_emergencies   boolean     NOT NULL DEFAULT false,
  notify_patients       boolean     NOT NULL DEFAULT false,
  notification_sent_at  timestamptz,
  created_at            timestamptz DEFAULT now(),
  UNIQUE (clinic_id, date)
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clinic_schedule_clinic
  ON public.clinic_schedule(clinic_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_clinic_closures_clinic_date
  ON public.clinic_closures(clinic_id, date);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE public.clinic_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_closures  ENABLE ROW LEVEL SECURITY;

-- clinic_schedule: any member can read, only owner can write
DROP POLICY IF EXISTS "clinic_schedule_select" ON public.clinic_schedule;
DROP POLICY IF EXISTS "clinic_schedule_insert" ON public.clinic_schedule;
DROP POLICY IF EXISTS "clinic_schedule_update" ON public.clinic_schedule;
DROP POLICY IF EXISTS "clinic_schedule_delete" ON public.clinic_schedule;
DROP POLICY IF EXISTS "clinic_closures_select" ON public.clinic_closures;
DROP POLICY IF EXISTS "clinic_closures_insert" ON public.clinic_closures;
DROP POLICY IF EXISTS "clinic_closures_update" ON public.clinic_closures;
DROP POLICY IF EXISTS "clinic_closures_delete" ON public.clinic_closures;

CREATE POLICY "clinic_schedule_select" ON public.clinic_schedule
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clinic_members
      WHERE clinic_id = clinic_schedule.clinic_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "clinic_schedule_insert" ON public.clinic_schedule
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinics
      WHERE id = clinic_schedule.clinic_id
        AND owner_id = auth.uid()
    )
  );

CREATE POLICY "clinic_schedule_update" ON public.clinic_schedule
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.clinics
      WHERE id = clinic_schedule.clinic_id
        AND owner_id = auth.uid()
    )
  );

CREATE POLICY "clinic_schedule_delete" ON public.clinic_schedule
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.clinics
      WHERE id = clinic_schedule.clinic_id
        AND owner_id = auth.uid()
    )
  );

-- clinic_closures: same pattern
CREATE POLICY "clinic_closures_select" ON public.clinic_closures
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clinic_members
      WHERE clinic_id = clinic_closures.clinic_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

CREATE POLICY "clinic_closures_insert" ON public.clinic_closures
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinics
      WHERE id = clinic_closures.clinic_id
        AND owner_id = auth.uid()
    )
  );

CREATE POLICY "clinic_closures_update" ON public.clinic_closures
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.clinics
      WHERE id = clinic_closures.clinic_id
        AND owner_id = auth.uid()
    )
  );

CREATE POLICY "clinic_closures_delete" ON public.clinic_closures
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.clinics
      WHERE id = clinic_closures.clinic_id
        AND owner_id = auth.uid()
    )
  );
