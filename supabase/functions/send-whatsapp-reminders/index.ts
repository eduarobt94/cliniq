import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Env ──────────────────────────────────────────────────────────────────────
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')              ?? '';
const SUPABASE_KEY              = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WA_ACCESS_TOKEN           = Deno.env.get('WHATSAPP_ACCESS_TOKEN')     ?? '';
const WA_PHONE_NUMBER_ID_GLOBAL = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')  ?? '';
const WA_TEMPLATE_NAME          = Deno.env.get('WHATSAPP_TEMPLATE_NAME')    ?? 'recordatorio_turno';
const WA_TEMPLATE_LANG          = Deno.env.get('WHATSAPP_TEMPLATE_LANG')    ?? 'es';

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

/**
 * Send a WhatsApp template message.
 * Template params: {{1}} = patient_name, {{2}} = time, {{3}} = clinic_name
 */
async function sendWaTemplate(
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
      const err = await res.text();
      console.error(`WA API error sending to ${to} via ${phoneNumberId}:`, err);
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

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const results  = { sent: 0, failed: 0, skipped: 0 };

  try {
    // ── 1. Load enabled automations ─────────────────────────────────────────
    const { data: automations, error: autoError } = await supabase
      .from('clinic_automations')
      .select('clinic_id, hours_before')
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
      const windowStart = new Date(now.getTime() + (auto.hours_before * 60 - 30) * 60 * 1000);
      const windowEnd   = new Date(now.getTime() + (auto.hours_before * 60 + 30) * 60 * 1000);

      const { data: appointments, error: apptError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_datetime,
          patients!inner ( id, full_name, phone_number, clinic_id ),
          clinics!inner  ( name, timezone, wa_phone_number_id )
        `)
        .eq('clinic_id',             auto.clinic_id)
        .eq('status',                'new')
        .is('reminder_sent_at',      null)
        .gte('appointment_datetime', windowStart.toISOString())
        .lte('appointment_datetime', windowEnd.toISOString());

      if (apptError) {
        console.error(`Error loading appointments for clinic ${auto.clinic_id}:`, apptError);
        continue;
      }

      for (const appt of (appointments ?? [])) {
        const patient = appt.patients as Record<string, string>;
        const clinic  = appt.clinics  as Record<string, string>;

        if (!patient?.phone_number) { results.skipped++; continue; }

        const phoneNumberId = clinic?.wa_phone_number_id || WA_PHONE_NUMBER_ID_GLOBAL;
        if (!phoneNumberId) {
          console.error(`Clinic ${auto.clinic_id} has no WA phone number configured`);
          results.skipped++;
          continue;
        }

        const tz = clinic?.timezone ?? 'America/Montevideo';
        const { time } = formatForTimezone(appt.appointment_datetime, tz);

        const waId = await sendWaTemplate(
          patient.phone_number,
          phoneNumberId,
          patient.full_name,
          time,
          clinic.name ?? 'el consultorio',
        );

        // Build readable message for the log
        const logMessage =
          `[Template: ${WA_TEMPLATE_NAME}] ` +
          `Hola ${patient.full_name}, turno mañana a las ${time} en ${clinic.name}.`;

        if (waId) {
          await supabase
            .from('appointments')
            .update({ status: 'pending', reminder_sent_at: new Date().toISOString() })
            .eq('id', appt.id);

          await supabase.from('whatsapp_message_log').insert({
            clinic_id:      auto.clinic_id,
            patient_id:     patient.id,
            appointment_id: appt.id,
            direction:      'outbound',
            phone_number:   patient.phone_number,
            message:        logMessage,
            wa_message_id:  waId,
            status:         'sent',
          });

          results.sent++;
        } else {
          await supabase.from('whatsapp_message_log').insert({
            clinic_id:      auto.clinic_id,
            patient_id:     patient.id,
            appointment_id: appt.id,
            direction:      'outbound',
            phone_number:   patient.phone_number,
            message:        logMessage,
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
