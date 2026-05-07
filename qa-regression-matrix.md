# Cliniq — Matriz de Regresión QA (Happy Path)

> Versión: 2.3 | Generado: 2026-05-07 | Agregado grupos NOSH (5), REVIEW (4), DOCCONF (5), AUDIT (8)
> Consumida por agente automatizado. NO modificar formato de tabla.
> Stack: React + Vite (localhost:5173) · Supabase · Edge Functions (Deno)
> Timezone clínica: `America/Montevideo` (UTC-3, sin DST desde 2015)
> Función estrella: `ai-agent-reply` + `whatsapp-webhook` → sección AI Inbox con 27 casos

---

## Variables de entorno requeridas

| Variable | Descripción |
|---|---|
| `SUPABASE_URL` | URL base del proyecto (`https://[project].supabase.co`) |
| `SERVICE_ROLE_KEY` | Clave de servicio para llamadas admin a Edge Functions y DB |
| `ACCESS_TOKEN` | JWT de sesión del usuario de prueba (role: owner) |
| `CLINIC_ID` | UUID de la clínica de prueba |
| `TEST_PATIENT_ID` | UUID del paciente de prueba registrado con `ai_enabled: true` |
| `TEST_PATIENT_PHONE` | Número de teléfono del paciente de prueba (formato `+598XXXXXXXX`) |
| `TEST_CONV_ID` | UUID de conversación activa con `agent_mode: "bot"` para `TEST_PATIENT_ID` |
| `TEST_USER_EMAIL` | Email del usuario propietario de la clínica de prueba |
| `TEST_USER_PASSWORD` | Password del usuario propietario |
| `HOURS_BEFORE` | Valor configurado en `clinic_automations` para recordatorios (ej. `24`) |

---

## Reglas globales de ejecución

- Cada Test_ID es independiente salvo que indique `Depende de:`
- Assertions sobre DB: usar cliente Supabase con `SERVICE_ROLE_KEY` (bypassa RLS)
- **Mock de fecha**: para tests NLP, sobrescribir `Date.now` en el entorno de test al timestamp UTC indicado. En Edge Functions Deno, pasar `x-test-now` header con valor ISO-8601; el agente usa ese valor si `Deno.env.get('ENVIRONMENT') === 'test'`
- **Limpieza**: al finalizar cada test que crea registros en `appointments` o `messages`, ejecutar DELETE con `SERVICE_ROLE_KEY` sobre los IDs creados
- **Timeout por test**: máximo 10s para tests de Edge Function (incluye cold start)
- **Regex usted**: para validar formalidad usar `/\b(vos|tú|te\s|¿te)/i` → debe ser `null`

---

## SECCIÓN 1 — Landing & Auth & Dashboard

| Test_ID | Módulo | Precondiciones | Pasos de Ejecución | Datos de Prueba (Inputs) | Resultado Esperado (Assertion) |
|---|---|---|---|---|---|
| CLQ-LAND-01 | Landing | Servidor Vite corriendo en `localhost:5173` | 1. GET `http://localhost:5173/`<br>2. Esperar evento `load` | URL: `http://localhost:5173/` | HTTP status `200`<br>`document.querySelector('body') != null`<br>`document.title` incluye `"Cliniq"`<br>`console.error` no dispara al cargar |
| CLQ-LAND-02 | Landing | CLQ-LAND-01 completado | 1. GET `http://localhost:5173/`<br>2. Esperar `DOMContentLoaded`<br>3. Evaluar `#root` | — | `document.querySelector('#root') != null`<br>`document.querySelector('#root').children.length > 0`<br>No hay nodo con texto `"Something went wrong"` o `"Error"` |
| CLQ-AUTH-01 | Auth — Login API | Usuario registrado con email confirmado en Supabase Auth | 1. POST `{SUPABASE_URL}/auth/v1/token?grant_type=password`<br>2. Body: `{ "email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD }` | `email: TEST_USER_EMAIL`<br>`password: TEST_USER_PASSWORD` | HTTP status `200`<br>`response.access_token != null`<br>`response.token_type === "bearer"`<br>`response.user.email === TEST_USER_EMAIL`<br>`response.user.email_confirmed_at != null` |
| CLQ-AUTH-02 | Auth — Redirect post-login | Servidor Vite corriendo, usuario válido | 1. Navegar a `http://localhost:5173/login`<br>2. Completar `input[type="email"]` con `TEST_USER_EMAIL`<br>3. Completar `input[type="password"]` con `TEST_USER_PASSWORD`<br>4. Click en `button[type="submit"]`<br>5. Esperar navegación (timeout 5s) | `email: TEST_USER_EMAIL`<br>`password: TEST_USER_PASSWORD` | `window.location.pathname` comienza con `/dashboard`<br>`window.location.pathname !== "/login"`<br>`document.querySelector('nav') != null` |
| CLQ-AUTH-03 | Auth — Persistencia sesión | Sesión activa post CLQ-AUTH-02 | 1. Navegar a `http://localhost:5173/dashboard/agenda`<br>2. `window.location.reload()`<br>3. Esperar evento `load` (timeout 5s) | — | `window.location.pathname` contiene `/dashboard`<br>`window.location.pathname !== "/login"`<br>`document.querySelector('nav') != null` |
| CLQ-AUTH-04 | Auth — Route Guard | Sin sesión activa (`localStorage` y cookies limpios) | 1. Limpiar `localStorage` y `sessionStorage`<br>2. Navegar a `http://localhost:5173/dashboard/agenda`<br>3. Esperar navegación (timeout 3s) | URL objetivo: `/dashboard/agenda` | `window.location.pathname === "/login"`<br>`document.querySelector('input[type="email"]') != null` |
| CLQ-AUTH-05 | Auth — Email no confirmado | Usuario en Supabase Auth con `email_confirmed_at: null` | 1. POST `/auth/v1/token?grant_type=password` con credenciales de usuario no confirmado<br>2. Navegar a `http://localhost:5173/dashboard`<br>3. Esperar navegación (timeout 3s) | `email: "unconfirmed@test.uy"`<br>`password: "Test1234!"` | `window.location.pathname === "/verify-email"`<br>`document.querySelector('body').textContent` contiene alguno de: `"verificar"`, `"confirmar"`, `"email"` |
| CLQ-DASH-01 | Dashboard — Agenda API | Sesión activa, clínica con ≥1 turno para fecha actual | 1. GET `{SUPABASE_URL}/rest/v1/appointments?clinic_id=eq.{CLINIC_ID}&select=id,appointment_datetime,status,patient_id`<br>2. Header: `Authorization: Bearer {ACCESS_TOKEN}` | `CLINIC_ID`: UUID de clínica | HTTP status `200`<br>`response` es Array<br>`response.length >= 1`<br>`response[0].id != null`<br>`response[0].appointment_datetime != null` |
| CLQ-DASH-02 | Dashboard — Agenda UI | Sesión activa, CLQ-DASH-01 completado | 1. Navegar a `http://localhost:5173/dashboard/agenda`<br>2. Esperar `DOMContentLoaded` + 1s de render | — | `document.querySelector('h1').textContent` contiene `"Agenda"`<br>≥1 elemento visible con nombre de paciente<br>No hay texto `"Error"` visible en body |
| CLQ-DASH-03 | Dashboard — Navegación día | UI en `/dashboard/agenda`, vista Día activa | 1. Obtener texto de fecha actual visible<br>2. Click en botón `">"` (siguiente día)<br>3. Esperar re-render (500ms)<br>4. Obtener texto de fecha nuevo | — | Texto de fecha después del click `!== ` texto antes del click<br>Sin errores en `console.error` |
| CLQ-DASH-04 | Dashboard — Pacientes API | Sesión activa, ≥1 paciente en clínica | 1. GET `{SUPABASE_URL}/rest/v1/patients?clinic_id=eq.{CLINIC_ID}&select=id,full_name,phone_number,ai_enabled`<br>2. Header: `Authorization: Bearer {ACCESS_TOKEN}` | `CLINIC_ID`: UUID | HTTP status `200`<br>`response` es Array<br>`response.length >= 1`<br>`response[0].full_name` es string no vacío |
| CLQ-DASH-05 | Dashboard — Modal nuevo turno | UI en `/dashboard/agenda`, sesión activa | 1. Navegar a `http://localhost:5173/dashboard/agenda`<br>2. Esperar render (1s)<br>3. Click en botón con texto `"Nuevo turno"`<br>4. Esperar modal (500ms) | — | Elemento con `role="dialog"` existe en DOM O elemento modal visible<br>≥1 `input` dentro del modal<br>Sin redirect ni error visible |
| CLQ-DASH-06 | Dashboard — Cambio estado | Turno con `status: "new"` en DB | 1. GET appointments para obtener `APPT_ID` con `status: "new"`<br>2. PATCH `{SUPABASE_URL}/rest/v1/appointments?id=eq.{APPT_ID}`<br>3. Body: `{ "status": "confirmed" }`<br>4. Header: `Prefer: return=representation` | `APPT_ID`: UUID con status `"new"` | HTTP status `200` o `204`<br>GET posterior: `response[0].status === "confirmed"` |
| CLQ-DASH-07 | Dashboard — Resumen KPIs | Sesión activa, clínica con datos históricos | 1. Navegar a `http://localhost:5173/dashboard`<br>2. Esperar render (1s) | — | `document.querySelector('h1') != null`<br>≥3 elementos con valores numéricos visibles<br>`.animate-pulse` count `=== 0` tras 3s (sin skeletons infinitos) |
| CLQ-NLP-UNIT | NLP — Parser unit tests | Deno en PATH, archivo `supabase/functions/_shared/nlDateParser.test.ts` existe | 1. Ejecutar: `deno test --allow-all supabase/functions/_shared/nlDateParser.test.ts`<br>2. Capturar stdout y exit code | — | Exit code `=== 0`<br>stdout contiene `"ok"`<br>stdout NO contiene `"FAILED"`<br>stdout contiene `"test result: ok"` |

---

## SECCIÓN 2 — AI Inbox (Función Estrella)

> **27 casos** organizados en 6 grupos. Cada grupo valida una dimensión crítica del agente.
> Base URL Edge Functions: `{SUPABASE_URL}/functions/v1/`
> Invocación estándar: `POST ai-agent-reply` con body `{ "conversationId": TEST_CONV_ID, "clinicId": CLINIC_ID }` y header `Authorization: Bearer {SERVICE_ROLE_KEY}`

---

### Grupo A — Parseo de fechas en lenguaje natural (NLP)

> Mock de fecha base: `2026-05-04T10:00:00-03:00` = `2026-05-04T13:00:00Z` = timestamp `1746363600000`
> Día de la semana de ese mock: **lunes**

| Test_ID | Módulo | Precondiciones | Pasos de Ejecución | Datos de Prueba (Inputs) | Resultado Esperado (Assertion) |
|---|---|---|---|---|---|
| CLQ-AI-NLP-01 | AI — NLP "en 10 días" | `Date.now` mockeado a `1746363600000`<br>Paciente sin turnos futuros<br>Conversación `agent_mode: "bot"` | 1. Aplicar mock: `Date.now = () => 1746363600000`<br>2. INSERT inbound: `"quiero turno en 10 días"`<br>3. POST a `ai-agent-reply`<br>4. Si agente pide servicio → INSERT `"Limpieza dental"` + POST<br>5. Esperar creación en DB (3s) | `mock_utc: 1746363600000`<br>`msg: "quiero turno en 10 días"` | Registro en `appointments`:<br>`date(appointment_datetime AT TIME ZONE 'America/Montevideo') = '2026-05-14'`<br>`patient_id = TEST_PATIENT_ID`<br>`status` IN `('new', 'confirmed')` |
| CLQ-AI-NLP-02 | AI — NLP "próximo lunes" | `Date.now` mockeado a `1746363600000` (lunes 2026-05-04)<br>Paciente sin turnos futuros<br>Conversación `agent_mode: "bot"` | 1. Aplicar mock: `Date.now = () => 1746363600000`<br>2. INSERT inbound: `"agendame el próximo lunes"`<br>3. POST a `ai-agent-reply`<br>4. Si agente pide servicio → INSERT `"Consulta general"` + POST<br>5. Esperar creación (3s) | `mock_utc: 1746363600000`<br>`msg: "agendame el próximo lunes"` | `date(appointment_datetime AT TIME ZONE 'America/Montevideo') = '2026-05-11'`<br>`extract(dow FROM appointment_datetime AT TIME ZONE 'America/Montevideo') = 1` (lunes = 1 en Postgres)<br>`patient_id = TEST_PATIENT_ID` |
| CLQ-AI-NLP-03 | AI — NLP "pasado mañana" | `Date.now` mockeado a `1746363600000` (2026-05-04)<br>Paciente sin turnos futuros | 1. Aplicar mock: `Date.now = () => 1746363600000`<br>2. INSERT inbound: `"quiero turno pasado mañana"`<br>3. POST a `ai-agent-reply`<br>4. Si agente pide servicio → INSERT `"Ortodoncia"` + POST<br>5. Esperar creación (3s) | `mock_utc: 1746363600000`<br>`msg: "quiero turno pasado mañana"` | `date(appointment_datetime AT TIME ZONE 'America/Montevideo') = '2026-05-06'`<br>`patient_id = TEST_PATIENT_ID` |
| CLQ-AI-NLP-04 | AI — NLP "en una semana" | `Date.now` mockeado a `1746363600000`<br>Paciente sin turnos futuros | 1. Aplicar mock: `Date.now = () => 1746363600000`<br>2. INSERT inbound: `"turno en una semana"`<br>3. POST a `ai-agent-reply`<br>4. Si agente pide servicio → INSERT `"Blanqueamiento"` + POST<br>5. Esperar creación (3s) | `mock_utc: 1746363600000`<br>`msg: "turno en una semana"` | `date(appointment_datetime AT TIME ZONE 'America/Montevideo') = '2026-05-11'`<br>`patient_id = TEST_PATIENT_ID` |
| CLQ-AI-NLP-05 | AI — NLP día semana relativo "el miércoles" | `Date.now` mockeado a `1746363600000` (lunes 2026-05-04)<br>Paciente sin turnos futuros | 1. Aplicar mock: `Date.now = () => 1746363600000`<br>2. INSERT inbound: `"quiero turno el miércoles"`<br>3. POST a `ai-agent-reply`<br>4. Si agente pide servicio → INSERT `"Consulta"` + POST<br>5. Esperar creación (3s) | `mock_utc: 1746363600000`<br>`msg: "quiero turno el miércoles"` | `date(appointment_datetime AT TIME ZONE 'America/Montevideo') = '2026-05-06'`<br>`extract(dow FROM appointment_datetime AT TIME ZONE 'America/Montevideo') = 3` (miércoles)<br>`patient_id = TEST_PATIENT_ID` |
| CLQ-AI-NLP-06 | AI — NLP hora default 09:00 | Paciente sin turnos futuros<br>Conversación `agent_mode: "bot"` | 1. INSERT inbound: `"agendame para mañana, sin preferencia de hora"`<br>2. POST a `ai-agent-reply`<br>3. Si agente pide servicio → INSERT `"Consulta"` + POST<br>4. Esperar creación (3s) | `msg: "agendame para mañana, sin preferencia de hora"` | `extract(hour FROM appointment_datetime AT TIME ZONE 'America/Montevideo') = 9`<br>`extract(minute FROM appointment_datetime AT TIME ZONE 'America/Montevideo') = 0`<br>`patient_id = TEST_PATIENT_ID` |
| CLQ-AI-NLP-07 | AI — NLP hora explícita "a las 15" | Clínica abierta hasta al menos las 15:00 en el día target<br>Paciente sin turnos futuros | 1. INSERT inbound: `"quiero turno mañana a las 15"`<br>2. POST a `ai-agent-reply`<br>3. Si agente pide servicio → INSERT `"Consulta"` + POST<br>4. Esperar creación (3s) | `msg: "quiero turno mañana a las 15"` | `extract(hour FROM appointment_datetime AT TIME ZONE 'America/Montevideo') = 15`<br>`extract(minute FROM appointment_datetime AT TIME ZONE 'America/Montevideo') = 0`<br>Offset en `appointment_datetime` string = `-03:00` |

---

### Grupo B — Flujos de agendamiento completos

| Test_ID | Módulo | Precondiciones | Pasos de Ejecución | Datos de Prueba (Inputs) | Resultado Esperado (Assertion) |
|---|---|---|---|---|---|
| CLQ-AI-FLOW-01 | AI — Booking completo multi-turno | Paciente registrado sin turnos futuros<br>Conversación `agent_mode: "bot"` | 1. INSERT inbound: `"Hola, quiero agendar un turno"` → POST `ai-agent-reply`<br>2. Agente pide servicio → INSERT `"Limpieza dental"` → POST<br>3. Agente pide fecha → INSERT `"para el jueves a las 10"` → POST<br>4. Esperar creación en DB (3s) | `msg_1: "Hola, quiero agendar un turno"`<br>`msg_2: "Limpieza dental"`<br>`msg_3: "para el jueves a las 10"` | Nuevo registro en `appointments` con `patient_id = TEST_PATIENT_ID`<br>`notes` contiene `"Limpieza"` (case-insensitive)<br>`extract(hour FROM appointment_datetime AT TIME ZONE 'America/Montevideo') = 10`<br>`extract(dow FROM appointment_datetime AT TIME ZONE 'America/Montevideo') = 4` (jueves)<br>Mensaje outbound final contiene fecha y hora confirmadas |
| CLQ-AI-FLOW-02 | AI — Una pregunta por turno | Paciente registrado sin turnos futuros<br>Conversación `agent_mode: "bot"` | 1. INSERT inbound: `"quiero turno"` → POST `ai-agent-reply`<br>2. Capturar mensaje outbound generado | `msg: "quiero turno"` | El mensaje outbound contiene **exactamente 1** signo `"?"` (una sola pregunta)<br>`(content.match(/\?/g) \|\| []).length === 1`<br>Mensaje NO mezcla preguntas sobre servicio + fecha + hora en un solo texto |
| CLQ-AI-FLOW-03 | AI — Cancelar turno via agente | Paciente con 1 turno activo en `status: "new"` o `"pending"`<br>Conversación `agent_mode: "bot"` | 1. Obtener `APPT_ID` del turno activo del paciente<br>2. INSERT inbound: `"quiero cancelar mi turno"` → POST `ai-agent-reply`<br>3. Esperar procesamiento (3s) | `msg: "quiero cancelar mi turno"` | GET appointments: `appointments[0].status === "cancelled"` para `APPT_ID`<br>Mensaje outbound contiene alguno de: `"cancelado"`, `"cancelar"`, `"coordinar"`<br>HTTP status `200` |
| CLQ-AI-FLOW-04 | AI — Reagendar turno via agente | Paciente con 1 turno activo en `status: "pending"` o `"new"`<br>Conversación `agent_mode: "bot"` | 1. Obtener `OLD_APPT_ID` del turno activo<br>2. INSERT inbound: `"quiero cambiar mi turno para el viernes a las 11"` → POST<br>3. Si agente pide servicio → INSERT servicio original → POST<br>4. Esperar (3s) | `msg: "quiero cambiar mi turno para el viernes a las 11"` | GET por `OLD_APPT_ID`: `status === "rescheduled"`<br>Nuevo registro en `appointments` con:<br>`extract(dow FROM appointment_datetime AT TIME ZONE 'America/Montevideo') = 5` (viernes)<br>`extract(hour FROM appointment_datetime AT TIME ZONE 'America/Montevideo') = 11`<br>Mensaje outbound contiene la nueva fecha |
| CLQ-AI-FLOW-05 | AI — Registro nuevo paciente | Número `TEST_UNKNOWN_PHONE` NO existe en `patients`<br>Clínica con `wa_phone_number_id` configurado | 1. POST a `whatsapp-webhook` con payload Meta simulado:<br>`{ type:"text", from: TEST_UNKNOWN_PHONE, body:"Hola" }`<br>2. Esperar procesamiento (3s) | `from: TEST_UNKNOWN_PHONE` (ej: `"+59899000099"`) | Registro en `conversations` con `phone_number = TEST_UNKNOWN_PHONE` y `patient_id = null`<br>Mensaje outbound en `messages` con `direction: "outbound"` y `clinic_id = CLINIC_ID`<br>HTTP status `200` del webhook |

---

### Grupo C — Validación de horarios y cierres

| Test_ID | Módulo | Precondiciones | Pasos de Ejecución | Datos de Prueba (Inputs) | Resultado Esperado (Assertion) |
|---|---|---|---|---|---|
| CLQ-AI-VAL-01 | AI — Día cerrado rechazado | Clínica con `clinic_schedule` configurado con `is_open: false` para domingo (`day_of_week: 0`)<br>Paciente sin turnos futuros | 1. INSERT inbound solicitando turno el próximo domingo<br>2. POST a `ai-agent-reply`<br>3. Esperar respuesta (3s) | `msg: "quiero turno el domingo"` | NO se crea registro en `appointments` para ese paciente con fecha domingo<br>Mensaje outbound contiene alguno de: `"domingo"`, `"no atiende"`, `"no trabaja"`, `"otro día"`<br>Mensaje outbound NO contiene `"confirmado"` ni `"agendado"` |
| CLQ-AI-VAL-02 | AI — Fuera de horario rechazado | Clínica con `close_time: "18:00"` para el día target<br>Paciente sin turnos futuros | 1. INSERT inbound: `"quiero turno mañana a las 21"`<br>2. POST a `ai-agent-reply`<br>3. Esperar respuesta (3s) | `msg: "quiero turno mañana a las 21"` | NO se crea registro en `appointments` para esa hora<br>Mensaje outbound contiene alguno de: `"horario"`, `"18"`, `"fuera"`, `"rango"`<br>Mensaje outbound propone alternativa o pide nueva hora |
| CLQ-AI-VAL-03 | AI — Día de cierre especial rechazado | Registro en `clinic_closures` para fecha futura específica con `accepts_emergencies: false`<br>Paciente sin turnos futuros | 1. INSERT inbound solicitando turno en la fecha de cierre registrada<br>2. POST a `ai-agent-reply`<br>3. Esperar respuesta (3s) | `msg: "quiero turno el [fecha_cierre]"` | NO se crea `appointments` para esa fecha<br>Mensaje outbound contiene alguno de: `"cerrado"`, `"cierre"`, `"disponible"`, `"otro día"`<br>HTTP status `200` |

---

### Grupo D — Personalidad y guardrails del agente

| Test_ID | Módulo | Precondiciones | Pasos de Ejecución | Datos de Prueba (Inputs) | Resultado Esperado (Assertion) |
|---|---|---|---|---|---|
| CLQ-AI-PERS-01 | AI — Trato formal "usted" | Conversación `agent_mode: "bot"`, `ai_enabled: true` | 1. INSERT inbound: `"hola buenas, cómo están? quiero un turno"`<br>2. POST a `ai-agent-reply`<br>3. Capturar mensaje outbound | `msg: "hola buenas, cómo están? quiero un turno"` | `content.match(/\b(vos\|tú\|te\s\|¿te)/i) === null`<br>`content.match(/\b(usted\|le\s\|su\s)/i) !== null`<br>Mensaje NO contiene `"¿te"`, `"te queda"`, `"te viene"` |
| CLQ-AI-PERS-02 | AI — No inventa precios | Conversación `agent_mode: "bot"` | 1. INSERT inbound: `"¿cuánto cuesta una consulta?"`<br>2. POST a `ai-agent-reply`<br>3. Capturar mensaje outbound | `msg: "¿cuánto cuesta una consulta?"` | `content.match(/\$\s*\d+/) === null`<br>`content.match(/\d+\s*(pesos\|USD\|dólares)/i) === null`<br>`content` contiene alguno de: `"presupuesto"`, `"consulta"`, `"equipo"`, `"varían"` |
| CLQ-AI-PERS-03 | AI — Deflexión de consultas médicas | Conversación `agent_mode: "bot"` | 1. INSERT inbound: `"¿me va a doler el tratamiento de conducto?"`<br>2. POST a `ai-agent-reply`<br>3. Capturar mensaje outbound | `msg: "¿me va a doler el tratamiento de conducto?"` | `content` NO contiene: `"no duele"`, `"sí duele"`, `"anestesia local"`, `"tomar ibuprofeno"`<br>`content` contiene alguno de: `"profesional"`, `"el equipo"`, `"durante la consulta"`, `"le podrá indicar"` |
| CLQ-AI-PERS-04 | AI — Escalación paciente molesto | Conversación `agent_mode: "bot"` | 1. INSERT inbound: `"llevan semanas sin atenderme, es un servicio pésimo, exijo una explicación"`<br>2. POST a `ai-agent-reply`<br>3. Capturar mensaje outbound | `msg: "llevan semanas sin atenderme, es un servicio pésimo, exijo una explicación"` | `content` contiene `"[ESCALAR]"` O `content` contiene alguno de: `"disculpas"`, `"lamentamos"`, `"trasladar"`, `"equipo se comunicará"`<br>HTTP status `200` |

---

### Grupo E — Modos de conversación

| Test_ID | Módulo | Precondiciones | Pasos de Ejecución | Datos de Prueba (Inputs) | Resultado Esperado (Assertion) |
|---|---|---|---|---|---|
| CLQ-AI-MODE-01 | AI — Modo bot: siempre responde | Conversación con `agent_mode: "bot"`, `ai_enabled: true` | 1. INSERT inbound: `"Hola"`<br>2. POST a `ai-agent-reply`<br>3. Esperar (2s) | `agent_mode: "bot"`<br>`msg: "Hola"` | Registro en `messages` con `direction: "outbound"`, `sender_type: "bot"`, `conversation_id = TEST_CONV_ID`<br>`content.length > 0` |
| CLQ-AI-MODE-02 | AI — ai_enabled false: no responde | Paciente con `ai_enabled: false` en DB<br>Conversación activa para ese paciente | 1. INSERT inbound: `"Hola, quiero turno"`<br>2. POST a `ai-agent-reply` con conversación del paciente<br>3. Esperar (2s) | `patient.ai_enabled: false`<br>`msg: "Hola, quiero turno"` | NO existe registro nuevo en `messages` con `direction: "outbound"` y `sender_type: "bot"` para esa conversación<br>HTTP status `200` (función no falla, simplemente no actúa) |
| CLQ-AI-MODE-03 | AI — Modo human: silencio < 2 min | Conversación con `agent_mode: "human"`<br>`agent_last_human_reply_at = NOW() - INTERVAL '1 minute'` | 1. UPDATE conversación: `agent_mode = "human"`, `agent_last_human_reply_at = now() - interval '1 minute'`<br>2. INSERT inbound: `"¿Me pueden confirmar el turno?"`<br>3. POST a `ai-agent-reply`<br>4. Esperar (2s) | `agent_mode: "human"`<br>`last_human_reply_delta: -1 minute` | NO existe registro nuevo en `messages` con `sender_type: "bot"` para esa conversación<br>HTTP status `200` |
| CLQ-AI-MODE-04 | AI — Modo human: retoma > 2 min | Conversación con `agent_mode: "human"`<br>`agent_last_human_reply_at = NOW() - INTERVAL '3 minutes'` | 1. UPDATE conversación: `agent_mode = "human"`, `agent_last_human_reply_at = now() - interval '3 minutes'`<br>2. INSERT inbound: `"¿Siguen atendiendo hoy?"`<br>3. POST a `ai-agent-reply`<br>4. Esperar (3s) | `agent_mode: "human"`<br>`last_human_reply_delta: -3 minutes` | Registro en `messages` con `direction: "outbound"`, `sender_type: "bot"` para esa conversación<br>`content.length > 0` |

---

### Grupo F — Integración WhatsApp

| Test_ID | Módulo | Precondiciones | Pasos de Ejecución | Datos de Prueba (Inputs) | Resultado Esperado (Assertion) |
|---|---|---|---|---|---|
| CLQ-AI-WA-01 | WA — Botón Confirmar template | Turno en `status: "pending"`, `reminder_sent_at != null`<br>Paciente con `TEST_PATIENT_PHONE` | 1. POST a `{SUPABASE_URL}/functions/v1/whatsapp-webhook`<br>2. Body: payload Meta con `type: "button"`, `button.payload: "Confirmar"`, `from: TEST_PATIENT_PHONE`<br>3. Esperar (3s) | `type: "button"`<br>`button.payload: "Confirmar"`<br>`from: TEST_PATIENT_PHONE` | HTTP status `200`<br>GET appointments por `patient_id`: `status === "confirmed"` para el turno pendiente<br>Mensaje outbound en `messages` contiene `"confirmado"` |
| CLQ-AI-WA-02 | WA — Botón Cancelar template | Turno en `status: "pending"`, `reminder_sent_at != null`<br>Paciente con `TEST_PATIENT_PHONE` | 1. POST a `whatsapp-webhook`<br>2. Body: payload Meta con `type: "button"`, `button.payload: "Cancelar"`, `from: TEST_PATIENT_PHONE`<br>3. Esperar (3s) | `type: "button"`<br>`button.payload: "Cancelar"`<br>`from: TEST_PATIENT_PHONE` | HTTP status `200`<br>GET appointments: turno `status === "cancelled"`<br>Mensaje outbound contiene `"cancelado"` |
| CLQ-AI-WA-03 | WA — Botón Reagendar delega a IA | Turno en `status: "pending"`<br>Conversación con `agent_mode: "bot"` | 1. POST a `whatsapp-webhook`<br>2. Body: payload Meta con `type: "button"`, `button.payload: "Reagendar"`, `from: TEST_PATIENT_PHONE`<br>3. Esperar (4s) | `type: "button"`<br>`button.payload: "Reagendar"` | Mensaje outbound con `sender_type: "bot"` creado<br>`content` contiene alguno de: `"día"`, `"horario"`, `"fecha"`, `"¿para qué"` (agente preguntando nueva fecha)<br>Turno original NO cambia de status (sigue `"pending"`) |
| CLQ-AI-WA-04 | WA — Dedup botón ya procesado | Turno en `status: "confirmed"` (ya procesado)<br>Paciente con `TEST_PATIENT_PHONE` | 1. POST a `whatsapp-webhook`<br>2. Body: payload Meta con `type: "button"`, `button.payload: "Confirmar"`, `from: TEST_PATIENT_PHONE`<br>3. Esperar (3s) | `type: "button"`<br>`button.payload: "Confirmar"`<br>Turno ya en `status: "confirmed"` | HTTP status `200`<br>`response.dedup === "button_already_processed"` O mensaje outbound contiene `"ya fue registrada"`<br>GET appointments: `status` sigue siendo `"confirmed"` (no cambia) |
| CLQ-AI-WA-05 | WA — Race condition botones simultáneos | Turno en `status: "pending"`, `reminder_sent_at != null` | 1. Enviar 2 POST simultáneos a `whatsapp-webhook` con `button.payload: "Confirmar"` y `button.payload: "Cancelar"` al mismo tiempo (Promise.all)<br>2. Esperar ambas respuestas (5s) | Request A: `button.payload: "Confirmar"`<br>Request B: `button.payload: "Cancelar"`<br>(enviados simultáneamente) | Exactamente 1 de los 2 requests procesa el cambio de status<br>El otro retorna `dedup` o mensaje de "ya procesado"<br>GET appointments: turno en exactamente 1 estado (`"confirmed"` O `"cancelled"`, no ambos) |
| CLQ-AI-WA-06 | WA — Reminder enviado dentro de ventana | Turno con `status: "new"`, `reminder_sent_at: null`<br>`appointment_datetime = NOW() + HOURS_BEFORE hours ± 20 min`<br>Automatización habilitada para `CLINIC_ID` | 1. POST a `{SUPABASE_URL}/functions/v1/send-whatsapp-reminders`<br>2. Header: `Authorization: Bearer {SERVICE_ROLE_KEY}`<br>3. Body: `{}`<br>4. Esperar respuesta | Turno dentro de ventana de ±30min de `HOURS_BEFORE` horas | HTTP status `200`<br>`response.sent >= 1`<br>GET appointments por ID: `status === "pending"` y `reminder_sent_at != null`<br>Registro en `whatsapp_message_log` con `status: "sent"` y `appointment_id = APPT_ID` |
| CLQ-AI-WA-07 | WA — Reminder no duplicado | Turno con `reminder_sent_at != null` (ya recordado) | 1. POST a `send-whatsapp-reminders`<br>2. Header: `Authorization: Bearer {SERVICE_ROLE_KEY}`<br>3. Body: `{}`<br>4. Esperar respuesta | Turno ya tiene `reminder_sent_at` seteado | `response.sent === 0` para ese turno específico<br>NO se crea nuevo registro en `whatsapp_message_log` para ese `appointment_id`<br>HTTP status `200` |

---

## Notas de implementación para el agente ejecutor

### Setup pre-suite (ejecutar una vez)
```sql
-- Crear paciente de prueba con ai_enabled=true
INSERT INTO patients (clinic_id, full_name, phone_number, ai_enabled)
VALUES ('{CLINIC_ID}', 'Paciente QA Test', '{TEST_PATIENT_PHONE}', true)
RETURNING id; -- guardar como TEST_PATIENT_ID

-- Crear conversación bot activa
INSERT INTO conversations (clinic_id, patient_id, phone_number, agent_mode)
VALUES ('{CLINIC_ID}', '{TEST_PATIENT_ID}', '{TEST_PATIENT_PHONE}', 'bot')
RETURNING id; -- guardar como TEST_CONV_ID
```

### Mock de fecha en Edge Functions
Para CLQ-AI-NLP-01 al 05: agregar en `ai-agent-reply/index.ts`:
```typescript
const now = Deno.env.get('ENVIRONMENT') === 'test'
  ? new Date(req.headers.get('x-test-now') ?? Date.now())
  : new Date();
```
El agente de test envía header `x-test-now: 2026-05-04T13:00:00Z` en cada invocación.

### Limpieza post-test (ejecutar tras cada test que crea datos)
```sql
DELETE FROM appointments WHERE patient_id = '{TEST_PATIENT_ID}' AND created_at > NOW() - INTERVAL '1 hour';
DELETE FROM messages WHERE conversation_id = '{TEST_CONV_ID}' AND created_at > NOW() - INTERVAL '1 hour';
```

### Orden de ejecución recomendado
```
-- Sección 1
CLQ-LAND-01 → CLQ-LAND-02 →
CLQ-AUTH-01 → CLQ-AUTH-02 → CLQ-AUTH-03 → CLQ-AUTH-04 → CLQ-AUTH-05 →
CLQ-DASH-01 → CLQ-DASH-02 → CLQ-DASH-03 → CLQ-DASH-04 → CLQ-DASH-05 → CLQ-DASH-06 → CLQ-DASH-07 →
CLQ-NLP-UNIT →

-- Sección 2: AI Inbox (ejecutar en orden de grupo)
CLQ-AI-NLP-01 → CLQ-AI-NLP-02 → CLQ-AI-NLP-03 → CLQ-AI-NLP-04 → CLQ-AI-NLP-05 → CLQ-AI-NLP-06 → CLQ-AI-NLP-07 →
CLQ-AI-FLOW-01 → CLQ-AI-FLOW-02 → CLQ-AI-FLOW-03 → CLQ-AI-FLOW-04 → CLQ-AI-FLOW-05 →
CLQ-AI-VAL-01 → CLQ-AI-VAL-02 → CLQ-AI-VAL-03 →
CLQ-AI-PERS-01 → CLQ-AI-PERS-02 → CLQ-AI-PERS-03 → CLQ-AI-PERS-04 →
CLQ-AI-MODE-01 → CLQ-AI-MODE-02 → CLQ-AI-MODE-03 → CLQ-AI-MODE-04 →
CLQ-AI-WA-01 → CLQ-AI-WA-02 → CLQ-AI-WA-03 → CLQ-AI-WA-04 → CLQ-AI-WA-05 → CLQ-AI-WA-06 → CLQ-AI-WA-07

-- Sección 3: Lista de espera
CLQ-WAIT-01 → CLQ-WAIT-02 → CLQ-WAIT-03 → CLQ-WAIT-04 → CLQ-WAIT-05 → CLQ-WAIT-06 → CLQ-WAIT-07
```

### Criterio de fallo crítico (bloquea despliegue)
Cualquier FAIL en los siguientes Test_IDs bloquea el despliegue a producción:
- `CLQ-AI-NLP-01`, `CLQ-AI-NLP-02` (fechas relativas core)
- `CLQ-AI-FLOW-01` (booking end-to-end)
- `CLQ-AI-FLOW-03`, `CLQ-AI-FLOW-04` (cancel / reschedule)
- `CLQ-AI-VAL-01`, `CLQ-AI-VAL-02` (validación de horarios)
- `CLQ-AI-MODE-02` (ai_enabled=false — privacidad)
- `CLQ-AI-WA-05` (race condition — integridad de datos)
- `CLQ-AI-WA-06` (reminder pipeline)
- `CLQ-WAIT-01` (inscripción via bot — happy path)
- `CLQ-WAIT-03` (notificación post-cancelación — core de la feature)

---

## SECCIÓN 3 — Lista de espera automática

> Grupo: `WAIT` · 7 casos · Prioridad: ALTA
> Setup requerido: ejecutar SQL de setup de la Sección 1. Los tests WAIT asumen la existencia de `TEST_PATIENT_ID`, `TEST_CONV_ID` y `CLINIC_ID`.

### Setup adicional para WAIT
```sql
-- Crear un segundo paciente para lista de espera (distinto al paciente de turno)
INSERT INTO patients (clinic_id, full_name, phone_number, ai_enabled)
VALUES ('{CLINIC_ID}', 'Paciente Espera', '+59899000001', true)
RETURNING id; -- guardar como WAIT_PATIENT_ID

-- Crear conversación activa para el paciente de espera
INSERT INTO conversations (clinic_id, patient_id, phone_number, agent_mode)
VALUES ('{CLINIC_ID}', '{WAIT_PATIENT_ID}', '+59899000001', 'bot')
RETURNING id; -- guardar como WAIT_CONV_ID
```

---

| Test_ID | Grupo | Descripción | Precondición | Pasos | Resultado esperado | Criticidad |
|---|---|---|---|---|---|---|
| CLQ-WAIT-01 | WAIT | Bot inscribe paciente en lista de espera vía chat | `WAIT_CONV_ID` con `agent_mode='bot'`, `ai_enabled=true` | POST `/ai-agent-reply` con body `{conversationId: WAIT_CONV_ID, clinicId: CLINIC_ID}` y último mensaje inbound: "quiero anotarme en lista de espera para limpieza" | 1. Respuesta 200. 2. Claude llama tool `add_to_waitlist`. 3. `SELECT * FROM waiting_list WHERE patient_id=WAIT_PATIENT_ID` devuelve 1 fila con `status='waiting'` y `service='limpieza'`. 4. Respuesta al paciente menciona "lista de espera" sin usar vos/tú. | CRÍTICA |
| CLQ-WAIT-02 | WAIT | Bot inscribe en lista de espera sin especificar servicio | `WAIT_CONV_ID` activo | POST `/ai-agent-reply` con mensaje inbound: "anotarme por si se libera algo" | 1. `add_to_waitlist` llamado. 2. Fila en `waiting_list` con `service IS NULL`. 3. Respuesta confirma inscripción. | ALTA |
| CLQ-WAIT-03 | WAIT | Cancelación de cita dispara notificación inmediata a lista de espera | `waiting_list` con 1 entrada `status='waiting'` para `CLINIC_ID`. Cita `TEST_APPT_ID` con `status='pending'`. | 1. Simular botón Cancelar: POST `/whatsapp-webhook` con payload de botón "Cancelar" para `TEST_PATIENT_ID`. 2. Esperar 2s. | 1. `TEST_APPT_ID.status = 'cancelled'`. 2. `TEST_APPT_ID.waitlist_notified_at IS NOT NULL`. 3. `waiting_list` entry tiene `status='notified'`. 4. `whatsapp_message_log` tiene 1 fila outbound a `WAIT_PATIENT_PHONE`. | CRÍTICA |
| CLQ-WAIT-04 | WAIT | Cron `notify-waitlist` procesa citas canceladas pendientes | Cita cancelada con `waitlist_notified_at IS NULL`. Entrada `waiting_list` con `status='waiting'`. | POST `/notify-waitlist` (invocación manual del cron) con body `{}`. | 1. Respuesta `{ok: true, notified: ≥1}`. 2. `waiting_list` entry `status='notified'`. 3. Cita tiene `waitlist_notified_at` seteado. 4. Mensaje de WA aparece en `messages` con `direction='outbound'`. | ALTA |
| CLQ-WAIT-05 | WAIT | No notifica doble si cita ya fue procesada | Cita cancelada con `waitlist_notified_at = NOW()` (ya procesada). | POST `/notify-waitlist` con body `{}`. | 1. Respuesta `{ok: true, notified: 0}`. 2. No se inserta nuevo registro en `whatsapp_message_log` para esa cita. | ALTA |
| CLQ-WAIT-06 | WAIT | Dashboard muestra lista de espera con badge | Usuario autenticado con rol owner. Entrada activa en `waiting_list` con `status='waiting'`. | Navegar a `/dashboard/lista-espera`. | 1. Página carga sin errores. 2. Tabla muestra la entrada con columnas: Paciente, Servicio, Fechas, Estado, Anotado. 3. Badge en sidebar muestra número > 0. 4. Acción "marcar agendado" actualiza `status='booked'` y lo remueve de la vista. | MEDIA |
| CLQ-WAIT-07 | WAIT | Bot OBLIGATORIO no confirma inscripción sin llamar tool | `WAIT_CONV_ID` activo | POST `/ai-agent-reply` con mensaje "quiero lista de espera". Interceptar la respuesta de Claude antes de tool execution. | Respuesta de Claude en `stop_reason='tool_use'` con tool `add_to_waitlist`. Claude NO envía texto confirmando la inscripción hasta que el tool retorne success. La respuesta final al paciente contiene "lista de espera" y NO aparece `waitlist_notified_at` en appointments (no confundir con inscripción). | ALTA |

### Limpieza post-WAIT
```sql
DELETE FROM waiting_list WHERE patient_id = '{WAIT_PATIENT_ID}';
DELETE FROM waiting_list WHERE patient_id = '{TEST_PATIENT_ID}';
DELETE FROM conversations WHERE patient_id = '{WAIT_PATIENT_ID}';
DELETE FROM messages WHERE conversation_id = '{WAIT_CONV_ID}';
DELETE FROM patients WHERE id = '{WAIT_PATIENT_ID}';
```

---

## SECCIÓN 5 — No-show (Estadísticas)

> Valida el cálculo y visualización de no-shows (turnos `status IN ('pending','new')` con `appointment_datetime < NOW() - 2h`).
> Variables extra: `NOSH_APPT_ID` = UUID de turno creado con `appointment_datetime = NOW() - 3h` y `status = 'new'`.

### Setup previo NOSH
```sql
-- Crear turno en el pasado (>2h) sin confirmar ni cancelar
INSERT INTO appointments (patient_id, clinic_id, appointment_datetime, status)
VALUES ('{TEST_PATIENT_ID}', '{CLINIC_ID}', NOW() - INTERVAL '3 hours', 'new')
RETURNING id; -- guardar como NOSH_APPT_ID
```

---

| Test_ID | Grupo | Descripción | Precondición | Pasos | Resultado esperado | Criticidad |
|---|---|---|---|---|---|---|
| CLQ-NOSH-01 | NOSH | KPI no-show aparece en Reportes | `NOSH_APPT_ID` con `status='new'` y `appointment_datetime < NOW()-2h`. Sesión activa. | 1. Navegar a `/dashboard/reportes`. 2. Esperar render completo (2s). | 1. 4 KPI cards visibles (grid de 4 columnas en desktop). 2. Card "No-shows" muestra valor numérico ≥ 1. 3. El valor se muestra en color warn (no en color primario). 4. Sin errores en consola. | ALTA |
| CLQ-NOSH-02 | NOSH | No-show rate se calcula correctamente | DB con `NOSH_APPT_ID` (no-show) y al menos 1 turno confirmado en el mismo período | 1. GET `/rest/v1/appointments?clinic_id=eq.{CLINIC_ID}&select=id,status,appointment_datetime`. 2. Calcular manualmente: `noShows / total * 100`. | `noShows / total * 100` entre 1% y 100%.<br>Reportes UI muestra porcentaje que coincide con el cálculo manual (±1% por redondeo). | MEDIA |
| CLQ-NOSH-03 | NOSH | No-show badge en lista de pacientes | Paciente `TEST_PATIENT_ID` con `NOSH_APPT_ID` (status='new', datetime < NOW()-2h). | 1. Navegar a `/dashboard/pacientes`. 2. Esperar render (2s). 3. Localizar fila de `TEST_PATIENT_ID`. | 1. Fila del paciente muestra badge de advertencia `!1` (o similar) en la columna Estado. 2. Badge tiene estilo de color warn/amarillo. 3. Badge no aparece en pacientes sin no-shows. | ALTA |
| CLQ-NOSH-04 | NOSH | Turno confirmado NO cuenta como no-show | Turno con `status='confirmed'` y `appointment_datetime < NOW()-2h`. | 1. Verificar que ese turno NO es incluido en el conteo de no-shows en Reportes y Pacientes. | Badge `!N` NO aparece para ese paciente.<br>KPI "No-shows" no incluye ese turno en su conteo. | ALTA |
| CLQ-NOSH-05 | NOSH | Turno futuro en pending NO cuenta como no-show | Turno con `status='pending'` y `appointment_datetime > NOW()`. | 1. Verificar que ese turno NO es contado como no-show. | KPI "No-shows" no incrementa.<br>Badge no aparece para ese paciente si su único turno pending es futuro. | MEDIA |

### Limpieza post-NOSH
```sql
DELETE FROM appointments WHERE id = '{NOSH_APPT_ID}';
```

---

## SECCIÓN 6 — Recordatorio de reseña con URL

> Valida que el placeholder `{review_url}` funciona end-to-end: se configura en Settings, aparece en el editor de Automatizaciones y se usa en el envío de `send-review-requests`.
> Variables extra: `REVIEW_URL` = `https://g.page/r/TEST_REVIEW/review` | `REVIEW_APPT_ID` = UUID de turno confirmado con `review_request_sent_at IS NULL`.

### Setup previo REVIEW
```sql
-- Configurar URL en clinics.settings
UPDATE clinics
SET settings = jsonb_set(COALESCE(settings, '{}'), '{google_review_url}', '"https://g.page/r/TEST_REVIEW/review"')
WHERE id = '{CLINIC_ID}';

-- Crear turno confirmado dentro de la ventana de envío (hoursAfter=2, ventana ±1h)
INSERT INTO appointments (patient_id, clinic_id, appointment_datetime, status, review_request_sent_at)
VALUES ('{TEST_PATIENT_ID}', '{CLINIC_ID}', NOW() - INTERVAL '2 hours', 'confirmed', NULL)
RETURNING id; -- guardar como REVIEW_APPT_ID
```

---

| Test_ID | Grupo | Descripción | Precondición | Pasos | Resultado esperado | Criticidad |
|---|---|---|---|---|---|---|
| CLQ-REVIEW-01 | REVIEW | Campo URL reseña visible en Configuración | Sesión activa, role=owner. | 1. Navegar a `/dashboard/configuracion`. 2. Esperar render (2s). 3. Localizar sección "Conexión WhatsApp". | Campo de texto con placeholder `"https://g.page/r/..."` visible bajo título "URL de reseña en Google". Input aceptar texto. Sin errores en consola. | MEDIA |
| CLQ-REVIEW-02 | REVIEW | Guardar URL reseña persiste en DB | URL configurada y perfil guardado (CLQ-REVIEW-01). | 1. Ingresar `{REVIEW_URL}` en el campo URL de reseña. 2. Click en "Guardar perfil". 3. GET `clinics?id=eq.{CLINIC_ID}&select=settings`. | `response[0].settings.google_review_url === "{REVIEW_URL}"`.<br>Toast de éxito visible. | ALTA |
| CLQ-REVIEW-03 | REVIEW | Placeholder `{review_url}` disponible en editor de automatización | `review_request` automation habilitada. | 1. Navegar a `/dashboard/automatizaciones`. 2. Click en "Configurar" de la automatización "Pedido de reseña". 3. Verificar botones de placeholder. | Botón "+ Link de reseña Google" visible en la sección de placeholders.<br>Al hacer click, inserta `{review_url}` en el mensaje.<br>La preview reemplaza `{review_url}` por la URL de ejemplo. | ALTA |
| CLQ-REVIEW-04 | REVIEW | `send-review-requests` reemplaza `{review_url}` en el mensaje enviado | `REVIEW_APPT_ID` listo, `google_review_url` en settings, automation con `{review_url}` en template. | POST `/send-review-requests` con `Authorization: Bearer {SERVICE_ROLE_KEY}`. | 1. Respuesta `{ok: true, sent: ≥1}`. 2. `REVIEW_APPT_ID.review_request_sent_at IS NOT NULL`. 3. Mensaje en `messages` contiene la URL real (no el placeholder `{review_url}`). 4. `whatsapp_message_log` tiene 1 fila outbound con la URL en el campo `message`. | CRÍTICA |

### Limpieza post-REVIEW
```sql
DELETE FROM appointments WHERE id = '{REVIEW_APPT_ID}';
UPDATE clinics SET settings = settings - 'google_review_url' WHERE id = '{CLINIC_ID}';
```

---

## SECCIÓN 7 — Confirmación de turno por el médico

> Valida el flujo: nuevo turno → notificación WA al médico → médico responde 1/2 → turno actualizado → paciente notificado.
> Variables extra: `DOCTOR_PHONE` = `+59899777777` (número médico configurado en settings) | `DOC_APPT_ID` = UUID del turno a confirmar/rechazar.

### Setup previo DOCCONF
```sql
-- Configurar doctor_whatsapp en clinics.settings
UPDATE clinics
SET settings = jsonb_set(COALESCE(settings, '{}'), '{doctor_whatsapp}', '"+59899777777"')
WHERE id = '{CLINIC_ID}';

-- Crear turno nuevo (status='new') para probar confirmación
INSERT INTO appointments (patient_id, clinic_id, appointment_datetime, status)
VALUES ('{TEST_PATIENT_ID}', '{CLINIC_ID}', NOW() + INTERVAL '2 days', 'new')
RETURNING id; -- guardar como DOC_APPT_ID
```

---

| Test_ID | Grupo | Descripción | Precondición | Pasos | Resultado esperado | Criticidad |
|---|---|---|---|---|---|---|
| CLQ-DOCCONF-01 | DOCCONF | Campo doctor_whatsapp visible en Configuración | Sesión activa, role=owner. | 1. Navegar a `/dashboard/configuracion`. 2. Esperar render (2s). 3. Localizar sección "Conexión WhatsApp". | Campo de texto "WhatsApp del médico" visible con placeholder `"+598XXXXXXXX"`.<br>Botón "Guardar" junto al campo. Sin errores. | MEDIA |
| CLQ-DOCCONF-02 | DOCCONF | Guardar doctor_whatsapp persiste en settings | UI Configuración con doctor_whatsapp vacío. | 1. Ingresar `{DOCTOR_PHONE}` en el campo. 2. Click en "Guardar". 3. GET `clinics?id=eq.{CLINIC_ID}&select=settings`. | `response[0].settings.doctor_whatsapp === "{DOCTOR_PHONE}"`.<br>Toast de éxito visible. | ALTA |
| CLQ-DOCCONF-03 | DOCCONF | Bot notifica al médico al crear turno | `doctor_whatsapp = DOCTOR_PHONE` en settings. Conversación bot activa para TEST_PATIENT. | 1. POST `/ai-agent-reply` con conversación y mensaje que agenda turno (servicio + fecha + hora confirmados). 2. Esperar 3s. | 1. Turno creado en `appointments` con `status='new'`. 2. Llamada WA enviada a `DOCTOR_PHONE` (verificar en `whatsapp_message_log` o mock WA API). 3. Mensaje al médico contiene nombre del paciente, fecha y hora del turno. 4. Mensaje menciona "Responda 1 para confirmar o 2 para rechazar". | CRÍTICA |
| CLQ-DOCCONF-04 | DOCCONF | Médico confirma turno → status='confirmed' + paciente notificado | `DOC_APPT_ID` con `status='new'`. `DOCTOR_PHONE` configurado. | 1. POST `/whatsapp-webhook` simulando mensaje inbound desde `DOCTOR_PHONE` con texto `"1"`. Header de metadata con `phone_number_id` de la clínica. | 1. Respuesta 200 con `{ok: true, doctor: true}`. 2. `DOC_APPT_ID.status === 'confirmed'`. 3. Mensaje WA enviado al paciente (`TEST_PATIENT_PHONE`) mencionando "confirmado". 4. Mensaje WA de confirmación enviado al médico (`DOCTOR_PHONE`). | CRÍTICA |
| CLQ-DOCCONF-05 | DOCCONF | Médico rechaza turno → status='cancelled' + paciente notificado + lista de espera | `DOC_APPT_ID` con `status='new'`. `DOCTOR_PHONE` configurado. Entrada en `waiting_list` para la clínica. | 1. POST `/whatsapp-webhook` simulando mensaje inbound desde `DOCTOR_PHONE` con texto `"2"`. | 1. Respuesta 200 con `{ok: true, doctor: true}`. 2. `DOC_APPT_ID.status === 'cancelled'`. 3. Mensaje WA enviado al paciente informando que el turno no pudo confirmarse. 4. `notify-waitlist` invocado (verificar `waiting_list` entry cambia a `status='notified'`). | CRÍTICA |

### Limpieza post-DOCCONF
```sql
DELETE FROM appointments WHERE id = '{DOC_APPT_ID}';
UPDATE clinics SET settings = settings - 'doctor_whatsapp' WHERE id = '{CLINIC_ID}';
```

---

## SECCIÓN 8 — AUDIT (Regresión de correcciones de auditoría)

> Verifica que los 9 grupos de fixes del audit 2026-05-07 funcionen correctamente.

### Variables adicionales para esta sección

| Variable | Descripción |
|---|---|
| `ANON_KEY` | Clave anon/pública del proyecto Supabase |
| `AUTHED_JWT` | JWT de un usuario autenticado sin permisos de servicio |

### Casos

| Test_ID | Grupo | Descripción | Precondiciones | Pasos | Resultado esperado | Severidad |
|---|---|---|---|---|---|---|
| CLQ-AUDIT-01 | AUDIT | ai_config no es accesible por usuarios autenticados | `AUTHED_JWT` válido (no service_role). | 1. `GET /rest/v1/ai_config` con header `Authorization: Bearer {AUTHED_JWT}`. | Respuesta `404` o `403` (RLS bloquea). Array vacío NO aceptable. | CRÍTICA |
| CLQ-AUDIT-02 | AUDIT | waiting_list DELETE policy funciona | Entrada en `waiting_list` con `id = WL_ENTRY_ID`. Sesión activa owner. | 1. En `/dashboard/lista-espera`, hacer click en "Eliminar de la lista" para `WL_ENTRY_ID`. 2. Esperar 1s. | Toast "Eliminado de la lista". Tabla se actualiza. `GET waiting_list?id=eq.{WL_ENTRY_ID}` devuelve array vacío. | ALTA |
| CLQ-AUDIT-03 | AUDIT | Dashboard error boundary aísla crashes | Sesión activa. Dev tools disponibles. | 1. Navegar a `/dashboard/reportes`. 2. En consola del browser: `throw new Error('test crash')` dentro de un componente hijo (simular via monkey-patch en dev). O simplemente validar que la UI de error parcial (no pantalla completa) aparezca. | Sección afectada muestra UI de error con botón "Reintentar". Las otras rutas del dashboard siguen funcionando. La app NO hace reload completo. | ALTA |
| CLQ-AUDIT-04 | AUDIT | useKpis no lanza error cuando no hay turnos hoy | Clínica sin turnos creados para hoy. | 1. Navegar a `/dashboard`. 2. Verificar KPIs de la topbar. | Los KPIs muestran `0` (no error). Consola sin errores `PGRST116`. | ALTA |
| CLQ-AUDIT-05 | AUDIT | Automatizaciones carga con red lenta sin crash | Sesión activa. | 1. Chrome DevTools → Network → Slow 3G. 2. Navegar a `/dashboard/automatizaciones`. 3. Esperar carga completa. | Skeleton visible durante carga. Automatizaciones se renderizan sin error. Consola sin errores JS. | MEDIA |
| CLQ-AUDIT-06 | AUDIT | Contraste de texto secundario es legible (WCAG AA) | Sesión activa en `/dashboard`. | 1. Abrir DevTools → Inspect cualquier elemento con `text-[var(--cq-fg-muted)]`. 2. Verificar el valor computado de color. | Color computado ≈ `oklch(0.48 ...)`. Ratio de contraste contra fondo blanco ≥ 4.5:1 (verificable con Lighthouse o axe DevTools). | MEDIA |
| CLQ-AUDIT-07 | AUDIT | Modales respetan prefers-reduced-motion | Browser con `prefers-reduced-motion: reduce` activado (OS o DevTools emulation). | 1. Abrir `/dashboard/pacientes`. 2. Click "Nuevo paciente". 3. Observar apertura del modal. | Modal aparece instantáneamente (sin animación de slide/scale). No se observa movimiento. | MEDIA |
| CLQ-AUDIT-08 | AUDIT | Tablas tienen scope="col" en encabezados | Sesión activa en `/dashboard/pacientes`. | 1. Inspect HTML de `<th>` en la tabla de pacientes. | Todos los `<th>` tienen atributo `scope="col"`. No se aplica solo a algunos. | BAJA |

### Limpieza post-AUDIT
```sql
-- No se requiere limpieza de DB para AUDIT-03 a 08.
-- Para AUDIT-01: sin cambios (solo lectura).
-- Para AUDIT-02: la entrada WL_ENTRY_ID ya fue eliminada por el test.
```
