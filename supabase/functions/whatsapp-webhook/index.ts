import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Env ──────────────────────────────────────────────────────────────────────
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')               ?? '';
const SUPABASE_KEY              = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')  ?? '';
const VERIFY_TOKEN              = Deno.env.get('WHATSAPP_VERIFY_TOKEN')      ?? '';
const WA_ACCESS_TOKEN           = Deno.env.get('WHATSAPP_ACCESS_TOKEN')      ?? '';
const WA_PHONE_NUMBER_ID_GLOBAL = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')   ?? '';

// ─── Send text reply ──────────────────────────────────────────────────────────
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
  if (!res.ok) { console.error('WA send error:', await res.text()); return null; }
  const data = await res.json();
  return data?.messages?.[0]?.id ?? null;
}

// ─── Resolve clinic's WA phone number ID ─────────────────────────────────────
async function resolvePhoneNumberId(
  supabase: ReturnType<typeof createClient>,
  incomingPhoneNumId: string,
  clinicId: string | null,
): Promise<string> {
  // Prefer patient's clinic number
  if (clinicId) {
    const { data } = await supabase
      .from('clinics')
      .select('wa_phone_number_id')
      .eq('id', clinicId)
      .maybeSingle();
    if (data?.wa_phone_number_id) return data.wa_phone_number_id;
  }
  // Fall back to incoming number or global
  return incomingPhoneNumId || WA_PHONE_NUMBER_ID_GLOBAL;
}

// ─── Log outbound reply ───────────────────────────────────────────────────────
async function logOutbound(
  supabase: ReturnType<typeof createClient>,
  clinicId: string,
  patientId: string,
  appointmentId: string | null,
  phone: string,
  message: string,
  waId: string | null,
) {
  await supabase.from('whatsapp_message_log').insert({
    clinic_id:      clinicId,
    patient_id:     patientId,
    appointment_id: appointmentId,
    direction:      'outbound',
    phone_number:   phone,
    message,
    wa_message_id:  waId,
    status:         waId ? 'sent' : 'failed',
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  const url = new URL(req.url);

  // ── GET: Meta webhook verification ─────────────────────────────────────────
  if (req.method === 'GET') {
    const mode      = url.searchParams.get('hub.mode');
    const token     = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  // ── POST: Incoming message ──────────────────────────────────────────────────
  if (req.method === 'POST') {
    let body: Record<string, unknown>;
    try { body = await req.json(); }
    catch { return new Response('Bad Request', { status: 400 }); }

    const entry    = (body?.entry  as unknown[])?.[0] as Record<string, unknown>;
    const changes  = (entry?.changes as unknown[])?.[0] as Record<string, unknown>;
    const value    = changes?.value as Record<string, unknown>;
    const messages = value?.messages as Record<string, unknown>[];
    const message  = messages?.[0];

    if (!message) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    const metadata           = value?.metadata as Record<string, string>;
    const incomingPhoneNumId = metadata?.phone_number_id ?? '';
    const waMessageId        = message.id as string;
    const fromPhone          = message.from as string;
    const msgType            = message.type as string;  // 'text' | 'interactive'

    // ── Extract intent from text OR button reply ───────────────────────────
    let intent = '';  // 'confirm' | 'cancel' | 'reschedule' | ''
    let rawText = '';

    if (msgType === 'text') {
      rawText = ((message.text as Record<string, string>)?.body ?? '').trim().toLowerCase();
      if (['1', 'si', 'sí', 'confirmo', 'confirmar', 'ok'].includes(rawText)) intent = 'confirm';
      else if (['2', 'no', 'cancelo', 'cancelar', 'cancelacion', 'cancelación'].includes(rawText)) intent = 'cancel';
      else if (['3', 'reagendar', 'reagendo', 'cambiar'].includes(rawText)) intent = 'reschedule';
    } else if (msgType === 'interactive') {
      const interactive = message.interactive as Record<string, unknown>;
      const buttonReply = interactive?.button_reply as Record<string, string>;
      intent  = buttonReply?.id ?? '';    // 'confirm' | 'cancel' | 'reschedule'
      rawText = buttonReply?.title ?? '';
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // ── Dedup ──────────────────────────────────────────────────────────────
    const { data: existingLog } = await supabase
      .from('whatsapp_message_log')
      .select('id')
      .eq('wa_message_id', waMessageId)
      .maybeSingle();

    if (existingLog) {
      return new Response(JSON.stringify({ ok: true, dup: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Find patient ───────────────────────────────────────────────────────
    const { data: patient } = await supabase
      .from('patients')
      .select('id, full_name, clinic_id, phone_number')
      .or(`phone_number.eq.${fromPhone},phone_number.eq.+${fromPhone}`)
      .maybeSingle();

    const logEntry = {
      clinic_id:      patient?.clinic_id ?? null,
      patient_id:     patient?.id ?? null,
      appointment_id: null as string | null,
      direction:      'inbound',
      phone_number:   fromPhone,
      message:        rawText || `[${msgType}]`,
      wa_message_id:  waMessageId,
      status:         'received',
    };

    if (!patient) {
      await supabase.from('whatsapp_message_log').insert(logEntry);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    const replyPhoneNumberId = await resolvePhoneNumberId(supabase, incomingPhoneNumId, patient.clinic_id);

    // ── Find pending appointment ───────────────────────────────────────────
    const { data: appointment } = await supabase
      .from('appointments')
      .select('id, status, appointment_datetime')
      .eq('patient_id', patient.id)
      .eq('clinic_id',  patient.clinic_id)
      .eq('status', 'pending')
      .gte('appointment_datetime', new Date().toISOString())
      .order('appointment_datetime', { ascending: true })
      .limit(1)
      .maybeSingle();

    logEntry.appointment_id = appointment?.id ?? null;

    // ── Get clinic phone for reschedule message ────────────────────────────
    const { data: clinicData } = await supabase
      .from('clinics')
      .select('name, phone')
      .eq('id', patient.clinic_id)
      .maybeSingle();

    // ── Process intent ─────────────────────────────────────────────────────
    if (appointment && intent) {

      if (intent === 'confirm') {
        await supabase
          .from('appointments')
          .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
          .eq('id', appointment.id);

        await supabase.from('whatsapp_message_log').insert(logEntry);

        const replyText = `¡Perfecto, ${patient.full_name}! ✅ Tu turno quedó *confirmado*. Te esperamos.`;
        const replyId = await sendWaText(fromPhone, replyText, replyPhoneNumberId);
        await logOutbound(supabase, patient.clinic_id, patient.id, appointment.id, fromPhone, replyText, replyId);

      } else if (intent === 'cancel') {
        await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('id', appointment.id);

        await supabase.from('whatsapp_message_log').insert(logEntry);

        const replyText = `Entendido, ${patient.full_name}. Tu turno fue *cancelado*. Cuando quieras reagendar, contactá al consultorio.`;
        const replyId = await sendWaText(fromPhone, replyText, replyPhoneNumberId);
        await logOutbound(supabase, patient.clinic_id, patient.id, appointment.id, fromPhone, replyText, replyId);

      } else if (intent === 'reschedule') {
        // Keep appointment as pending — staff will reschedule manually
        await supabase.from('whatsapp_message_log').insert(logEntry);

        const clinicPhone = clinicData?.phone ? ` o llamanos al ${clinicData.phone}` : '';
        const replyText =
          `Entendido, ${patient.full_name}. 📅 Para reagendar tu turno escribinos al consultorio${clinicPhone} y con gusto te buscamos un nuevo horario. ¡Hasta pronto!`;
        const replyId = await sendWaText(fromPhone, replyText, replyPhoneNumberId);
        await logOutbound(supabase, patient.clinic_id, patient.id, appointment.id, fromPhone, replyText, replyId);

      }

    } else {
      // No pending appointment or unknown message
      await supabase.from('whatsapp_message_log').insert(logEntry);

      if (msgType === 'text' && rawText) {
        const helpText =
          `Hola ${patient.full_name} 👋 No encontramos ningún turno pendiente para confirmar.\n\n` +
          `Si querés sacar un turno, contactá al consultorio.`;
        const replyId = await sendWaText(fromPhone, helpText, replyPhoneNumberId);
        await logOutbound(supabase, patient.clinic_id, patient.id, null, fromPhone, helpText, replyId);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response('Method Not Allowed', { status: 405 });
});
