import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Env ──────────────────────────────────────────────────────────────────────
const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')              ?? '';
const SUPABASE_KEY              = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANTHROPIC_API_KEY         = Deno.env.get('ANTHROPIC_API_KEY')         ?? '';
const WA_ACCESS_TOKEN_GLOBAL    = Deno.env.get('WHATSAPP_ACCESS_TOKEN')     ?? '';
const WA_PHONE_NUMBER_ID_GLOBAL = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')  ?? '';

// ─── Escalation patterns ──────────────────────────────────────────────────────
// Patrones deliberadamente estrictos: solo escalar cuando hay intención explícita
// de hablar con una persona O hay urgencia médica real.
const ESCALATION_PATTERNS = [
  'quiero hablar con',
  'necesito hablar con',
  'hablar con alguien',
  'hablar con el médico',
  'hablar con el doctor',
  'hablar con la médica',
  'hablar con la doctora',
  'hablar con la recepcionista',
  'hablar con una persona',
  'persona real',
  'un humano',
  'emergencia',
  'dolor fuerte',
  'dolor intenso',
  'accidente',
  'sangrado',
  'no puedo respirar',
  'me desmayé',
  'perdí el conocimiento',
];

function requiresEscalation(text: string): boolean {
  const lower = text.toLowerCase();
  return ESCALATION_PATTERNS.some((p) => lower.includes(p));
}

// ─── Send WhatsApp text ───────────────────────────────────────────────────────
async function sendWaText(
  to: string,
  text: string,
  phoneNumberId: string,
  accessToken: string,
): Promise<string | null> {
  try {
    const api = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    const res = await fetch(api, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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
      console.error('[ai-agent-reply] WA send error:', await res.text());
      return null;
    }
    const data = await res.json();
    return data?.messages?.[0]?.id ?? null;
  } catch (err) {
    console.error('[ai-agent-reply] WA fetch error:', err);
    return null;
  }
}

// ─── Format upcoming appointments for system prompt ───────────────────────────
// Timezone de Uruguay (UTC-3, sin cambio de horario de verano desde 2015)
const UY_TZ = 'America/Montevideo';

function formatAppointments(appointments: Record<string, unknown>[]): string {
  if (!appointments?.length) return 'Sin turnos agendados';
  return appointments.map((a) => {
    const dtStr = (a.appointment_datetime as string) ?? (a.scheduled_at as string) ?? '';
    if (!dtStr) return `[ID:${a.id}] Turno sin fecha`;
    const dt = new Date(dtStr);
    // ⚠ Siempre mostrar en hora Uruguay — el servidor corre en UTC
    const fecha = dt.toLocaleDateString('es-UY', { timeZone: UY_TZ, weekday: 'long', day: 'numeric', month: 'long' });
    const hora  = dt.toLocaleTimeString('es-UY', { timeZone: UY_TZ, hour: '2-digit', minute: '2-digit', hour12: false });
    // Extract service from notes (stored as "[IA] Servicio: X — ..." or "Servicio: X")
    const notesStr = String(a.notes ?? '');
    const svcMatch = notesStr.match(/Servicio:\s*([^—\n]+)/);
    const svcLabel = svcMatch ? ` — Servicio: ${svcMatch[1].trim()}` : '';
    return `[ID:${a.id}] Turno el ${fecha} a las ${hora} (estado: ${a.status})${svcLabel}`;
  }).join('\n');
}

// ─── Format clinic schedule for system prompt ─────────────────────────────────
const SCHEDULE_DAY_NAMES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const CLOSURE_REASONS: Record<string, string> = {
  holiday: 'feriado', vacation: 'vacaciones', repair: 'reparación',
  remodeling: 'remodelación', emergency_close: 'cierre de emergencia', other: 'cierre',
};

function formatSchedule(rows: Record<string, unknown>[]): string {
  const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Lun→Dom
  return DISPLAY_ORDER.flatMap(dow => {
    const r = rows.find(x => (x.day_of_week as number) === dow);
    if (!r) return [];
    return [r.is_open
      ? `  ${SCHEDULE_DAY_NAMES[dow]}: ${r.open_time}–${r.close_time}`
      : `  ${SCHEDULE_DAY_NAMES[dow]}: cerrado`];
  }).join('\n');
}

function formatClosures(rows: Record<string, unknown>[] | null): string {
  if (!rows?.length) return '  Ninguno próximo.';
  return rows.map(r => {
    const dateLabel = new Date((r.date as string) + 'T12:00:00Z')
      .toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
    const reason = (r.reason_label as string) || CLOSURE_REASONS[r.reason as string] || 'cierre';
    const emerg  = r.accepts_emergencies ? ' (solo urgencias)' : '';
    return `  • ${dateLabel}: ${reason}${emerg}`;
  }).join('\n');
}

// ─── Build Claude message history from DB messages ────────────────────────────
// Incluye mensajes del staff (outbound) como respuestas del asistente,
// prefijados con "[Staff]" para que Claude sepa que fue una persona real.
function buildClaudeHistory(
  messages: Record<string, unknown>[],
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const msg of messages) {
    // Skip internal system notices — they'd confuse the model
    if (msg.sender_type === 'system') continue;

    const isInbound = msg.direction === 'inbound';
    const isStaff   = msg.sender_type === 'staff';

    const role: 'user' | 'assistant' = isInbound ? 'user' : 'assistant';

    // Prefijar mensajes del staff para que Claude tenga contexto real
    const rawContent = String(msg.content ?? '');
    const content    = isStaff ? `[Staff]: ${rawContent}` : rawContent;

    const last = history[history.length - 1];
    if (last && last.role === role) {
      last.content += '\n' + content;
    } else {
      history.push({ role, content });
    }
  }

  // Claude requires the conversation to start with a user turn
  while (history.length > 0 && history[0].role !== 'user') {
    history.shift();
  }

  return history;
}

// ─── Detect intent from last patient message ──────────────────────────────────
function detectIntent(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('turno') || lower.includes('agendar') || lower.includes('reservar')) return 'agendar_turno';
  if (lower.includes('cancelar') || lower.includes('cancelo')) return 'cancelar_turno';
  if (lower.includes('reagendar') || lower.includes('cambiar')) return 'reagendar';
  if (lower.includes('precio') || lower.includes('costo') || lower.includes('cuánto') || lower.includes('cuanto')) return 'consulta_precio';
  if (lower.includes('urgente') || lower.includes('urgencia') || lower.includes('dolor')) return 'urgencia';
  return 'consulta_general';
}

// ─── Main ─────────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  // Always return 200 — never expose internals to the outside
  try {
    if (req.method !== 'POST') {
      return new Response('ok', { status: 200 });
    }

    // ── A. Parse & validate input ───────────────────────────────────────────
    let body: { conversationId?: string; clinicId?: string; force?: boolean };
    try {
      body = await req.json();
    } catch {
      console.error('[ai-agent-reply] Invalid JSON body');
      return new Response('ok', { status: 200 });
    }

    const { conversationId, clinicId, force = false } = body;
    console.log('[ai-agent-reply] START conversationId:', conversationId, 'clinicId:', clinicId, 'force:', force);

    if (!conversationId || !clinicId) {
      console.error('[ai-agent-reply] Missing conversationId or clinicId');
      return new Response('ok', { status: 200 });
    }

    if (!ANTHROPIC_API_KEY) {
      console.error('[ai-agent-reply] ANTHROPIC_API_KEY no está configurado en secrets');
      return new Response('ok', { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // ── B. Load context ─────────────────────────────────────────────────────

    // 1. Conversation
    const { data: conv } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (!conv) {
      console.error('[ai-agent-reply] Conversation not found:', conversationId);
      return new Response('ok', { status: 200 });
    }

    // 2. Si el humano respondió hace menos de 2 min Y no es forzado → saltar (humano activo)
    // force=true lo usa pg_cron cuando ya pasaron 3 min sin respuesta.
    // Con 2 min de ventana, damos tiempo al humano para enviar mensajes seguidos.
    if (!force && conv.agent_mode === 'human' && conv.agent_last_human_reply_at) {
      const minutesSinceHuman =
        (Date.now() - new Date(conv.agent_last_human_reply_at).getTime()) / 60000;
      if (minutesSinceHuman < 2) {
        console.log(`[ai-agent-reply] Human active ${minutesSinceHuman.toFixed(1)}min ago, skipping`);
        return new Response('ok', { status: 200 });
      }
    }

    // 3. Patient — REGLA DE ORO 1: if ai_enabled=false → stop immediately
    let patient: Record<string, unknown> | null = null;
    if (conv.patient_id) {
      const { data } = await supabase
        .from('patients')
        .select('id, full_name, ai_enabled, last_human_interaction')
        .eq('id', conv.patient_id)
        .maybeSingle();
      patient = data;
    }

    if (patient && patient.ai_enabled === false) {
      console.log('[ai-agent-reply] AI disabled for patient:', conv.patient_id);
      return new Response('ok', { status: 200 });
    }

    // 4. Últimos 16 mensajes de las últimas 4 horas — evita que conversaciones
    //    viejas de testing confundan el contexto de Claude.
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    const { data: messagesRaw, error: msgError } = await supabase
      .from('messages')
      .select('id, direction, content, sender_type, created_at')
      .eq('conversation_id', conversationId)
      .gte('created_at', fourHoursAgo)
      .order('created_at', { ascending: false })  // newest first so limit keeps most recent
      .limit(16);
    // Reverse to restore chronological order for Claude
    const messages = (messagesRaw ?? []).reverse();
    console.log('[ai-agent-reply] messages loaded:', messages.length, msgError ? 'ERR:'+msgError.message : 'ok',
      '| patient_id:', conv.patient_id ?? 'null(guest)', '| agent_mode:', conv.agent_mode);

    // 5. Upcoming appointments
    let appointments: Record<string, unknown>[] = [];
    if (conv.patient_id) {
      const { data } = await supabase
        .from('appointments')
        .select('id, status, appointment_datetime, notes')
        .eq('patient_id', conv.patient_id)
        .not('status', 'eq', 'cancelled')
        .not('status', 'eq', 'rescheduled')
        .gte('appointment_datetime', new Date().toISOString())
        .order('appointment_datetime', { ascending: true })
        .limit(3);
      appointments = data ?? [];
    }

    // 6. Clinic
    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select('name, wa_phone_number_id, address, phone, email_contact, settings')
      .eq('id', clinicId)
      .maybeSingle();

    // 7. Clinic schedule (weekly hours + upcoming closures)
    const _nowUTCForSchedule = new Date();
    const _todayUY = new Date(_nowUTCForSchedule.getTime() - 3 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);
    const DEFAULT_SCHEDULE_ROWS = [0, 1, 2, 3, 4, 5, 6].map(dow => ({
      day_of_week: dow, is_open: dow >= 1 && dow <= 5,
      open_time: '09:00', close_time: '18:00',
    }));

    const [{ data: scheduleDbRows }, { data: closureRows }] = await Promise.all([
      supabase.from('clinic_schedule').select('day_of_week, is_open, open_time, close_time').eq('clinic_id', clinicId).order('day_of_week'),
      supabase.from('clinic_closures').select('date, reason, reason_label, accepts_emergencies').eq('clinic_id', clinicId).gte('date', _todayUY).order('date').limit(10),
    ]);

    // Merge DB rows with defaults so all 7 days are always present (same logic as frontend hook)
    const scheduleRows = DEFAULT_SCHEDULE_ROWS.map(def => {
      const row = scheduleDbRows?.find(r => (r.day_of_week as number) === def.day_of_week);
      return row ?? def;
    });

    if (clinicError) {
      console.error('[ai-agent-reply] Clinic query error:', clinicError.message);
    }
    if (!clinic) {
      console.error('[ai-agent-reply] Clinic not found:', clinicId);
      return new Response('ok', { status: 200 });
    }

    // ── C1. Verificar si hay mensajes del paciente sin respuesta ────────────────
    // Contar inbound consecutivos al final (sin ningún outbound después de ellos).
    // EXCEPCIÓN: si el último outbound del staff es solo un saludo corto ("hola", "ok", "bien", etc.)
    // y hay un mensaje inbound pendiente antes, consideramos que el paciente sigue sin respuesta real.
    const msgList = messages ?? [];
    let consecutiveUnanswered = 0;

    // Detectar si el último mensaje outbound del staff es un "saludo vacío" que no resolvió nada
    const STAFF_GREETINGS = ['hola', 'ok', 'bien', 'buenas', 'buen día', 'buenas tardes', 'buenas noches', 'ok!', 'hola!', '👍'];
    function isEmptyStaffReply(content: string): boolean {
      return STAFF_GREETINGS.includes(content.trim().toLowerCase());
    }

    for (let i = msgList.length - 1; i >= 0; i--) {
      const d = msgList[i].direction as string;
      const isStaffMsg = msgList[i].sender_type === 'staff';
      if (d === 'inbound') {
        consecutiveUnanswered++;
      } else if (d === 'outbound_ai') {
        break; // respuesta real de la IA → parar
      } else if (d === 'outbound' && isStaffMsg) {
        // Si es un saludo vacío del staff, seguir contando hacia atrás
        if (isEmptyStaffReply(String(msgList[i].content ?? ''))) {
          continue; // no detener la búsqueda de inbounds sin respuesta
        }
        break; // respuesta real del staff → parar
      } else if (d === 'system_template') {
        break;
      }
      // 'system' no cuenta como respuesta visible al paciente
    }

    // Si hay mensajes sin responder Y el humano lleva más de 2 min sin escribir
    // → la IA retoma aunque agent_mode sea 'human'
    const minutesSinceHumanForUnanswered = conv.agent_last_human_reply_at
      ? (Date.now() - new Date(conv.agent_last_human_reply_at).getTime()) / 60000
      : 999;

    if (!force && conv.agent_mode === 'human' && consecutiveUnanswered >= 1 && minutesSinceHumanForUnanswered >= 2) {
      console.log(`[ai-agent-reply] ${consecutiveUnanswered} msg(s) sin respuesta, humano inactivo ${minutesSinceHumanForUnanswered.toFixed(1)}min → IA retoma`);
      // Continuar (no hacer return) — la IA responderá
    }

    // ── C2. Escalation check ─────────────────────────────────────────────────
    const lastMsg    = msgList[msgList.length - 1];
    const lastText   = String(lastMsg?.content ?? '');

    if (requiresEscalation(lastText)) {
      console.log('[ai-agent-reply] Immediate escalation triggered for:', conversationId);
      await supabase.from('conversations').update({ agent_mode: 'human' }).eq('id', conversationId);
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        clinic_id:       clinicId,
        direction:       'system',
        sender_type:     'system',
        content:         '🔴 Escalado al staff — el paciente necesita atención humana',
        status:          'sent',
      });
      // Don't send anything to the patient — staff takes over
      return new Response('ok', { status: 200 });
    }

    // ── D. Build Claude message history ─────────────────────────────────────
    const claudeMessages = buildClaudeHistory(msgList);
    console.log('[ai-agent-reply] claudeMessages:', claudeMessages.length, '| isNewPatient:', !patient);
    if (claudeMessages.length === 0) {
      console.log('[ai-agent-reply] No processable messages for conversation:', conversationId);
      return new Response('ok', { status: 200 });
    }

    // ── E. Call Claude API ───────────────────────────────────────────────────
    const patientName = String(patient?.full_name ?? 'Paciente nuevo');
    const clinicName  = String(clinic.name ?? 'la clínica');

    // Calcular fecha/hora en zona Uruguay (UTC-3) — el servidor corre en UTC
    const UY_OFFSET_MS = -3 * 60 * 60 * 1000;
    const nowUtc   = new Date();
    const nowUY    = new Date(nowUtc.getTime() + UY_OFFSET_MS);

    // Hoy en formato legible
    const DAY_NAMES = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
    const MON_NAMES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const fechaHoy  = `${DAY_NAMES[nowUY.getUTCDay()]} ${nowUY.getUTCDate()} de ${MON_NAMES[nowUY.getUTCMonth()]} de ${nowUY.getUTCFullYear()}`;
    const horaHoy   = `${String(nowUY.getUTCHours()).padStart(2,'0')}:${String(nowUY.getUTCMinutes()).padStart(2,'0')}`;

    // Generar próximos 14 días con ISO date explícita
    // ⚠ Claude DEBE copiar estas fechas literalmente — no debe calcular fechas por su cuenta
    const proximosDias = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(nowUY.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
      const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
      return `  ${DAY_NAMES[d.getUTCDay()]} ${iso.slice(8)} de ${MON_NAMES[d.getUTCMonth()]} → ${iso}`;
    }).join('\n');

    const clinicAddress = String((clinic as Record<string,unknown>).address ?? '').trim();
    const clinicPhone   = String((clinic as Record<string,unknown>).phone   ?? '').trim();
    const clinicEmail   = String((clinic as Record<string,unknown>).email_contact ?? '').trim();

    const clinicInfoLines = [
      clinicAddress ? `- Dirección: ${clinicAddress}` : null,
      clinicPhone   ? `- Teléfono:  ${clinicPhone}`   : null,
      clinicEmail   ? `- Email:     ${clinicEmail}`    : null,
    ].filter(Boolean).join('\n');

    const isNewPatient = !patient; // número no registrado en el sistema

    const scheduleText  = formatSchedule(scheduleRows);
    const closuresText  = formatClosures(closureRows  ?? []);

    const COMMON_BLOCK = `
━━━ VOZ Y PRESENCIA ━━━

Representás a ${clinicName}. Escribís como una persona real que trabaja en la clínica: cálida, segura y profesional.
El paciente no debe notar ningún indicio de automatización. Tu tono es el de una recepcionista atenta de una clínica de primer nivel.

TRATAMIENTO — REGLA ABSOLUTA:
Siempre tratá al paciente de USTED. Sin excepciones.
Ejemplos correctos: "¿En qué le puedo ayudar?", "¿Qué día le queda bien?", "Le confirmo el turno.", "¿Qué servicio necesita?"
Ejemplos PROHIBIDOS: "¿Qué necesitás?", "¿Te viene bien?", "Te confirmo", "¿Querés agendar?"

CÓMO SONAR NATURAL:
- Variá las aperturas. No empieces todos los mensajes igual. Alternativas: "Con gusto.", "Por supuesto.", "Anotado.", "Entendido.", "Claro que sí." — según el contexto.
- Mostrá reacciones humanas breves cuando corresponda: "Gracias por comunicarse.", "Entiendo, no hay apuro.", "Claro que sí, con mucho gusto."
- Respondé al tono del paciente: si es formal, mantené formalidad; si es más relajado, puede ser cordial sin bajar el registro de usted.
- Nunca repitas el nombre del paciente en cada mensaje. Usalo solo cuando sea natural y genere cercanía.
- Evitá las frases de call center: "¡Gracias por contactarnos!", "¿Hay algo más en lo que pueda ayudarle?", "Quedamos a su disposición."
- Nada de listas, viñetas ni formato de documento. Escribís como se habla, en párrafo corto.
- Los signos de exclamación con moderación — uno por mensaje como máximo, solo cuando sea genuino.
- Si algo no salió bien → reconocelo con naturalidad: "Disculpe, permítame revisarlo."
- Nunca des la sensación de estar leyendo un guión. Respondé específicamente a lo que dijo el paciente.

━━━ GUÍA DE ESCENARIOS ━━━

▸ SALUDOS / PRIMER MENSAJE ("hola", "buenos días", "buenas tardes"):
  → Respondé con el saludo correspondiente al horario: "Buenos días.", "Buenas tardes.", "Buenas noches."
  → Primera vez: presentate con calidez — "Buenos días, le saluda ${clinicName}. ¿En qué le puedo ayudar?"
  → Si ya hubo intercambio previo → no te volvás a presentar. Entrá directo.

▸ CONSULTA DE HORARIOS ("¿cuándo atienden?", "¿a qué hora abren?", "¿atienden los sábados?"):
  → Respondé directamente con el HORARIO DE ATENCIÓN. Sin preámbulos.
  → Ejemplo de tono: "Atendemos de lunes a viernes, de 9:00 a 18:00 horas. Los sábados y domingos permanecemos cerrados."
  → Si hay cierres próximos relevantes, mencionálos: "Le comento que el [día] no vamos a estar disponibles por [motivo]."

▸ CONSULTA DE TURNOS ("¿tengo turno?", "¿cuál es mi turno?", "¿a qué hora es?"):
  → Respondé con los TURNOS ACTIVOS, con fecha y hora en lenguaje natural.
  → Si no tiene: "Por el momento no tiene turnos agendados. ¿Desea coordinar uno?"

▸ AGENDAR TURNO ("quiero turno", "necesito un turno", "¿puedo sacar hora?"):
  → Pedí los datos que falten de a uno: primero el servicio, luego el día, luego la hora.
  → Una sola pregunta por mensaje, nada más.
  → Con servicio + fecha + hora confirmados → llamá schedule_appointment. Sin pedir confirmación extra.
  → Si el día o la hora están fuera del horario de la clínica → informalo con amabilidad y proponé alternativa: "Ese día la clínica no trabaja. ¿Le quedaría bien otro día de la semana?"

▸ CONFIRMAR ASISTENCIA ("confirmo", "sí voy", "ahí voy", "confirmado"):
  → Llamá confirm_appointment de inmediato — el mensaje del paciente ES la confirmación.
  → Respondé con calidez: "Perfecto, quedó confirmado para el [fecha] a las [hora]. Le esperamos."

▸ CANCELAR TURNO ("cancelo", "no voy a poder ir", "quiero cancelar"):
  → Con 1 turno: cancelá directamente, sin pedir nueva confirmación.
  → Con varios: mostrá la lista y preguntá cuál cancelar.
  → Con ninguno: "Por el momento no tiene turnos activos para cancelar."
  → Respondé con cordialidad: "Listo, turno cancelado. Cuando guste volver a coordinar, con mucho gusto le ayudamos."

▸ REAGENDAR ("quiero reagendar", "puedo cambiar", "cambiar para el X", botón "Reagendar" de plantilla):
  → Con 1 turno y ya dio fecha+hora → ejecutá reschedule_appointment sin preguntar más.
  → Con 1 turno y sin fecha/hora → preguntá solo: "¿Para qué día y horario lo pasamos?"
  → Si ya preguntaste fecha/hora y el paciente respondió, y ya tiene el servicio → ejecutá reschedule_appointment YA.
  → Con varios turnos sin especificar → mostrá la lista y preguntá cuál mover.
  ⚠ OBLIGATORIO: NUNCA digas "reagendado", "listo" o similar sin haber llamado reschedule_appointment primero.
     Si el tool devuelve error → informalo al paciente y proponé alternativa. Si devuelve success → confirmá con la fecha/hora nueva.

▸ LISTA DE ESPERA ("no hay turnos", "quiero uno antes", "anotarme en lista", "lista de espera", "si se libera algo", "si se libera un turno", "avíseme si hay algo"):
  → Si el paciente ya indicó servicio y/o rango de fechas (o acepta cualquier turno) → llamá add_to_waitlist AHORA MISMO, sin preguntar más.
  → Si aún no indicó nada → preguntá solo: "¿Para qué servicio lo anoto? (opcional)" — no lo obligues a responder.
  → En cuanto tengas suficiente contexto (o si el paciente dijo que acepta cualquier turno) → llamá add_to_waitlist de inmediato.
  ⚠ OBLIGATORIO: NUNCA confirmes la inscripción, ni digas "anotado", "lo agendamos", "ya está" ni nada similar sin haber llamado add_to_waitlist primero. Llamar el tool es el primer paso, no el último.
  → Tras el éxito del tool: "Listo, lo anotamos en nuestra lista de espera. En cuanto se libere un turno le avisamos por este mismo WhatsApp."

▸ CONSULTA DE PRECIOS ("¿cuánto sale?", "¿qué precio tiene?"):
  → Nunca inventes cifras ni rangos.
  → Tono: "Los precios varían según el tratamiento y cada caso particular. Para un presupuesto preciso, lo ideal es coordinar una consulta. ¿Le ayudo a agendar?"

▸ CONSULTA DE SERVICIOS ("¿hacen blanqueamiento?", "¿atienden ortodoncia?"):
  → Confirmá solo lo que sabe con certeza. Si no tiene el dato → derivá.
  → "Para más información sobre los servicios disponibles, le recomiendo consultarlo directamente con el equipo. ¿Prefiere que alguien le contacte, o desea pasar por una consulta inicial?"

▸ CONSULTA DE OBRA SOCIAL / MUTUAL ("¿aceptan IAMC?", "¿trabajan con FONASA?"):
  → No inventes convenios que no tiene confirmados.
  → "Para ese detalle le recomiendo consultarlo directamente con la clínica al ${clinicPhone || 'teléfono de contacto'}."

▸ TURNO PARA UN FAMILIAR ("es para mi mamá", "es para mi hijo"):
  → Agendá normalmente registrando el nombre del familiar.
  → Notas del turno: "Paciente: [nombre familiar] — contacto vía [quien escribe]".
  → Si el familiar no está registrado → pedí su nombre: "¿Me indica el nombre completo de su familiar para anotarlo?"

▸ PREGUNTA MÉDICA ("¿tengo que ir en ayunas?", "¿me va a doler?", "¿puedo tomar medicación antes?"):
  → Nunca des indicaciones clínicas.
  → Derivá con naturalidad: "Esa consulta se la podrá hacer directamente al profesional que lo atienda. ¿Le ayudo a confirmar o coordinar el turno?"

▸ RESULTADOS O INDICACIONES ("¿llegaron mis análisis?", "¿qué me recetó?"):
  → No tiene acceso a esa información.
  → "Esa información la maneja el equipo de la clínica directamente. Le recomiendo comunicarse al ${clinicPhone || 'teléfono de contacto'} para que le puedan orientar."

▸ PACIENTE MOLESTO O CON QUEJA ("pésimo servicio", "llevo semanas esperando", "no me atienden"):
  → Empatía genuina, sin defensiva, sin frases de manual.
  → Algo como: "Entiendo su situación y le pido disculpas por los inconvenientes. Voy a trasladar esto al equipo para que se comuniquen con usted a la brevedad."
  → Terminá con [ESCALAR].

▸ URGENCIA MÉDICA ("me duele mucho", "tuve un accidente", "sangrado", "no puedo masticar"):
  → Serenidad y urgencia real: "Entiendo que es urgente. Voy a avisar al equipo de inmediato para que le den atención prioritaria."
  → Siempre terminar con [ESCALAR].

▸ NO RECONOCE LA CLÍNICA ("¿quiénes son?", "¿cómo consiguieron mi número?"):
  → Explicá con naturalidad: "Somos ${clinicName}, una clínica en Uruguay. Nos contactó anteriormente / tiene un turno agendado con nosotros."
  → Si no desea interactuar, no insistas.

▸ MENSAJES CORTOS O AMBIGUOS ("ok", "👍", "dale", "mmm"):
  → No supongas intención. Respondé simple: "Con gusto. ¿En qué le puedo ayudar?"
  → Si viene después de una pregunta tuya y el contexto lo permite → interpretalo como afirmación y avanzá.

▸ VARIOS MENSAJES SEGUIDOS (el paciente manda varios mensajes cortos):
  → Respondé al conjunto con un solo mensaje coherente.
  → Usá el último mensaje como ancla principal.

▸ FUERA DE HORARIO (paciente escribe de noche o madrugada):
  → Atendé con normalidad, sin mencionar el horario. La atención por este canal es continua.

━━━ REGLAS OPERATIVAS ━━━
- Nunca inventes precios, diagnósticos, resultados ni información clínica
- Nunca prometas un turno sin llamar a schedule_appointment
- Nunca pidas doble confirmación — si el paciente dijo que quiere hacer algo, ejecutalo
- IDs de turno: aparecen como [ID:uuid] en TURNOS ACTIVOS — usá siempre el ID exacto
- Fechas: siempre del CALENDARIO — nunca calcules por tu cuenta
- Extensión: máximo 3 oraciones por mensaje. WhatsApp, no email.

CUÁNDO ESCALAR (terminar con [ESCALAR]):
- Solicita explícitamente hablar con una persona real
- Urgencia o emergencia médica
- Queja grave o paciente muy molesto
- Situación que no puede resolver por su cuenta`;

    const systemPrompt = isNewPatient
      ? `Trabajás en la recepción de ${clinicName}, una clínica en Uruguay, y atendés consultas por WhatsApp.
Se comunicó un número que no está registrado en el sistema. Tu tarea es atenderlo con calidez — siempre de usted —, registrar su nombre y, si desea turno, agendárselo en esta misma conversación.

INFORMACIÓN DE LA CLÍNICA:
${clinicInfoLines || '(sin datos de contacto cargados aún)'}

HORARIO DE ATENCIÓN:
${scheduleText}

DÍAS NO DISPONIBLES PRÓXIMOS:
${closuresText}

FECHA Y HORA ACTUAL (hora Uruguay): ${fechaHoy}, ${horaHoy}

CALENDARIO — REGLA ABSOLUTA: cuando el paciente mencione un día, buscá en esta lista y copiá la fecha ISO exacta. NUNCA calcules fechas por tu cuenta.
${proximosDias}

FLUJO PARA CONTACTOS NUEVOS — seguí estos pasos en orden:

PASO 1 → Respondé al primer mensaje con calidez. Si solo saludó, saludá de vuelta y preguntá en qué puede ayudarle.
PASO 2 → Cuando corresponda, pedí el nombre completo con naturalidad: "¿Me podría indicar su nombre y apellido para registrarlo?"
          Si el paciente ya incluyó nombre Y apellido en el mismo mensaje ("Soy Juan Pérez", "Me llamo María González", "Hola, soy Pedro López"), pasá directamente al PASO 3 sin pedir confirmación.
          No registres si solo hay un nombre de pila sin apellido.
PASO 3 → Llamá register_patient con el nombre completo. El teléfono lo toma el sistema solo.
PASO 4 → Preguntá si desea coordinar un turno. Si sí: pedí servicio → día → hora, de a uno.
          Con los tres datos: llamá schedule_appointment.
PASO 4b (LISTA DE ESPERA) → Si el paciente menciona lista de espera o quiere anotarse para cuando se libere un turno:
          1. Si aún no fue registrado (no se llamó register_patient), llamá register_patient PRIMERO.
          2. Luego llamá add_to_waitlist inmediatamente con los datos disponibles.
          ⚠ NUNCA confirmes la inscripción en lista de espera sin haber llamado add_to_waitlist primero.

REGLAS OPERATIVAS:
- Nunca llamar register_patient sin nombre Y apellido confirmados
- Nunca llamar schedule_appointment antes de register_patient
- Para add_to_waitlist en paciente nuevo: siempre register_patient primero, en la misma ronda si es posible
- Si pregunta por la clínica antes de dar su nombre → respondé, después retomá el registro con naturalidad
${COMMON_BLOCK}`

      : `Trabajás en la recepción de ${clinicName}, una clínica en Uruguay, y atendés consultas por WhatsApp.
Conocés a los pacientes, sus turnos y la agenda de la clínica. Atendés siempre de usted, con calidez y eficiencia.

INFORMACIÓN DE LA CLÍNICA:
${clinicInfoLines || '(sin datos de contacto cargados aún)'}

HORARIO DE ATENCIÓN:
${scheduleText}

DÍAS NO DISPONIBLES PRÓXIMOS:
${closuresText}

FECHA Y HORA ACTUAL (hora Uruguay): ${fechaHoy}, ${horaHoy}

CALENDARIO — REGLA ABSOLUTA: cuando el paciente mencione un día ("el lunes", "el jueves que viene", etc.) buscá en esta lista y copiá la fecha ISO exacta. NUNCA calcules fechas por tu cuenta.
${proximosDias}

CONTEXTO DEL PACIENTE:
- Nombre: ${patientName}
- Turnos activos (${appointments.length}): ${formatAppointments(appointments)}

SOBRE EL HISTORIAL:
Los mensajes con prefijo "[Staff]:" los escribió el equipo de la clínica. Usá todo el hilo como contexto — no repitas lo que ya se aclaró.
${COMMON_BLOCK}`;

    // ─── Tools ─────────────────────────────────────────────────────────────────
    const tools = [
      {
        name:        'schedule_appointment',
        description: 'Agenda un turno NUEVO para el paciente cuando ya confirmó servicio, fecha y hora exacta. Solo llamar cuando TODOS esos datos están presentes.',
        input_schema: {
          type: 'object',
          properties: {
            service: {
              type:        'string',
              description: 'Tipo de servicio (ej: limpieza dental, ortodoncia, implante)',
            },
            date: {
              type:        'string',
              description: 'Fecha exacta en formato YYYY-MM-DD. Si el paciente dice "el lunes", calculá la fecha real basándote en FECHA ACTUAL del system prompt.',
            },
            time: {
              type:        'string',
              description: 'Hora de inicio en formato HH:MM en 24 horas, tal como la dijo el paciente (siempre en hora Uruguay, UTC-3)',
            },
            notes: {
              type:        'string',
              description: 'Notas adicionales del paciente (opcional)',
            },
          },
          required: ['service', 'date', 'time'],
        },
      },
      {
        name:        'cancel_appointments',
        description: 'Cancela uno o varios turnos existentes del paciente. Usar cuando el paciente quiere cancelar sin proporcionar una nueva fecha.',
        input_schema: {
          type: 'object',
          properties: {
            appointment_ids: {
              type:        'array',
              items:       { type: 'string' },
              description: 'Lista de IDs de los turnos a cancelar. Los IDs aparecen en CONTEXTO DEL PACIENTE con el formato [ID:uuid].',
            },
          },
          required: ['appointment_ids'],
        },
      },
      {
        name:        'reschedule_appointment',
        description: 'Reagenda: marca los turnos anteriores como "rescheduled" y crea uno nuevo. Usar cuando el paciente quiere cambiar de fecha/hora.',
        input_schema: {
          type: 'object',
          properties: {
            old_appointment_ids: {
              type:        'array',
              items:       { type: 'string' },
              description: 'IDs de los turnos a marcar como reagendados. Los IDs aparecen en CONTEXTO DEL PACIENTE con el formato [ID:uuid].',
            },
            service: {
              type:        'string',
              description: 'Tipo de servicio del nuevo turno. Si ya aparece en el contexto del paciente (campo Servicio), copialo exactamente. Si no está disponible, dejá este campo vacío.',
            },
            date: {
              type:        'string',
              description: 'Nueva fecha en formato YYYY-MM-DD. Buscá en el CALENDARIO del system prompt el día que mencionó el paciente.',
            },
            time: {
              type:        'string',
              description: 'Nueva hora en formato HH:MM (hora Uruguay, UTC-3)',
            },
            notes: {
              type:        'string',
              description: 'Notas adicionales (opcional)',
            },
          },
          required: ['old_appointment_ids', 'date', 'time'],
        },
      },
      {
        name:        'confirm_appointment',
        description: 'Marca un turno existente como confirmado. Usar cuando el paciente dice "confirmo", "sí voy", "confirmo mi turno" o similar.',
        input_schema: {
          type: 'object',
          properties: {
            appointment_id: {
              type:        'string',
              description: 'ID del turno a confirmar. Aparece en CONTEXTO DEL PACIENTE con el formato [ID:uuid].',
            },
          },
          required: ['appointment_id'],
        },
      },
      {
        name:        'add_to_waitlist',
        description: 'Agrega al paciente a la lista de espera de la clínica. Usar cuando no hay turnos disponibles en la fecha deseada, o cuando el paciente pide anotarse para ser avisado si se libera un turno antes.',
        input_schema: {
          type: 'object',
          properties: {
            service: {
              type:        'string',
              description: 'Tipo de servicio deseado (opcional, omitir si acepta cualquier turno)',
            },
            preferred_date_from: {
              type:        'string',
              description: 'Inicio del rango de fechas preferido en formato YYYY-MM-DD (opcional)',
            },
            preferred_date_to: {
              type:        'string',
              description: 'Fin del rango de fechas preferido en formato YYYY-MM-DD (opcional)',
            },
            notes: {
              type:        'string',
              description: 'Notas adicionales del paciente (opcional)',
            },
          },
          required: [],
        },
      },
      // Solo disponible para pacientes nuevos (no registrados)
      ...(isNewPatient ? [{
        name:        'register_patient',
        description: 'Registra al nuevo contacto como paciente de la clínica. Llamar solo cuando ya tiene el nombre completo confirmado por el propio paciente.',
        input_schema: {
          type: 'object',
          properties: {
            full_name: {
              type:        'string',
              description: 'Nombre completo del paciente tal como lo dijo él mismo',
            },
            notes: {
              type:        'string',
              description: 'Breve nota del motivo de consulta (opcional)',
            },
          },
          required: ['full_name'],
        },
      }] : []),
    ];

    // ─── Helper: validate date+time against clinic schedule ──────────────────
    function validateSchedule(date: string, time: string): { allowed: boolean; reason?: string } {
      // Closure check (specific date override)
      const closure = closureRows?.find((c) => c.date === date);
      if (closure) {
        if (!closure.accepts_emergencies) {
          const reason = (closure.reason_label as string) || CLOSURE_REASONS[closure.reason as string] || 'cierre especial';
          return { allowed: false, reason: `La clínica no trabaja ese día (${reason}). Por favor elegí otra fecha.` };
        }
        // accepts_emergencies=true → allowed but no further time check needed
        return { allowed: true };
      }

      // Weekly schedule check
      const dow = new Date(date + 'T12:00:00').getDay(); // 0=Sun…6=Sat
      const row = scheduleRows?.find((r) => (r.day_of_week as number) === dow);
      if (row && !(row.is_open as boolean)) {
        return { allowed: false, reason: `La clínica no atiende los ${SCHEDULE_DAY_NAMES[dow]}s. Por favor elegí otro día.` };
      }

      // Time range check
      if (row && row.is_open) {
        const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        const openMin  = toMin(row.open_time  as string);
        const closeMin = toMin(row.close_time as string);
        const reqMin   = toMin(time);
        if (reqMin < openMin || reqMin >= closeMin) {
          return { allowed: false, reason: `El horario de atención ese día es de ${row.open_time} a ${row.close_time}. Por favor elegí un horario dentro de ese rango.` };
        }
      }

      return { allowed: true };
    }

    // ─── Helper: extraer texto del response de Claude ─────────────────────────
    function extractText(data: Record<string, unknown>): string {
      const content = data?.content as Record<string, string>[] ?? [];
      const textBlock = content.find((b) => b.type === 'text');
      return textBlock?.text ?? '';
    }

    // ─── Helper: call Claude ────────────────────────────────────────────────────
    async function callClaude(
      msgs: Array<{ role: 'user' | 'assistant'; content: unknown }>,
      withTools = true,
    ): Promise<Record<string, unknown>> {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: {
          'x-api-key':         ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type':      'application/json',
        },
        body: JSON.stringify({
          model:      'claude-haiku-4-5',
          max_tokens: 400,
          system:     systemPrompt,
          ...(withTools ? { tools } : {}),
          messages:   msgs,
        }),
      });
      if (!res.ok) throw new Error(`Claude API error: ${await res.text()}`);
      return await res.json();
    }

    // ─── E. Call Claude (con soporte para tool use) ─────────────────────────────
    let claudeText = '';
    let appointmentCreated: { id: string; datetime: string } | null = null;

    // ID del paciente: puede venir del conv existente O ser recién registrado en esta sesión
    let resolvedPatientId: string | null = conv.patient_id as string | null;

    // Helper: crear un turno nuevo en la DB
    async function createAppointmentInDB(
      service: string, date: string, time: string, notes?: string,
    ): Promise<{ id: string; datetime: string } | { error: string }> {
      if (!resolvedPatientId) return { error: 'patient_id no disponible — registrá al paciente primero' };
      const appointmentDatetime = `${date}T${time}:00-03:00`;
      const { data: appt, error: apptErr } = await supabase
        .from('appointments')
        .insert({
          patient_id:           resolvedPatientId,
          clinic_id:            clinicId,
          appointment_datetime: appointmentDatetime,
          status:               'new',
          notes:                `[IA] Servicio: ${service}${notes ? ' — ' + notes : ''}`,
        })
        .select('id')
        .single();
      if (apptErr) { console.error('[ai-agent-reply] Error creating appointment:', apptErr.message); return { error: apptErr.message }; }
      console.log('[ai-agent-reply] Appointment created:', appt.id);
      return { id: appt.id, datetime: appointmentDatetime };
    }

    try {
      const baseMessages = claudeMessages as Array<{ role: 'user' | 'assistant'; content: unknown }>;

      // ─── Multi-turn tool-use loop ──────────────────────────────────────────────
      // Claude API REQUIRES tools to be present in every call that has tool_use
      // blocks in the message history — otherwise it returns empty content.
      // We loop up to 3 rounds so we can handle chained tool calls (e.g. register → schedule).
      let currentMessages = [...baseMessages];

      // ── Helper: ejecutar un tool block y devolver su resultado ──────────────────
      async function executeTool(
        toolBlock: Record<string, unknown>,
      ): Promise<Record<string, unknown>> {

        // ── Tool: schedule_appointment ──────────────────────────────────────────
        if (toolBlock.name === 'schedule_appointment') {
          const input = toolBlock.input as { service?: string; date?: string; time?: string; notes?: string };
          console.log('[ai-agent-reply] Tool: schedule_appointment', JSON.stringify(input));
          if (!input.service || !input.date || !input.time)
            return { success: false, error: 'Faltan datos: necesito servicio, fecha y hora antes de agendar.' };
          const schedCheck = validateSchedule(input.date, input.time);
          if (!schedCheck.allowed) return { success: false, error: schedCheck.reason };
          const result = await createAppointmentInDB(input.service, input.date, input.time, input.notes);
          if ('error' in result) return { success: false, error: result.error };
          appointmentCreated = result;
          return { success: true, appointment_id: result.id,
            message: `Turno agendado: ${input.service} el ${input.date} a las ${input.time}.` };

        // ── Tool: cancel_appointments ────────────────────────────────────────────
        } else if (toolBlock.name === 'cancel_appointments') {
          const input = toolBlock.input as { appointment_ids?: string[] };
          console.log('[ai-agent-reply] Tool: cancel_appointments', JSON.stringify(input));
          const ids = input.appointment_ids ?? [];
          if (!ids.length) return { success: false, error: 'No se especificaron IDs de turnos a cancelar.' };
          const { error: cancelErr } = await supabase
            .from('appointments').update({ status: 'cancelled' })
            .in('id', ids).eq('clinic_id', clinicId);
          if (cancelErr) { console.error('[ai-agent-reply] cancel error:', cancelErr.message); return { success: false, error: cancelErr.message }; }
          console.log('[ai-agent-reply] Cancelled appointments:', ids);
          return { success: true, message: `${ids.length} turno(s) cancelado(s) correctamente.` };

        // ── Tool: reschedule_appointment ─────────────────────────────────────────
        } else if (toolBlock.name === 'reschedule_appointment') {
          const input = toolBlock.input as {
            old_appointment_ids?: string[]; service?: string; date?: string; time?: string; notes?: string;
          };
          console.log('[ai-agent-reply] Tool: reschedule_appointment', JSON.stringify(input));
          const oldIds = input.old_appointment_ids ?? [];
          if (!oldIds.length || !input.date || !input.time)
            return { success: false, error: 'Faltan datos para reagendar: IDs anteriores, fecha y hora.' };
          const reschedCheck = validateSchedule(input.date, input.time);
          if (!reschedCheck.allowed) return { success: false, error: reschedCheck.reason };

          // Si no se proveyó servicio, obtenerlo del turno original
          let serviceToUse = input.service?.trim() || '';
          if (!serviceToUse) {
            const { data: oldAppt } = await supabase.from('appointments').select('notes').eq('id', oldIds[0]).maybeSingle();
            const m = String(oldAppt?.notes ?? '').match(/Servicio:\s*([^—\n]+)/);
            serviceToUse = m ? m[1].trim() : 'Consulta general';
          }

          // 1. Marcar viejos como reagendados
          const { error: reschedErr } = await supabase
            .from('appointments').update({ status: 'rescheduled' })
            .in('id', oldIds).eq('clinic_id', clinicId);
          if (reschedErr) { console.error('[ai-agent-reply] reschedule error:', reschedErr.message); return { success: false, error: reschedErr.message }; }

          // 2. Crear nuevo turno
          const result = await createAppointmentInDB(serviceToUse, input.date, input.time, input.notes);
          if ('error' in result) return { success: false, error: result.error };
          appointmentCreated = result;
          return { success: true, new_appointment_id: result.id,
            message: `${oldIds.length} turno(s) marcado(s) como reagendado(s). Nuevo turno: ${serviceToUse} el ${input.date} a las ${input.time}.` };

        // ── Tool: register_patient ───────────────────────────────────────────────
        } else if (toolBlock.name === 'register_patient') {
          const input = toolBlock.input as { full_name?: string; notes?: string };
          console.log('[ai-agent-reply] Tool: register_patient', JSON.stringify(input));
          if (!input.full_name?.trim()) return { success: false, error: 'Necesito el nombre completo del paciente.' };
          const { data: newPatient, error: regErr } = await supabase
            .from('patients').insert({
              clinic_id: clinicId, full_name: input.full_name.trim(),
              phone_number: conv.phone_number, ai_enabled: true,
              notes: input.notes ? `[IA] ${input.notes}` : '[Registrado por IA via WhatsApp]',
            }).select('id').single();
          if (regErr) { console.error('[ai-agent-reply] register error:', regErr.message); return { success: false, error: regErr.message }; }
          await supabase.from('conversations').update({ patient_id: newPatient.id }).eq('id', conversationId);
          resolvedPatientId = newPatient.id;
          console.log('[ai-agent-reply] Patient registered:', newPatient.id);
          return { success: true, patient_id: newPatient.id,
            message: `Paciente ${input.full_name} registrado correctamente. Ya puede ofrecerle agendar un turno.` };

        // ── Tool: confirm_appointment ────────────────────────────────────────────
        } else if (toolBlock.name === 'confirm_appointment') {
          const input = toolBlock.input as { appointment_id?: string };
          console.log('[ai-agent-reply] Tool: confirm_appointment', JSON.stringify(input));
          if (!input.appointment_id) return { success: false, error: 'Necesito el ID del turno a confirmar.' };
          const { error: confirmErr } = await supabase
            .from('appointments').update({ status: 'confirmed' })
            .eq('id', input.appointment_id).eq('clinic_id', clinicId);
          if (confirmErr) { console.error('[ai-agent-reply] confirm error:', confirmErr.message); return { success: false, error: confirmErr.message }; }
          console.log('[ai-agent-reply] Confirmed appointment:', input.appointment_id);
          return { success: true, message: 'Turno confirmado correctamente.' };

        // ── Tool: add_to_waitlist ────────────────────────────────────────────────
        } else if (toolBlock.name === 'add_to_waitlist') {
          const input = toolBlock.input as {
            service?: string; preferred_date_from?: string; preferred_date_to?: string; notes?: string;
          };
          console.log('[ai-agent-reply] Tool: add_to_waitlist', JSON.stringify(input));
          // resolvedPatientId may be null if register_patient ran in the same Promise.all round —
          // fall back to a DB lookup by phone so both tools work when called together.
          if (!resolvedPatientId) {
            const { data: existingPat } = await supabase
              .from('patients')
              .select('id')
              .eq('clinic_id', clinicId)
              .eq('phone_number', conv.phone_number)
              .maybeSingle();
            if (existingPat?.id) resolvedPatientId = existingPat.id;
          }
          if (!resolvedPatientId) return { success: false, error: 'No se puede agregar a lista de espera: paciente no registrado.' };
          const { error: wlErr } = await supabase
            .from('waiting_list')
            .insert({
              clinic_id:           clinicId,
              patient_id:          resolvedPatientId,
              service:             input.service             ?? null,
              preferred_date_from: input.preferred_date_from ?? null,
              preferred_date_to:   input.preferred_date_to   ?? null,
              notes:               input.notes               ?? null,
              status:              'waiting',
            });
          if (wlErr) { console.error('[ai-agent-reply] waitlist insert error:', wlErr.message); return { success: false, error: wlErr.message }; }
          console.log('[ai-agent-reply] Added to waitlist, patient:', resolvedPatientId);
          return { success: true, message: 'Paciente agregado a la lista de espera correctamente.' };
        }

        return { success: false, error: `Tool no reconocido: ${toolBlock.name}` };
      }

      for (let round = 0; round < 4; round++) {
        const roundData  = await callClaude(currentMessages); // siempre con tools
        const stopReason = roundData?.stop_reason as string;
        console.log(`[ai-agent-reply] round ${round} stop_reason: ${stopReason}`);

        if (stopReason !== 'tool_use') {
          claudeText = extractText(roundData);
          break;
        }

        // ── Procesar TODOS los tool_use blocks en una sola respuesta ──────────────
        // Claude puede devolver múltiples tools en un mismo turno (ej: reschedule + cancel)
        const allToolBlocks = ((roundData?.content as Record<string, unknown>[]) ?? [])
          .filter((b) => (b as Record<string,string>).type === 'tool_use') as Record<string, unknown>[];

        if (!allToolBlocks.length) {
          claudeText = extractText(roundData);
          break;
        }

        // Ejecutar todos los tools en paralelo y recoger resultados
        const toolResultContents = await Promise.all(
          allToolBlocks.map(async (tb) => {
            const result = await executeTool(tb);
            return {
              type:        'tool_result',
              tool_use_id: tb.id as string,
              content:     JSON.stringify(result),
            };
          }),
        );

        console.log(`[ai-agent-reply] executed ${allToolBlocks.length} tool(s):`, allToolBlocks.map(b => b.name).join(', '));

        // Añadir el turno del asistente + todos los resultados al hilo
        currentMessages = [
          ...currentMessages,
          { role: 'assistant' as const, content: roundData.content },
          { role: 'user' as const, content: toolResultContents },
        ];
        // El loop continuará con la respuesta de Claude tras recibir todos los resultados
      } // end for loop

      // Si después de 3 rondas de tools aún no hay texto, intentar una llamada limpia
      if (!claudeText) {
        console.warn('[ai-agent-reply] No claudeText after tool loop — trying clean fallback');
        const fallback = await callClaude(baseMessages);
        claudeText = extractText(fallback);
      }

      console.log('[ai-agent-reply] Claude responded, chars:', claudeText.length, 'preview:', claudeText.slice(0, 80));
    } catch (err) {
      console.error('[ai-agent-reply] Claude fetch error:', err instanceof Error ? err.message : err);
      return new Response('ok', { status: 200 });
    }

    if (!claudeText) {
      console.error('[ai-agent-reply] Empty Claude response for conversation:', conversationId);
      return new Response('ok', { status: 200 });
    }

    // ── F. Process Claude response ───────────────────────────────────────────
    const needsEscalation = claudeText.includes('[ESCALAR]');
    const cleanText       = claudeText.replace('[ESCALAR]', '').trim();

    // Send to patient via WhatsApp (access token siempre del env global)
    const accessToken   = WA_ACCESS_TOKEN_GLOBAL;
    const phoneNumberId = String((clinic as Record<string,unknown>).wa_phone_number_id || WA_PHONE_NUMBER_ID_GLOBAL);

    console.log('[ai-agent-reply] Sending WA to:', conv.phone_number, 'via phoneNumberId:', phoneNumberId || '(vacío!)');

    if (accessToken && phoneNumberId) {
      const waId = await sendWaText(conv.phone_number, cleanText, phoneNumberId, accessToken);
      console.log('[ai-agent-reply] WA sent, waId:', waId);
    } else {
      console.error('[ai-agent-reply] No WA credentials — accessToken:', !!accessToken, 'phoneNumberId:', !!phoneNumberId);
    }

    // Insert AI reply message (visible in Inbox, sent to patient)
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      clinic_id:       clinicId,
      patient_id:      conv.patient_id ?? null,
      direction:       'outbound_ai',
      sender_type:     'bot',
      content:         cleanText,
      status:          'sent',
    });

    if (needsEscalation) {
      // Insert internal escalation notice (NOT sent to patient)
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        clinic_id:       clinicId,
        direction:       'system',
        sender_type:     'system',
        content:         '🤖 Bot escaló al staff — se requiere atención humana',
        status:          'sent',
      });
      await supabase.from('conversations')
        .update({ agent_mode: 'human' })
        .eq('id', conversationId);

    } else {
      // Detectar intent y lead score
      const detectedIntent = appointmentCreated ? 'agendar_turno' : detectIntent(lastText);
      const hasAppt        = appointments.length > 0 || !!appointmentCreated;
      const leadScore =
        ['agendar_turno', 'cancelar_turno', 'reagendar'].includes(detectedIntent) ? 'hot'
        : (hasAppt || detectedIntent === 'consulta_precio')                        ? 'warm'
        : 'cold';

      await supabase.from('conversations').update({
        // Si la IA retomó (force) o respondió en modo human, volver a bot
        agent_mode:    conv.agent_mode === 'human' ? 'bot' : conv.agent_mode,
        agent_context: {
          intent:            detectedIntent,
          summary:           appointmentCreated
            ? `Turno agendado: ${detectedIntent.replace(/_/g, ' ')} — ${appointmentCreated.datetime}`
            : `Paciente contactó por: ${detectedIntent.replace(/_/g, ' ')}`,
          lead_score:        leadScore,
          last_bot_reply_at: new Date().toISOString(),
          ...(appointmentCreated ? { appointment_id: appointmentCreated.id } : {}),
        },
      }).eq('id', conversationId);
    }

    // ── Notificar al médico si hay doctor_whatsapp configurado ───────────────
    if (appointmentCreated) {
      const clinicSettings = (clinic?.settings ?? {}) as Record<string, string>;
      const doctorWa       = clinicSettings.doctor_whatsapp;
      if (doctorWa) {
        const doctorPhone = doctorWa.startsWith('+') ? doctorWa : `+${doctorWa}`;
        const apptDt      = new Date(appointmentCreated.datetime);
        const dateFmt     = apptDt.toLocaleDateString('es-UY', {
          weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Montevideo',
        });
        const timeFmt     = apptDt.toLocaleTimeString('es-UY', {
          hour: '2-digit', minute: '2-digit', timeZone: 'America/Montevideo',
        });
        const docMsg = `🔔 *Nuevo turno agendado*\n\n👤 Paciente: ${patientName}\n📅 ${dateFmt} a las ${timeFmt}\n\nResponda *1* para confirmar o *2* para rechazar.`;
        const phoneNumId  = clinic?.wa_phone_number_id || WA_PHONE_NUMBER_ID_GLOBAL;
        const accessToken = WA_ACCESS_TOKEN_GLOBAL;
        try {
          await sendWaText(doctorPhone, docMsg, phoneNumId, accessToken);
          console.log('[ai-agent-reply] Doctor notified at', doctorPhone);
        } catch (err) {
          console.error('[ai-agent-reply] Error notifying doctor:', err);
        }
      }
    }

    return new Response('ok', { status: 200 });

  } catch (err) {
    // Never throw — always return 200
    console.error(
      '[ai-agent-reply] Unhandled error:',
      err instanceof Error ? err.message : String(err),
    );
    return new Response('ok', { status: 200 });
  }
});
