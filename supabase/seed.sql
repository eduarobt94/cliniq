-- ============================================================
-- CLINIQ — Seed de datos de prueba
-- ============================================================
--
-- IMPORTANTE: Este script se ejecuta DESPUÉS de crear el usuario
-- en Supabase Auth. El RLS requiere que el owner_id exista en
-- auth.users antes de insertar la clínica.
--
-- Antes de ejecutar:
--   1. Ir a Authentication → Users en el dashboard de Supabase
--   2. Crear el usuario (o usar uno existente)
--   3. Copiar el UUID del usuario
--   4. Reemplazar 'REEMPLAZAR-CON-UUID-DEL-USUARIO' con el UUID real
--   5. Ejecutar este script completo en el SQL Editor de Supabase
--
-- ============================================================

WITH

-- ── 1. Insertar clínica y capturar su ID ──────────────────────
clinic_insert AS (
  INSERT INTO clinics (owner_id, name, whatsapp_number, timezone)
  VALUES (
    '39235755-78e8-427b-9fae-76b80fb09ee5'::uuid,
    'Clínica Bonomi',
    '+59891634316',
    'America/Montevideo'
  )
  RETURNING id AS clinic_id
),

-- ── 2. Insertar pacientes referenciando la clínica insertada ──
patient_inserts AS (
  INSERT INTO patients (clinic_id, full_name, phone_number)
  SELECT
    c.clinic_id,
    p.full_name,
    p.phone_number
  FROM clinic_insert c
  CROSS JOIN (VALUES
    ('Camila Álvarez',   '+59891100001'),
    ('Martín Pérez',     '+59891100002'),
    ('Lucía Fernández',  '+59891100003'),
    ('Roberto Castro',   '+59891100004'),
    ('Ana Rodríguez',    '+59891100005'),
    ('Diego Méndez',     '+59891100006')
  ) AS p(full_name, phone_number)
  RETURNING id AS patient_id, full_name, clinic_id
),

-- ── 3. Insertar turnos para HOY con distintos status ──────────
-- Los horarios se expresan en UTC para la timezone America/Montevideo.
-- Montevideo es UTC-3 (sin DST en abril), por eso sumamos 3 horas
-- al convertir hora local → UTC:
--   09:00 local = 12:00 UTC  →  INTERVAL '12 hours'
--   09:30 local = 12:30 UTC  →  INTERVAL '12 hours 30 minutes'
--   ... etc.

appointment_inserts AS (
  INSERT INTO appointments (
    clinic_id,
    patient_id,
    appointment_datetime,
    status,
    professional_name,
    appointment_type
  )
  SELECT
    pi.clinic_id,
    pi.patient_id,
    (CURRENT_DATE + appt.local_offset) AT TIME ZONE 'UTC',
    appt.status::appointment_status,
    appt.professional_name,
    appt.appointment_type
  FROM patient_inserts pi
  JOIN (VALUES
    ('Camila Álvarez',  INTERVAL '12 hours',          'confirmed',   'Dr. Bonomi',  'Control'),
    ('Martín Pérez',    INTERVAL '12 hours 30 minutes','confirmed',   'Dra. Silva',  'Limpieza'),
    ('Lucía Fernández', INTERVAL '13 hours',           'pending',     'Dr. Bonomi',  'Ortodoncia'),
    ('Roberto Castro',  INTERVAL '13 hours 30 minutes','confirmed',   'Dr. Bonomi',  'Endodoncia'),
    ('Ana Rodríguez',   INTERVAL '14 hours',           'new',         'Dra. Silva',  'Primera visita'),
    ('Diego Méndez',    INTERVAL '14 hours 30 minutes','rescheduled', 'Dr. Bonomi',  'Control')
  ) AS appt(full_name, local_offset, status, professional_name, appointment_type)
    ON pi.full_name = appt.full_name
  RETURNING id
)

-- Confirmación final: muestra cuántos registros se insertaron
SELECT
  (SELECT COUNT(*) FROM patient_inserts)     AS pacientes_insertados,
  (SELECT COUNT(*) FROM appointment_inserts) AS turnos_insertados;


-- ============================================================
-- CÓMO EJECUTAR ESTE SEED
-- ============================================================
--
-- Paso 1: Crear el usuario en Supabase
--   → Dashboard → Authentication → Users → "Add user"
--   → Completar email y password (ej: bonomi@cliniq.app / Test1234!)
--   → Guardar
--
-- Paso 2: Copiar el UUID del usuario recién creado
--   → Aparece en la columna "UID" de la lista de usuarios
--   → Ejemplo: a1b2c3d4-e5f6-7890-abcd-ef1234567890
--
-- Paso 3: Reemplazar el placeholder en este archivo
--   → Buscar: REEMPLAZAR-CON-UUID-DEL-USUARIO
--   → Reemplazar con el UUID copiado (sin comillas)
--
-- Paso 4: Ejecutar en el SQL Editor
--   → Dashboard → SQL Editor → "New query"
--   → Pegar el contenido de este archivo
--   → Hacer clic en "Run"
--
-- Paso 5: Verificar que se insertaron los datos
--   → La query final muestra: pacientes_insertados=6, turnos_insertados=6
--   → También podés verificar con:
--        SELECT * FROM v_today_appointments;
--        SELECT * FROM v_clinic_kpis_today;
--
-- ============================================================
