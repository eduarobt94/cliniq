-- Agrega message_template a los registros appointment_reminder existentes
-- que no tengan uno configurado todavía.
-- Para hours_before < 12: se usará este template (mensaje libre).
-- Para hours_before >= 12: se sigue usando la plantilla de Meta.

UPDATE clinic_automations
SET message_template = 'Hola {patient_name} 👋 Le escribimos desde {clinic_name} para recordarle que tiene un turno el {appointment_date} a las {appointment_time}.

¿Va a poder asistir?'
WHERE type = 'appointment_reminder'
  AND (message_template IS NULL OR message_template = '');
