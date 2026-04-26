import { supabase } from './supabase';

export async function searchPatients(clinicId, query) {
  const { data, error } = await supabase
    .from('patients')
    .select('id, full_name, phone_number')
    .eq('clinic_id', clinicId)
    .ilike('full_name', `%${query.trim()}%`)
    .limit(8);
  if (error) throw error;
  return data ?? [];
}

export async function createPatient(clinicId, fullName, phoneNumber) {
  const { data, error } = await supabase
    .from('patients')
    .insert({ clinic_id: clinicId, full_name: fullName.trim(), phone_number: phoneNumber.trim() })
    .select('id, full_name, phone_number')
    .single();
  if (error) throw error;
  return data;
}

export async function createAppointment(clinicId, { patientId, datetime, type, professionalName, notes }) {
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      clinic_id:            clinicId,
      patient_id:           patientId,
      appointment_datetime: datetime,
      appointment_type:     type?.trim() || null,
      professional_name:    professionalName?.trim() || null,
      notes:                notes?.trim() || null,
      status:               'new',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

export async function updateAppointmentStatus(appointmentId, status) {
  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId);
  if (error) throw error;
}
