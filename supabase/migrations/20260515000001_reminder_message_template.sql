-- Actualiza message_template para todos los appointment_reminder existentes.
-- Reemplaza cualquier valor anterior (incluido el template antiguo con "Respondé *1*")
-- por el nuevo mensaje conversacional humanizado.

UPDATE clinic_automations
SET message_template = 'Hola {patient_name} 👋 Le escribimos desde {clinic_name} para recordarle que tiene un turno el {appointment_date} a las {appointment_time}.

¿Va a poder asistir?'
WHERE type = 'appointment_reminder';
