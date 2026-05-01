-- ============================================================
-- CLINIQ — Seed histórico 2 años (2024 + 2025)
-- ============================================================
-- Genera ~305 turnos distribuidos en todos los meses de 2024
-- y 2025 con una curva de crecimiento realista:
--
--   2024 Q1: ~21  turnos  (clínica arrancando)
--   2024 Q2: ~27  turnos
--   2024 Q3: ~32  turnos
--   2024 Q4: ~34  turnos   → 114 total 2024
--
--   2025 Q1: ~38  turnos
--   2025 Q2: ~48  turnos
--   2025 Q3: ~52  turnos
--   2025 Q4: ~53  turnos   → 191 total 2025
--
-- Se complementa con demo_seed.sql (marzo–mayo 2026).
-- Idempotente: ON CONFLICT DO NOTHING.
-- ============================================================

DO $$
DECLARE
  v_clinic_id   UUID;
  v_patient_ids UUID[];
  v_pat_count   INT;

  v_profs   TEXT[] := ARRAY['Dr. Bonomi', 'Dra. Silva', 'Dr. García'];
  v_types   TEXT[] := ARRAY[
    'Control', 'Limpieza', 'Ortodoncia', 'Endodoncia',
    'Primera visita', 'Blanqueamiento', 'Extracción',
    'Implante', 'Radiografía', 'Prótesis'
  ];

  -- Distribución de estados para turnos pasados:
  -- 67 % confirmed · 22 % cancelled · 11 % rescheduled
  v_statuses TEXT[] := ARRAY[
    'confirmed',   'confirmed',   'confirmed',
    'confirmed',   'confirmed',   'confirmed',
    'cancelled',   'cancelled',
    'rescheduled'
  ];

  -- Conteo por mes: 24 posiciones → ene-2024 … dic-2025
  -- Cada grupo de 12 es un año calendario
  v_counts INT[] := ARRAY[
  --  E   F   M   A   M   J   J   A   S   O   N   D
      7,  6,  8,  9,  8, 10, 11,  9, 12, 11, 13, 10,  -- 2024 = 114
     11, 13, 14, 15, 16, 17, 15, 18, 19, 17, 20, 16   -- 2025 = 191
  ];

  v_year    INT;
  v_month   INT;
  v_day     INT;
  v_hour    INT;
  v_appt_dt TIMESTAMPTZ;
  v_status  TEXT;

  v_m_idx   INT;
  v_n       INT;
  v_i       INT;
  v_counter INT := 0;  -- global, controla el ciclo de paciente/prof/tipo/hora/status
  v_ok      INT := 0;
  v_skip    INT := 0;

BEGIN
  -- ── 0. Buscar clínica ─────────────────────────────────────────
  SELECT id INTO v_clinic_id
  FROM clinics ORDER BY created_at LIMIT 1;

  IF v_clinic_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró ninguna clínica. Ejecutá seed.sql primero.';
  END IF;

  -- ── 1. Cargar IDs de pacientes ────────────────────────────────
  SELECT ARRAY_AGG(id ORDER BY created_at)
    INTO v_patient_ids
  FROM patients
  WHERE clinic_id = v_clinic_id;

  v_pat_count := COALESCE(array_length(v_patient_ids, 1), 0);

  IF v_pat_count = 0 THEN
    RAISE EXCEPTION 'No hay pacientes. Ejecutá demo_seed.sql primero.';
  END IF;

  RAISE NOTICE 'Clinic: % | Pacientes disponibles: %', v_clinic_id, v_pat_count;

  -- ── 2. Generar turnos por mes ─────────────────────────────────
  -- Mes 1–12 = 2024, mes 13–24 = 2025
  FOR v_m_idx IN 1..24 LOOP
    v_year  := CASE WHEN v_m_idx <= 12 THEN 2024 ELSE 2025 END;
    v_month := CASE WHEN v_m_idx <= 12 THEN v_m_idx ELSE v_m_idx - 12 END;
    v_n     := v_counts[v_m_idx];

    FOR v_i IN 1..v_n LOOP
      v_counter := v_counter + 1;

      -- Día: escalonado para llenar el mes sin repetir (rango 1–27, seguro para feb)
      --   i=1→3, i=2→6, i=3→9 … i=9→27, i=10→3 (distinto paciente)
      v_day  := 1 + ((v_i * 3 - 1) % 27);

      -- Hora local: cicla 09:00–17:00 (9 franjas)
      -- Guardamos en UTC → local + 3 h (Montevideo = UTC-3)
      v_hour := 9 + ((v_counter - 1) % 9);   -- 9..17 local → 12..20 UTC

      v_appt_dt := MAKE_TIMESTAMP(v_year, v_month, v_day, v_hour + 3, 0, 0)
                   AT TIME ZONE 'UTC';

      -- Estado: cicla sobre el arreglo de 9 elementos definido arriba
      v_status := v_statuses[((v_counter - 1) % 9) + 1];

      INSERT INTO appointments (
        clinic_id,
        patient_id,
        appointment_datetime,
        status,
        professional_name,
        appointment_type,
        reminder_sent_at,
        confirmed_at
      )
      VALUES (
        v_clinic_id,
        v_patient_ids[((v_counter - 1) % v_pat_count) + 1],
        v_appt_dt,
        v_status::appointment_status,
        v_profs   [((v_counter - 1) % 3)  + 1],
        v_types   [((v_counter - 1) % 10) + 1],

        -- reminder_sent_at: 2 días antes para todos los pasados
        v_appt_dt - INTERVAL '2 days',

        -- confirmed_at: solo si status = confirmed
        CASE WHEN v_status = 'confirmed'
             THEN v_appt_dt - INTERVAL '1 day'
             ELSE NULL END
      )
      ON CONFLICT (clinic_id, patient_id, appointment_datetime) DO NOTHING;

      IF FOUND THEN
        v_ok := v_ok + 1;
      ELSE
        v_skip := v_skip + 1;
      END IF;

    END LOOP;
  END LOOP;

  -- ── 3. Resumen ─────────────────────────────────────────────────
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════';
  RAISE NOTICE '  Seed 2 años completado';
  RAISE NOTICE '  Insertados : %  |  Ya existían : %', v_ok, v_skip;
  RAISE NOTICE '══════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '  Turnos por año:';
  RAISE NOTICE '  2024 → %', (
    SELECT COUNT(*) FROM appointments
    WHERE clinic_id = v_clinic_id
      AND appointment_datetime >= '2024-01-01'
      AND appointment_datetime <  '2025-01-01'
  );
  RAISE NOTICE '  2025 → %', (
    SELECT COUNT(*) FROM appointments
    WHERE clinic_id = v_clinic_id
      AND appointment_datetime >= '2025-01-01'
      AND appointment_datetime <  '2026-01-01'
  );
  RAISE NOTICE '  2026 → %', (
    SELECT COUNT(*) FROM appointments
    WHERE clinic_id = v_clinic_id
      AND appointment_datetime >= '2026-01-01'
  );
  RAISE NOTICE '';
  RAISE NOTICE '  Por estado (todo el historial):';
  RAISE NOTICE '  confirmed   → %', (SELECT COUNT(*) FROM appointments WHERE clinic_id = v_clinic_id AND status = 'confirmed');
  RAISE NOTICE '  cancelled   → %', (SELECT COUNT(*) FROM appointments WHERE clinic_id = v_clinic_id AND status = 'cancelled');
  RAISE NOTICE '  rescheduled → %', (SELECT COUNT(*) FROM appointments WHERE clinic_id = v_clinic_id AND status = 'rescheduled');
  RAISE NOTICE '  pending     → %', (SELECT COUNT(*) FROM appointments WHERE clinic_id = v_clinic_id AND status = 'pending');
  RAISE NOTICE '  new         → %', (SELECT COUNT(*) FROM appointments WHERE clinic_id = v_clinic_id AND status = 'new');
  RAISE NOTICE '  TOTAL       → %', (SELECT COUNT(*) FROM appointments WHERE clinic_id = v_clinic_id);

END $$;
