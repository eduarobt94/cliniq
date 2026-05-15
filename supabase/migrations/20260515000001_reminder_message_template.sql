-- Agrega message_template a los registros appointment_reminder existentes
-- que no tengan uno configurado todavía.
-- Para hours_before < 12: se usará este template (mensaje libre).
-- Para hours_before >= 12: se sigue usando la plantilla de Meta.

UPDATE clinic_automations
SET message_template = 'Hola {patient_name} 👋 Le recordamos su turno en {clinic_name} para {service} el {appointment_date} a las {appointment_time}.

¿Confirma su asistencia? Responda *Sí* para confirmar o *No* si no puede asistir.'
WHERE type = 'appointment_reminder'
  AND (message_template IS NULL OR message_template = '');
