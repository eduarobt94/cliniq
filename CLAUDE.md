# Cliniq — Project Instructions

## ⚡ INICIO RÁPIDO DE SESIÓN
> Leé esta sección primero. Resume el estado actual y qué hacer a continuación.

**Última sesión completada: 2026-07-08**

### ✅ Auditoría integral completa (2026-07-06 → 2026-07-08) — cerrada y desplegada
Auditoría de arquitectura, seguridad, performance, escalabilidad, IA, código y producto. 3 PRs mergeadas a `main`, **migraciones y edge functions ya desplegadas en producción**.

**PR #3** (`972329d`) — anti-solapamiento de turnos (constraint `EXCLUDE USING gist` + `duration_minutes`/`ends_at`), reconciliación de schema `waiting_list` (dos migraciones homónimas en conflicto), HMAC del webhook fail-closed (`WHATSAPP_APP_SECRET` obligatorio), rate-limit por remitente (`ai_rate_limit` + RPC `check_rate_limit`), cron de seguimiento IA sin full-scan (`conversations.last_message_at` denormalizado), timezone del agente por clínica (antes UTC-3 hardcodeado), guards de paciente-scope en cancel/reschedule/confirm del agente, `insertMessage` fail-loud, paginación server-side en Pacientes.

**PR #4** (`7990bb8`) — RLS por roles (`fn_user_clinic_ids_writer`/`_owner`: `viewer` pasa a solo-lectura; **fix del toggle IA del Inbox que no persistía** por falta de policy UPDATE en `conversations`), multi-tenant real en el webhook (lookup de paciente scoped por clínica, antes global), doctor flow confirma el turno *notificado* (no el más antiguo), gate del agente en modo humano ya no es no-op y no auto-resetea `human→bot`, claims atómicos en `send-whatsapp-reminders`/`notify-waitlist` (evita doble-envío), fallback free-text→template, filtro de servicio en waitlist, fix CI (pnpm version + vite CVE alta).

**PR #5** (`bfcb61c`) — audit UX: focus-visible universal (antes solo 13 elementos de toda la app tenían foco de teclado visible), título de documento por página.

**Estado en producción (verificado por CLI, 2026-07-08):**
- ✅ Todas las migraciones aplicadas — `supabase migration list --linked` sin drift, incluida `20260707000000_rls_role_enforcement`
- ✅ Las 4 edge functions tocadas por el audit redeployadas: `whatsapp-webhook` v94, `ai-agent-reply` v102, `send-whatsapp-reminders` v71, `notify-waitlist` v7 (todas `updated_at` 2026-07-08 ~09:09-09:10)

**QA en vivo (browser, 2026-07-08):**
1. 🔴 PENDIENTE — Usuario con rol `viewer` solo-lectura: requiere una **segunda cuenta con rol `viewer`** (la cuenta de prueba es owner). Las políticas RLS `fn_user_clinic_ids_writer/_owner` sí están confirmadas activas en prod por CLI.
2. ✅ **PASS** — Toggle de IA del Inbox: verificado en vivo. Desactivar → `patients.ai_enabled=false` persiste en DB → sobrevive reload completo. (El toggle escribe `patients.ai_enabled`, no `conversations.agent_mode`.)
3. 🔴 PENDIENTE — Doctor flow: NO browser-testable, requiere mensajes reales de WhatsApp del médico + `supabase functions logs whatsapp-webhook`
4. 🔴 PENDIENTE — Gate agente modo humano: NO browser-testable, requiere inbound real de WhatsApp

**Verificado de paso en el smoke test (2026-07-08):** búsqueda server-side de Pacientes ("1 resultado" con filtro correcto), focus-visible universal (outline accent al enfocar), título por página (Dashboard/Inbox/Pacientes — Cliniq), 0 errores de consola, Web Vitals TTFB 172ms. El **export de turnos ya existe** (botón en dashboard, deshabilitado sin datos).

**Hallazgos identificados pero NO implementados (quedan para próxima sesión):**
- Command palette (⌘K ya existe, falta agregar acciones tipo "Nuevo turno", "Ir a Reportes")
- Paginación/virtualización del Inbox (hoy corta en 50 conversaciones sin aviso)
- Undo en acciones destructivas (borrar paciente/mensaje)
- Export CSV (Pacientes, Reportes)
- Refactor de `ai-agent-reply` (1250+ líneas, god function) — deuda de mantenibilidad, requiere rama dedicada con QA suite

### ✅ Completado en sesión (2026-05-16)
- **Fix H2 — AuthCallback timeout:** `timedOut = useRef` no re-triggerea useEffect. Fix: navigate('/login') directamente en setTimeout. Removido useRef innecesario.
- **Fix W6 — ResetPassword flash:** `setSuccess(true)` antes de `updatePassword()` previene redirect a /login cuando `passwordRecoveryMode` se limpia.
- **Fix W5 — ErrorBoundary console.error:** wrapped en `if (import.meta.env.DEV)` en ambos ErrorBoundary y DashboardErrorBoundary.
- **Fix W3 — Email enumeration en Signup:** "Ya existe una cuenta con ese correo" → mensaje genérico.
- **Fix W2 — googleLoading safety reset:** timeout de 15s resetea el estado si OAuth no redirige.
- **QA Exhaustivo completo:** 344 test cases documentados en `docs/qa/` cubriendo todos los flujos del sistema.
- **CLAUDE.md actualizado:** 10 reglas QA críticas para que el agente dev no repita errores.

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
1. **QA manual de los 4 puntos del audit** (ver arriba) — usuario viewer, toggle IA, doctor flow, gate del agente
2. **Token WhatsApp permanente** — verificar si sigue siendo token de prueba (60 días) en Meta Business Manager → actualizar secret `WHATSAPP_ACCESS_TOKEN` si venció

### 🟡 Próximas funcionalidades sugeridas
- Configuración → WhatsApp: UI real para gestionar token y número (actualmente mock)
- Command palette con acciones (⌘K ya existe la búsqueda; falta agregar comandos)
- Paginación/virtualización del Inbox (hoy corta en 50 conversaciones)
- Export de datos (CSV de pacientes, turnos)
- Undo en acciones destructivas (5s con toast, patrón "Deshacer")

**Usuario de prueba:** ⚠️ `maria@bonomi.uy` / `demo1234` es **INVÁLIDO** (verificado 2026-07-08 — Supabase responde "Invalid login credentials"). Recomendado: crear un usuario demo dedicado en Supabase Auth y documentarlo acá. **No** hardcodear credenciales de cuentas personales reales en este archivo (queda en el historial de git).
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
| `waiting_list` | Lista de espera. Cols: `patient_id` (NOT NULL), `service`, `preferred_date_from`, `preferred_date_to`, `notes`, `status` (`waiting/notified/booked/expired/cancelled`), `notified_at`, `updated_at`. Esquema canónico definido en `20260507000000_waiting_list.sql` — ver nota en `20260507000004_waiting_list.sql` sobre el conflicto reconciliado (audit CRÍTICO-2) |
| `ai_rate_limit` | Rate-limit de IA por remitente. Cols: `phone_number` (PK), `window_start`, `count`. RPC `check_rate_limit(phone, max, window_seconds)` — default 12 msg/60s |

### Migraciones
> **⚠️ NO mantener esta tabla a mano** (fue la causa del CRÍTICO-3 del audit 2026-07-06: drift entre lo documentado y lo real). Fuente de verdad:
> ```bash
> npx supabase migration list --linked   # compara local vs remoto
> npx supabase db push --linked          # aplica pendientes
> ```
> Ver `supabase/migrations/README.md` para el flujo completo y detección de drift en CI. Migraciones clave del audit: `20260706000000` (anti-solapamiento de turnos), `20260706000001` (cron sin full-scan), `20260706000002` (rate-limit IA), `20260707000000` (RLS por roles).

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
- `agent_mode = 'human'` → solo si humano lleva > 2min inactivo Y hay mensajes sin responder (audit REP-MEDIO-8: gate real, antes era no-op; si cubre, NO auto-resetea a `bot` — el control sigue siendo del staff)
- `ai_enabled = false` → nunca responde
- Doctor flow: el "1"/"2" del médico actúa sobre `clinics.settings.doctor_pending_appointment_id` (turno notificado), no sobre "el más antiguo" (audit REP-MEDIO-10)

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
WHATSAPP_APP_SECRET=<app-secret-de-meta>    ← ✅ Configurado (2026-07-06). OBLIGATORIO: sin este secret el webhook rechaza TODO con 403 (fail-closed, audit ALTO-4). Meta → Configuración de la app → Básica → "Clave secreta de la app"
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

## 🚨 Estándares de código — reglas aprendidas (react-doctor audit 71→84/100)

> **LEER OBLIGATORIO antes de escribir cualquier componente o hook.**
> Estas reglas vienen de auditorías reales del proyecto. Violarlas genera deuda técnica que toma horas corregir.

---

### 1. Tailwind CSS — tamaños

```jsx
// ❌ MAL — w-N h-N del mismo valor
<div className="w-8 h-8" />
<div className="w-4 h-4" />

// ✅ BIEN — shorthand size-N (Tailwind v3.4+)
<div className="size-8" />
<div className="size-4" />
```
> Aplica a cualquier valor: `size-5`, `size-6`, `size-[14px]`, etc.

---

### 2. React — Keys estables en listas

```jsx
// ❌ MAL — índice como key, rompe en reorder/filter
items.map((item, i) => <Row key={i} />)

// ✅ BIEN — ID estable del dato
items.map(item => <Row key={item.id} />)
items.map(item => <Row key={item.slug} />)
items.map(item => <Row key={item.name} />)

// ✅ OK para listas ESTÁTICAS que nunca cambian de orden
STATIC_OPTIONS.map((opt, i) => <Option key={i} />)
```

---

### 3. useEffect — siempre retornar cleanup

**Timers:**
```jsx
// ❌ MAL — leak en cada re-render y en unmount
useEffect(() => {
  setTimeout(() => navigate('/dashboard'), 1200);
}, []);

// ✅ BIEN
useEffect(() => {
  const t = setTimeout(() => navigate('/dashboard'), 1200);
  return () => clearTimeout(t);
}, []);
```

**Supabase Realtime — patrón OBLIGATORIO en todos los hooks:**
```js
useEffect(() => {
  if (!clinicId) return;

  async function load() { /* fetch data */ }
  load();

  // ⚠️ SEPARAR asignación de channel y .subscribe() en dos líneas
  // para que el static analyzer detecte el cleanup correctamente
  const channel = supabase.channel(`nombre-${clinicId}`);
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'tabla',
    filter: `clinic_id=eq.${clinicId}` }, load)
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [clinicId]);
```
> **Crítico:** asignar `const channel = supabase.channel(...)` en línea separada antes de `.on().subscribe()`. Si se encadena todo en una línea, el analyzer no detecta el cleanup.

**Event listeners:**
```jsx
useEffect(() => {
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);
```

---

### 4. Performance — operaciones independientes en paralelo

```ts
// ❌ MAL — secuencial, innecesariamente lento
for (const item of items) {
  await sendNotification(item);
}

// ✅ BIEN — paralelo
await Promise.all(items.map(item => sendNotification(item)));

// ⚠️ EXCEPCIÓN: loops que DEBEN ser secuenciales (ej: ai-agent-reply tool loop)
// NO paralelizar cuando el resultado de una iteración afecta la siguiente
```

**Awaits independientes también van en paralelo:**
```ts
// ❌ MAL
const patients = await supabase.from('patients').select('*');
const appointments = await supabase.from('appointments').select('*');

// ✅ BIEN
const [patients, appointments] = await Promise.all([
  supabase.from('patients').select('*'),
  supabase.from('appointments').select('*'),
]);
```

---

### 5. Performance — referencias estables

```jsx
// ❌ MAL — [] literal crea nueva referencia en cada render
function Comp({ items = [] }) {}

// ✅ BIEN — constante de módulo, referencia estable
const EMPTY_ITEMS = [];
function Comp({ items = EMPTY_ITEMS }) {}
```

```js
// ❌ MAL — O(n) por cada llamada en un loop
items.filter(x => STATUS_LIST.includes(x.status))

// ✅ BIEN — O(1) con Set
const STATUS_SET = new Set(STATUS_LIST);
items.filter(x => STATUS_SET.has(x.status))
```

```js
// ❌ MAL — itera el array dos veces
items.map(transform).filter(Boolean)

// ✅ BIEN — una sola pasada
items.flatMap(x => condition(x) ? [transform(x)] : [])
```

```js
// ❌ MAL — copia + sort mutable
[...array].sort(compareFn)

// ✅ BIEN — ES2023, inmutable sin spread
array.toSorted(compareFn)
```

---

### 6. Performance — inicialización lazy de estado

```jsx
// ❌ MAL — se recalcula en cada render aunque solo se use la primera vez
const [year, setYear] = useState(new Date().getFullYear());

// ✅ BIEN — función inicializadora, se ejecuta solo una vez
const [year, setYear] = useState(() => new Date().getFullYear());
```

```jsx
// ❌ MAL — localStorage en cada render
const [compact, setCompact] = useState(localStorage.getItem('key') === 'true');
// y luego otra llamada más abajo...

// ✅ BIEN — leer una sola vez y cachear
const stored = localStorage.getItem('cq_compact_mode:v1');
const [compact, setCompact] = useState(stored === 'true');
```

---

### 7. Correctness — new Date() en render

```jsx
// ❌ MAL — new Date() en el cuerpo del componente / JSX
function MyComp() {
  const today = new Date().toISOString().slice(0, 10); // distinto en server vs client
  return <div>{today}</div>;
}

// ✅ BIEN — solo en cliente, después del mount
function MyComp() {
  const [today, setToday] = useState('');
  useEffect(() => { setToday(new Date().toISOString().slice(0, 10)); }, []);
  return <div>{today}</div>;
}

// ✅ También OK — inicializador lazy (evita flash)
const [today] = useState(() => new Date().toISOString().slice(0, 10));
```

---

### 8. Correctness — localStorage versionado

```js
// ❌ MAL — sin versión, crashes si cambia el schema
localStorage.setItem('cliniq:tweaks', JSON.stringify(data));

// ✅ BIEN — con versión en la key
localStorage.setItem('cliniq:tweaks:v1', JSON.stringify(data));
```

---

### 9. useState vs useRef

```jsx
// ❌ MAL — useState para valores que NUNCA se muestran en el JSX
const [sent, setSent] = useState(false);
// ...en handler: setSent(true)
// ...en JSX: no aparece "sent" en ningún return/render

// ✅ BIEN — useRef para valores que solo se leen en handlers/efectos
const sentRef = useRef(false);
// ...en handler: sentRef.current = true
```
> Regla: si el valor no aparece en el `return (...)` del componente, usar `useRef`.

---

### 10. Accesibilidad

```jsx
// ❌ MAL — <a> sin href real
<a href="#" onClick={handler}>Ver más</a>

// ✅ BIEN — usar <button> para acciones, <a> solo para navegación real
<button onClick={handler}>Ver más</button>
<a href="/ruta-real">Ver más</a>
```

```jsx
// ❌ MAL — div clicable sin accesibilidad de teclado
<div onClick={handler}>Acción</div>

// ✅ BIEN — navegable por teclado
<div
  role="button"
  tabIndex={0}
  onClick={handler}
  onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handler()}
>
  Acción
</div>
```

```jsx
// ❌ MAL — label sin asociar al input
<label>Email</label>
<input type="email" />

// ✅ BIEN — htmlFor + id
<label htmlFor="email-field">Email</label>
<input id="email-field" type="email" />
```

```jsx
// ❌ MAL — botones vagos
<button onClick={cancelar}>No</button>

// ✅ BIEN — descriptivos
<button onClick={cancelar}>Cancelar</button>
<button onClick={confirmDelete}>Eliminar paciente</button>
```

---

### 11. JSX — texto

```jsx
// ❌ MAL — em dash literal en JSX
<p>Servicio — incluye consulta</p>

// ✅ BIEN — expresión JSX
<p>Servicio {" — "} incluye consulta</p>
// o simplemente usar coma/dos puntos
<p>Servicio: incluye consulta</p>
```

---

### 12. Intl — cachear constructores costosos

```ts
// ❌ MAL — new Intl.DateTimeFormat() dentro de función, se recrea en cada llamada
function formatDate(date: Date) {
  return new Intl.DateTimeFormat('es-UY', { ... }).format(date);
}

// ✅ BIEN — module scope o Map cache
const DTF = new Intl.DateTimeFormat('es-UY', { dateStyle: 'short' });
function formatDate(date: Date) { return DTF.format(date); }

// ✅ Para múltiples locales/opciones — Map cache
const intlCache = new Map<string, Intl.DateTimeFormat>();
function getFormatter(locale: string, opts: Intl.DateTimeFormatOptions) {
  const key = `${locale}-${JSON.stringify(opts)}`;
  if (!intlCache.has(key)) intlCache.set(key, new Intl.DateTimeFormat(locale, opts));
  return intlCache.get(key)!;
}
```

---

### 13. Lo que NO corregir (no son bugs reales en este proyecto)

| Regla | Por qué ignorar |
|---|---|
| `prefer-useReducer` | Refactorizar `useState×5` → `useReducer` en 14 componentes = riesgo alto sin beneficio funcional |
| `no-cascading-set-state` | Hooks de carga con múltiples setState son correctos aquí |
| `knip/files` (edge functions) | Supabase Edge Functions no son módulos JS importados — falso positivo del analyzer |
| `no-fetch-in-effect` | Requeriría migrar a `react-query`, fuera de scope |
| `no-mutable-in-deps` (location.pathname) | `useLocation()` de React Router es inmutable por render — falso positivo |
| `no-react19-deprecated-apis` | Estamos en React 18, no 19 — falso positivo |
| `no-side-tab-border` | El `border-l-2` del ítem activo en Sidebar es una decisión de diseño intencional |
| `no-giant-component` | Signup/NewAppointmentModal/Configuracion son grandes pero funcionales, refactorizar es riesgo |

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

---

## 🔬 QA — Reglas para el agente dev

> Estas reglas vienen del audit QA exhaustivo de 2026-05-16. Aplicar ANTES de hacer PR.

### Antes de cualquier PR — ejecutar mentalmente:

**1. Auth flows — 4 reglas críticas:**
```
✅ AuthCallback: timeout de 10s navega directamente en setTimeout (NO via ref)
✅ ResetPassword: setSuccess(true) ANTES de updatePassword() para evitar flash a /login
✅ Emails de error: NUNCA revelar si un email existe (signup, forgot-password)
✅ Google loading: siempre tiene safety reset de 15s (no queda infinito)
```

**2. Race conditions — updates atómicos:**
```typescript
// ❌ MAL — dos operaciones separadas, race condition
await supabase.from('appointments').update({ status: 'confirmed' }).eq('id', id);

// ✅ BIEN — atómico con condición en WHERE
await supabase.from('appointments')
  .update({ status: 'confirmed' })
  .eq('id', id)
  .in('status', ['pending', 'new']); // CRÍTICO: falla silenciosamente si ya fue procesado
// Verificar que retorne 1 row afectada
```

**3. Optimistic updates — SIEMPRE revertir:**
```jsx
// ❌ MAL — sin rollback si falla
const handleToggle = async () => {
  setEnabled(!enabled); // optimistic
  await db.update(...);  // si falla, UI queda inconsistente
};

// ✅ BIEN — revertir en catch
const handleToggle = async () => {
  const prev = enabled;
  setEnabled(!prev); // optimistic
  try {
    await db.update(...);
  } catch {
    setEnabled(prev); // revert
    showError();
  }
};
```

**4. Supabase Realtime — cleanup obligatorio:**
```jsx
// ❌ MAL — leak de canales
useEffect(() => {
  supabase.channel('msgs').on('INSERT', handler).subscribe();
}, [convId]);

// ✅ BIEN — split + cleanup
useEffect(() => {
  const channel = supabase.channel(`msgs:${convId}`);
  channel.on('postgres_changes', { event: 'INSERT', ... }, handler).subscribe();
  return () => { supabase.removeChannel(channel); };
}, [convId]);
```

**5. success_rate — SIEMPRE usar Math.min:**
```jsx
// ❌ MAL — la vista devuelve 0-100, no 0-1
Math.round(stats.success_rate * 100) // → "1390%"

// ✅ BIEN
Math.min(100, Math.round(stats.success_rate)) // → "100%"
```

**6. ErrorBoundary — console.error solo en dev:**
```jsx
componentDidCatch(error, info) {
  if (import.meta.env.DEV) { // ← OBLIGATORIO
    console.error('[ErrorBoundary]', error, info.componentStack);
  }
}
```

**7. WhatsApp — dedup de botones:**
```
Si paciente confirma/cancela y presiona de nuevo → verificar dedup ANTES de actuar
Pattern: buscar appointment en ['confirmed','cancelled','rescheduled'] → mensaje dedup
NUNCA doble-confirmar ni doble-cancelar un appointment
```

**8. AI agent — validaciones de tools:**
```typescript
// register_patient: exigir nombre completo (sin apellido → error)
// schedule_appointment: validar closure + día laborable + horario ANTES de insertar
// add_to_waitlist: si patient_id null → lookup por phone o error claro
// Máx 4 rondas de tool use — nunca loop infinito
```

**9. Timezone — siempre clínica, nunca browser:**
```
Todas las fechas visibles al usuario → timezone de clinics.timezone
Fallback si null → 'America/Montevideo'
NUNCA usar new Date().toLocaleString() sin timezone explícita
```

**10. Recordatorios — threshold exacto:**
```
hours_before < 12  → free-text conversacional (sendWaFreeText)
hours_before >= 12 → template Meta aprobado (sendWaTemplate con lang fallback)
El 12 va al modo TEMPLATE (operador < es estricto)
reminder_sent_at solo se setea si waId !== null (no marcar si falló)
```

---

## 🧪 QA AGENT — Protocolo obligatorio

> **LEER COMPLETO antes de iniciar cualquier sesión de QA.**
> El agente QA NUNCA improvisa test cases. SIEMPRE opera desde los documentos en `docs/qa/`.

---

### Identidad del agente QA

Cuando se te pide "hacer QA", "probar", "verificar", "hacer regresión", o cualquier variante, sos un **Senior QA Automation Engineer** con acceso completo a `docs/qa/`. Tu trabajo es:

1. **Leer** el documento relevante antes de ejecutar cualquier prueba
2. **Ejecutar** los test cases definidos — no inventar nuevos sobre la marcha
3. **Reportar** con el formato estándar de la sección "Reporte de resultados" más abajo
4. **Actualizar** los documentos QA si encontrás casos no cubiertos o si el sistema cambió

---

### Mapa de documentos — qué leer según la tarea

| Si te piden probar... | Leer PRIMERO |
|----------------------|--------------|
| Login, signup, OAuth, invitaciones, roles, password reset | `docs/qa/QA_AUTH_FLOWS.md` |
| WhatsApp inbound, intents, doctor flow, confirmaciones, cancelaciones | `docs/qa/QA_WHATSAPP_FLOWS.md` |
| AI agent, agendamiento, reagendamiento, escalación, tools | `docs/qa/QA_WHATSAPP_FLOWS.md` (sección AI) |
| Recordatorios automáticos backend, cron de reminders | `docs/qa/QA_AUTOMATIONS_FLOWS.md` |
| UI de Automatizaciones, modal de edición, templates | `docs/qa/QA_AUTOMATIONS_FLOWS.md` (sección AUT) |
| Agenda, Pacientes, Inbox UI, Config, Lista de espera, Dashboard, Reportes | `docs/qa/QA_FRONTEND_FLOWS.md` |
| Race conditions, límites exactos, seguridad, offline | `docs/qa/QA_EDGE_CASES.md` |
| Regresión completa pre-deploy | `docs/qa/QA_REGRESSION_CHECKLIST.md` |
| Tests automatizados API-level con SQL assertions | `docs/qa/QA_AUTOMATION_SPECS.md` |
| Estrategia general, severidades, entornos | `docs/qa/QA_MASTER_PLAN.md` |

---

### Protocolo de ejecución paso a paso

```
PASO 1 — LEER el documento del módulo afectado (OBLIGATORIO, no opcional)
  → Si no leés el doc, no empezás la prueba

PASO 2 — IDENTIFICAR los test cases relevantes por ID
  → Ej: "AUTH-001", "AG-015", "WH-018", "R-INB-04"
  → Si el usuario pidió módulo específico: leer TODOS los cases de ese módulo
  → Si pidió regresión completa: usar QA_REGRESSION_CHECKLIST.md como guía

PASO 3 — EJECUTAR cada test case en orden de severidad
  → CRÍTICOS primero, luego ALTOS, MEDIOS, BAJOS
  → Para cada case: describir qué estás probando, resultado obtenido, PASS/FAIL

PASO 4 — REPORTAR en el formato estándar (ver abajo)

PASO 5 — SI encontrás bugs: documentarlos con ID, severidad, pasos para reproducir
  → Verificar si ya existe un case en docs/qa/ que lo cubra
  → Si NO existe: AGREGAR el case al archivo correspondiente

PASO 6 — SI el sistema cambió (nuevo feature, fix): ACTUALIZAR docs/qa/
  → Nunca dejar docs desactualizados respecto al código
```

---

### Formato de reporte de resultados

```markdown
## Reporte QA — {Módulo} — {Fecha}

### Resumen ejecutivo
| Estado | Count |
|--------|-------|
| ✅ PASS | N |
| ❌ FAIL | N |
| ⏭ SKIP | N |
| **Total** | **N** |

**Decisión**: ✅ GO / ❌ NO-GO / ⚠️ GO con seguimiento

---

### Resultados por test case

| ID | Descripción | Estado | Notas |
|----|-------------|--------|-------|
| AUTH-001 | Login email/password → /dashboard | ✅ PASS | |
| AUTH-007 | Google OAuth error → pantalla de error | ❌ FAIL | Ver BUG-001 |

---

### Bugs encontrados

#### BUG-001 — {Título corto}
**Severidad**: CRÍTICA / ALTA / MEDIA / BAJA
**Test case**: {ID del case}
**Pasos para reproducir**:
1. ...
2. ...
**Resultado obtenido**: ...
**Resultado esperado**: ...
**Archivo afectado**: `src/pages/.../index.jsx` línea N
```

---

### Reglas inviolables del agente QA

```
❌ NUNCA ejecutar pruebas sin leer el doc correspondiente primero
❌ NUNCA marcar PASS si no se verificó explícitamente
❌ NUNCA inventar test cases que contradigan los documentados
❌ NUNCA omitir tests de severidad CRÍTICA o ALTA
❌ NUNCA dejar docs/qa/ desactualizados si el código cambió
❌ NUNCA reportar "todo bien" sin haber ejecutado al menos el módulo relevante

✅ SIEMPRE leer el doc del módulo antes de empezar
✅ SIEMPRE reportar con formato estándar
✅ SIEMPRE ejecutar los CRÍTICOS y ALTOS como mínimo
✅ SIEMPRE actualizar docs si encontrás gaps de cobertura
✅ SIEMPRE verificar los edge cases de QA_EDGE_CASES.md para features nuevas
✅ SIEMPRE consultar QA_AUTOMATION_SPECS.md para tests API-level (tiene SQL assertions exactas)
```

---

### Cuándo actualizar los documentos QA

| Situación | Qué hacer |
|-----------|-----------|
| Se agregó una feature nueva | Agregar test cases en el archivo del módulo correspondiente |
| Se encontró un bug no cubierto por ningún case | Agregar el case + marcar si era un gap de cobertura |
| Se cambió comportamiento existente | Actualizar el caso afectado + resultado esperado |
| Se corrigió un bug | Agregar case de regresión específico para ese fix |
| Se cambió un umbral (ej: 12h → 6h) | Actualizar BC-005 en QA_EDGE_CASES.md + cases afectados |
| Nuevo módulo de UI | Crear sección nueva en QA_FRONTEND_FLOWS.md |
| Nueva edge function | Crear sección nueva en QA_WHATSAPP_FLOWS.md o QA_AUTOMATIONS_FLOWS.md |

Después de actualizar un doc: actualizar también el contador de test cases en `QA_MASTER_PLAN.md` (tabla final).

---

### Índice de documentos QA (`docs/qa/`)

| Archivo | Módulo | Cases | Última actualización |
|---------|--------|-------|---------------------|
| `QA_MASTER_PLAN.md` | Plan maestro, estrategia, criterios GO/NO-GO | — | 2026-05-16 |
| `QA_AUTH_FLOWS.md` | AUTH | 42 | 2026-05-16 |
| `QA_WHATSAPP_FLOWS.md` | WH + AI + DEPLOY | 95 | 2026-05-16 |
| `QA_AUTOMATIONS_FLOWS.md` | REM + AUT | 50 | 2026-05-16 |
| `QA_FRONTEND_FLOWS.md` | AG + PAC + INB + CFG + LSE + DASH + REG | 179 | 2026-05-16 |
| `QA_EDGE_CASES.md` | RC + BC + DI + PL + SEC + NET + UX | 40+ | 2026-05-16 |
| `QA_REGRESSION_CHECKLIST.md` | Regresión pre-deploy (95 checks) | 95 | 2026-05-16 |
| `QA_AUTOMATION_SPECS.md` | API-level, SQL assertions, NLP mocks | 27+ | 2026-05-16 |

**Total documentado**: ~350 test cases
