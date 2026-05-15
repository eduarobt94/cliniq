# Cliniq — Project Instructions

## ⚡ INICIO RÁPIDO DE SESIÓN
> Leé esta sección primero. Resume el estado actual y qué hacer a continuación.

**Última sesión completada: 2026-05-15**

### ✅ Completado en esta sesión (2026-05-15) — parte 2
- **Fix `success_rate` WhatsApp:** porcentaje mostraba "1390%" porque la vista ya devuelve 0-100, no 0-1. Fix: `Math.min(100, Math.round(stats.success_rate))`
- **Fix sidebar `Icons.Waitlist`:** icono de Lista de espera cambiado de `Icons.Bell` a `Icons.Waitlist`
- **React Doctor audit (71/100 → corregido):** 38 archivos, 324 issues resueltos:
  - Correctness: hydration mismatch con `new Date()`, `localStorage` sin versión, `<a href="#">`
  - Performance: `await` en loops → `Promise.all`, default `[]` props → constantes de módulo, `includes()` en loops → `Set`
  - Architecture: `w-N h-N` → `size-N` (83 occurrencias), em dashes en JSX
  - Accessibility: `htmlFor`+`id` en labels, `onKeyDown`+`role` en divs clicables, `href` reales en `<a>`
  - State & Effects: `clearTimeout` cleanup en efectos con setTimeout

### ✅ Completado en esta sesión (2026-05-15) — parte 1
- **Audio WhatsApp:** pacientes pueden enviar notas de voz → webhook transcribe con OpenAI Whisper-1 → inbox muestra burbuja con ícono `Icons.Mic`, label "NOTA DE VOZ", transcripción (itálica si falló), sufijo "· transcripto"
- **Migración `20260512000000_messages_audio.sql`:** columna `message_type` (`text|audio|image|document|sticker|video|unknown`) + índice parcial
- **Migración `20260515000000_messages_type_video.sql`:** agrega `video` al CHECK constraint (fix QA)
- **Fix `norm()` regex:** reemplazado bytes invisibles Unicode por `/[̀-ͯ]/g` (portable entre editores)
- **Fix `useAIReactivation`:** `Promise.all` con rollback correcto si falla una de las dos actualizaciones
- **Fix webhook `video` type:** `insertMessage` ahora detecta `video` y lo guarda correctamente (antes quedaba como `text`)
- **QA regresión completa:** 0 críticos, 0 altos — sistema verificado listo para producción
- **Docs:** `Cliniq - Documentacion de Funcionalidades.docx` y `Cliniq - Servicios Externos y Costos.docx`
- **Git:** todo mergeado en `main` (PR #2). Ramas `develop` y `main` sincronizadas.

### ✅ Completado en sesión anterior (2026-05-07)
- **Configuración → Servicios:** CRUD completo (`ServicesSection.jsx` + `useClinicServices.js`)
- **Agente IA — servicios reales:** `ai-agent-reply` consulta `clinic_services` en tiempo real
- **Tool `add_to_waitlist`:** implementada en el array `tools` de Claude (antes solo en system prompt)
- **Fix PASO 1/2 agente:** registra paciente si el primer mensaje incluye nombre completo
- **Lista de espera:** UI completa con filtros, Realtime, badge en sidebar
- **Fixes inbox:** badge `tone="warn"`, dedup `outbound_ai` en Realtime, `agent_mode` solo en envío exitoso, búsqueda con acentos

### 🔴 Pendiente — TAREAS INMEDIATAS
1. **Ejecutar migración** `20260507000004_waiting_list.sql` en Supabase SQL Editor (tabla `waiting_list`)
2. **Ejecutar migración** `20260515000000_messages_type_video.sql` en Supabase SQL Editor (constraint `video`)
3. **Ejecutar migración** `20260512000000_messages_audio.sql` en Supabase SQL Editor (columna `message_type`)
4. **Ejecutar migración** `20260430000002_new_automations.sql` en Supabase SQL Editor
5. **Ejecutar migración** `20260504000000_fix_views_timezone.sql` en Supabase SQL Editor
6. **Token WhatsApp permanente** — crear System User token en Meta Business Manager → actualizar secret `WHATSAPP_ACCESS_TOKEN`
7. **Redesplegar funciones** después de aplicar migraciones: `whatsapp-webhook`, `ai-agent-reply`

### 🟡 Próximas funcionalidades sugeridas
- Configuración → WhatsApp: UI real para gestionar token y número (actualmente mock)
- Notificación automática de lista de espera cuando se cancela un turno
- Panel de analytics de transcripciones de audio
- Export de datos (CSV de pacientes, turnos)

**Usuario de prueba:** `maria@bonomi.uy` / `demo1234`
**Dev server:** `npm run dev` → localhost:5173

---

## Qué es este proyecto
SaaS de automatización para clínicas médicas en Uruguay. Gestiona turnos, pacientes y automatizaciones de WhatsApp. Stack: Vite 6 + React 18 + Tailwind CSS v3 + Supabase.

**Repo GitHub:** https://github.com/eduarobt94/cliniq
**Rama principal:** `main` (develop → main siempre via PR)

---

## Tech Stack
- **Framework:** React 18 + Vite 6
- **Styling:** Tailwind CSS v3 + CSS custom properties (`--cq-*`)
- **Routing:** React Router v6
- **Charts:** Recharts (`BarChart`, `ResponsiveContainer`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`)
- **Backend:** Supabase (PostgreSQL 15, Auth, Realtime)
- **Language:** JavaScript (JSX) — sin TypeScript en frontend; TypeScript en Edge Functions (Deno)

---

## Estructura del proyecto
```
src/
  components/ui/          ← Button, Badge, Card, Avatar, Icons, Typography, Toast
  components/ErrorBoundary.jsx
  components/ProtectedRoute.jsx
  context/AuthContext.jsx  ← Auth con Supabase real (solo onAuthStateChange, sin race condition)
  hooks/
    useClinic.js
    useAppointments.js        ← turnos de hoy + Realtime
    useKpis.js                ← KPIs desde v_clinic_kpis_today
    usePatients.js            ← lista de pacientes (limit 50) + refetch
    useMembers.js             ← miembros + profiles batch + addMember/removeMember/refetch
    useAutomations.js         ← clinic_automations + v_automation_stats
    useConversations.js       ← lista de conversaciones CRM con Realtime
    useRealtimeMessages.js    ← mensajes de una conversación con Realtime + deleteMessage
    useAgendaRange.js         ← turnos por rango de fechas + Realtime + refetch
    useNotifications.js
    useAgendaBadge.js
    useAutomationsBadge.js
    useUnreadCounts.js
    useReportes.js
    useClinicServices.js      ← CRUD servicios de clínica
    useAIReactivation.js      ← detecta convs con IA inactiva >12h, sugiere reactivar en bloque
    useWaitingList.js         ← lista de espera con Realtime y filtros
    useWaitlistBadge.js       ← badge contador en sidebar
  lib/
    supabase.js
    authService.js
    appointmentService.js     ← CRUD + normaliza teléfonos a E.164
    phoneUtils.js             ← isValidPhone(), normalizePhone()
  pages/
    Dashboard/
    Agenda/
    Pacientes/
    Inbox/                 ← CRM inbox + audio bubbles + toggle IA + panel contexto
    Automatizaciones/
    Reportes/
    Configuracion/         ← tabs: Horarios / Servicios / Equipo / WhatsApp
    ListaEspera/           ← filtros pending/notified/all + tabla + Realtime
  layouts/DashboardLayout.jsx
supabase/
  functions/
    whatsapp-webhook/      ← recibe eventos Meta + transcribeAudio(Whisper) + insertMessage(messageType)
    ai-agent-reply/        ← agente IA completo con tools
    send-whatsapp-message/
    initiate-conversation/
    send-whatsapp-reminders/
    send-patient-reactivation/
    send-review-requests/
  migrations/              ← ver tabla más abajo
```

---

## Base de datos (Supabase)
**Proyecto ID:** `jmpyygecgqkeuwwaioew` — región: São Paulo
**URL:** `https://jmpyygecgqkeuwwaioew.supabase.co`

### Tablas principales
| Tabla | Descripción |
|---|---|
| `clinics` | Raíz multi-tenant. `owner_id` FK → `auth.users.id`. Cols WA: `wa_phone_number_id`, `wa_access_token`, `address`, `phone`, `email_contact` |
| `profiles` | Nombre y apellido de cada usuario |
| `clinic_members` | Multi-usuario. Roles: `owner/staff/viewer`. Estados: `invited/active` |
| `patients` | `UNIQUE(clinic_id, phone_number)`. Tel en E.164. Cols IA: `ai_enabled`, `last_human_interaction` |
| `appointments` | ENUM status: `new/pending/confirmed/rescheduled/cancelled`. `notes` = `[IA] Servicio: X` |
| `clinic_automations` | `UNIQUE(clinic_id, type)`. Tipos: `appointment_reminder/patient_reactivation/review_request`. Cols: `months_inactive`, `hours_after` |
| `conversations` | CRM inbox. `UNIQUE(clinic_id, phone_number)`. `agent_mode`: `bot/human`. `REPLICA IDENTITY FULL` |
| `messages` | FK → conversations. `direction`: `inbound/outbound/outbound_ai/system/system_template`. `message_type`: `text/audio/image/document/sticker/video/unknown` (DEFAULT `text`). `REPLICA IDENTITY FULL` |
| `whatsapp_message_log` | Auditoría — sigue siendo insertada para backward compat |
| `clinic_services` | CRUD servicios. Cols: `name`, `duration_minutes`, `price`, `discount_type` (percent/fixed), `discount_value`, `is_active` |
| `waiting_list` | Lista de espera. Cols: `patient_id` (nullable), `phone_number`, `full_name`, `service`, `date_from`, `date_to`, `notes`, `status` (pending/notified/cancelled) |

### Migraciones
| Archivo | Estado |
|---|---|
| `20260420000000_cliniq_mvp.sql` | ✅ Ejecutada |
| `20260422000000_cliniq_optimizations.sql` | ✅ Ejecutada |
| `20260423000000_clinic_members.sql` | ✅ Ejecutada |
| `20260424000000_profiles_and_rpc.sql` | ✅ Ejecutada |
| `20260425000000_invite_flow.sql` | ✅ Ejecutada |
| `20260428000000_whatsapp_automations.sql` | ✅ Ejecutada |
| `20260428000000_fix_whatsapp_rls.sql` | ✅ Ejecutada |
| `20260429000000_inbox_v2.sql` | ✅ Ejecutada |
| `20260429000001_inbox_delete_policy.sql` | ✅ Ejecutada |
| `20260430000000_ai_agent_handoff.sql` | ✅ Ejecutada |
| `20260430000002_new_automations.sql` | 🔴 PENDIENTE |
| `20260504000000_fix_views_timezone.sql` | 🔴 PENDIENTE |
| `20260507000003_clinic_services.sql` | ✅ Ejecutada |
| `20260507000004_waiting_list.sql` | 🔴 PENDIENTE |
| `20260512000000_messages_audio.sql` | 🔴 PENDIENTE — columna `message_type` |
| `20260515000000_messages_type_video.sql` | 🔴 PENDIENTE — agrega `video` al constraint |

**⚠️ Nunca volver a ejecutar las ya aplicadas.**

---

## Agente IA WhatsApp (`ai-agent-reply`)

### Arquitectura
- **Modelo:** `claude-haiku-4-5`, max_tokens: 400
- **Invocación:** `whatsapp-webhook` → llama `ai-agent-reply` via HTTP interno cuando `shouldAgentReply()` = true
- **Timezone:** todos los cálculos en `America/Montevideo` (UTC-3)

### Loop multi-turn (crítico)
```typescript
// Loop de hasta 4 rondas — SIEMPRE con tools aunque no se usen
for (let round = 0; round < 4; round++) {
  const data = await callClaude(currentMessages); // siempre con tools
  if (data.stop_reason !== 'tool_use') { claudeText = extractText(data); break; }
  // Ejecutar todos los tool blocks en paralelo → Promise.all
}
```
**⚠️ NUNCA llamar a Claude sin tools si el historial tiene bloques tool_use.**

### Herramientas disponibles
| Tool | Cuándo | Qué hace |
|---|---|---|
| `schedule_appointment` | Turno nuevo | INSERT en `appointments` status `new` |
| `cancel_appointments` | Cancelar | UPDATE status → `cancelled` |
| `reschedule_appointment` | Cambiar fecha | UPDATE viejos + INSERT nuevo |
| `confirm_appointment` | Paciente confirma | UPDATE status → `confirmed` |
| `register_patient` | Solo isNewPatient | INSERT `patients` + UPDATE `conversation.patient_id` |
| `add_to_waitlist` | Lista de espera | INSERT en `waiting_list` |

### Lógica de activación (`shouldAgentReply`)
- `agent_mode = 'bot'` → siempre responde
- `agent_mode = 'human'` → solo si humano lleva > 2min inactivo Y hay mensajes sin responder
- `ai_enabled = false` → nunca responde

### Mensajes de audio en el agente
- El webhook transcribe el audio con Whisper antes de llamar al agente
- El historial llega con el texto de la transcripción como `content`
- Si la transcripción falló, `content` = `[Nota de voz — no se pudo transcribir]`
- El agente puede interpretar la transcripción y responder normalmente

---

## Variables de entorno

### Frontend (.env)
```
VITE_SUPABASE_URL=https://jmpyygecgqkeuwwaioew.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

### Secrets Supabase (Edge Functions)
```
SUPABASE_URL=https://jmpyygecgqkeuwwaioew.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
WHATSAPP_VERIFY_TOKEN=cliniq_webhook_2026
WHATSAPP_ACCESS_TOKEN=<system-user-token>   ← 🔴 VENCE si es token de prueba (60 días)
WHATSAPP_PHONE_NUMBER_ID=<phone-number-id>
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...                        ← ✅ Configurado (Whisper transcripción)
RESEND_API_KEY=re_...
```

---

## WhatsApp / Meta — Configuración

- **Webhook URL:** `https://jmpyygecgqkeuwwaioew.supabase.co/functions/v1/whatsapp-webhook`
- **Verify Token:** `cliniq_webhook_2026`
- **Subscribed fields:** `messages` ✅
- **Token permanente:** Meta Business Manager → Usuarios del sistema → token sin expiración
- **Audio:** Meta envía `type: "audio"` con `audio.id` → webhook descarga + Whisper → texto

---

## Componentes UI — Reglas importantes
- **`Icons`:** `Alert` (no `X`), `Mic`, `Bot`, `Sparkle`, `Waitlist`, etc. Ver `Icons.jsx` para lista completa
- **`Badge` tones válidos:** `neutral | accent | success | warn | danger | outline` — NO `warning`
- **`norm(str)`** en Inbox: `/[̀-ͯ]/g` (explícito, no bytes invisibles)
- **`MessageBubble`:** renderiza `message_type === 'audio'` con ícono Mic + label "NOTA DE VOZ"

---

## Comandos útiles
```bash
npm run dev      # localhost:5173
npm run build

# Deploy Edge Functions
npx supabase functions deploy whatsapp-webhook --no-verify-jwt
npx supabase functions deploy ai-agent-reply --no-verify-jwt
npx supabase functions deploy send-whatsapp-message
npx supabase functions deploy initiate-conversation
npx supabase functions deploy send-whatsapp-reminders --no-verify-jwt
npx supabase functions deploy send-patient-reactivation --no-verify-jwt
npx supabase functions deploy send-review-requests --no-verify-jwt

# Secrets
npx supabase secrets set OPENAI_API_KEY=sk-...
npx supabase secrets set WHATSAPP_ACCESS_TOKEN=<nuevo-token>
npx supabase secrets list

# Git workflow
git checkout develop
git pull origin develop
# ... trabajar ...
git push origin develop
# Crear PR en GitHub: develop → main
```

---

## Estado actual de páginas
| Componente | Estado | Notas |
|---|---|---|
| Dashboard / KPIs | ✅ Real | useKpis |
| Agenda | ✅ Real | useAgendaRange + Realtime |
| Pacientes | ✅ Real | CRUD completo |
| Inbox WhatsApp | ✅ Real | Texto + Audio (Whisper) + AI agent |
| Lista de espera | ✅ Real | Filtros + Realtime + badge sidebar |
| Automatizaciones | ✅ Real | 3 tipos + EditModal |
| Reportes | ✅ Real | Recharts, rangos 3M/6M/1A/2A |
| Configuración → Servicios | ✅ Real | CRUD con descuentos |
| Configuración → Equipo | ✅ Real | Invitaciones + roles |
| Configuración → WhatsApp | ⏳ Mock | Pendiente UI real |

---

## 🚨 Estándares de código — reglas aprendidas (react-doctor)

> Estas reglas DEBEN seguirse en todo código nuevo para mantener la calidad del proyecto.

### Tailwind CSS
- **`w-N h-N` del mismo valor → usar `size-N`** (Tailwind v3.4+). Ej: `w-8 h-8` → `size-8`, `w-4 h-4` → `size-4`
- No usar `w-[Npx] h-[Npx]` cuando se puede usar `size-[Npx]`

### React — Keys
- **Nunca usar índice de array como key** (`key={i}`). Siempre usar ID estable: `key={item.id}`, `key={item.slug}`, `key={item.name}`
- Exception: listas estáticas/constantes donde el orden nunca cambia (ej: lista de beneficios fija)

### React — useEffect cleanup
- **Todo `setTimeout` en useEffect → retornar `clearTimeout`**
  ```jsx
  useEffect(() => {
    const t = setTimeout(() => { ... }, delay);
    return () => clearTimeout(t);
  }, [dep]);
  ```
- **Todo `setInterval` → retornar `clearInterval`**
- **Todo Supabase Realtime `.subscribe()` → retornar `supabase.removeChannel(channel)`** (ya aplica en la mayoría de hooks)

### React — Performance
- **Default array props → constante de módulo**, no literal inline:
  ```jsx
  // ❌ MAL: crea nueva referencia en cada render
  function Comp({ items = [] }) {}
  // ✅ BIEN: referencia estable
  const EMPTY_ITEMS = [];
  function Comp({ items = EMPTY_ITEMS }) {}
  ```
- **`array.includes()` en loops repetidos → convertir a `Set`**:
  ```js
  // ❌ O(n) por cada llamada
  STATUS_LIST.includes(item.status)
  // ✅ O(1)
  const STATUS_SET = new Set(STATUS_LIST);
  STATUS_SET.has(item.status)
  ```
- **`await` dentro de `for...of` para operaciones independientes → `Promise.all`**:
  ```ts
  // ❌ Secuencial
  for (const item of items) { await processItem(item); }
  // ✅ Paralelo
  await Promise.all(items.map(item => processItem(item)));
  ```

### React — Correctness
- **`new Date()` en render/JSX → envolver en `useEffect+useState`** para evitar hydration mismatch
- **`localStorage` → siempre versionar la key**: `"cliniq:tweaks:v1"` no `"cliniq:tweaks"`

### Accesibilidad
- **`<a>` sin href real → usar `<button>`** si es un click handler. Si es link, usar href real.
- **`<div onClick>` no interactivo → agregar `role="button"` + `tabIndex={0}` + `onKeyDown`**:
  ```jsx
  <div
    role="button"
    tabIndex={0}
    onClick={handleClick}
    onKeyDown={e => e.key === 'Enter' && handleClick()}
  >
  ```
- **`<label>` → siempre con `htmlFor` apuntando al `id` del input asociado**:
  ```jsx
  <label htmlFor="email-input">Email</label>
  <input id="email-input" type="email" />
  ```

### JSX — Texto
- **No usar em dash literal `—` en JSX text** → usar `{"—"}` o `{" — "}` como expresión JSX

---

## Decisiones de diseño importantes

- **Loop multi-turn siempre con tools:** la API de Anthropic requiere tools en toda llamada con `tool_use` en historial.
- **resolvedPatientId:** variable en memoria dentro del invocation → permite `register_patient → schedule_appointment` en cadena.
- **Timezone en formatAppointments:** siempre `timeZone: 'America/Montevideo'`. El servidor Deno corre en UTC.
- **Capitalización con split(' '):** regex `\b\w` de JS no funciona con tildes.
- **`message_type` en messages:** siempre pasarlo al insertar mensajes inbound. Mapeo: `['audio','image','document','sticker','video'].includes(msgType) ? msgType : 'text'`
- **`add_to_waitlist` en tools array:** DEBE estar en el array `tools` de la llamada a Claude.
- **`norm()` regex:** usar `/[̀-ͯ]/g` — nunca bytes literales Unicode (frágiles entre editores).
- **Realtime DELETE requiere REPLICA IDENTITY FULL.**
- **`agent_mode = 'human'`** solo se setea DESPUÉS de `res.ok` en handleSend.
