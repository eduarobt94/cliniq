# Cliniq — Project Instructions

## ⚡ INICIO RÁPIDO DE SESIÓN
> Leé esta sección primero. Resume el estado actual y qué hacer a continuación.

**Último trabajo completado (2026-05-07) — Servicios de clínica + herramienta `add_to_waitlist` del agente IA:**

### ✅ Completado en esta sesión
- **Configuración → Servicios:** nueva sección `ServicesSection.jsx` en Configuración. CRUD completo (nombre, duración, precio base, descuento porcentual o fijo, toggle activo/inactivo). Hook `useClinicServices.js`.
- **Agente IA — servicios reales:** `ai-agent-reply` consulta `clinic_services` en tiempo real. Función `formatServices()` genera texto con precio final calculado. Sistema prompt incluye `SERVICIOS DE LA CLÍNICA` en ambos flujos (nuevo/existente). Reglas actualizadas: CONSULTA DE PRECIOS y CONSULTA DE SERVICIOS usan datos reales.
- **Fix PASO 1/2 agente:** si el primer mensaje incluye nombre + apellido, registra de inmediato sin volver a preguntar.
- **Tool `add_to_waitlist`:** bug crítico resuelto — la herramienta estaba en el sistema prompt pero NO en el array `tools`. Claude no podía llamarla. Ahora está implementada: inserta en tabla `waiting_list` (clinic_id, patient_id, phone_number, full_name, service, date_from, date_to, notes, status).
- **Migración `20260507000003_clinic_services.sql`:** tabla `clinic_services` creada.
- **Migración `20260507000004_waiting_list.sql`:** tabla `waiting_list` creada — **🔴 PENDIENTE ejecutar en SQL Editor**.
- **Test suite `agent-test.mjs`:** 20 tests (T01–T20). Cubre UI de servicios + agente IA completo.

### Próximas tareas priorizadas
1. 🔴 **Ejecutar migración** `20260507000004_waiting_list.sql` en Supabase SQL Editor → habilita tool `add_to_waitlist`
2. 🔴 **Ejecutar migración** `20260430000002_new_automations.sql` en Supabase SQL Editor (sigue pendiente)
3. 🔴 **Token WhatsApp permanente** — crear System User token en Meta Business Manager → actualizar secret `WHATSAPP_ACCESS_TOKEN`
4. 🟡 **Deploy Edge Functions nuevas** — `send-patient-reactivation` y `send-review-requests` (ver comandos abajo)
5. 🟡 **Configuración → WhatsApp** — UI real para gestionar token y número

**Usuario de prueba:** `maria@bonomi.uy` / `demo1234`
**Dev server:** `npm run dev` → localhost:5173

---

## Qué es este proyecto
SaaS de automatización para clínicas médicas en Uruguay. Gestiona turnos, pacientes y automatizaciones de WhatsApp. Stack: Vite 6 + React 18 + Tailwind CSS v3 + Supabase.

**Repo GitHub:** https://github.com/eduarobt94/cliniq

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
    useClinic.js              ← clínica del usuario autenticado
    useAppointments.js        ← turnos de hoy + Realtime
    useKpis.js                ← KPIs desde v_clinic_kpis_today
    usePatients.js            ← lista de pacientes (limit 50) + refetch
    useMembers.js             ← miembros + profiles batch + addMember/removeMember/refetch
    useAutomations.js         ← clinic_automations + v_automation_stats
    useConversations.js       ← lista de conversaciones CRM con Realtime
    useRealtimeMessages.js    ← mensajes de una conversación con Realtime
    useAgendaRange.js         ← turnos por rango de fechas + Realtime + refetch
    useNotifications.js
    useAgendaBadge.js         ← count turnos activos futuros (new/pending/confirmed) para sidebar
    useAutomationsBadge.js    ← count automatizaciones enabled para sidebar
    useUnreadCounts.js        ← Map<convId, N> de mensajes inbound sin respuesta por conversación
    useReportes.js            ← Reportes reales: confirmRate, cancelled, msgCount, monthSeries,
                                 quarterSeries, topPatients, autoStats. Rangos: 3m/6m/1a/2a
    useClinicServices.js      ← CRUD servicios de clínica: createService/updateService/toggleActive/deleteService
  lib/
    supabase.js            ← cliente Supabase singleton
    authService.js         ← signUp, signIn, createClinic, inviteMember, acceptInvite
    appointmentService.js  ← CRUD de patients y appointments; normaliza teléfonos a E.164
    phoneUtils.js          ← isValidPhone(), normalizePhone() — validación E.164
  pages/
    Dashboard/             ← AgendaBlock, KPIs, AutomationsBlock, InboxBlock, NewAppointmentModal,
                              InviteMemberModal. InboxBlock usa useConversations+useUnreadCounts.
                              NewAppointmentModal tiene modo express (status=confirmed, hora=now±15m)
    Agenda/                ← vista completa de agenda + fmtDayLabel/fmtMonthLabel con split(' ') para tildes
    Pacientes/             ← tabla de pacientes con CRUD, búsqueda, filtros + refetch inmediato
    Inbox/                 ← CRM inbox: useConversations + useRealtimeMessages, toggle IA, panel contexto
    Automatizaciones/      ← 3 tipos: appointment_reminder / patient_reactivation / review_request.
                              EditModal con campos dinámicos por tipo + preview de template en vivo
    Reportes/              ← Recharts BarChart apilado (5 estados). Rangos: 3M/6M/1A/2A.
                              Toggle granularidad mensual/trimestral. Datos reales de appointments
    Configuracion/             ← tab Horarios y servicios incluye ServicesSection: CRUD servicios con descuentos
  layouts/DashboardLayout.jsx  ← modalConfig centralizado (open/defaultDate/express),
                                  openModal()/openModalExpress(), cq_appointment_created CustomEvent
supabase/
  functions/
    whatsapp-webhook/      ← recibe eventos Meta, upsert conversations+messages, llama ai-agent-reply
    ai-agent-reply/        ← agente IA completo (ver sección AI Agent más abajo)
    send-whatsapp-message/ ← staff envía mensajes outbound
    initiate-conversation/ ← crea conversación + envía template si hay turno
    send-whatsapp-reminders/   ← recordatorios automáticos — cron, escribe en messages+conversations
    send-patient-reactivation/ ← contacta pacientes inactivos N meses; max 20/clínica/run
    send-review-requests/      ← envía link de Google Reviews N horas post-consulta
  migrations/              ← ver tabla más abajo
  demo_seed.sql            ← 15 pacientes UY + ~65 turnos ±56d desde hoy (ON CONFLICT DO NOTHING)
  demo_seed_2years.sql     ← PL/pgSQL DO block — 24 meses Jan 2024–Dec 2025 de datos históricos
```

---

## Base de datos (Supabase)
**Proyecto ID:** `jmpyygecgqkeuwwaioew` — región: São Paulo
**URL:** `https://jmpyygecgqkeuwwaioew.supabase.co`

### Tablas principales
| Tabla | Descripción |
|---|---|
| `clinics` | Raíz multi-tenant. `owner_id` FK → `auth.users.id`. Cols WA: `wa_phone_number_id`, `wa_access_token`, `address`, `phone`, `email_contact` |
| `profiles` | Nombre y apellido de cada usuario. Creado por trigger |
| `clinic_members` | Multi-usuario. Roles: `owner/staff/viewer`. Estados: `invited/active` |
| `patients` | `UNIQUE(clinic_id, phone_number)`. Tel en E.164. Cols IA: `ai_enabled` (bool), `last_human_interaction` |
| `appointments` | ENUM status: `new/pending/confirmed/rescheduled/cancelled`. `notes` = `[IA] Servicio: X` para agente |
| `clinic_automations` | Config automatizaciones. `UNIQUE(clinic_id, type)`. Tipos: `appointment_reminder / patient_reactivation / review_request`. Extra cols: `months_inactive` (int, default 6), `hours_after` (int, default 2) |
| `conversations` | CRM inbox. `UNIQUE(clinic_id, phone_number)`. `agent_mode`: `bot/human`. `REPLICA IDENTITY FULL` |
| `messages` | FK → conversations. `direction`: `inbound/outbound/outbound_ai/system/system_template`. `sender_type`: `bot/staff/system`. `REPLICA IDENTITY FULL` |
| `whatsapp_message_log` | Auditoría legacy — sigue siendo insertada para backward compat |
| `clinic_services` | Servicios configurados por clínica. Cols: `name`, `duration_minutes`, `price` (numeric 10,2), `discount_type` (percent/fixed), `discount_value`, `is_active`. RLS: miembros leen, solo owner escribe |
| `waiting_list` | Lista de espera para turnos. Cols: `patient_id` (nullable), `phone_number`, `full_name`, `service`, `date_from`, `date_to`, `notes`, `status` (pending/notified/cancelled) |

### Vistas
- `v_today_appointments` — turnos de hoy + paciente + timezone
- `v_clinic_kpis_today` — conteos del día
- `v_automation_stats` — estadísticas outbound

### RPCs
- `fn_user_clinic_ids()` — STABLE SECURITY DEFINER
- `create_clinic_with_owner(clinic_name, p_first_name, p_last_name)`
- `create_member_invite(p_clinic_id, p_email, p_role)`
- `get_invite_by_token(p_token)` — pública
- `accept_member_invite(p_token)`

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
| `20260430000002_new_automations.sql` | 🔴 PENDIENTE — agregar `patient_reactivation`, `review_request`, cols `months_inactive`/`hours_after` |
| `20260504000000_fix_views_timezone.sql` | 🔴 PENDIENTE — fix `CURRENT_DATE` (UTC) → `(CURRENT_TIMESTAMP AT TIME ZONE 'America/Montevideo')::date` en `v_today_appointments` y `v_clinic_kpis_today` |
| `20260507000003_clinic_services.sql` | ✅ Ejecutada |
| `20260507000004_waiting_list.sql` | 🔴 PENDIENTE — tabla `waiting_list` para tool `add_to_waitlist` del agente IA |

**⚠️ Nunca volver a ejecutar las ya aplicadas en producción.**

---

## Agente IA WhatsApp (`ai-agent-reply`)

### Arquitectura
- **Modelo:** `claude-haiku-4-5`, max_tokens: 400
- **Invocación:** `whatsapp-webhook` → llama `ai-agent-reply` via HTTP interno cuando `shouldAgentReply()` = true
- **Timezone:** todos los cálculos de fecha/hora en `America/Montevideo` (UTC-3)
- **Modo paciente nuevo:** `isNewPatient = !patient` → sistema diferente, solo tools `register_patient` + `schedule_appointment`
- **resolvedPatientId:** variable en memoria que se actualiza al registrar → permite chain `register_patient → schedule_appointment` en mismo invocation

### Loop multi-turn (crítico)
```typescript
// La API de Anthropic REQUIERE tools en toda llamada que tenga tool_use en el historial
// Loop de hasta 4 rondas — procesa TODOS los tool_use blocks en paralelo por ronda
for (let round = 0; round < 4; round++) {
  const data = await callClaude(currentMessages); // siempre con tools
  if (data.stop_reason !== 'tool_use') { claudeText = extractText(data); break; }
  // Ejecutar todos los tool blocks en paralelo → Promise.all
  // Añadir assistant + tool_results al hilo → continuar loop
}
```
**⚠️ NUNCA llamar a Claude sin tools si el historial tiene bloques tool_use — devuelve contenido vacío.**

### Herramientas disponibles
| Tool | Cuándo | Qué hace |
|---|---|---|
| `schedule_appointment` | Turno nuevo — tiene servicio+fecha+hora | Inserta en `appointments` con status `new` |
| `cancel_appointments` | Cancelar sin nueva fecha | UPDATE status → `cancelled` |
| `reschedule_appointment` | Cambiar fecha/hora | UPDATE viejos → `rescheduled` + INSERT nuevo |
| `confirm_appointment` | Paciente confirma asistencia | UPDATE status → `confirmed` |
| `register_patient` | Solo para isNewPatient | INSERT en `patients` + UPDATE conversation.patient_id |
| `add_to_waitlist` | Paciente quiere ser avisado si se libera turno | INSERT en `waiting_list` con service/date_from/date_to opcionales |

### Contexto de turnos (`formatAppointments`)
```typescript
// ⚠ Siempre con timeZone: 'America/Montevideo' — servidor corre en UTC
const fecha = dt.toLocaleDateString('es-UY', { timeZone: 'America/Montevideo', weekday: 'long', ... });
const hora  = dt.toLocaleTimeString('es-UY', { timeZone: 'America/Montevideo', ... });
// Extrae servicio de notes: /Servicio:\s*([^—\n]+)/
// Formato: [ID:uuid] Turno el miércoles 6 de mayo a las 15:00 (estado: new) — Servicio: limpieza dental
```

### Lógica de activación (`whatsapp-webhook`)
- `shouldAgentReply()`: agent_mode = 'bot' → true; 'human' → solo si `agent_last_human_reply_at > 2 min`
- Saludos vacíos del staff (`"hola"`, `"ok"`, `"bien"`, etc.) → NO se tratan como "respuesta real"
- Si hay mensajes del paciente sin respuesta Y humano inactivo > 2min → IA retoma aunque agent_mode sea 'human'
- Lookup de clínica para guests: exact match `wa_phone_number_id` → fallback `WA_PHONE_NUMBER_ID_GLOBAL` env var

### Sistema de intenciones (prompt)
- **"cuántos turnos tengo"** → responde del contexto, sin tool
- **"cancelar"** → 1 turno: cancela directo. Varios: muestra lista y pregunta cuál
- **"reagendar para X"** → 1 turno + fecha dada: reschedule directo. Sin fecha: pregunta. Varios: pregunta cuál primero
- **"confirmo"** → confirm_appointment con el turno más próximo
- **"quiero turno nuevo"** → pide servicio → fecha → hora → schedule_appointment

### Calendario explícito en system prompt
```typescript
// 14 días con día nombre + número + mes → ISO
// "miércoles 06 de mayo → 2026-05-06"
// REGLA ABSOLUTA: Claude NUNCA calcula fechas — copia del calendario
const proximosDias = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(nowUY.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
  return `  ${DAY_NAMES[d.getUTCDay()]} ${iso.slice(8)} de ${MON_NAMES[d.getUTCMonth()]} → ${iso}`;
}).join('\n');
```

---

## Automatizaciones (Edge Functions de fondo)

### `send-whatsapp-reminders`
- Cron cada 1 min via Supabase Cron
- Busca turnos de mañana sin recordatorio enviado
- Auto-detecta idioma del template (itera `es_AR/es/es_ES/es_MX/es_US/es_UY`)
- Escribe en `messages` + `conversations` (visible en inbox)
- Cron creado SIN `Authorization` header (`--no-verify-jwt`)

### `send-patient-reactivation`
- Busca pacientes sin turno en N meses (`months_inactive` de la automatización, default 6)
- Max 20 pacientes por clínica por ejecución (anti-spam)
- Envía texto libre con template `{patient_name}` + `{clinic_name}` vía WhatsApp
- Registra en `messages` + actualiza `conversations`

### `send-review-requests`
- Corre N horas después de que termina un turno (`hours_after`, default 2)
- Solo para turnos `confirmed` que no recibieron request aún
- Template configurable con `{patient_name}` + `{clinic_name}` + link de reviews

---

## Variables de entorno
```
VITE_SUPABASE_URL=https://jmpyygecgqkeuwwaioew.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

### Secrets de Supabase (Edge Functions)
```
SUPABASE_URL=https://jmpyygecgqkeuwwaioew.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
WHATSAPP_VERIFY_TOKEN=cliniq_webhook_2026
WHATSAPP_ACCESS_TOKEN=<system-user-token-permanente>   ← 🔴 VENCE CADA 24H si es token de prueba
WHATSAPP_PHONE_NUMBER_ID=<phone-number-id>
ANTHROPIC_API_KEY=sk-ant-...
```

---

## WhatsApp / Meta — Configuración

- **Webhook URL:** `https://jmpyygecgqkeuwwaioew.supabase.co/functions/v1/whatsapp-webhook`
- **Verify Token:** `cliniq_webhook_2026`
- **Subscribed fields:** `messages`
- **Token permanente:** Meta Business Manager → Configuración → Usuarios del sistema → Generar token → Sin expiración → `whatsapp_business_messaging` + `whatsapp_business_management`
- **Ventana 24h:** texto libre solo si el paciente escribió en las últimas 24h

### Edge Functions — Deploy
| Función | Flags | Propósito |
|---|---|---|
| `whatsapp-webhook` | `--no-verify-jwt` | Recibe eventos de Meta |
| `ai-agent-reply` | `--no-verify-jwt` | Agente IA (invocado internamente) |
| `send-whatsapp-message` | normal | Staff envía mensaje outbound |
| `initiate-conversation` | normal | Crea conversación + template |
| `send-whatsapp-reminders` | `--no-verify-jwt` | Recordatorios automáticos — cron |
| `send-patient-reactivation` | `--no-verify-jwt` | Reactivación de pacientes inactivos |
| `send-review-requests` | `--no-verify-jwt` | Solicitud de reseñas Google post-turno |

---

## Auth
- `AuthContext.jsx` usa solo `onAuthStateChange` (dispara `INITIAL_SESSION` al montar)
- `authService.js` — signUp crea user + clinic; si clinic falla → needsOnboarding=true
- `ProtectedRoute` → `/login` si no hay sesión, `/onboarding` si needsOnboarding
- Flujo invitación: `/accept-invite?token=X` → login/signup → acepta → `/dashboard`

---

## Hooks de datos
| Hook | Retorna | Notas |
|---|---|---|
| `useClinic()` | `{ clinic, loading }` | Join clinic_members → clinics |
| `useAppointments()` | `{ appointments, loading }` | Hoy + Realtime |
| `useKpis()` | `{ kpis, loading }` | v_clinic_kpis_today |
| `usePatients()` | `{ patients, loading, refetch }` | Limit 50 |
| `useMembers(clinicId)` | `{ members, loading, addMember, removeMember, refetch }` | displayName = nombre o email |
| `useAutomations(clinicId)` | `{ automation, stats, loading, toggle, save }` | |
| `useAgendaRange(start, end)` | `{ appointments, loading, error, refetch }` | Rango de fechas + Realtime |
| `useConversations(clinicId)` | `{ conversations, loading, error, refetch, deleteConversation }` | agent_mode, agent_context, ai_enabled |
| `useRealtimeMessages(convId)` | `{ messages, loading, error, addOptimistic, removeOptimistic, deleteMessage, refetch }` | |
| `useUnreadCounts(conversationIds)` | `Map<convId, N>` | Mensajes inbound consecutivos sin respuesta staff. Single query + client-side |
| `useAgendaBadge(clinicId)` | `{ count }` | Turnos new/pending/confirmed futuros |
| `useAutomationsBadge(clinicId)` | `{ count }` | Automatizaciones enabled |
| `useReportes(clinicId, range)` | `{ data, loading, error }` | `data` = `{ confirmRate, cancelled, msgCount, monthSeries, quarterSeries, topPatients, autoStats }`. Rangos: `3m/6m/1a/2a` |

---

## Estado actual de páginas
| Componente | Estado | Notas |
|---|---|---|
| KPI cards | ✅ Real | useKpis |
| AgendaBlock | ✅ Real | useAppointments + Realtime |
| NewAppointmentModal | ✅ Real | appointmentService. Express mode: status=confirmed, hora=now±15m |
| AutomationsBlock | ✅ Real | useAutomations |
| InboxBlock (dashboard) | ✅ Real | useConversations + useUnreadCounts (migrado de legacy) |
| Página Inbox (CRM) | ✅ Real | bidireccional + AI Agent + toggle + contexto lead |
| Agenda (página) | ✅ Real | useAgendaRange + refetch inmediato post-mutación |
| Pacientes | ✅ Real | CRUD + refetch inmediato |
| Sidebar badges | ✅ Real | useAgendaBadge + useAutomationsBadge |
| Configuracion → Equipo | ✅ Real | useMembers + InviteMemberModal |
| Configuracion → Servicios | ✅ Real | useClinicServices — CRUD con descuentos porcentuales y fijos |
| Configuracion → WhatsApp | ⏳ Mock | Hardcodeado |
| Reportes | ✅ Real | useReportes — Recharts BarChart apilado, rangos 3M/6M/1A/2A, granularidad mensual/trimestral |
| Automatizaciones | ✅ Real | 3 tipos, EditModal dinámico, preview de template |
| RevenueBlock | 🚫 Oculto | Sin facturación en esta versión |
| RiskBlock | 🚫 Oculto | Sin datos de dinero en esta versión |

---

## Decisiones de diseño importantes

- **Loop multi-turn siempre con tools:** la API de Anthropic requiere tools en toda llamada que tenga `tool_use` en el historial. Sin esto Claude devuelve contenido vacío (chars: 0).
- **Múltiples tools por ronda:** Claude puede devolver varios `tool_use` blocks en una respuesta. Se ejecutan en `Promise.all` y se devuelven todos juntos.
- **resolvedPatientId:** variable en memoria dentro del invocation. Permite que `schedule_appointment` funcione inmediatamente después de `register_patient`.
- **Timezone en formatAppointments:** siempre `timeZone: 'America/Montevideo'`. El servidor Deno corre en UTC.
- **Capitalización con split(' '):** `split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')` — el regex `\b\w` de JS no funciona con tildes.
- **Saludos vacíos del staff:** "hola", "ok", "bien" no cuentan como respuesta real al escanear inbounds sin responder.
- **Refetch inmediato post-mutación:** todas las mutaciones llaman `refetch()` directamente, sin esperar Realtime (que tarda 1-2s).
- **CustomEvent `cq_appointment_created`:** `DashboardLayout` lo emite al crear turno. `Agenda` escucha y llama `refetchAgenda()`.
- **Sin UI optimista en mensajes:** causaba duplicados con Realtime. Realtime < 1s es suficiente.
- **Realtime DELETE requiere REPLICA IDENTITY FULL:** sin esto los filtros de columna en DELETE no funcionan.
- **agent_mode 'human':** cualquier mensaje manual del staff silencia el bot. Se reactiva si humano lleva > 2min sin escribir Y hay mensajes del paciente sin responder.
- **`add_to_waitlist` — tool en tools array:** la herramienta DEBE estar en el array `tools` de la llamada a Claude para que Claude pueda invocarla. Si solo está en el system prompt pero no en `tools`, Claude genera texto verbal como "te anoto" sin ejecutar nada. Mismo patrón para cualquier herramienta nueva.
- **`formatServices()`:** construye el bloque `SERVICIOS DE LA CLÍNICA` del system prompt. Calcula precio final con descuento en tiempo real. Injected en ambos system prompts (nuevo/existente).
- **useReportes — `buildMonthSeries` / `buildQuarterSeries`:** agrupa appointments por mes/trimestre en timezone UY. Multi-year label: si hay más de un año en el rango, labels como `"Ene '25"` en vez de `"Ene"`.
- **useUnreadCounts:** cuenta hacia atrás desde el último mensaje hasta el primer outbound — eso da los inbound sin responder. No usa Realtime (se recalcula al cambiar conversationIds).

---

## Comandos útiles
```bash
npm run dev      # localhost:5173
npm run build    # build de producción

# Desplegar Edge Functions
npx supabase functions deploy whatsapp-webhook --no-verify-jwt
npx supabase functions deploy ai-agent-reply --no-verify-jwt
npx supabase functions deploy send-whatsapp-message
npx supabase functions deploy initiate-conversation
npx supabase functions deploy send-whatsapp-reminders --no-verify-jwt
npx supabase functions deploy send-patient-reactivation --no-verify-jwt
npx supabase functions deploy send-review-requests --no-verify-jwt

# Setear secrets
npx supabase secrets set WHATSAPP_ACCESS_TOKEN=<nuevo-token-permanente>
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# Verificar secrets
npx supabase secrets list
```

---

## Seguridad
| Aspecto | Estado |
|---|---|
| RLS | ✅ Activado en todas las tablas; 23+ políticas |
| Headers HTTP | ✅ CSP + HSTS + X-Frame-Options en netlify.toml / vercel.json |
| Error disclosure | ✅ Mensajes genéricos en Login/Signup |
| Phone validation | ✅ phoneUtils.js antes de persistir |
| XSS | ✅ Sin dangerouslySetInnerHTML |
| SQL injection | ✅ PostgREST parametriza todo |
| npm audit | ✅ 0 vulnerabilidades |

---

## 🧪 REGRESIÓN PENDIENTE (2026-05-07)

Se aplicaron fixes de auditoría. Usar `claude --chrome` para verificar en el browser:

### Checklist de pruebas
1. Navegar `localhost:5173/dashboard` → sin errores en consola
2. KPIs del día muestran números (no error PGRST116)
3. Abrir modal "Nuevo turno" → se anima al abrir con `.cq-modal-in`
4. Tabla Pacientes → inspect `<th>` debe tener `scope="col"`
5. Lista de espera `/dashboard/lista-espera` → carga sin errores
6. Inbox `/dashboard/inbox` → conversaciones visibles
7. Reportes `/dashboard/reportes` → gráficos de recharts cargan
8. Automatizaciones → 3 cards, badge "1 activa · 2 inactivas"
9. Abrir EditModal en Automatizaciones → botón cerrar tiene `aria-label="Cerrar"`
10. Configuración → carga sin errores

### Fixes aplicados (verificar no regresión)
- `DashboardErrorBoundary` envuelve cada ruta del dashboard
- `useKpis` usa `.maybeSingle()` con fallback a ceros
- `useAutomations` tiene try/catch/finally
- `useNotifications` tiene caché de nombres (`_patientNameCache`)
- `handleStatusChange` en ListaEspera usa `useCallback`
- `handleConversationCreated/Delete` en Inbox usan `useCallback`
- Vite: chunks `vendor-recharts` y `vendor-supabase` separados
- `--cq-fg-muted: oklch(0.48...)` en globals.css
- Clases `.cq-modal-in` y `.cq-modal-in-fast` en globals.css
- `scope="col"` en `<th>` de Pacientes, ListaEspera, Reportes
- `aria-label="Cerrar"` en EditModal de Automatizaciones
