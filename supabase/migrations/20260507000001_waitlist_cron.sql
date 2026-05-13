-- ═══════════════════════════════════════════════════════════════════════════════
-- CRON: notify-waitlist — notifica lista de espera al detectar citas canceladas
--
-- PREREQUISITO: ai_config debe tener 'supabase_url' y 'service_role_key'
--
--   INSERT INTO public.ai_config (key, value)
--   VALUES ('supabase_url', 'https://TUPROYECTO.supabase.co')
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
--
--   INSERT INTO public.ai_config (key, value)
--   VALUES ('service_role_key', 'eyJ...')
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Función wrapper (misma estructura que ai_followup_tick) ──────────────────
CREATE OR REPLACE FUNCTION public.notify_waitlist_tick()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url  text;
  v_key  text;
BEGIN
  SELECT value INTO v_url FROM public.ai_config WHERE key = 'supabase_url';
  SELECT value INTO v_key FROM public.ai_config WHERE key = 'service_role_key';

  IF v_url IS NULL OR v_url = '' THEN
    RAISE LOG '[notify_waitlist_tick] SKIP: supabase_url no configurada en ai_config';
    RETURN;
  END IF;

  IF v_key IS NULL OR v_key = '' THEN
    RAISE LOG '[notify_waitlist_tick] SKIP: service_role_key no configurada en ai_config';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_url || '/functions/v1/notify-waitlist',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body    := '{}'::jsonb
  );

  RAISE LOG '[notify_waitlist_tick] Invocada notify-waitlist';
END;
$$;

-- ─── Programar cada 5 minutos ─────────────────────────────────────────────────
SELECT cron.schedule(
  'notify-waitlist',
  '*/5 * * * *',
  'SELECT public.notify_waitlist_tick()'
);
