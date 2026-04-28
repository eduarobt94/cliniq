import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Env ──────────────────────────────────────────────────────────────────────
const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')               ?? '';
const SUPABASE_KEY       = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')  ?? '';
const VERIFY_TOKEN       = Deno.env.get('WHATSAPP_VERIFY_TOKEN')      ?? '';
const WA_ACCESS_TOKEN    = Deno.env.get('WHATSAPP_ACCESS_TOKEN')      ?? '';
const WA_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')   ?? '';

// ─── Meta Graph API ───────────────────────────────────────────────────────────
const WA_API = `https://graph.facebook.com/v19.0/${WA_PHONE_NUMBER_ID}/messages`;

// ─── Keyword maps ──────────────────────────────────────────────────────────────
const CONFIRM_KEYWORDS  = new Set(['1', 'si', 'sí', 'confirmo', 'confirmar', 'ok']);
const CANCEL_KEYWORDS   = new Set(['2', 'no', 'cancelo', 'cancelar', 'cancelacion', 'cancelación']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normaliza número de teléfono a E.164 sin '+' para comparar */
function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Envía un mensaje de texto simple via WhatsApp Cloud API */
async function sendWaText(to: string, text: string): Promise<string | null> {
  const res = await fetch(WA_API, {
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

    // Extract message from Meta payload structure
    const entry    = (body?.entry as unknown[])?.[0] as Record<string, unknown>;
    const changes  = (entry?.changes as unknown[])?.[0] as Record<string, unknown>;
    const value    = changes?.value as Record<string, unknown>;
    const messages = value?.messages as Record<string, unknown>[];
    const message  = messages?.[0];

    // Always acknowledge Meta immediately (avoid retries)
    if (!message) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    const waMessageId = message.id as string;
    const fromPhone   = message.from as string;            // E.164 without '+'
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

    // ── Find patient by phone number ──────────────────────────────────────
    const normalizedFrom = normalizePhone(fromPhone);

    const { data: patient } = await supabase
      .from('patients')
      .select('id, full_name, clinic_id, phone_number')
      .or(`phone_number.eq.${fromPhone},phone_number.eq.+${fromPhone}`)
      .maybeSingle();

    // Log inbound message regardless of whether we know the patient
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
        // Confirm appointment
        await supabase
          .from('appointments')
          .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
          .eq('id', appointment.id);

        await supabase.from('whatsapp_message_log').insert(logEntry);

        const replyId = await sendWaText(
          fromPhone,
          `¡Perfecto, ${patient.full_name}! ✅ Tu turno quedó *confirmado*. Te esperamos.`
        );
        if (replyId) {
          await supabase.from('whatsapp_message_log').insert({
            clinic_id:      patient.clinic_id,
            patient_id:     patient.id,
            appointment_id: appointment.id,
            direction:      'outbound',
            phone_number:   fromPhone,
            message:        `¡Perfecto, ${patient.full_name}! ✅ Tu turno quedó *confirmado*. Te esperamos.`,
            wa_message_id:  replyId,
            status:         'sent',
          });
        }

      } else if (CANCEL_KEYWORDS.has(msgText)) {
        // Cancel appointment
        await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('id', appointment.id);

        await supabase.from('whatsapp_message_log').insert(logEntry);

        const replyId = await sendWaText(
          fromPhone,
          `Entendido, ${patient.full_name}. Tu turno fue *cancelado*. Cuando quieras reagendar, contactá al consultorio.`
        );
        if (replyId) {
          await supabase.from('whatsapp_message_log').insert({
            clinic_id:      patient.clinic_id,
            patient_id:     patient.id,
            appointment_id: appointment.id,
            direction:      'outbound',
            phone_number:   fromPhone,
            message:        `Entendido, ${patient.full_name}. Tu turno fue *cancelado*. Cuando quieras reagendar, contactá al consultorio.`,
            wa_message_id:  replyId,
            status:         'sent',
          });
        }

      } else {
        // Unknown keyword — send help
        await supabase.from('whatsapp_message_log').insert(logEntry);

        const helpText =
          `Hola ${patient.full_name} 👋 No entendí tu mensaje.\n\n` +
          `Respondé:\n*1* para confirmar tu turno\n*2* para cancelar tu turno`;

        const replyId = await sendWaText(fromPhone, helpText);
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
      // No pending appointment or non-text message
      await supabase.from('whatsapp_message_log').insert(logEntry);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response('Method Not Allowed', { status: 405 });
});
