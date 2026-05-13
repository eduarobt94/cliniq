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

// ─── Upsert conversation — returns full object for AI handoff logic ───────────
async function upsertConversation(
  supabase: ReturnType<typeof createClient>,
  clinicId: string,
  patientId: string | null,
  phone: string,
): Promise<{ id: string; agent_mode: string; agent_last_human_reply_at: string | null } | null> {
  const { data, error } = await supabase
    .from('conversations')
    .upsert(
      { clinic_id: clinicId, patient_id: patientId, phone_number: phone },
      { onConflict: 'clinic_id,phone_number', ignoreDuplicates: false },
    )
    .select('id, agent_mode, agent_last_human_reply_at')
    .single();
  if (error) { console.error('upsertConversation error:', error); return null; }
  return data ?? null;
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
    senderType?:    'bot' | 'staff' | 'system' | null;
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
    sender_type:     opts.senderType ?? null,
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

// ─── AI handoff: decide if the agent should reply ─────────────────────────────
function shouldAgentReply(
  conv: { agent_mode: string; agent_last_human_reply_at: string | null } | null,
  patient: { ai_enabled: boolean } | null,
): boolean {
  // REGLA DE ORO 1: paciente con IA deshabilitada → nunca responder
  if (patient && patient.ai_enabled === false) return false;

  // Sin conversación todavía → el agente puede responder
  if (!conv) return true;

  // Modo bot → siempre responder
  if (conv.agent_mode === 'bot') return true;

  // Modo human → solo responder si el humano lleva más de 2 minutos sin escribir
  if (conv.agent_mode === 'human') {
    const lastHuman = conv.agent_last_human_reply_at;
    if (!lastHuman) return true; // nunca hubo respuesta humana
    const minutesSince = (Date.now() - new Date(lastHuman).getTime()) / 60000;
    return minutesSince > 2;
  }

  return false;
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
    } else if (msgType === 'button') {
      // Quick Reply desde template — llega como type:"button", no "interactive"
      const btn        = message.button as Record<string, string>;
      const btnPayload = (btn?.payload ?? '').toLowerCase().trim();
      const btnText    = (btn?.text    ?? '').toLowerCase().trim();
      rawText = btn?.text ?? btn?.payload ?? '';

      const matchesBtn = (keywords: string[]) =>
        keywords.some(k => btnPayload.includes(k) || btnText.includes(k));

      if (matchesBtn(['confirm', 'confirmar', 'confirmo', 'si', 'sí', '1'])) {
        intent = 'confirm';
      } else if (matchesBtn(['cancel', 'cancelar', 'cancelo', 'cancelacion', 'cancelación', 'no', '2'])) {
        intent = 'cancel';
      } else if (matchesBtn(['reschedule', 'reagendar', 'reagendo', 'cambiar', 'otro', '3'])) {
        intent = 'reschedule';
      } else {
        intent = btnPayload;
      }
      console.log(`[webhook] button(template): payload="${btnPayload}" text="${btnText}" → intent="${intent}"`);
    } else if (msgType === 'interactive') {
      const interactive = message.interactive as Record<string, unknown>;
      const buttonReply = interactive?.button_reply as Record<string, string>;
      const btnId    = (buttonReply?.id    ?? '').toLowerCase().trim();
      const btnTitle = (buttonReply?.title ?? '').toLowerCase().trim();
      rawText = buttonReply?.title ?? buttonReply?.id ?? '';

      // Map any button ID or title → standard intent (tolerante con español/inglés)
      const matches = (keywords: string[]) =>
        keywords.some(k => btnId.includes(k) || btnTitle.includes(k));

      if (matches(['confirm', 'confirmar', 'confirmo', 'si', 'sí', '1'])) {
        intent = 'confirm';
      } else if (matches(['cancel', 'cancelar', 'cancelo', 'cancelacion', 'cancelación', 'no', '2'])) {
        intent = 'cancel';
      } else if (matches(['reschedule', 'reagendar', 'reagendo', 'cambiar', 'otro', '3'])) {
        intent = 'reschedule';
      } else {
        intent = btnId; // fallback: usar el id directo
      }
      console.log(`[webhook] button_reply: id="${btnId}" title="${btnTitle}" → intent="${intent}"`);
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

    // ── Find patient (search with and without +) — include ai_enabled ──────
    const { data: patient } = await supabase
      .from('patients')
      .select('id, full_name, clinic_id, phone_number, ai_enabled')
      .or(`phone_number.eq.${fromPhone},phone_number.eq.${fromPhoneRaw}`)
      .maybeSingle();

    const displayText = rawText || `[${msgType}]`;

    if (!patient) {
      // Número desconocido — buscar a qué clínica pertenece este WA phone number ID
      // Meta envía phone_number_id como ID numérico; la DB puede guardar el número real
      // → intentamos ambos: el ID entrante y el env var global como fallback
      console.log('[webhook] Guest message — incomingPhoneNumId:', incomingPhoneNumId, 'globalId:', WA_PHONE_NUMBER_ID_GLOBAL);

      let clinicForGuest: { id: string; settings?: Record<string, string>; wa_phone_number_id?: string } | null = null;

      // Intento 1: coincidencia exacta con lo que envía Meta
      const { data: c1 } = await supabase
        .from('clinics')
        .select('id, settings, wa_phone_number_id')
        .eq('wa_phone_number_id', incomingPhoneNumId)
        .maybeSingle();
      clinicForGuest = c1;

      // Intento 2: fallback usando el env var global (por si hay diferencia de formato)
      if (!clinicForGuest && WA_PHONE_NUMBER_ID_GLOBAL) {
        const { data: c2 } = await supabase
          .from('clinics')
          .select('id, settings, wa_phone_number_id')
          .eq('wa_phone_number_id', WA_PHONE_NUMBER_ID_GLOBAL)
          .maybeSingle();
        clinicForGuest = c2;
      }

      console.log('[webhook] clinicForGuest found:', !!clinicForGuest);

      // ── ¿Es el médico respondiendo? ──────────────────────────────────────
      if (clinicForGuest) {
        const doctorWa = clinicForGuest.settings?.doctor_whatsapp;
        if (doctorWa) {
          const doctorPhone = doctorWa.startsWith('+') ? doctorWa : `+${doctorWa}`;
          if (fromPhone === doctorPhone) {
            // Handle doctor confirmation / rejection
            const doctorIntent = rawText.trim();
            const isConfirm = ['1', 'confirmar', 'confirmo', 'sí', 'si', 'ok'].includes(doctorIntent.toLowerCase());
            const isReject  = ['2', 'rechazar', 'rechazo', 'bloquear', 'bloqueo', 'no'].includes(doctorIntent.toLowerCase());
            const replyPhoneNumId = clinicForGuest.wa_phone_number_id || incomingPhoneNumId || WA_PHONE_NUMBER_ID_GLOBAL;

            const sendDoctor = async (text: string) => {
              const id = await sendWaText(fromPhone, text, replyPhoneNumId);
              await logAudit(supabase, {
                clinicId: clinicForGuest!.id, patientId: null, appointmentId: null,
                direction: 'outbound', phone: fromPhone, message: text, waMessageId: id, status: id ? 'sent' : 'failed',
              });
            };

            await logAudit(supabase, {
              clinicId: clinicForGuest.id, patientId: null, appointmentId: null,
              direction: 'inbound', phone: fromPhone, message: rawText || `[${msgType}]`,
              waMessageId, status: 'received',
            });

            if (!isConfirm && !isReject) {
              await sendDoctor(`Hola. Responda *1* para confirmar el turno más reciente o *2* para rechazarlo.`);
              return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            // Find the most recent 'new' appointment for this clinic (not yet confirmed/cancelled)
            const { data: pendingAppt } = await supabase
              .from('appointments')
              .select('id, appointment_datetime, patients!inner(id, full_name, phone_number)')
              .eq('clinic_id', clinicForGuest.id)
              .eq('status', 'new')
              .order('appointment_datetime', { ascending: true })
              .limit(1)
              .maybeSingle();

            if (!pendingAppt) {
              await sendDoctor(`No hay turnos pendientes de confirmación en este momento.`);
              return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            const aptPatient = pendingAppt.patients as Record<string, string>;
            const apptDt     = new Date(pendingAppt.appointment_datetime);
            const dtLabel    = apptDt.toLocaleString('es-UY', {
              weekday: 'short', day: 'numeric', month: 'short',
              hour: '2-digit', minute: '2-digit', timeZone: 'America/Montevideo',
            });

            if (isConfirm) {
              const { data: confirmed } = await supabase
                .from('appointments')
                .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
                .eq('id', pendingAppt.id)
                .eq('status', 'new')
                .select('id')
                .maybeSingle();

              if (!confirmed) {
                await sendDoctor(`El turno ya fue procesado anteriormente.`);
              } else {
                await sendDoctor(`✅ Turno de ${aptPatient.full_name} el ${dtLabel} *confirmado*.`);
                // Notify patient
                if (aptPatient.phone_number) {
                  const patPhoneNumId = clinicForGuest.wa_phone_number_id || WA_PHONE_NUMBER_ID_GLOBAL;
                  await sendWaText(aptPatient.phone_number, `✅ Su turno del ${dtLabel} fue *confirmado* por el médico. ¡Le esperamos!`, patPhoneNumId);
                }
              }
            } else {
              const { data: rejected } = await supabase
                .from('appointments')
                .update({ status: 'cancelled' })
                .eq('id', pendingAppt.id)
                .eq('status', 'new')
                .select('id')
                .maybeSingle();

              if (!rejected) {
                await sendDoctor(`El turno ya fue procesado anteriormente.`);
              } else {
                await sendDoctor(`❌ Turno de ${aptPatient.full_name} el ${dtLabel} *rechazado*.`);
                // Notify patient
                if (aptPatient.phone_number) {
                  const patPhoneNumId = clinicForGuest.wa_phone_number_id || WA_PHONE_NUMBER_ID_GLOBAL;
                  await sendWaText(aptPatient.phone_number, `Le informamos que su turno del ${dtLabel} no pudo confirmarse. Por favor, comuníquese con nosotros para reagendar.`, patPhoneNumId);
                }
                // Notify waitlist
                fetch(`${SUPABASE_URL}/functions/v1/notify-waitlist`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_KEY}` },
                  body: JSON.stringify({ clinic_id: clinicForGuest.id }),
                }).catch(err => console.error('[webhook] Error triggering notify-waitlist (doctor reject):', err));
              }
            }

            return new Response(JSON.stringify({ ok: true, doctor: true }), {
              status: 200, headers: { 'Content-Type': 'application/json' },
            });
          }
        }
      }
      // ── Fin manejo doctor ────────────────────────────────────────────────

      await logAudit(supabase, {
        clinicId: clinicForGuest?.id ?? null, patientId: null, appointmentId: null,
        direction: 'inbound', phone: fromPhone,
        message: displayText, waMessageId, status: 'received',
      });

      if (clinicForGuest) {
        // Crear/reutilizar conversación sin paciente vinculado (guest)
        const guestConv = await upsertConversation(supabase, clinicForGuest.id, null, fromPhone);
        if (guestConv) {
          await insertMessage(supabase, {
            conversationId: guestConv.id,
            clinicId:       clinicForGuest.id,
            patientId:      null,
            direction:      'inbound',
            content:        displayText,
            status:         'received',
            metaMessageId:  waMessageId,
          });
          // El agente da la bienvenida y registra al nuevo paciente
          if (shouldAgentReply(guestConv, null)) {
            try {
              await fetch(`${SUPABASE_URL}/functions/v1/ai-agent-reply`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_KEY}` },
                body:    JSON.stringify({ conversationId: guestConv.id, clinicId: clinicForGuest.id }),
              });
            } catch (err) {
              console.error('[webhook] Error invoking ai-agent-reply for guest:', err);
            }
          }
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    const replyPhoneNumberId = await resolvePhoneNumberId(supabase, incomingPhoneNumId, patient.clinic_id);

    // ── Upsert conversation (using normalized phone) ───────────────────────
    const convData = await upsertConversation(
      supabase, patient.clinic_id, patient.id, fromPhone,
    );
    const conversationId = convData?.id ?? null;

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
        senderType:    null,
      });
    }

    // ── Find upcoming appointment (pending or new — recordatorio puede no haber cambiado estado) ──
    const { data: appointment } = await supabase
      .from('appointments')
      .select('id, status, appointment_datetime')
      .eq('patient_id', patient.id)
      .eq('clinic_id',  patient.clinic_id)
      .in('status', ['pending', 'new'])
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

    // ── Intent-based bot reply (appointment confirm/cancel/reschedule) ──────
    // This original bot only handles explicit appointment intents.
    // Generic messages are handled by the AI agent (below).
    const shouldBotReply = !!(appointment && intent);

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
          senderType:    'bot',
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

    // ── Duplicate button press: intent detectado pero no hay turno pendiente ──
    // El paciente volvió al chat y presionó un botón del recordatorio que ya procesó.
    // Buscamos si hay un turno próximo ya resuelto y avisamos que la selección ya fue registrada.
    const isButtonIntent = (msgType === 'button' || msgType === 'interactive') && !!intent;
    if (isButtonIntent && !appointment) {
      const { data: resolvedAppt } = await supabase
        .from('appointments')
        .select('id, status, appointment_datetime')
        .eq('patient_id', patient.id)
        .eq('clinic_id',  patient.clinic_id)
        .in('status', ['confirmed', 'cancelled', 'rescheduled'])
        .gte('appointment_datetime', new Date().toISOString())
        .order('appointment_datetime', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (resolvedAppt) {
        const STATUS_LABEL: Record<string, string> = {
          confirmed:   'confirmado ✅',
          cancelled:   'cancelado',
          rescheduled: 'reagendado',
        };
        const label = STATUS_LABEL[resolvedAppt.status as string] ?? 'procesado';
        await sendReply(
          `Su selección ya fue registrada: el turno se encuentra *${label}*. Si desea realizar algún cambio, comuníquese con nosotros.`
        );
        return new Response(JSON.stringify({ ok: true, dedup: 'button_already_processed' }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    if (shouldBotReply) {
      if (intent === 'confirm') {
        // Atomic update: only succeeds if status is still pending/new (prevents race conditions)
        const { data: confirmed } = await supabase
          .from('appointments')
          .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
          .eq('id', appointment!.id)
          .in('status', ['pending', 'new'])
          .select('id')
          .maybeSingle();

        if (!confirmed) {
          // Race condition: another button press already changed the status
          await sendReply(`Su selección ya fue registrada. Si desea realizar algún cambio, comuníquese con nosotros.`);
          return new Response(JSON.stringify({ ok: true, dedup: 'race_condition' }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
          });
        }
        await sendReply(`Su turno quedó *confirmado* ✅. Le esperamos, ${patient.full_name}.`);
        return new Response(JSON.stringify({ ok: true }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });

      } else if (intent === 'cancel') {
        // Atomic update: only succeeds if status is still pending/new
        const { data: cancelled } = await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('id', appointment!.id)
          .in('status', ['pending', 'new'])
          .select('id')
          .maybeSingle();

        if (!cancelled) {
          // Race condition: another button press already changed the status
          await sendReply(`Su turno ya había sido procesado anteriormente. Si necesita ayuda, comuníquese con nosotros directamente.`);
          return new Response(JSON.stringify({ ok: true, dedup: 'race_condition' }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
          });
        }
        await sendReply(`Entendido, ${patient.full_name}. Su turno fue *cancelado*. Cuando desee reagendar, con gusto le ayudamos.`);

        // Fire-and-forget: notificar lista de espera inmediatamente
        fetch(`${SUPABASE_URL}/functions/v1/notify-waitlist`, {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({ clinic_id: patient.clinic_id }),
        }).catch(err => console.error('[webhook] Error triggering notify-waitlist:', err));

        return new Response(JSON.stringify({ ok: true }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });

      } else if (intent === 'reschedule') {
        // No tocamos el turno acá — el AI agent lo marca como rescheduled
        // cuando ejecuta el tool reschedule_appointment.
        // Caemos al bloque AI agent para que pregunte fecha/hora.
        // Si el agente NO va a responder (ai_enabled=false o human_takeover activo),
        // enviamos un mensaje de fallback para que el paciente no quede en silencio.
        if (!shouldAgentReply(convData, patient)) {
          await sendReply(
            `Para reagendar su turno, por favor comuníquese con nosotros directamente o responda este mensaje y un representante lo atenderá a la brevedad.`
          );
          return new Response(JSON.stringify({ ok: true, reschedule: 'fallback_sent' }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // ── AI Handoff: determinar si el agente de IA debe responder ───────────
    // Solo se llega acá cuando NO hubo respuesta del bot de turnos (mensaje genérico).
    // Llamamos ai-agent-reply de forma sincrónica pero sin bloquear: respondemos a Meta
    // primero y el agente corre dentro del mismo ciclo de vida de esta invocación.
    if (conversationId && shouldAgentReply(convData, patient)) {
      console.log('[webhook] Invocando ai-agent-reply para conv:', conversationId);
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/ai-agent-reply`, {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({ conversationId, clinicId: patient.clinic_id }),
        });
      } catch (err) {
        console.error('[webhook] Error invocando ai-agent-reply:', err);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response('Method Not Allowed', { status: 405 });
});
