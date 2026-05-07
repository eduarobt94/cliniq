import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Env ──────────────────────────────────────────────────────────────────────
const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')              ?? '';
const SUPABASE_KEY        = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WA_ACCESS_TOKEN     = Deno.env.get('WHATSAPP_ACCESS_TOKEN')     ?? '';
const WA_PHONE_ID_GLOBAL  = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')  ?? '';

// ─── Send free-form WhatsApp text (valid within 24-h conversation window) ─────
async function sendWaText(
  to: string,
  text: string,
  phoneNumberId: string,
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
      const err = await res.text();
      console.error(`WA text error to ${to}:`, err);
      return null;
    }

    const data = await res.json() as Record<string, unknown>;
    return ((data?.messages as Record<string, string>[])?.[0]?.id) ?? null;
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
  const results  = { notified: 0, skipped: 0, failed: 0 };

  // Opcional: si el body trae clinic_id, limitamos la búsqueda a esa clínica
  // (usado cuando el webhook lo llama directamente tras una cancelación)
  let filterClinicId: string | null = null;
  try {
    const body = await req.json() as Record<string, string>;
    filterClinicId = body?.clinic_id ?? null;
  } catch { /* body vacío — ok, el cron no envía body */ }

  try {
    // ── 1. Buscar citas canceladas sin notificar ────────────────────────────
    //    Solo de los últimos 7 días para no procesar historial antiguo.
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    let apptQuery = supabase
      .from('appointments')
      .select(`
        id,
        clinic_id,
        appointment_datetime,
        appointment_type,
        clinics!inner ( id, name, timezone, wa_phone_number_id, whatsapp_number )
      `)
      .eq('status', 'cancelled')
      .is('waitlist_notified_at', null)
      .gte('appointment_datetime', sevenDaysAgo);

    if (filterClinicId) {
      apptQuery = apptQuery.eq('clinic_id', filterClinicId);
    }

    const { data: cancelledAppts, error: apptErr } = await apptQuery;

    if (apptErr) {
      console.error('Error loading cancelled appointments:', apptErr);
      return new Response(JSON.stringify({ error: apptErr.message }), { status: 500 });
    }

    if (!cancelledAppts?.length) {
      return new Response(
        JSON.stringify({ ok: true, message: 'No cancelled appointments pending waitlist notification', ...results }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // ── 2. Para cada cita cancelada, notificar la lista de espera ───────────
    for (const appt of cancelledAppts) {
      const clinic = appt.clinics as Record<string, string>;

      // Buscar entradas de lista de espera para esta clínica
      const { data: waitlistEntries, error: wlErr } = await supabase
        .from('waiting_list')
        .select(`
          id,
          patient_id,
          service,
          preferred_date_from,
          preferred_date_to,
          patients!inner ( id, full_name, phone_number )
        `)
        .eq('clinic_id', appt.clinic_id)
        .eq('status', 'waiting');

      if (wlErr) {
        console.error(`Error loading waiting list for clinic ${appt.clinic_id}:`, wlErr);
        continue;
      }

      if (!waitlistEntries?.length) {
        // Marcar igualmente para no volver a procesar esta cita
        await supabase
          .from('appointments')
          .update({ waitlist_notified_at: new Date().toISOString() })
          .eq('id', appt.id);
        results.skipped++;
        continue;
      }

      const phoneNumberId = clinic?.wa_phone_number_id || WA_PHONE_ID_GLOBAL;
      if (!phoneNumberId) {
        console.error(`Clinic ${appt.clinic_id} has no WA phone number configured`);
        results.skipped++;
        continue;
      }

      // Notificar a cada paciente en lista de espera
      for (const entry of waitlistEntries) {
        const patient = entry.patients as Record<string, string>;

        if (!patient?.phone_number) { results.skipped++; continue; }

        // Filtro de servicio: si la entrada especifica servicio, verificar coincidencia
        if (entry.service && appt.appointment_type) {
          const entryService = entry.service.toLowerCase();
          const apptService  = (appt.appointment_type as string).toLowerCase();
          if (!apptService.includes(entryService) && !entryService.includes(apptService)) {
            results.skipped++;
            continue;
          }
        }

        const msgContent =
          `Hola ${patient.full_name} 👋 Tenemos una buena noticia: se liberó un turno en *${clinic.name ?? 'nuestra clínica'}*.\n\n` +
          `¿Le interesa agendarse? Responda *SÍ* y le confirmamos el turno, o ignore este mensaje si ya no lo necesita.`;

        const waId = await sendWaText(patient.phone_number, msgContent, phoneNumberId);

        if (waId) {
          // Upsert conversation
          const { data: convRow, error: convErr } = await supabase
            .from('conversations')
            .upsert(
              {
                clinic_id:    appt.clinic_id,
                patient_id:   patient.id,
                phone_number: patient.phone_number,
              },
              { onConflict: 'clinic_id,phone_number', ignoreDuplicates: false },
            )
            .select('id')
            .single();

          if (!convErr && convRow?.id) {
            // Insert message in inbox
            await supabase.from('messages').insert({
              conversation_id: convRow.id,
              clinic_id:       appt.clinic_id,
              patient_id:      patient.id,
              direction:       'outbound',
              sender_type:     'bot',
              content:         msgContent,
              status:          'sent',
              meta_message_id: waId,
            });
          }

          // Audit log
          await supabase.from('whatsapp_message_log').insert({
            clinic_id:      appt.clinic_id,
            patient_id:     patient.id,
            appointment_id: appt.id,
            direction:      'outbound',
            phone_number:   patient.phone_number,
            message:        msgContent,
            wa_message_id:  waId,
            status:         'sent',
          });

          // Marcar entrada de lista de espera como notificada
          await supabase
            .from('waiting_list')
            .update({ status: 'notified', notified_at: new Date().toISOString() })
            .eq('id', entry.id);

          console.log(`✅ Waitlist notified: ${patient.phone_number} (entry ${entry.id})`);
          results.notified++;
        } else {
          // Audit log — fallo
          await supabase.from('whatsapp_message_log').insert({
            clinic_id:      appt.clinic_id,
            patient_id:     patient.id,
            appointment_id: appt.id,
            direction:      'outbound',
            phone_number:   patient.phone_number,
            message:        msgContent,
            wa_message_id:  null,
            status:         'failed',
          });

          console.log(`❌ Waitlist notify failed: ${patient.phone_number}`);
          results.failed++;
        }
      }

      // Marcar la cita como procesada (sin importar cuántos se notificaron)
      await supabase
        .from('appointments')
        .update({ waitlist_notified_at: new Date().toISOString() })
        .eq('id', appt.id);
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
