-- Fix: v_today_appointments and v_clinic_kpis_today used CURRENT_DATE (UTC)
-- instead of today's date in the clinic's own timezone. When it's past 21:00 UYT
-- (= midnight UTC) the views returned 0 rows for the rest of the night.
-- Fix: CURRENT_DATE → (CURRENT_TIMESTAMP AT TIME ZONE c.timezone)::date

CREATE OR REPLACE VIEW v_today_appointments
WITH (security_invoker = true)
AS
SELECT
  a.id,
  a.clinic_id,
  a.appointment_datetime,
  a.status,
  a.professional_name,
  a.appointment_type,
  a.notes,
  a.reminder_sent_at,
  a.confirmed_at,
  p.full_name    AS patient_name,
  p.phone_number AS patient_phone,
  c.timezone     AS clinic_timezone
FROM  appointments a
JOIN  patients     p ON p.id = a.patient_id
JOIN  clinics      c ON c.id = a.clinic_id
WHERE DATE(a.appointment_datetime AT TIME ZONE c.timezone)
    = (CURRENT_TIMESTAMP AT TIME ZONE c.timezone)::date
ORDER BY a.appointment_datetime;

CREATE OR REPLACE VIEW v_clinic_kpis_today
WITH (security_invoker = true)
AS
SELECT
  a.clinic_id,
  COUNT(*)                                                    AS total_today,
  COUNT(*) FILTER (WHERE a.status = 'confirmed')             AS confirmed_today,
  COUNT(*) FILTER (WHERE a.status = 'pending')               AS pending_today,
  COUNT(*) FILTER (WHERE a.status = 'cancelled')             AS cancelled_today,
  COUNT(*) FILTER (WHERE a.status = 'rescheduled')           AS rescheduled_today,
  COUNT(*) FILTER (WHERE a.reminder_sent_at IS NOT NULL)     AS reminders_sent,
  COUNT(*) FILTER (WHERE a.confirmed_at IS NOT NULL)         AS auto_confirmed
FROM  appointments a
JOIN  clinics      c ON c.id = a.clinic_id
WHERE DATE(a.appointment_datetime AT TIME ZONE c.timezone)
    = (CURRENT_TIMESTAMP AT TIME ZONE c.timezone)::date
GROUP BY a.clinic_id;
