import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Env ──────────────────────────────────────────────────────────────────────
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')               ?? '';
const SUPABASE_KEY              = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')  ?? '';
const VERIFY_TOKEN              = Deno.env.get('WHATSAPP_VERIFY_TOKEN')      ?? '';
const WA_ACCESS_TOKEN           = Deno.env.get('WHATSAPP_ACCESS_TOKEN')      ?? '';
const WA_PHONE_NUMBER_ID_GLOBAL = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')   ?? '';

// ─── Normalize phone: always store with + prefix ──────────────────────────────
function normalizePhone(phone: string): string {
  return phone.startsWith('+') ? phone : `+${phone}`;
}

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
  if (clinicId) {
    const { data } = await supabase
      .from('clinics')
      .select('wa_phone_number_id')
      .eq('id', clinicId)
      .maybeSingle();
    if (data?.wa_phone_number_id) return data.wa_phone_number_id;
  }
  return incomingPhoneNumId || WA_PHONE_NUMBER_ID_GLOBAL;
}

// ─── Upsert conversation ──────────────────────────────────────────────────────
async function upsertConversation(
  supabase: ReturnType<typeof createClient>,
  clinicId: string,
  patientId: string | null,
  phone: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('conversations')
    .upsert(
      { clinic_id: clinicId, patient_id: patientId, phone_number: phone },
      { onConflict: 'clinic_id,phone_number', ignoreDuplicates: false },
    )
    .select('id')
    .single();
  if (error) { console.error('upsertConversation error:', error); return null; }
  return data?.id ?? null;
}

// ─── Insert into messages ─────────────────────────────────────────────────────
async function insertMessage(
  supabase: ReturnType<typeof createClient>,
  opts: {
    conversationId: string;
    clinicId:       string;
    patientId:      string | null;
    direction:      'inbound' | 'outbound' | 'system_template';
    content:        string;
    status:         string;
    metaMessageId:  string | null;
  },
) {
  const { error } = await supabase.from('messages').insert({
    conversation_id: opts.conversationId,
    clinic_id:       opts.clinicId,
    patient_id:      opts.patientId,
    direction:       opts.direction,
    content:         opts.content,
    status:          opts.status,
    meta_message_id: opts.metaMessageId,
  });
  if (error) console.error('insertMessage error:', error);
}

// ─── Audit log ────────────────────────────────────────────────────────────────
async function logAudit(
  supabase: ReturnType<typeof createClient>,
  opts: {
    clinicId:      string | null;
    patientId:     string | null;
    appointmentId: string | null;
    direction:     string;
    phone:         string;
    message:       string;
    waMessageId:   string | null;
    status:        string;
  },
) {
  await supabase.from('whatsapp_message_log').insert({
    clinic_id:      opts.clinicId,
    patient_id:     opts.patientId,
    appointment_id: opts.appointmentId,
    direction:      opts.direction,
    phone_number:   opts.phone,
    message:        opts.message,
    wa_message_id:  opts.waMessageId,
    status:         opts.status,
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  const url = new URL(req.url);

  // ── GET: webhook verification ───────────────────────────────────────────────
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
    const fromPhoneRaw       = message.from as string;
    const fromPhone          = normalizePhone(fromPhoneRaw);  // always +prefix
    const msgType            = message.type as string;

    // ── Extract intent ────────────────────────────────────────────────────
    let intent = '';
    let rawText = '';

    if (msgType === 'text') {
      rawText = ((message.text as Record<string, string>)?.body ?? '').trim();
      const lower = rawText.toLowerCase();
      if (['1', 'si', 'sí', 'confirmo', 'confirmar', 'ok'].includes(lower)) intent = 'confirm';
      else if (['2', 'no', 'cancelo', 'cancelar', 'cancelacion', 'cancelación'].includes(lower)) intent = 'cancel';
      else if (['3', 'reagendar', 'reagendo', 'cambiar'].includes(lower)) intent = 'reschedule';
    } else if (msgType === 'interactive') {
      const interactive = message.interactive as Record<string, unknown>;
      const buttonReply = interactive?.button_reply as Record<string, string>;
      intent  = buttonReply?.id ?? '';
      rawText = buttonReply?.title ?? '';
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // ── Dedup ─────────────────────────────────────────────────────────────
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

    // ── Find patient (search with and without +) ──────────────────────────
    const { data: patient } = await supabase
      .from('patients')
      .select('id, full_name, clinic_id, phone_number')
      .or(`phone_number.eq.${fromPhone},phone_number.eq.${fromPhoneRaw}`)
      .maybeSingle();

    const displayText = rawText || `[${msgType}]`;

    if (!patient) {
      await logAudit(supabase, {
        clinicId: null, patientId: null, appointmentId: null,
        direction: 'inbound', phone: fromPhone,
        message: displayText, waMessageId, status: 'received',
      });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    const replyPhoneNumberId = await resolvePhoneNumberId(supabase, incomingPhoneNumId, patient.clinic_id);

    // ── Upsert conversation (using normalized phone) ───────────────────────
    const conversationId = await upsertConversation(
      supabase, patient.clinic_id, patient.id, fromPhone,
    );

    // ── Insert inbound message ─────────────────────────────────────────────
    if (conversationId) {
      await insertMessage(supabase, {
        conversationId,
        clinicId:      patient.clinic_id,
        patientId:     patient.id,
        direction:     'inbound',
        content:       displayText,
        status:        'received',
        metaMessageId: waMessageId,
      });
    }

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

    // ── Audit log: inbound ─────────────────────────────────────────────────
    await logAudit(supabase, {
      clinicId:      patient.clinic_id,
      patientId:     patient.id,
      appointmentId: appointment?.id ?? null,
      direction:     'inbound',
      phone:         fromPhone,
      message:       displayText,
      waMessageId,
      status:        'received',
    });

    // ── Bot only responds to appointment intents — NOT generic messages ────
    // If the patient sends a free-form message with no intent, the staff
    // replies manually from the Inbox. Bot only handles confirm/cancel/reschedule.
    const shouldBotReply = !!(appointment && intent);
    const noAppointmentIntent = !appointment && intent; // intent but no appt

    const { data: clinicData } = await supabase
      .from('clinics')
      .select('name, phone')
      .eq('id', patient.clinic_id)
      .maybeSingle();

    const sendReply = async (replyText: string) => {
      const replyId = await sendWaText(fromPhone, replyText, replyPhoneNumberId);
      if (conversationId) {
        await insertMessage(supabase, {
          conversationId,
          clinicId:      patient.clinic_id,
          patientId:     patient.id,
          direction:     'outbound',
          content:       replyText,
          status:        replyId ? 'sent' : 'failed',
          metaMessageId: replyId,
        });
      }
      await logAudit(supabase, {
        clinicId:      patient.clinic_id,
        patientId:     patient.id,
        appointmentId: appointment?.id ?? null,
        direction:     'outbound',
        phone:         fromPhone,
        message:       replyText,
        waMessageId:   replyId,
        status:        replyId ? 'sent' : 'failed',
      });
    };

    if (shouldBotReply) {
      if (intent === 'confirm') {
        await supabase
          .from('appointments')
          .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
          .eq('id', appointment!.id);
        await sendReply(`¡Perfecto, ${patient.full_name}! ✅ Tu turno quedó *confirmado*. Te esperamos.`);

      } else if (intent === 'cancel') {
        await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('id', appointment!.id);
        await sendReply(`Entendido, ${patient.full_name}. Tu turno fue *cancelado*. Cuando quieras reagendar, contactá al consultorio.`);

      } else if (intent === 'reschedule') {
        const clinicPhone = clinicData?.phone ? ` o llamanos al ${clinicData.phone}` : '';
        await sendReply(
          `Entendido, ${patient.full_name}. 📅 Para reagendar tu turno escribinos al consultorio${clinicPhone} y con gusto te buscamos un nuevo horario. ¡Hasta pronto!`,
        );
      }
    }
    // Generic messages (no intent) → staff replies manually from Inbox. No bot response.

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response('Method Not Allowed', { status: 405 });
});
