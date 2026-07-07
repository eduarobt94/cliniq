-- ═══════════════════════════════════════════════════════════════════════════════
-- ALTO-6 (audit 2026-07-06): rate-limit por remitente para acotar costo de IA
--
-- El webhook dispara Whisper (transcripción) + Claude en cada mensaje inbound. Sin
-- límite, un solo número puede spamear y generar gasto ilimitado de OpenAI/Anthropic
-- + envíos de Meta. Esta función atómica cuenta mensajes por teléfono en una ventana
-- deslizante y el webhook la consulta ANTES de procesar (fail-open si el RPC falla).
--
-- Default: 12 mensajes / 60s por número (holgado para humanos, corta floods).
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ai_rate_limit (
  phone_number text        PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  count        int         NOT NULL DEFAULT 0
);

-- No exponer a clientes: solo el service_role (edge function) la usa. RLS on, sin políticas.
ALTER TABLE ai_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_phone          text,
  p_max            int DEFAULT 12,
  p_window_seconds int DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count int;
BEGIN
  INSERT INTO ai_rate_limit AS r (phone_number, window_start, count)
  VALUES (p_phone, now(), 1)
  ON CONFLICT (phone_number) DO UPDATE
    SET count = CASE
                  WHEN r.window_start < now() - make_interval(secs => p_window_seconds)
                  THEN 1
                  ELSE r.count + 1
                END,
        window_start = CASE
                  WHEN r.window_start < now() - make_interval(secs => p_window_seconds)
                  THEN now()
                  ELSE r.window_start
                END
  RETURNING count INTO v_new_count;

  RETURN v_new_count <= p_max;
END $$;
