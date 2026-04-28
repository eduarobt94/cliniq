import { supabase } from './supabase';

export async function updateClinicProfile(clinicId, { name, phone, address, emailContact, timezone, waPhoneNumberId }) {
  const { data, error } = await supabase
    .from('clinics')
    .update({
      name,
      phone,
      address,
      email_contact:      emailContact,
      timezone,
      wa_phone_number_id: waPhoneNumberId ?? null,
    })
    .eq('id', clinicId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateClinicSettings(clinicId, fields) {
  const { error } = await supabase
    .from('clinics')
    .update({ settings: fields })
    .eq('id', clinicId);

  if (error) throw error;
}

export async function getClinic(clinicId) {
  const { data, error } = await supabase
    .from('clinics')
    .select('*')
    .eq('id', clinicId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
