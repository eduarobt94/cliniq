-- ─── clinic_services ──────────────────────────────────────────────────────────
-- Servicios/prestaciones que ofrece cada clínica.
-- Se usan en el formulario de nuevo turno y en el bot de WhatsApp.

CREATE TABLE IF NOT EXISTS public.clinic_services (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id        uuid        NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name             text        NOT NULL CHECK (char_length(trim(name)) > 0),
  duration_minutes integer     CHECK (duration_minutes > 0),
  price            numeric(10,2) CHECK (price >= 0),
  discount_type    text        CHECK (discount_type IN ('percent', 'fixed')),
  discount_value   numeric(10,2) CHECK (discount_value >= 0),
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Un servicio con descuento en % no puede superar 100
ALTER TABLE public.clinic_services
  ADD CONSTRAINT chk_discount_percent
    CHECK (discount_type <> 'percent' OR discount_value <= 100);

-- Índice para listar servicios de una clínica
CREATE INDEX IF NOT EXISTS idx_clinic_services_clinic
  ON public.clinic_services (clinic_id, is_active, created_at);

-- RLS
ALTER TABLE public.clinic_services ENABLE ROW LEVEL SECURITY;

-- Miembros de la clínica pueden leer
CREATE POLICY "clinic_services_select" ON public.clinic_services
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clinic_members cm
      WHERE cm.clinic_id = clinic_services.clinic_id
        AND cm.user_id   = auth.uid()
        AND cm.status    = 'active'
    )
  );

-- Solo owners pueden insertar/actualizar/eliminar
CREATE POLICY "clinic_services_insert" ON public.clinic_services
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinic_members cm
      WHERE cm.clinic_id = clinic_services.clinic_id
        AND cm.user_id   = auth.uid()
        AND cm.role      = 'owner'
        AND cm.status    = 'active'
    )
  );

CREATE POLICY "clinic_services_update" ON public.clinic_services
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.clinic_members cm
      WHERE cm.clinic_id = clinic_services.clinic_id
        AND cm.user_id   = auth.uid()
        AND cm.role      = 'owner'
        AND cm.status    = 'active'
    )
  );

CREATE POLICY "clinic_services_delete" ON public.clinic_services
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.clinic_members cm
      WHERE cm.clinic_id = clinic_services.clinic_id
        AND cm.user_id   = auth.uid()
        AND cm.role      = 'owner'
        AND cm.status    = 'active'
    )
  );
