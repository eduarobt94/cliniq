import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.0';
import { verifyCronSecret } from '../_shared/security.ts';

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

// In-memory cache: phone number → language code that succeeded last.
// Scoped to this function invocation — avoids redundant language retries within one cron run.
const langCache = new Map<string, string>();

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
  // If we already know the correct language for this number, try it first.
  const cached = langCache.get(to);
  const langsToTry = cached
    ? [cached, ...LANG_CANDIDATES.filter(l => l !== cached)]
    : LANG_CANDIDATES;

  const seen = new Set<string>();
  for (const lang of langsToTry) {
    if (seen.has(lang)) continue;
    seen.add(lang);
    const { waId, errorCode } = await trySendWithLang(to, phoneNumberId, patientName, time, clinicName, lang);
    if (waId) {
      langCache.set(to, lang); // cache successful language for this invocation
      return waId;
    }
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

  // CN-002: Validate cron caller identity
  if (!verifyCronSecret(req)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const results  = { sent: 0, failed: 0, skipped: 0 };

  try {
    // ── 0. Prevent concurrent / too-recent executions ───────────────────────
    const { data: lastRunRow } = await supabase
      .from('ai_config')
      .select('value')
      .eq('key', 'reminders_last_run')
      .maybeSingle();

    const lastRunTime = lastRunRow?.value ? new Date(lastRunRow.value) : null;
    const now = new Date();
    if (lastRunTime && (now.getTime() - lastRunTime.getTime()) < 4 * 60 * 1000) {
      console.log('[reminders] Too recent, skipping');
      return new Response(JSON.stringify({ ok: true, message: 'Too recent' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    await supabase
      .from('ai_config')
      .upsert({ key: 'reminders_last_run', value: now.toISOString() });

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
          status,
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

      // ── Process appointments in batches to avoid WA rate limits ───────────
      const SEND_BATCH_SIZE = 10;
      const SEND_DELAY_MS   = 150;

      async function sendReminder(appt: Record<string, unknown>): Promise<void> {
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

        // NUEVO-MEDIO-4 (audit): claim atómico ANTES de enviar. El lock
        // reminders_last_run es check-then-set (no atómico) y dos ejecuciones
        // solapadas del cron podían doble-enviar. Solo un worker gana este UPDATE
        // condicional; el perdedor sale sin enviar. Si el envío falla, se revierte
        // el claim para que el próximo tick reintente.
        const { data: claim } = await supabase
          .from('appointments')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('id', appt.id)
          .is('reminder_sent_at', null)
          .select('id')
          .maybeSingle();
        if (!claim) {
          console.log(`[reminders] Claim perdido para appt ${appt.id} — otro worker lo tomó`);
          r.skipped++;
          return;
        }

        let waId: string | null = null;
        let msgContent: string;
        let msgDirection: string;

        if (useConversational) {
          // ── Conversational path: free-form message with confirmation request ──
          const defaultTemplate =
            'Hola {patient_name} 👋 Le escribimos desde {clinic_name} para recordarle que tiene un turno el {appointment_date} a las {appointment_time}.\n\n¿Va a poder asistir?';

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

          // NUEVO-MEDIO-5 (audit): Meta rechaza free-text sin sesión abierta
          // (ventana de 24h). Si falla, fallback al template aprobado para que
          // el paciente igual reciba el recordatorio.
          if (!waId) {
            console.warn(`[reminders] Free-text falló para ${patient.phone_number} (¿ventana 24h?) — fallback a template`);
            waId = await sendWaTemplate(
              patient.phone_number,
              phoneNumberId,
              patient.full_name,
              time,
              clinic.name ?? 'el consultorio',
            );
            if (waId) {
              msgContent   = `📅 Recordatorio de turno enviado (fallback template) — ${patient.full_name}, ${time} en ${clinic.name}`;
              msgDirection = 'system_template';
            }
          }
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
          // NUEVO-ALTO-1 (audit): NO degradar turnos ya confirmados a 'pending'.
          // Solo los 'new' pasan a 'pending' (esperando respuesta al recordatorio).
          // reminder_sent_at ya quedó marcado por el claim atómico de arriba.
          const wasNew = (appt as Record<string, unknown>).status === 'new';
          const [, { data: convRow, error: convErr }] = await Promise.all([
            wasNew
              ? supabase.from('appointments').update({ status: 'pending' }).eq('id', appt.id)
              : Promise.resolve({ data: null, error: null }),
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
          // ── Failed send — revertir el claim para que el próximo tick reintente ──
          await supabase
            .from('appointments')
            .update({ reminder_sent_at: null })
            .eq('id', appt.id);

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
      }

      const apptList = appointments ?? [];
      for (let i = 0; i < apptList.length; i += SEND_BATCH_SIZE) {
        const batch = apptList.slice(i, i + SEND_BATCH_SIZE);
        await Promise.all(batch.map(sendReminder));
        if (i + SEND_BATCH_SIZE < apptList.length) {
          await new Promise(resolve => setTimeout(resolve, SEND_DELAY_MS));
        }
      }
      return r;
    }

    // ── Process automations in batches of 10 ──────────────────────────────────
    const BATCH_SIZE    = 10;
    const BATCH_DELAY_MS = 200;

    for (let i = 0; i < automations.length; i += BATCH_SIZE) {
      const batch = automations.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map(processAutomation));
      for (const r of batchResults) {
        results.sent    += r.sent;
        results.failed  += r.failed;
        results.skipped += r.skipped;
      }
      if (i + BATCH_SIZE < automations.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    // ── Healthcheck ping ─────────────────────────────────────────────────────
    const HEALTHCHECK_URL = Deno.env.get('HEALTHCHECK_REMINDERS_URL');
    if (HEALTHCHECK_URL) {
      fetch(HEALTHCHECK_URL).catch(() => {}); // fire-and-forget
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
