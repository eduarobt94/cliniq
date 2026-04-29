import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Env ──────────────────────────────────────────────────────────────────────
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')              ?? '';
const SUPABASE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WA_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')     ?? '';
const WA_PHONE_ID_GLOBAL = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? '';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Send free-form text (only valid within 24-h window) ─────────────────────
async function sendWaText(
  to: string,
  text: string,
  phoneNumberId: string,
): Promise<string | null> {
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

  if (!res.ok) {
    const err = await res.text();
    console.error('WA send error:', err);
    return null;
  }

  const data = await res.json();
  return data?.messages?.[0]?.id ?? null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: CORS });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  // ── Auth: verify caller's JWT ────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // Use service role for DB writes, but verify the user JWT first
  const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  let body: { conversation_id: string; content: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const { conversation_id, content } = body;
  if (!conversation_id || !content?.trim()) {
    return new Response(JSON.stringify({ error: 'conversation_id and content are required' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // ── Load conversation + clinic ───────────────────────────────────────────
  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .select(`
      id,
      clinic_id,
      patient_id,
      phone_number,
      clinics!inner ( wa_phone_number_id )
    `)
    .eq('id', conversation_id)
    .maybeSingle();

  if (convErr || !conv) {
    return new Response(JSON.stringify({ error: 'Conversation not found' }), {
      status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── Verify caller belongs to clinic ─────────────────────────────────────
  const { data: membership } = await supabase
    .from('clinics')
    .select('id, owner_id')
    .eq('id', conv.clinic_id)
    .maybeSingle();

  if (!membership) {
    return new Response(JSON.stringify({ error: 'Clinic not found' }), {
      status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const isOwner = membership.owner_id === user.id;
  if (!isOwner) {
    const { data: member } = await supabase
      .from('clinic_members')
      .select('id')
      .eq('clinic_id', conv.clinic_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!member) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
  }

  // ── Check 24-hour messaging window ───────────────────────────────────────
  const { data: lastInbound } = await supabase
    .from('messages')
    .select('created_at')
    .eq('conversation_id', conversation_id)
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const windowExpired = !lastInbound || (
    Date.now() - new Date(lastInbound.created_at).getTime() > 24 * 60 * 60 * 1000
  );

  if (windowExpired) {
    return new Response(JSON.stringify({
      error: 'window_expired',
      message: 'La ventana de 24 horas expiró. Solo podés enviar mensajes de plantilla.',
    }), {
      status: 422, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  // ── Send via WhatsApp API ─────────────────────────────────────────────────
  const clinic = conv.clinics as Record<string, string>;
  const phoneNumberId = clinic?.wa_phone_number_id || WA_PHONE_ID_GLOBAL;

  if (!phoneNumberId) {
    return new Response(JSON.stringify({ error: 'No WhatsApp phone number configured for this clinic' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const waId = await sendWaText(conv.phone_number, content.trim(), phoneNumberId);

  // ── Insert into messages ──────────────────────────────────────────────────
  const { data: msg, error: insertErr } = await supabase
    .from('messages')
    .insert({
      conversation_id,
      clinic_id:       conv.clinic_id,
      patient_id:      conv.patient_id ?? null,
      direction:       'outbound',
      content:         content.trim(),
      status:          waId ? 'sent' : 'failed',
      meta_message_id: waId ?? null,
    })
    .select()
    .single();

  if (insertErr) {
    console.error('Insert message error:', insertErr);
    return new Response(JSON.stringify({ error: 'Failed to save message' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, message: msg, wa_id: waId }), {
    status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
