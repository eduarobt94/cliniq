import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')              ?? '';
const SUPABASE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WA_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')     ?? '';
const WA_PHONE_ID_GLOBAL = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? '';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REASON_ES: Record<string, string> = {
  holiday:         'feriado',
  vacation:        'vacaciones del personal',
  repair:          'reparaciones en el local',
  remodeling:      'remodelación del local',
  emergency_close: 'cierre de emergencia',
  other:           'motivos internos',
};

async function sendWaText(to: string, text: string, phoneNumberId: string): Promise<string | null> {
  const api = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
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
      type: 'text',
      text: { preview_url: false, body: text },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('WA send error to', to, ':', err);
    return null;
  }
  const data = await res.json();
  return data?.messages?.[0]?.id ?? null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS });
  }
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  // Verify caller JWT
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

  let body: { closure_id: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const { closure_id } = body;
  if (!closure_id) {
    return new Response(JSON.stringify({ error: 'closure_id is required' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Load the closure
  const { data: closure, error: cErr } = await supabase
    .from('clinic_closures')
    .select('*, clinics!inner(id, name, owner_id, wa_phone_number_id, timezone)')
    .eq('id', closure_id)
    .maybeSingle();

  if (cErr || !closure) {
    return new Response(JSON.stringify({ error: 'Closure not found' }), {
      status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const clinic = closure.clinics as Record<string, string>;

  // Verify the caller owns this clinic
  if (clinic.owner_id !== user.id) {
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

  // Format the closure date for display
  const closureDate = new Date(closure.date + 'T12:00:00Z');
  const tz = clinic.timezone ?? 'America/Montevideo';
  const dateLabel = closureDate.toLocaleDateString('es-UY', {
    timeZone: tz, weekday: 'long', day: 'numeric', month: 'long',
  });
  const reasonText = closure.reason_label
    || REASON_ES[closure.reason as string]
    || 'motivos internos';

  // Find all appointments on this date that are not cancelled
  const { data: appointments, error: apptErr } = await supabase
    .from('appointments')
    .select(`
      id,
      patient_id,
      appointment_datetime,
      patients!inner(id, full_name, phone_number)
    `)
    .eq('clinic_id', clinic.id)
    .gte('appointment_datetime', closure.date + 'T00:00:00Z')
    .lt( 'appointment_datetime', closure.date + 'T23:59:59Z')
    .in('status', ['confirmed', 'pending', 'new']);

  if (apptErr) {
    console.error('Appointments query error:', apptErr);
    return new Response(JSON.stringify({ error: 'Failed to load appointments' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const phoneNumberId = clinic.wa_phone_number_id || WA_PHONE_ID_GLOBAL;
  if (!phoneNumberId) {
    return new Response(JSON.stringify({ error: 'No WhatsApp phone number configured' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const results = await Promise.all((appointments ?? []).map(async (appt) => {
    const patient = (appt as Record<string, unknown>).patients as Record<string, string> | null;
    const phone = patient?.phone_number;
    if (!phone) return null;

    const patientName = patient?.full_name ?? 'Paciente';
    const apptTime = new Date(appt.appointment_datetime as string).toLocaleTimeString('es-UY', {
      timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
    });

    const message = [
      `Hola ${patientName} 👋`,
      ``,
      `Te informamos que *${clinic.name}* estará cerrada el *${dateLabel}* por ${reasonText}.`,
      ``,
      `Tu turno de las *${apptTime}hs* ha sido reagendado. Por favor, comunicate con nosotros para coordinar una nueva fecha.`,
      ``,
      `Disculpá los inconvenientes 🙏`,
    ].join('\n');

    const [waId] = await Promise.all([
      sendWaText(phone, message, phoneNumberId),
      // Mark appointment as rescheduled in parallel with the WA send
    ]);

    await supabase
      .from('appointments')
      .update({ status: 'rescheduled' })
      .eq('id', appt.id);

    return { patient_id: appt.patient_id as string, phone, sent: !!waId };
  }));

  const filteredResults = results.filter((r): r is { patient_id: string; phone: string; sent: boolean } => r !== null);

  const sent  = filteredResults.filter(r => r.sent).length;
  const total = filteredResults.length;

  console.log(`notify-closure-patients: ${sent}/${total} messages sent for closure ${closure_id}`);

  return new Response(JSON.stringify({ ok: true, sent, total, results: filteredResults }), {
    status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
