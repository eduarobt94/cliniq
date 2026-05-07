import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')              ?? '';
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WA_TOKEN     = Deno.env.get('WHATSAPP_ACCESS_TOKEN')     ?? '';
const WA_PHONE_ID  = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')  ?? '';

// ─── Render message template ──────────────────────────────────────────────────
function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

// ─── Send free-text WhatsApp message ─────────────────────────────────────────
async function sendWaText(to: string, text: string, phoneNumberId: string): Promise<string | null> {
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type:    'individual',
      to,
      type: 'text',
      text: { preview_url: false, body: text },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(`WA send error to ${to}:`, JSON.stringify(err));
    return null;
  }
  const data = await res.json();
  return data?.messages?.[0]?.id ?? null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const results  = { sent: 0, failed: 0, skipped: 0 };

  try {
    // 1. Load enabled review_request automations
    const { data: automations, error: autoErr } = await supabase
      .from('clinic_automations')
      .select('clinic_id, hours_after, message_template')
      .eq('type', 'review_request')
      .eq('enabled', true);

    if (autoErr) {
      console.error('Error loading automations:', autoErr);
      return new Response(JSON.stringify({ error: autoErr.message }), { status: 500 });
    }
    if (!automations?.length) {
      return new Response(JSON.stringify({ ok: true, message: 'No active review_request automations', ...results }), { status: 200 });
    }

    for (const auto of automations) {
      const hoursAfter = auto.hours_after ?? 2;
      const now        = new Date();

      // Window: appointments that finished hoursAfter hours ago (±1 hour buffer)
      const windowEnd   = new Date(now.getTime() - hoursAfter * 3_600_000);
      const windowStart = new Date(windowEnd.getTime()  - 3_600_000); // 1h back

      // 2. Find confirmed/completed appointments in window, no review sent yet
      const { data: appts, error: apptErr } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_datetime,
          patients!inner ( id, full_name, phone_number ),
          clinics!inner  ( name, timezone, wa_phone_number_id, settings )
        `)
        .eq('clinic_id', auto.clinic_id)
        .in('status', ['confirmed', 'completed'])
        .is('review_request_sent_at', null)
        .gte('appointment_datetime', windowStart.toISOString())
        .lte('appointment_datetime', windowEnd.toISOString());

      if (apptErr) {
        console.error(`Appointments error for clinic ${auto.clinic_id}:`, apptErr);
        continue;
      }

      for (const appt of (appts ?? [])) {
        const patient = appt.patients as Record<string, string>;
        const clinic  = appt.clinics  as Record<string, string>;

        if (!patient?.phone_number) { results.skipped++; continue; }

        const phoneNumberId = clinic?.wa_phone_number_id || WA_PHONE_ID;
        if (!phoneNumberId) { results.skipped++; continue; }

        // 3. Render message (support {review_url} placeholder)
        const clinicSettings = (clinic?.settings ?? {}) as Record<string, string>;
        const reviewUrl      = clinicSettings.google_review_url ?? '';
        const text = render(auto.message_template ?? '', {
          patient_name: patient.full_name ?? 'Paciente',
          clinic_name:  clinic.name       ?? 'la clínica',
          review_url:   reviewUrl,
        });

        // 4. Get or create conversation
        const { data: convRow, error: convErr } = await supabase
          .from('conversations')
          .upsert(
            { clinic_id: auto.clinic_id, patient_id: patient.id, phone_number: patient.phone_number },
            { onConflict: 'clinic_id,phone_number', ignoreDuplicates: false },
          )
          .select('id')
          .single();

        if (convErr || !convRow?.id) {
          console.error(`Conversation upsert error for ${patient.phone_number}:`, convErr);
          results.skipped++;
          continue;
        }

        // 5. Send
        const waId = await sendWaText(patient.phone_number, text, phoneNumberId);

        // 6. Record in messages table (direction: system_template keeps AI quiet)
        await supabase.from('messages').insert({
          conversation_id: convRow.id,
          clinic_id:       auto.clinic_id,
          patient_id:      patient.id,
          direction:       'system_template',
          content:         text,
          status:          waId ? 'sent' : 'failed',
          meta_message_id: waId ?? null,
        });

        // 7. Mark appointment so we never resend
        await supabase
          .from('appointments')
          .update({ review_request_sent_at: new Date().toISOString() })
          .eq('id', appt.id);

        // 8. Audit log
        await supabase.from('whatsapp_message_log').insert({
          clinic_id:      auto.clinic_id,
          patient_id:     patient.id,
          appointment_id: appt.id,
          direction:      'outbound',
          phone_number:   patient.phone_number,
          message:        text,
          wa_message_id:  waId ?? null,
          status:         waId ? 'sent' : 'failed',
        });

        if (waId) {
          console.log(`✅ Review request sent to ${patient.phone_number}`);
          results.sent++;
        } else {
          console.log(`❌ Review request failed for ${patient.phone_number}`);
          results.failed++;
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, ...results }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
});
