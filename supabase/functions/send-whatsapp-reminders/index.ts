import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Env ──────────────────────────────────────────────────────────────────────
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')              ?? '';
const SUPABASE_KEY              = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WA_ACCESS_TOKEN           = Deno.env.get('WHATSAPP_ACCESS_TOKEN')     ?? '';
const WA_PHONE_NUMBER_ID_GLOBAL = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')  ?? '';
const WA_TEMPLATE_NAME          = Deno.env.get('WHATSAPP_TEMPLATE_NAME')    ?? 'appointment_scheduling';
const WA_TEMPLATE_LANG          = Deno.env.get('WHATSAPP_TEMPLATE_LANG')    ?? 'es';

// ─── Threshold: below this, send conversational message; at or above, use template ──
const TEMPLATE_THRESHOLD_HOURS = 12;

// ─── Format date/time for a timezone ─────────────────────────────────────────
function formatForTimezone(iso: string, tz: string): { date: string; time: string } {
  const dt = new Date(iso);
  const date = dt.toLocaleDateString('es-UY', {
    timeZone: tz, weekday: 'long', day: 'numeric', month: 'long',
  });
  const time = dt.toLocaleTimeString('es-UY', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  });
  return { date: date.charAt(0).toUpperCase() + date.slice(1), time };
}

// ─── Render message template with variables ───────────────────────────────────
function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

// All Spanish language codes to try (in order of preference).
const LANG_CANDIDATES = [
  WA_TEMPLATE_LANG,
  'es_AR', 'es', 'es_ES', 'es_MX', 'es_US', 'es_UY', 'es_LA',
];

/**
 * Try sending a WhatsApp template with a specific language code.
 * Returns { waId, errorCode } — errorCode 132001 = wrong lang (keep trying).
 */
async function trySendWithLang(
  to: string,
  phoneNumberId: string,
  patientName: string,
  time: string,
  clinicName: string,
  lang: string,
): Promise<{ waId: string | null; errorCode: number | null }> {
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
          language: { code: lang },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: patientName },
                { type: 'text', text: time        },
                { type: 'text', text: clinicName  },
              ],
            },
          ],
        },
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as Record<string, unknown>;
      const errObj = body?.error as Record<string, unknown> | undefined;
      const code   = (errObj?.code as number) ?? null;
      console.error(`WA API [lang=${lang}] error sending to ${to}:`, JSON.stringify(body));
      return { waId: null, errorCode: code };
    }

    const data = await res.json() as Record<string, unknown>;
    const waId = ((data?.messages as Record<string, string>[])?.[0]?.id) ?? null;
    console.log(`✅ Template sent [lang=${lang}] to ${to}, waId=${waId}`);
    return { waId, errorCode: null };
  } catch (err) {
    console.error(`Fetch error sending to ${to}:`, err);
    return { waId: null, errorCode: null };
  }
}

/**
 * Send a WhatsApp template message, auto-detecting the correct language code.
 * Template params: {{1}} = patient_name, {{2}} = time, {{3}} = clinic_name
 */
async function sendWaTemplate(
  to: string,
  phoneNumberId: string,
  patientName: string,
  time: string,
  clinicName: string,
): Promise<string | null> {
  const seen = new Set<string>();
  for (const lang of LANG_CANDIDATES) {
    if (seen.has(lang)) continue;
    seen.add(lang);
    const { waId, errorCode } = await trySendWithLang(to, phoneNumberId, patientName, time, clinicName, lang);
    if (waId) return waId;
    if (errorCode !== 132001) return null;
    console.log(`Lang ${lang} not found for template ${WA_TEMPLATE_NAME}, trying next...`);
  }
  console.error(`No valid language found for template ${WA_TEMPLATE_NAME}`);
  return null;
}

/**
 * Send a free-form WhatsApp text message (conversational, within 24h window).
 * Used when hours_before < TEMPLATE_THRESHOLD_HOURS.
 */
async function sendWaFreeText(
  to: string,
  phoneNumberId: string,
  text: string,
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
        type: 'text',
        text: { preview_url: false, body: text },
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error(`WA free-text error sending to ${to}:`, JSON.stringify(body));
      return null;
    }

    const data = await res.json() as Record<string, unknown>;
    const waId = ((data?.messages as Record<string, string>[])?.[0]?.id) ?? null;
    console.log(`✅ Free-text reminder sent to ${to}, waId=${waId}`);
    return waId;
  } catch (err) {
    console.error(`Fetch error (free-text) sending to ${to}:`, err);
    return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const results  = { sent: 0, failed: 0, skipped: 0 };

  try {
    // ── 1. Load enabled automations ─────────────────────────────────────────
    const { data: automations, error: autoError } = await supabase
      .from('clinic_automations')
      .select('clinic_id, hours_before, message_template')
      .eq('type',    'appointment_reminder')
      .eq('enabled', true);

    if (autoError) {
      console.error('Error loading automations:', autoError);
      return new Response(JSON.stringify({ error: autoError.message }), { status: 500 });
    }

    if (!automations?.length) {
      return new Response(JSON.stringify({ ok: true, message: 'No active automations', ...results }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── 2. For each clinic, find appointments in the reminder window ────────
    async function processAutomation(auto: {
      clinic_id: string;
      hours_before: number;
      message_template: string | null;
    }): Promise<{ sent: number; failed: number; skipped: number }> {
      const r = { sent: 0, failed: 0, skipped: 0 };
      const now         = new Date();
      const windowStart = new Date(now.getTime() + (auto.hours_before * 60 - 30) * 60 * 1000);
      const windowEnd   = new Date(now.getTime() + (auto.hours_before * 60 + 30) * 60 * 1000);

      // Determine which send strategy to use
      const useConversational = auto.hours_before < TEMPLATE_THRESHOLD_HOURS;

      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_datetime,
          notes,
          patients!inner ( id, full_name, phone_number, clinic_id ),
          clinics!inner  ( name, timezone, wa_phone_number_id )
        `)
        .eq('clinic_id',             auto.clinic_id)
        .in('status',                ['new', 'confirmed'])
        .is('reminder_sent_at',      null)
        .gte('appointment_datetime', windowStart.toISOString())
        .lte('appointment_datetime', windowEnd.toISOString());

      if (apptError) {
        console.error(`Error loading appointments for clinic ${auto.clinic_id}:`, apptError);
        return r;
      }

      await Promise.all((appointments ?? []).map(async (appt) => {
        const patient = appt.patients as Record<string, string>;
        const clinic  = appt.clinics  as Record<string, string>;

        if (!patient?.phone_number) { r.skipped++; return; }

        const phoneNumberId = clinic?.wa_phone_number_id || WA_PHONE_NUMBER_ID_GLOBAL;
        if (!phoneNumberId) {
          console.error(`Clinic ${auto.clinic_id} has no WA phone number configured`);
          r.skipped++;
          return;
        }

        const tz = clinic?.timezone ?? 'America/Montevideo';
        const { date, time } = formatForTimezone(appt.appointment_datetime, tz);

        // ── Extract service from appointment notes ────────────────────────
        const notesStr = String((appt as Record<string, unknown>).notes ?? '');
        const svcMatch = notesStr.match(/Servicio:\s*([^—\n]+)/);
        const service  = svcMatch ? svcMatch[1].trim() : 'su consulta';

        let waId: string | null = null;
        let msgContent: string;
        let msgDirection: string;

        if (useConversational) {
          // ── Conversational path: free-form message with confirmation request ──
          const defaultTemplate =
            'Hola {patient_name} 👋 Le recordamos su turno en {clinic_name} para {service} el {appointment_date} a las {appointment_time}.\n\n¿Confirma su asistencia? Responda *Sí* para confirmar o *No* si no puede asistir.';

          const rendered = renderTemplate(
            auto.message_template ?? defaultTemplate,
            {
              patient_name:     patient.full_name,
              clinic_name:      clinic.name ?? 'el consultorio',
              service,
              appointment_date: date,
              appointment_time: time,
            },
          );

          waId         = await sendWaFreeText(patient.phone_number, phoneNumberId, rendered);
          msgContent   = rendered;
          msgDirection = 'outbound_ai'; // visible en inbox, activa flujo de confirmación del agente IA
        } else {
          // ── Template path: Meta approved template (required for ≥12h) ────
          waId = await sendWaTemplate(
            patient.phone_number,
            phoneNumberId,
            patient.full_name,
            time,
            clinic.name ?? 'el consultorio',
          );
          msgContent   = `📅 Recordatorio de turno enviado — ${WA_TEMPLATE_NAME} — ${patient.full_name}, ${time} en ${clinic.name}`;
          msgDirection = 'system_template';
        }

        if (waId) {
          // ── Mark appointment as reminded + upsert conversation in parallel ──
          const [, { data: convRow, error: convErr }] = await Promise.all([
            supabase
              .from('appointments')
              .update({ status: 'pending', reminder_sent_at: new Date().toISOString() })
              .eq('id', appt.id),
            supabase
              .from('conversations')
              .upsert(
                {
                  clinic_id:    auto.clinic_id,
                  patient_id:   patient.id,
                  phone_number: patient.phone_number,
                },
                { onConflict: 'clinic_id,phone_number', ignoreDuplicates: false },
              )
              .select('id')
              .single(),
          ]);

          // ── Inbox message + audit log in parallel ─────────────────────────
          await Promise.all([
            ...((!convErr && convRow?.id) ? [
              supabase.from('messages').insert({
                conversation_id: convRow.id,
                clinic_id:       auto.clinic_id,
                patient_id:      patient.id,
                direction:       msgDirection,
                content:         msgContent,
                status:          'sent',
                meta_message_id: waId,
              }),
            ] : []),
            supabase.from('whatsapp_message_log').insert({
              clinic_id:      auto.clinic_id,
              patient_id:     patient.id,
              appointment_id: appt.id,
              direction:      'outbound',
              phone_number:   patient.phone_number,
              message:        msgContent,
              wa_message_id:  waId,
              status:         'sent',
            }),
          ]);

          if (convErr) {
            console.error(`Conversation upsert error for ${patient.phone_number}:`, convErr);
          }
          console.log(`✅ Reminder (${useConversational ? 'conversational' : 'template'}) sent to ${patient.phone_number} (waId: ${waId})`);
          r.sent++;
        } else {
          // ── Failed send — just log it ─────────────────────────────────────
          await supabase.from('whatsapp_message_log').insert({
            clinic_id:      auto.clinic_id,
            patient_id:     patient.id,
            appointment_id: appt.id,
            direction:      'outbound',
            phone_number:   patient.phone_number,
            message:        msgContent ?? '',
            wa_message_id:  null,
            status:         'failed',
          });

          console.log(`❌ Reminder failed for ${patient.phone_number}`);
          r.failed++;
        }
      }));
      return r;
    }

    const perClinic = await Promise.all(automations.map(processAutomation));
    for (const r of perClinic) {
      results.sent    += r.sent;
      results.failed  += r.failed;
      results.skipped += r.skipped;
    }

    return new Response(JSON.stringify({ ok: true, ...results }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
});
