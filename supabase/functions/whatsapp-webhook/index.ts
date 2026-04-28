import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Env ──────────────────────────────────────────────────────────────────────
const SUPABASE_URL            = Deno.env.get('SUPABASE_URL')               ?? '';
const SUPABASE_KEY            = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')  ?? '';
const VERIFY_TOKEN            = Deno.env.get('WHATSAPP_VERIFY_TOKEN')      ?? '';
const WA_ACCESS_TOKEN         = Deno.env.get('WHATSAPP_ACCESS_TOKEN')      ?? '';
// Fallback — used when clinic has no wa_phone_number_id configured
const WA_PHONE_NUMBER_ID_GLOBAL = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? '';

// ─── Keyword maps ──────────────────────────────────────────────────────────────
const CONFIRM_KEYWORDS = new Set(['1', 'si', 'sí', 'confirmo', 'confirmar', 'ok']);
const CANCEL_KEYWORDS  = new Set(['2', 'no', 'cancelo', 'cancelar', 'cancelacion', 'cancelación']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Envía un mensaje de texto simple via WhatsApp Cloud API desde el número de la clínica */
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
      type:              'text',
      text:              { preview_url: false, body: text },
    }),
  });
  if (!res.ok) {
    console.error('WA send error:', await res.text());
    return null;
  }
  const data = await res.json();
  return data?.messages?.[0]?.id ?? null;
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
    try {
      body = await req.json();
    } catch {
      return new Response('Bad Request', { status: 400 });
    }

    const entry    = (body?.entry as unknown[])?.[0] as Record<string, unknown>;
    const changes  = (entry?.changes as unknown[])?.[0] as Record<string, unknown>;
    const value    = changes?.value as Record<string, unknown>;
    const messages = value?.messages as Record<string, unknown>[];
    const message  = messages?.[0];

    // Acknowledge Meta immediately to avoid retries
    if (!message) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Identify which clinic this message is for via phone_number_id ────────
    // Meta includes metadata.phone_number_id — the WA number that received the message.
    // We use it to find the clinic and reply from the same number.
    const metadata            = value?.metadata as Record<string, string>;
    const incomingPhoneNumId  = metadata?.phone_number_id ?? '';

    const waMessageId = message.id as string;
    const fromPhone   = message.from as string;   // E.164 without '+'
    const msgType     = message.type as string;
    const msgText     = msgType === 'text'
      ? ((message.text as Record<string, string>)?.body ?? '').trim().toLowerCase()
      : '';

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // ── Dedup: skip already-processed messages ─────────────────────────────
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

    // ── Resolve the clinic's phoneNumberId for replies ───────────────────────
    // Try to match by wa_phone_number_id; fall back to global.
    let replyPhoneNumberId = WA_PHONE_NUMBER_ID_GLOBAL;
    if (incomingPhoneNumId) {
      const { data: clinicByPhone } = await supabase
        .from('clinics')
        .select('id, wa_phone_number_id')
        .eq('wa_phone_number_id', incomingPhoneNumId)
        .maybeSingle();

      if (clinicByPhone?.wa_phone_number_id) {
        replyPhoneNumberId = clinicByPhone.wa_phone_number_id;
      }
    }

    // ── Find patient by phone number ──────────────────────────────────────
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
      message:        msgText || `[${msgType}]`,
      wa_message_id:  waMessageId,
      status:         'received',
    };

    if (!patient) {
      await supabase.from('whatsapp_message_log').insert(logEntry);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // If patient's clinic has its own number, prefer it over the incoming lookup
    if (patient.clinic_id) {
      const { data: patientClinic } = await supabase
        .from('clinics')
        .select('wa_phone_number_id')
        .eq('id', patient.clinic_id)
        .maybeSingle();

      if (patientClinic?.wa_phone_number_id) {
        replyPhoneNumberId = patientClinic.wa_phone_number_id;
      }
    }

    // ── Find next pending appointment for this patient ────────────────────
    const now = new Date().toISOString();
    const { data: appointment } = await supabase
      .from('appointments')
      .select('id, status, appointment_datetime')
      .eq('patient_id', patient.id)
      .eq('clinic_id',  patient.clinic_id)
      .eq('status', 'pending')
      .gte('appointment_datetime', now)
      .order('appointment_datetime', { ascending: true })
      .limit(1)
      .maybeSingle();

    logEntry.appointment_id = appointment?.id ?? null;

    // ── Process keyword ────────────────────────────────────────────────────
    if (appointment && msgText) {
      if (CONFIRM_KEYWORDS.has(msgText)) {
        await supabase
          .from('appointments')
          .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
          .eq('id', appointment.id);

        await supabase.from('whatsapp_message_log').insert(logEntry);

        const replyText = `¡Perfecto, ${patient.full_name}! ✅ Tu turno quedó *confirmado*. Te esperamos.`;
        const replyId = await sendWaText(fromPhone, replyText, replyPhoneNumberId);
        if (replyId) {
          await supabase.from('whatsapp_message_log').insert({
            clinic_id:      patient.clinic_id,
            patient_id:     patient.id,
            appointment_id: appointment.id,
            direction:      'outbound',
            phone_number:   fromPhone,
            message:        replyText,
            wa_message_id:  replyId,
            status:         'sent',
          });
        }

      } else if (CANCEL_KEYWORDS.has(msgText)) {
        await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('id', appointment.id);

        await supabase.from('whatsapp_message_log').insert(logEntry);

        const replyText = `Entendido, ${patient.full_name}. Tu turno fue *cancelado*. Cuando quieras reagendar, contactá al consultorio.`;
        const replyId = await sendWaText(fromPhone, replyText, replyPhoneNumberId);
        if (replyId) {
          await supabase.from('whatsapp_message_log').insert({
            clinic_id:      patient.clinic_id,
            patient_id:     patient.id,
            appointment_id: appointment.id,
            direction:      'outbound',
            phone_number:   fromPhone,
            message:        replyText,
            wa_message_id:  replyId,
            status:         'sent',
          });
        }

      } else {
        await supabase.from('whatsapp_message_log').insert(logEntry);

        const helpText =
          `Hola ${patient.full_name} 👋 No entendí tu mensaje.\n\n` +
          `Respondé:\n*1* para confirmar tu turno\n*2* para cancelar tu turno`;

        const replyId = await sendWaText(fromPhone, helpText, replyPhoneNumberId);
        if (replyId) {
          await supabase.from('whatsapp_message_log').insert({
            clinic_id:      patient.clinic_id,
            patient_id:     patient.id,
            appointment_id: appointment.id,
            direction:      'outbound',
            phone_number:   fromPhone,
            message:        helpText,
            wa_message_id:  replyId,
            status:         'sent',
          });
        }
      }
    } else {
      await supabase.from('whatsapp_message_log').insert(logEntry);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response('Method Not Allowed', { status: 405 });
});
