-- ============================================================
-- CLINIQ — Demo Seed (datos para video / presentación)
-- ============================================================
-- Agrega 15 pacientes nuevos + ~60 turnos distribuidos en
-- las últimas 8 semanas, esta semana y las próximas 2 semanas.
-- Todos los estados representados: new, pending, confirmed,
-- rescheduled, cancelled.
--
-- CÓMO USAR:
--   1. Ejecutar en Supabase SQL Editor
--   2. Reemplazar CLINIC_NAME si tu clínica tiene otro nombre
-- ============================================================

DO $$
DECLARE
  v_clinic_id UUID;
BEGIN

  -- ── 0. Obtener el clinic_id de la clínica existente ──────────
  SELECT id INTO v_clinic_id
  FROM clinics
  ORDER BY created_at
  LIMIT 1;

  IF v_clinic_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró ninguna clínica. Ejecutá el seed.sql primero.';
  END IF;

  RAISE NOTICE 'Usando clinic_id: %', v_clinic_id;

  -- ── 1. Insertar pacientes nuevos (ON CONFLICT = skip duplicados) ─
  INSERT INTO patients (clinic_id, full_name, phone_number, email, notes) VALUES
    (v_clinic_id, 'Valentina Suárez',   '+59891200001', 'vsuarez@gmail.com',    'Paciente con brackets'),
    (v_clinic_id, 'Nicolás Herrera',    '+59891200002', null,                   null),
    (v_clinic_id, 'Florencia Morales',  '+59891200003', 'fmorales@hotmail.com', 'Sensibilidad en muela del juicio'),
    (v_clinic_id, 'Sebastián Giménez',  '+59891200004', null,                   'Alérgico a penicilina'),
    (v_clinic_id, 'Isadora Barrios',    '+59891200005', null,                   null),
    (v_clinic_id, 'Tomás Ríos',         '+59891200006', 'trios@gmail.com',      null),
    (v_clinic_id, 'Natalia Vázquez',    '+59891200007', null,                   'Paciente nueva referida por Camila Álvarez'),
    (v_clinic_id, 'Emilio Perdomo',     '+59891200008', null,                   null),
    (v_clinic_id, 'Sofía Acosta',       '+59891200009', 'sacosta@gmail.com',    null),
    (v_clinic_id, 'Mauricio Sosa',      '+59891200010', null,                   'Requiere sedación leve'),
    (v_clinic_id, 'Alejandra Benítez',  '+59891200011', null,                   null),
    (v_clinic_id, 'Rodrigo Cabrera',    '+59891200012', 'rcabrera@outlook.com', null),
    (v_clinic_id, 'Paula Ibáñez',       '+59891200013', null,                   'Embarazada — evitar rayos X'),
    (v_clinic_id, 'Gonzalo Techera',    '+59891200014', null,                   null),
    (v_clinic_id, 'Romina Díaz',        '+59891200015', 'rdiaz@gmail.com',      null)
  ON CONFLICT (clinic_id, phone_number) DO NOTHING;

  -- ── 2. Insertar turnos ────────────────────────────────────────
  -- Nota de timezone: Montevideo = UTC-3, entonces:
  --   hora local 09:00 → UTC 12:00  (+3h)
  --   hora local 17:30 → UTC 20:30  (+3h)
  -- Usamos CURRENT_DATE como ancla para que los datos siempre
  -- sean relativos a la fecha en que se ejecuta el seed.

  INSERT INTO appointments (
    clinic_id, patient_id, appointment_datetime,
    status, professional_name, appointment_type, notes,
    reminder_sent_at, confirmed_at
  )

  SELECT
    v_clinic_id,
    p.id,
    t.appt_dt,
    t.status::appointment_status,
    t.professional,
    t.appt_type,
    t.notes,
    t.reminder_sent_at,
    CASE WHEN t.status = 'confirmed' THEN t.appt_dt - INTERVAL '1 day' ELSE NULL END
  FROM (VALUES

    -- ══════════════════════════════════════════════
    -- HACE 8 SEMANAS (historial antiguo)
    -- ══════════════════════════════════════════════
    ('Valentina Suárez',  CURRENT_DATE - 56 + TIME '12:00', 'confirmed',   'Dr. Bonomi',  'Ortodoncia',      null,                                         NOW()-'57 days'::interval),
    ('Nicolás Herrera',   CURRENT_DATE - 55 + TIME '13:30', 'cancelled',   'Dra. Silva',  'Limpieza',        'No se presentó',                             null),
    ('Florencia Morales', CURRENT_DATE - 54 + TIME '15:00', 'confirmed',   'Dr. García',  'Control',         null,                                         NOW()-'55 days'::interval),
    ('Sebastián Giménez', CURRENT_DATE - 53 + TIME '09:30', 'confirmed',   'Dr. Bonomi',  'Endodoncia',      null,                                         NOW()-'54 days'::interval),
    ('Isadora Barrios',   CURRENT_DATE - 52 + TIME '11:00', 'cancelled',   'Dra. Silva',  'Primera visita',  'Canceló por enfermedad',                     null),
    ('Tomás Ríos',        CURRENT_DATE - 51 + TIME '16:00', 'confirmed',   'Dr. Bonomi',  'Extracción',      null,                                         NOW()-'52 days'::interval),

    -- ══════════════════════════════════════════════
    -- HACE 6 SEMANAS
    -- ══════════════════════════════════════════════
    ('Natalia Vázquez',   CURRENT_DATE - 42 + TIME '10:00', 'confirmed',   'Dra. Silva',  'Primera visita',  null,                                         NOW()-'43 days'::interval),
    ('Emilio Perdomo',    CURRENT_DATE - 41 + TIME '14:30', 'confirmed',   'Dr. García',  'Blanqueamiento',  null,                                         NOW()-'42 days'::interval),
    ('Sofía Acosta',      CURRENT_DATE - 40 + TIME '09:00', 'cancelled',   'Dr. Bonomi',  'Control',         'Reagendó para semana siguiente',             null),
    ('Mauricio Sosa',     CURRENT_DATE - 39 + TIME '11:30', 'confirmed',   'Dra. Silva',  'Limpieza',        null,                                         NOW()-'40 days'::interval),
    ('Alejandra Benítez', CURRENT_DATE - 38 + TIME '16:30', 'confirmed',   'Dr. Bonomi',  'Implante',        null,                                         NOW()-'39 days'::interval),
    ('Camila Álvarez',    CURRENT_DATE - 37 + TIME '13:00', 'confirmed',   'Dr. García',  'Ortodoncia',      null,                                         NOW()-'38 days'::interval),

    -- ══════════════════════════════════════════════
    -- HACE 4 SEMANAS
    -- ══════════════════════════════════════════════
    ('Rodrigo Cabrera',   CURRENT_DATE - 28 + TIME '09:30', 'confirmed',   'Dr. Bonomi',  'Radiografía',     null,                                         NOW()-'29 days'::interval),
    ('Paula Ibáñez',      CURRENT_DATE - 27 + TIME '10:30', 'confirmed',   'Dra. Silva',  'Control',         'Segundo trimestre embarazo',                 NOW()-'28 days'::interval),
    ('Gonzalo Techera',   CURRENT_DATE - 26 + TIME '15:30', 'cancelled',   'Dr. García',  'Limpieza',        null,                                         null),
    ('Romina Díaz',       CURRENT_DATE - 25 + TIME '12:00', 'confirmed',   'Dr. Bonomi',  'Primera visita',  null,                                         NOW()-'26 days'::interval),
    ('Martín Pérez',      CURRENT_DATE - 24 + TIME '14:00', 'confirmed',   'Dra. Silva',  'Ortodoncia',      null,                                         NOW()-'25 days'::interval),
    ('Lucía Fernández',   CURRENT_DATE - 23 + TIME '11:00', 'confirmed',   'Dr. Bonomi',  'Endodoncia',      null,                                         NOW()-'24 days'::interval),
    ('Roberto Castro',    CURRENT_DATE - 22 + TIME '09:00', 'rescheduled', 'Dr. García',  'Control',         'Pidió pasar al lunes siguiente',             NOW()-'23 days'::interval),

    -- ══════════════════════════════════════════════
    -- HACE 2 SEMANAS
    -- ══════════════════════════════════════════════
    ('Ana Rodríguez',     CURRENT_DATE - 14 + TIME '10:00', 'confirmed',   'Dra. Silva',  'Primera visita',  null,                                         NOW()-'15 days'::interval),
    ('Diego Méndez',      CURRENT_DATE - 13 + TIME '13:30', 'confirmed',   'Dr. Bonomi',  'Blanqueamiento',  null,                                         NOW()-'14 days'::interval),
    ('Valentina Suárez',  CURRENT_DATE - 12 + TIME '09:00', 'confirmed',   'Dr. Bonomi',  'Ortodoncia',      'Control brackets semana 8',                  NOW()-'13 days'::interval),
    ('Florencia Morales', CURRENT_DATE - 11 + TIME '15:00', 'cancelled',   'Dr. García',  'Extracción',      'No llegó. Reagendar.',                       NOW()-'12 days'::interval),
    ('Isadora Barrios',   CURRENT_DATE - 10 + TIME '11:30', 'confirmed',   'Dra. Silva',  'Primera visita',  null,                                         NOW()-'11 days'::interval),
    ('Nicolás Herrera',   CURRENT_DATE - 9  + TIME '14:00', 'confirmed',   'Dr. Bonomi',  'Limpieza',        null,                                         NOW()-'10 days'::interval),

    -- ══════════════════════════════════════════════
    -- SEMANA PASADA (lunes a viernes aprox.)
    -- ══════════════════════════════════════════════
    ('Sebastián Giménez', CURRENT_DATE - 7 + TIME '09:30',  'confirmed',   'Dr. Bonomi',  'Control post-endo', null,                                       NOW()-'8 days'::interval),
    ('Sofía Acosta',      CURRENT_DATE - 6 + TIME '11:00',  'confirmed',   'Dr. García',  'Control',         null,                                         NOW()-'7 days'::interval),
    ('Emilio Perdomo',    CURRENT_DATE - 5 + TIME '16:00',  'confirmed',   'Dra. Silva',  'Blanqueamiento',  'Sesión 2 de 3',                              NOW()-'6 days'::interval),
    ('Tomás Ríos',        CURRENT_DATE - 4 + TIME '12:30',  'confirmed',   'Dr. Bonomi',  'Extracción',      null,                                         NOW()-'5 days'::interval),
    ('Natalia Vázquez',   CURRENT_DATE - 3 + TIME '10:00',  'confirmed',   'Dra. Silva',  'Ortodoncia',      null,                                         NOW()-'4 days'::interval),
    ('Mauricio Sosa',     CURRENT_DATE - 2 + TIME '14:30',  'cancelled',   'Dr. García',  'Control',         null,                                         null),

    -- ══════════════════════════════════════════════
    -- AYER
    -- ══════════════════════════════════════════════
    ('Alejandra Benítez', CURRENT_DATE - 1 + TIME '09:00',  'confirmed',   'Dr. Bonomi',  'Implante',        'Segunda etapa',                              NOW()-'2 days'::interval),
    ('Rodrigo Cabrera',   CURRENT_DATE - 1 + TIME '10:30',  'confirmed',   'Dra. Silva',  'Control',         null,                                         NOW()-'2 days'::interval),
    ('Paula Ibáñez',      CURRENT_DATE - 1 + TIME '12:00',  'confirmed',   'Dr. García',  'Radiografía',     null,                                         NOW()-'2 days'::interval),
    ('Gonzalo Techera',   CURRENT_DATE - 1 + TIME '15:00',  'confirmed',   'Dr. Bonomi',  'Limpieza',        null,                                         NOW()-'2 days'::interval),
    ('Romina Díaz',       CURRENT_DATE - 1 + TIME '16:30',  'cancelled',   'Dra. Silva',  'Control',         'Avisó tarde que no venía',                   null),

    -- ══════════════════════════════════════════════
    -- HOY (distintos estados para el dashboard en vivo)
    -- ══════════════════════════════════════════════
    ('Camila Álvarez',    CURRENT_DATE + TIME '12:00',       'confirmed',   'Dr. Bonomi',  'Control',         null,                                         NOW()-'1 hour'::interval),
    ('Martín Pérez',      CURRENT_DATE + TIME '12:30',       'confirmed',   'Dra. Silva',  'Limpieza',        null,                                         NOW()-'45 mins'::interval),
    ('Lucía Fernández',   CURRENT_DATE + TIME '13:00',       'pending',     'Dr. Bonomi',  'Ortodoncia',      null,                                         NOW()-'30 mins'::interval),
    ('Roberto Castro',    CURRENT_DATE + TIME '13:30',       'confirmed',   'Dr. García',  'Endodoncia',      null,                                         NOW()-'1 hour'::interval),
    ('Ana Rodríguez',     CURRENT_DATE + TIME '14:00',       'new',         'Dra. Silva',  'Primera visita',  null,                                         null),
    ('Diego Méndez',      CURRENT_DATE + TIME '14:30',       'rescheduled', 'Dr. Bonomi',  'Control',         'Quiere pasar a la tarde',                    NOW()-'2 hours'::interval),
    ('Valentina Suárez',  CURRENT_DATE + TIME '15:00',       'confirmed',   'Dr. Bonomi',  'Ortodoncia',      'Control brackets semana 12',                 NOW()-'1 hour'::interval),
    ('Nicolás Herrera',   CURRENT_DATE + TIME '15:30',       'pending',     'Dr. García',  'Control',         null,                                         NOW()-'20 mins'::interval),
    ('Florencia Morales', CURRENT_DATE + TIME '16:00',       'confirmed',   'Dra. Silva',  'Extracción',      null,                                         NOW()-'2 hours'::interval),
    ('Isadora Barrios',   CURRENT_DATE + TIME '16:30',       'new',         'Dr. Bonomi',  'Limpieza',        null,                                         null),
    ('Tomás Ríos',        CURRENT_DATE + TIME '17:00',       'confirmed',   'Dr. García',  'Control',         null,                                         NOW()-'30 mins'::interval),
    ('Natalia Vázquez',   CURRENT_DATE + TIME '17:30',       'cancelled',   'Dra. Silva',  'Blanqueamiento',  'Canceló en el día',                          null),

    -- ══════════════════════════════════════════════
    -- MAÑANA
    -- ══════════════════════════════════════════════
    ('Sebastián Giménez', CURRENT_DATE + 1 + TIME '09:30',   'confirmed',   'Dr. Bonomi',  'Control',         null,                                         NOW()),
    ('Sofía Acosta',      CURRENT_DATE + 1 + TIME '10:00',   'new',         'Dra. Silva',  'Control',         null,                                         null),
    ('Emilio Perdomo',    CURRENT_DATE + 1 + TIME '11:00',   'confirmed',   'Dr. García',  'Blanqueamiento',  'Sesión 3 de 3',                              NOW()),
    ('Mauricio Sosa',     CURRENT_DATE + 1 + TIME '12:30',   'pending',     'Dr. Bonomi',  'Implante',        null,                                         NOW()),
    ('Alejandra Benítez', CURRENT_DATE + 1 + TIME '14:00',   'new',         'Dr. Bonomi',  'Control post-implante', null,                                  null),
    ('Rodrigo Cabrera',   CURRENT_DATE + 1 + TIME '15:30',   'confirmed',   'Dra. Silva',  'Radiografía',     null,                                         NOW()),

    -- ══════════════════════════════════════════════
    -- PRÓXIMA SEMANA
    -- ══════════════════════════════════════════════
    ('Paula Ibáñez',      CURRENT_DATE + 7 + TIME '09:00',   'new',         'Dr. García',  'Control',         null,                                         null),
    ('Gonzalo Techera',   CURRENT_DATE + 7 + TIME '10:30',   'new',         'Dr. Bonomi',  'Limpieza',        null,                                         null),
    ('Romina Díaz',       CURRENT_DATE + 8 + TIME '11:00',   'confirmed',   'Dra. Silva',  'Control',         null,                                         NOW()),
    ('Camila Álvarez',    CURRENT_DATE + 8 + TIME '12:00',   'new',         'Dr. Bonomi',  'Ortodoncia',      'Control brackets semana 16',                 null),
    ('Martín Pérez',      CURRENT_DATE + 9 + TIME '09:30',   'pending',     'Dra. Silva',  'Limpieza',        null,                                         NOW()),
    ('Lucía Fernández',   CURRENT_DATE + 9 + TIME '14:00',   'new',         'Dr. Bonomi',  'Endodoncia',      'Seguimiento canal',                          null),
    ('Roberto Castro',    CURRENT_DATE +10 + TIME '10:00',   'confirmed',   'Dr. García',  'Control',         null,                                         NOW()),
    ('Ana Rodríguez',     CURRENT_DATE +10 + TIME '11:30',   'new',         'Dra. Silva',  'Control',         null,                                         null),
    ('Diego Méndez',      CURRENT_DATE +11 + TIME '09:00',   'new',         'Dr. Bonomi',  'Blanqueamiento',  null,                                         null),
    ('Valentina Suárez',  CURRENT_DATE +11 + TIME '15:00',   'confirmed',   'Dr. Bonomi',  'Ortodoncia',      'Control brackets semana 20',                 NOW()),

    -- ══════════════════════════════════════════════
    -- EN DOS SEMANAS
    -- ══════════════════════════════════════════════
    ('Nicolás Herrera',   CURRENT_DATE +14 + TIME '10:00',   'new',         'Dr. García',  'Implante consulta', null,                                      null),
    ('Florencia Morales', CURRENT_DATE +14 + TIME '11:30',   'new',         'Dr. Bonomi',  'Extracción',      null,                                         null),
    ('Isadora Barrios',   CURRENT_DATE +15 + TIME '09:00',   'new',         'Dra. Silva',  'Control',         null,                                         null),
    ('Tomás Ríos',        CURRENT_DATE +15 + TIME '14:30',   'new',         'Dr. García',  'Control post-extracción', null,                                null)

  ) AS t(full_name, appt_dt, status, professional, appt_type, notes, reminder_sent_at)

  JOIN patients p
    ON p.full_name = t.full_name
   AND p.clinic_id = v_clinic_id

  ON CONFLICT (clinic_id, patient_id, appointment_datetime) DO NOTHING;

  -- ── 3. Resumen ─────────────────────────────────────────────────
  RAISE NOTICE '✅ Seed completado para clinic_id: %', v_clinic_id;
  RAISE NOTICE '   Pacientes totales: %', (SELECT COUNT(*) FROM patients WHERE clinic_id = v_clinic_id);
  RAISE NOTICE '   Turnos totales:    %', (SELECT COUNT(*) FROM appointments WHERE clinic_id = v_clinic_id);
  RAISE NOTICE '   → confirmed:  %', (SELECT COUNT(*) FROM appointments WHERE clinic_id = v_clinic_id AND status = 'confirmed');
  RAISE NOTICE '   → pending:    %', (SELECT COUNT(*) FROM appointments WHERE clinic_id = v_clinic_id AND status = 'pending');
  RAISE NOTICE '   → new:        %', (SELECT COUNT(*) FROM appointments WHERE clinic_id = v_clinic_id AND status = 'new');
  RAISE NOTICE '   → rescheduled:%', (SELECT COUNT(*) FROM appointments WHERE clinic_id = v_clinic_id AND status = 'rescheduled');
  RAISE NOTICE '   → cancelled:  %', (SELECT COUNT(*) FROM appointments WHERE clinic_id = v_clinic_id AND status = 'cancelled');

END $$;
