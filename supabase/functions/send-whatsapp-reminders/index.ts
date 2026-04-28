import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Env ──────────────────────────────────────────────────────────────────────
const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')              ?? '';
const SUPABASE_KEY       = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WA_ACCESS_TOKEN    = Deno.env.get('WHATSAPP_ACCESS_TOKEN')     ?? '';
const WA_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')  ?? '';

const WA_API = `https://graph.facebook.com/v19.0/${WA_PHONE_NUMBER_ID}/messages`;

// ─── Template renderer ────────────────────────────────────────────────────────
function renderTemplate(
  template: string,
  vars: { patient_name: string; date: string; time: string }
): string {
  return template
    .replace(/\{patient_name\}/g, vars.patient_name)
    .replace(/\{date\}/g,         vars.date)
    .replace(/\{time\}/g,         vars.time);
}

/** Format appointment_datetime for a given timezone */
function formatForTimezone(iso: string, tz: string): { date: string; time: string } {
  const dt = new Date(iso);
  const date = dt.toLocaleDateString('es-UY', {
    timeZone: tz,
    weekday: 'long',
    day:     'numeric',
    month:   'long',
  });
  const time = dt.toLocaleTimeString('es-UY', {
    timeZone: tz,
    hour:     '2-digit',
    minute:   '2-digit',
    hour12:   false,
  });
  // Capitalize weekday
  return { date: date.charAt(0).toUpperCase() + date.slice(1), time };
}

/** Send a text message via WhatsApp Cloud API. Returns wa_message_id or null. */
async function sendWaText(to: string, text: string): Promise<string | null> {
  try {
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
      const err = await res.text();
      console.error(`WA API error sending to ${to}:`, err);
      return null;
    }

    const data = await res.json();
    return data?.messages?.[0]?.id ?? null;
  } catch (err) {
    console.error(`Fetch error sending to ${to}:`, err);
    return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200 });
  }

  // Accept calls from pg_cron (no body required) or manual POST
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const results = { sent: 0, failed: 0, skipped: 0 };

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
    for (const auto of automations) {
      const now         = new Date();
      // Window: [now + hours_before - 30min, now + hours_before + 30min]
      // Gives a 1-hour window to catch the cron even if it runs slightly late/early
      const windowStart = new Date(now.getTime() + (auto.hours_before * 60 - 30) * 60 * 1000);
      const windowEnd   = new Date(now.getTime() + (auto.hours_before * 60 + 30) * 60 * 1000);

      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_datetime,
          appointment_type,
          patients!inner (
            id,
            full_name,
            phone_number,
            clinic_id
          ),
          clinics!inner (
            timezone,
            whatsapp_number
          )
        `)
        .eq('clinic_id',        auto.clinic_id)
        .eq('status',           'new')
        .is('reminder_sent_at', null)
        .gte('appointment_datetime', windowStart.toISOString())
        .lte('appointment_datetime', windowEnd.toISOString());

      if (apptError) {
        console.error(`Error loading appointments for clinic ${auto.clinic_id}:`, apptError);
        continue;
      }

      for (const appt of (appointments ?? [])) {
        const patient = appt.patients as Record<string, string>;
        const clinic  = appt.clinics  as Record<string, string>;

        if (!patient?.phone_number) {
          results.skipped++;
          continue;
        }

        // Format date/time in the clinic's timezone
        const tz = clinic?.timezone ?? 'America/Montevideo';
        const { date, time } = formatForTimezone(appt.appointment_datetime, tz);

        const messageText = renderTemplate(auto.message_template, {
          patient_name: patient.full_name,
          date,
          time,
        });

        // Send via WhatsApp API
        const waId = await sendWaText(patient.phone_number, messageText);

        if (waId) {
          // Update appointment: set status='pending' and reminder_sent_at
          await supabase
            .from('appointments')
            .update({
              status:           'pending',
              reminder_sent_at: new Date().toISOString(),
            })
            .eq('id', appt.id);

          // Log outbound message
          await supabase.from('whatsapp_message_log').insert({
            clinic_id:      auto.clinic_id,
            patient_id:     patient.id,
            appointment_id: appt.id,
            direction:      'outbound',
            phone_number:   patient.phone_number,
            message:        messageText,
            wa_message_id:  waId,
            status:         'sent',
          });

          results.sent++;
        } else {
          // Log failed attempt
          await supabase.from('whatsapp_message_log').insert({
            clinic_id:      auto.clinic_id,
            patient_id:     patient.id,
            appointment_id: appt.id,
            direction:      'outbound',
            phone_number:   patient.phone_number,
            message:        messageText,
            wa_message_id:  null,
            status:         'failed',
          });

          results.failed++;
        }
      }
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
