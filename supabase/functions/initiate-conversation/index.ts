import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Env ──────────────────────────────────────────────────────────────────────
const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')              ?? '';
const SUPABASE_KEY       = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WA_ACCESS_TOKEN    = Deno.env.get('WHATSAPP_ACCESS_TOKEN')     ?? '';
const WA_PHONE_ID_GLOBAL = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')  ?? '';
const WA_TEMPLATE_NAME   = Deno.env.get('WHATSAPP_TEMPLATE_NAME')    ?? 'recordatorio_turno';
const WA_TEMPLATE_LANG   = Deno.env.get('WHATSAPP_TEMPLATE_LANG')    ?? 'es';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Format time for timezone ─────────────────────────────────────────────────
function formatTime(iso: string, tz: string): string {
  const dt = new Date(iso);
  return dt.toLocaleTimeString('es-UY', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

// ─── Send template message ────────────────────────────────────────────────────
async function sendTemplate(
  to: string,
  phoneNumberId: string,
  patientName: string,
  time: string,
  clinicName: string,
): Promise<string | null> {
  const api = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
  try {
    const res = await fetch(api, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WA_ACCESS_TOKEN}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type:    'individual',
        to,
        type: 'template',
        template: {
          name:     WA_TEMPLATE_NAME,
          language: { code: WA_TEMPLATE_LANG },
          components: [{
            type: 'body',
            parameters: [
              { type: 'text', text: patientName },
              { type: 'text', text: time        },
              { type: 'text', text: clinicName  },
            ],
          }],
        },
      }),
    });

    if (!res.ok) {
      console.error('WA template error:', await res.text());
      return null;
    }
    const data = await res.json();
    return data?.messages?.[0]?.id ?? null;
  } catch (err) {
    console.error('sendTemplate fetch error:', err);
    return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { patient_id: string };
  try { body = await req.json(); }
  catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const { patient_id } = body;
  if (!patient_id) {
    return new Response(JSON.stringify({ error: 'patient_id is required' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // ── Load patient ──────────────────────────────────────────────────────────
  const { data: patient, error: patErr } = await supabase
    .from('patients')
    .select('id, full_name, phone_number, clinic_id')
    .eq('id', patient_id)
    .maybeSingle();

  if (patErr || !patient) {
    return new Response(JSON.stringify({ error: 'Patient not found' }), {
      status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  if (!patient.phone_number) {
    return new Response(JSON.stringify({ error: 'no_phone', message: 'El paciente no tiene número de teléfono registrado.' }), {
      status: 422, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── Verify caller belongs to clinic ──────────────────────────────────────
  const { data: clinic } = await supabase
    .from('clinics')
    .select('id, owner_id, name, timezone, wa_phone_number_id')
    .eq('id', patient.clinic_id)
    .maybeSingle();

  if (!clinic) {
    return new Response(JSON.stringify({ error: 'Clinic not found' }), {
      status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const isOwner = clinic.owner_id === user.id;
  if (!isOwner) {
    const { data: member } = await supabase
      .from('clinic_members')
      .select('id')
      .eq('clinic_id', clinic.id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!member) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
  }

  // ── Upsert conversation ───────────────────────────────────────────────────
  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .upsert(
      { clinic_id: clinic.id, patient_id: patient.id, phone_number: patient.phone_number },
      { onConflict: 'clinic_id,phone_number', ignoreDuplicates: false },
    )
    .select('id, clinic_id, patient_id, phone_number, last_message, last_message_at, created_at')
    .single();

  if (convErr || !conv) {
    console.error('upsert conversation error:', convErr);
    return new Response(JSON.stringify({ error: 'Failed to create conversation' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── Find next upcoming appointment ───────────────────────────────────────
  const { data: appointment } = await supabase
    .from('appointments')
    .select('id, appointment_datetime, status')
    .eq('patient_id', patient.id)
    .eq('clinic_id', clinic.id)
    .in('status', ['new', 'pending'])
    .gte('appointment_datetime', new Date().toISOString())
    .order('appointment_datetime', { ascending: true })
    .limit(1)
    .maybeSingle();

  // ── Send template if appointment exists ───────────────────────────────────
  let waId: string | null = null;
  let templateSent = false;

  if (appointment) {
    const phoneNumberId = clinic.wa_phone_number_id || WA_PHONE_ID_GLOBAL;
    const tz   = clinic.timezone ?? 'America/Montevideo';
    const time = formatTime(appointment.appointment_datetime, tz);

    waId = await sendTemplate(
      patient.phone_number,
      phoneNumberId,
      patient.full_name,
      time,
      clinic.name ?? 'el consultorio',
    );

    const content =
      `[Recordatorio] Hola ${patient.full_name}, tu turno es a las ${time} en ${clinic.name}.`;

    // Insert outbound message
    await supabase.from('messages').insert({
      conversation_id: conv.id,
      clinic_id:       clinic.id,
      patient_id:      patient.id,
      direction:       'system_template',
      content,
      status:          waId ? 'sent' : 'failed',
      meta_message_id: waId ?? null,
    });

    // Audit log
    await supabase.from('whatsapp_message_log').insert({
      clinic_id:      clinic.id,
      patient_id:     patient.id,
      appointment_id: appointment.id,
      direction:      'outbound',
      phone_number:   patient.phone_number,
      message:        content,
      wa_message_id:  waId,
      status:         waId ? 'sent' : 'failed',
    });

    templateSent = true;
  }

  return new Response(JSON.stringify({
    ok:            true,
    conversation:  conv,
    template_sent: templateSent,
    wa_id:         waId,
    has_appointment: !!appointment,
  }), {
    status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
