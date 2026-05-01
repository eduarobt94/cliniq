# Cliniq — Project Instructions

## ⚡ INICIO RÁPIDO DE SESIÓN
> Leé esta sección primero. Resume el estado actual y qué hacer a continuación.

**Último trabajo completado (2026-04-30) — Automatizaciones + Reportes + Resumen funcionales:**

### ✅ Completado en esta sesión
- **send-whatsapp-reminders:** cron cada 1 min, escribe en `messages` + `conversations` (aparece en inbox), para `ai_followup_tick` de disparar texto extra, auto-detecta idioma del template (itera es_AR/es/es_ES/es_MX/es_US/es_UY hasta encontrar el correcto)
- **Cron `send-whatsapp-reminders`:** era `Token null is invalid` — faltaba service_role_key en ai_config. Fix: recrear cron SIN Authorization header (`--no-verify-jwt` no lo necesita)
- **Template buttons (confirmar/cancelar/reagendar):** llegaban como `type:"button"` (no `"interactive"`). Agregado handler para `msgType === 'button'` en `whatsapp-webhook` con mapping robusto de payload/title → intent
- **Reagendar desde botón:** NO marca el turno como `rescheduled` en el webhook — deja que el AI agent lo haga cuando ejecuta `reschedule_appointment` (si se marca antes, la IA no ve el turno y responde genéricamente)
- **System prompt reagendar:** mejorado para reconocer "Reagendar" (sola palabra de botón) y pedir fecha/hora de inmediato
- **Reportes:** datos reales vía `useReportes` hook — tasa de confirmación, cancelados, mensajes WA enviados, turnos por mes (bar chart), top pacientes, estadísticas de automatizaciones
- **Dashboard Resumen:** removidos `RevenueBlock` y `RiskBlock` (hardcodeados, contenían facturación/ingresos). KPI strip sin deltas falsos. Layout ajustado
- **Sin facturación/DGI en esta versión:** todos los bloques de ingresos, dinero en riesgo y facturación están ocultos/eliminados

### Próximas tareas priorizadas
1. 🔴 **Token WhatsApp permanente** — crear System User token en Meta Business Manager → actualizar secret `WHATSAPP_ACCESS_TOKEN`
2. 🟡 **Configuración → WhatsApp** — UI real para gestionar token y número  
3. 🟡 **InboxBlock dashboard** — migrar de tabla legacy `whatsapp_message_log` a tabla `messages`

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
    useWhatsappInbox.js       ← últimos N mensajes inbound (InboxBlock dashboard) — tabla legacy
    useConversations.js       ← lista de conversaciones CRM con Realtime
    useRealtimeMessages.js    ← mensajes de una conversación con Realtime
    useAgendaRange.js         ← turnos por rango de fechas + Realtime + refetch
    useNotifications.js
    useAgendaBadge.js         ← count turnos activos futuros (new/pending/confirmed) para sidebar
    useAutomationsBadge.js    ← count automatizaciones enabled para sidebar
  lib/
    supabase.js            ← cliente Supabase singleton
    authService.js         ← signUp, signIn, createClinic, inviteMember, acceptInvite
    appointmentService.js  ← CRUD de patients y appointments; normaliza teléfonos a E.164
    phoneUtils.js          ← isValidPhone(), normalizePhone() — validación E.164
  pages/
    Dashboard/             ← AgendaBlock, KPIs, AutomationsBlock, InboxBlock, NewAppointmentModal, InviteMemberModal
    Agenda/                ← vista completa de agenda + fmtDayLabel/fmtMonthLabel con split(' ') para tildes
    Pacientes/             ← tabla de pacientes con CRUD, búsqueda, filtros + refetch inmediato
    Inbox/                 ← CRM inbox: useConversations + useRealtimeMessages, toggle IA, panel contexto
    Automatizaciones/ / Reportes/ / Configuracion/
  layouts/DashboardLayout.jsx  ← dispara cq_appointment_created CustomEvent para refetch cross-component
supabase/
  functions/
    whatsapp-webhook/      ← recibe eventos Meta, upsert conversations+messages, llama ai-agent-reply
    ai-agent-reply/        ← agente IA completo (ver sección AI Agent más abajo)
    send-whatsapp-message/ ← staff envía mensajes outbound
    initiate-conversation/ ← crea conversación + envía template si hay turno
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
| `profiles` | Nombre y apellido de cada usuario. Creado por trigger |
| `clinic_members` | Multi-usuario. Roles: `owner/staff/viewer`. Estados: `invited/active` |
| `patients` | `UNIQUE(clinic_id, phone_number)`. Tel en E.164. Cols IA: `ai_enabled` (bool), `last_human_interaction` |
| `appointments` | ENUM status: `new/pending/confirmed/rescheduled/cancelled`. `notes` = `[IA] Servicio: X` para agente |
| `clinic_automations` | Config recordatorios. `UNIQUE(clinic_id, type)` |
| `conversations` | CRM inbox. `UNIQUE(clinic_id, phone_number)`. `agent_mode`: `bot/human`. `agent_last_human_reply_at`. `REPLICA IDENTITY FULL` |
| `messages` | FK → conversations. `direction`: `inbound/outbound/outbound_ai/system/system_template`. `sender_type`: `bot/staff/system`. `REPLICA IDENTITY FULL` |
| `whatsapp_message_log` | Auditoría legacy — sigue siendo insertada para backward compat |

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
| `20260430000000_ai_agent_handoff.sql` | ✅ Ejecutada — `agent_mode`, `ai_enabled`, `sender_type`, `outbound_ai`, `agent_last_human_reply_at` |

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
- Saludos vacíos del staff (`"hola"`, `"ok"`, `"bien"`, etc.) → NO se tratan como "respuesta real" al contar inbounds sin responder
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
  // ...
  return `  ${DAY_NAMES[d.getUTCDay()]} ${iso.slice(8)} de ${MON_NAMES[d.getUTCMonth()]} → ${iso}`;
}).join('\n');
```

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
| `whatsapp-webhook` | `--no-verify-jwt` | Recibe eventos de Meta (Meta no manda JWT) |
| `ai-agent-reply` | `--no-verify-jwt` | Agente IA (invocado internamente por webhook) |
| `send-whatsapp-message` | normal | Staff envía mensaje outbound |
| `initiate-conversation` | normal | Crea conversación + template |
| `send-whatsapp-reminders` | `--no-verify-jwt` | Recordatorios automáticos — cron cada 1 min, escribe en messages+conversations |

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
| `useAgendaBadge(clinicId)` | `{ count }` | Turnos new/pending/confirmed futuros |
| `useAutomationsBadge(clinicId)` | `{ count }` | Automatizaciones enabled |
| `useAIReactivation(clinicId, convs)` | `{ showBanner, affectedCount, handleReactivate, handleDismiss }` | Sugiere reactivar IAs > 2h inactivas |
| `useReportes(clinicId, range)` | `{ data, loading, error }` | Reportes reales: confirmRate, cancelled, msgCount, monthSeries, topPatients, autoStats |

---

## Estado actual de páginas
| Componente | Estado | Notas |
|---|---|---|
| KPI cards | ✅ Real | useKpis |
| AgendaBlock | ✅ Real | useAppointments + Realtime |
| NewAppointmentModal | ✅ Real | appointmentService |
| AutomationsBlock | ✅ Real | useAutomations |
| InboxBlock (dashboard) | ✅ Real | tabla legacy whatsapp_message_log |
| Página Inbox (CRM) | ✅ Real | bidireccional + AI Agent + toggle + contexto lead |
| Agenda (página) | ✅ Real | useAgendaRange + refetch inmediato post-mutación |
| Pacientes | ✅ Real | CRUD + refetch inmediato |
| Sidebar badges | ✅ Real | useAgendaBadge + useAutomationsBadge |
| Configuracion → Equipo | ✅ Real | useMembers + InviteMemberModal |
| Configuracion → WhatsApp | ⏳ Mock | Hardcodeado |
| RevenueBlock | 🚫 Oculto | Sin facturación en esta versión |
| RiskBlock | 🚫 Oculto | Sin datos de dinero en esta versión |
| Reportes | ✅ Real | useReportes — turnos, confirmación, WA, top pacientes |

---

## Decisiones de diseño importantes

- **Loop multi-turn siempre con tools:** la API de Anthropic requiere tools en toda llamada que tenga `tool_use` en el historial. Sin esto Claude devuelve contenido vacío (chars: 0).
- **Múltiples tools por ronda:** Claude puede devolver varios `tool_use` blocks en una respuesta (ej: reschedule + cancel). Se ejecutan en `Promise.all` y se devuelven todos los resultados juntos.
- **resolvedPatientId:** variable en memoria dentro del invocation que se actualiza al registrar un paciente nuevo. Permite que `schedule_appointment` funcione inmediatamente después de `register_patient` sin esperar a que la DB sincronice.
- **Timezone en formatAppointments:** siempre `timeZone: 'America/Montevideo'`. El servidor Deno corre en UTC — sin esto muestra +3h de la hora real (ej: 15:00 aparece como 18:00).
- **Capitalización con split(' '):** `split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')` — el regex `\b\w` de JS no funciona con tildes (á, é, í actúan como word boundaries).
- **Saludos vacíos del staff:** "hola", "ok", "bien" etc. del staff no se cuentan como "respuesta real" al escanear mensajes inbound sin responder. Permite que la IA retome aunque el staff haya saludado.
- **Refetch inmediato post-mutación:** todas las mutaciones llaman `refetch()` directamente, sin esperar el evento Realtime (que tarda 1-2s). El evento Realtime actúa como segunda confirmación.
- **CustomEvent `cq_appointment_created`:** `DashboardLayout` lo emite cuando se crea un turno desde el modal. `Agenda` escucha y llama `refetchAgenda()`.
- **Sin UI optimista en mensajes:** causaba duplicados con Realtime. Realtime < 1s es suficiente.
- **Realtime DELETE requiere REPLICA IDENTITY FULL:** sin esto los filtros de columna en DELETE no funcionan.
- **agent_mode 'human':** cualquier mensaje manual del staff silencia el bot. Se reactiva si el humano lleva > 2min sin escribir Y hay mensajes del paciente sin responder.

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

# Setear secrets
npx supabase secrets set WHATSAPP_ACCESS_TOKEN=<nuevo-token-permanente>
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# Verificar secrets actuales
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

## Superpowers Skills
- Nuevas features → `brainstorming`
- Bugs → `systematic-debugging`
- Implementación → `test-driven-development`
- Planes → `writing-plans` → `executing-plans`
- Antes de terminar → `verification-before-completion`
