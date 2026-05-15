import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')              ?? '';
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WA_TOKEN     = Deno.env.get('WHATSAPP_ACCESS_TOKEN')     ?? '';
const WA_PHONE_ID  = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')  ?? '';

// Max patients to contact per clinic per run (anti-spam)
const MAX_PER_RUN = 20;

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
    // 1. Load enabled patient_reactivation automations
    const { data: automations, error: autoErr } = await supabase
      .from('clinic_automations')
      .select('clinic_id, months_inactive, message_template')
      .eq('type', 'patient_reactivation')
      .eq('enabled', true);

    if (autoErr) {
      console.error('Error loading automations:', autoErr);
      return new Response(JSON.stringify({ error: autoErr.message }), { status: 500 });
    }
    if (!automations?.length) {
      return new Response(JSON.stringify({ ok: true, message: 'No active patient_reactivation automations', ...results }), { status: 200 });
    }

    type AutoRow = { clinic_id: string; months_inactive: number | null; message_template: string | null };
    const perAutoResults = await Promise.all(automations.map(async (auto: AutoRow) => {
      const r = { sent: 0, failed: 0, skipped: 0 };
      const monthsInactive = auto.months_inactive ?? 6;

      // Cutoff date: patients with NO appointment after this date are eligible
      const inactiveSince = new Date();
      inactiveSince.setMonth(inactiveSince.getMonth() - monthsInactive);

      // Also: don't re-send reactivation within the same inactivity period
      const reactivationCutoff = inactiveSince.toISOString();

      // 2+3. Fetch recent and all-time appointments in parallel
      const [{ data: recentAppts }, { data: anyAppts }] = await Promise.all([
        supabase
          .from('appointments')
          .select('patient_id')
          .eq('clinic_id', auto.clinic_id)
          .gte('appointment_datetime', inactiveSince.toISOString())
          .in('status', ['new', 'pending', 'confirmed', 'completed'])
          .not('patient_id', 'is', null),
        supabase
          .from('appointments')
          .select('patient_id')
          .eq('clinic_id', auto.clinic_id)
          .not('patient_id', 'is', null),
      ]);

      const activeIds = new Set((recentAppts ?? []).map((a: Record<string, string>) => a.patient_id));
      const patientsWithHistory = [...new Set((anyAppts ?? []).map((a: Record<string, string>) => a.patient_id))];
      const inactiveIds = patientsWithHistory.filter(id => !activeIds.has(id));

      if (!inactiveIds.length) return r;

      // 4. Get details for inactive patients (not recently reactivated, with phone)
      const { data: patients, error: patErr } = await supabase
        .from('patients')
        .select('id, full_name, phone_number, last_reactivation_sent_at')
        .in('id', inactiveIds)
        .not('phone_number', 'is', null);

      if (patErr) {
        console.error(`Patients query error for clinic ${auto.clinic_id}:`, patErr);
        return r;
      }

      // 5. Filter: not reactivated recently
      const eligible = (patients ?? [])
        .filter((p: Record<string, string | null>) => {
          if (!p.last_reactivation_sent_at) return true;
          return p.last_reactivation_sent_at < reactivationCutoff;
        })
        .slice(0, MAX_PER_RUN);

      if (!eligible.length) return r;

      // 6. Get clinic config (timezone, WA phone)
      const { data: clinic } = await supabase
        .from('clinics')
        .select('name, wa_phone_number_id')
        .eq('id', auto.clinic_id)
        .maybeSingle();

      const phoneNumberId = (clinic as Record<string, string> | null)?.wa_phone_number_id || WA_PHONE_ID;
      const clinicName    = (clinic as Record<string, string> | null)?.name ?? 'la clínica';

      if (!phoneNumberId) {
        console.error(`Clinic ${auto.clinic_id} has no WA phone number`);
        return r;
      }

      await Promise.all(eligible.map(async (patient) => {
        const p = patient as Record<string, string>;

        // 7. Render message
        const text = render(auto.message_template ?? '', {
          patient_name: p.full_name ?? 'Paciente',
          clinic_name:  clinicName,
        });

        // 8. Get or create conversation
        const { data: convRow, error: convErr } = await supabase
          .from('conversations')
          .upsert(
            { clinic_id: auto.clinic_id, patient_id: p.id, phone_number: p.phone_number },
            { onConflict: 'clinic_id,phone_number', ignoreDuplicates: false },
          )
          .select('id')
          .single();

        if (convErr || !convRow?.id) {
          console.error(`Conversation upsert error for ${p.phone_number}:`, convErr);
          r.skipped++;
          return;
        }

        // 9. Send
        const waId = await sendWaText(p.phone_number, text, phoneNumberId);

        // 10+11+12. Record message, update patient, audit log — all independent, run in parallel
        await Promise.all([
          supabase.from('messages').insert({
            conversation_id: convRow.id,
            clinic_id:       auto.clinic_id,
            patient_id:      p.id,
            direction:       'system_template',
            content:         text,
            status:          waId ? 'sent' : 'failed',
            meta_message_id: waId ?? null,
          }),
          // 11. Update patient — mark reactivation sent (even on failure, to avoid spam loop)
          supabase
            .from('patients')
            .update({ last_reactivation_sent_at: new Date().toISOString() })
            .eq('id', p.id),
          supabase.from('whatsapp_message_log').insert({
            clinic_id:     auto.clinic_id,
            patient_id:    p.id,
            direction:     'outbound',
            phone_number:  p.phone_number,
            message:       text,
            wa_message_id: waId ?? null,
            status:        waId ? 'sent' : 'failed',
          }),
        ]);

        if (waId) {
          console.log(`✅ Reactivation sent to ${p.phone_number}`);
          r.sent++;
        } else {
          console.log(`❌ Reactivation failed for ${p.phone_number} (may be outside 24h window)`);
          r.failed++;
        }
      }));
      return r;
    }));

    for (const r of perAutoResults) {
      results.sent    += r.sent;
      results.failed  += r.failed;
      results.skipped += r.skipped;
    }

    return new Response(JSON.stringify({ ok: true, ...results }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
});
