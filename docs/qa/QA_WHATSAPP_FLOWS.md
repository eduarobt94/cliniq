# CLINIQ — QA: WhatsApp Webhook + AI Agent
> Módulos: WH · AI · 84 test cases · 2026-05-16

---

## Archivos bajo prueba
- `supabase/functions/whatsapp-webhook/index.ts`
- `supabase/functions/ai-agent-reply/index.ts`
- `supabase/functions/send-whatsapp-message/index.ts`
- `supabase/functions/initiate-conversation/index.ts`

---

## SECCIÓN WH — WEBHOOK INBOUND

### Tipos de mensaje (WH-001 → WH-008)

#### WH-001 · Mensaje de texto simple — paciente conocido
**Severidad**: CRÍTICA  
**Payload**:
```json
{ "type": "text", "text": { "body": "Hola, quería consultar" }, "from": "+59899123456" }
```
**Resultado esperado**:
- Paciente lookup por phone (con y sin +)
- Conversation upsert
- Message insert (direction: 'inbound', sender_type: null)
- Audit log insert
- `shouldAgentReply()` evaluado → AI invocado si aplica

---

#### WH-002 · Mensaje de audio — transcripción exitosa
**Severidad**: ALTA  
**Precondición**: `OPENAI_API_KEY` configurada  
**Pasos**:
1. Enviar mensaje type: 'audio' con mediaId válido

**Resultado esperado**:
- Fetch URL de media desde Meta API
- Llamada a Whisper API (`language: 'es'`)
- Texto transcripto guardado en `messages.content`
- `messages.message_type = 'audio'`
- Intent detectado desde transcripción
- Audit log: content = texto transcripto

---

#### WH-003 · Mensaje de audio — transcripción fallida
**Severidad**: ALTA  
**Pasos**:
1. Whisper API devuelve error / timeout

**Resultado esperado**:
- Content guardado: `'[Nota de voz — no se pudo transcribir]'`
- `message_type = 'audio'`
- Intent = null (no se puede detectar)
- Flujo continúa (no crash)

---

#### WH-004 · Mensaje de audio — OpenAI key no configurada
**Severidad**: MEDIA  
**Pasos**:
1. `OPENAI_API_KEY` vacía o ausente

**Resultado esperado**:
- Content: `'[Nota de voz — transcripción no configurada]'`
- NO intento de llamada a Whisper

---

#### WH-005 · Mensaje de imagen / documento / sticker
**Severidad**: MEDIA  
**Resultado esperado**:
- Content: `'[image]'` / `'[document]'` / `'[sticker]'`
- `message_type` = tipo correspondiente
- AI puede ver el tipo para responder contextualmente

---

#### WH-006 · Mensaje tipo 'button' (template reply)
**Severidad**: ALTA  
**Payload**:
```json
{ "type": "button", "button": { "payload": "confirm_appt", "text": "Confirmar" }, "from": "..." }
```
**Resultado esperado**:
- Intent = 'confirm' (keyword match en payload o text)
- Flujo de confirmación de appointment ejecutado

---

#### WH-007 · Mensaje tipo 'interactive' button_reply
**Severidad**: ALTA  
**Payload**:
```json
{ "type": "interactive", "interactive": { "type": "button_reply", "button_reply": { "id": "cancel", "title": "Cancelar" } } }
```
**Resultado esperado**:
- Intent = 'cancel'
- Flujo de cancelación ejecutado

---

#### WH-008 · Tipo de mensaje desconocido
**Severidad**: BAJA  
**Resultado esperado**:
- Content: `'[unknown]'` o tipo del mensaje
- `message_type = 'unknown'`
- NO crash del webhook

---

### Detección de intent (WH-009 → WH-016)

#### WH-009 · Intent CONFIRM — variantes de texto
**Severidad**: ALTA  
**Textos que deben disparar confirm**:
- "1", "si", "sí", "confirmo", "confirmar", "ok", "dale", "voy"
- Variantes con espacios: " sí ", "sí confirmo"
- Mayúsculas: "SI", "CONFIRMO"

**Resultado esperado**: `intent = 'confirm'` en todos los casos

---

#### WH-010 · Intent CANCEL — variantes de texto
**Severidad**: ALTA  
**Textos que deben disparar cancel**:
- "2", "no", "cancelo", "cancelar", "cancelacion", "cancelación"
- "no puedo", "no voy a poder"

**Resultado esperado**: `intent = 'cancel'`

---

#### WH-011 · Intent RESCHEDULE — variantes de texto
**Severidad**: ALTA  
**Textos**:
- "3", "reagendar", "reagendo", "cambiar", "cambiar fecha"

**Resultado esperado**: `intent = 'reschedule'`

---

#### WH-012 · Texto sin intent reconocible
**Severidad**: MEDIA  
**Texto**: "cuánto cuesta una consulta?" / "Hola buenas tardes"

**Resultado esperado**:
- `intent = null`
- AI agent invocado para respuesta general

---

#### WH-013 · Intent ambiguo (ej: "sí, pero necesito cambiar")
**Severidad**: MEDIA  
**Resultado esperado**:
- Primer match gana (confirm antes que reschedule)
- O bien: AI maneja la ambigüedad en respuesta

---

#### WH-014 · Dedup — botón ya procesado (confirm)
**Severidad**: ALTA  
**Escenario**: Paciente presiona botón "Confirmar", espera 30s, presiona de nuevo

**Resultado esperado**:
- Appointment ya en status 'confirmed'
- Ningún appointment en status ['pending', 'new']
- Buscar en ['confirmed', 'cancelled', 'rescheduled'] → encontrado
- Mensaje dedup: "Su selección ya fue registrada: el turno se encuentra *confirmado*…"
- NO duplicar la acción

---

#### WH-015 · Dedup — botón ya procesado (cancel)
**Severidad**: ALTA  
**Escenario**: Paciente cancela, presiona cancel de nuevo

**Resultado esperado**:
- Mensaje dedup con estado actual 'cancelado'

---

#### WH-016 · Confirm sin appointment pendiente (paciente sin turno)
**Severidad**: MEDIA  
**Escenario**: Paciente escribe "confirmo" pero no tiene turno en status pending/new

**Resultado esperado**:
- Intent detectado pero no hay appointment que actualizar
- AI responde contextualmente (no hay nada que confirmar)

---

### Acciones de appointment por intent (WH-017 → WH-024)

#### WH-017 · CONFIRM exitoso (race condition safe)
**Severidad**: CRÍTICA  
**Pasos**:
1. Appointment en status 'pending'
2. Paciente envía "sí"
3. Update atómico: `status = 'pending' AND id = X` → `'confirmed'`

**Resultado esperado**:
- Update devuelve 1 fila afectada
- Mensaje al paciente: "Su turno quedó *confirmado* ✅"
- Audit log outbound
- `confirmed_at` seteado

---

#### WH-018 · CONFIRM — race condition (dos presses simultáneos)
**Severidad**: CRÍTICA  
**Pasos**:
1. Dos requests simultáneos intentan confirmar mismo appointment
2. Primero: update atómico OK → status = 'confirmed'
3. Segundo: update atómico FALLA (status ya no es pending/new)

**Resultado esperado**:
- Solo UN mensaje de confirmación enviado
- Segundo request: mensaje dedup
- Appointment queda en 'confirmed' (no doble-confirmado)

---

#### WH-019 · CANCEL exitoso
**Severidad**: CRÍTICA  
**Pasos**:
1. Appointment en status 'pending' o 'new'
2. Paciente envía "2" o "cancelar"
3. Update atómico a 'cancelled'

**Resultado esperado**:
- Mensaje al paciente confirmando cancelación
- `notify-waitlist` disparado (fire-and-forget, no bloquea respuesta)
- Audit log

---

#### WH-020 · CANCEL dispara notify-waitlist
**Severidad**: ALTA  
**Pasos**:
1. Appointment cancelado (por paciente o doctor)
2. Hay pacientes en waiting_list para ese horario

**Resultado esperado**:
- `notify-waitlist` function invocada sin await
- Si hay matches → pacientes en espera reciben WhatsApp
- Si no hay matches → silencioso, no error

---

#### WH-021 · RESCHEDULE — derivado a AI
**Severidad**: ALTA  
**Pasos**:
1. Paciente envía "reagendar"
2. `shouldAgentReply()` = true

**Resultado esperado**:
- NO se actualiza appointment aquí
- AI agent invocado con contexto de reagendamiento
- AI usa tool `reschedule_appointment`

---

#### WH-022 · RESCHEDULE — AI no disponible
**Severidad**: ALTA  
**Pasos**:
1. Paciente envía "reagendar"
2. `shouldAgentReply()` = false (ai_enabled=false o human activo)

**Resultado esperado**:
- Fallback manual: "Para reagendar su turno, por favor comuníquese con nuestro equipo."
- NO intento de reagendamiento automático

---

#### WH-023 · Paciente desconocido (no en DB)
**Severidad**: ALTA  
**Pasos**:
1. Número de teléfono no en tabla patients

**Resultado esperado**:
- Conversation creada con `patient_id: null`
- AI agent invocado para registrar al paciente
- AI usa `register_patient` tool antes de continuar

---

#### WH-024 · Paciente con ai_enabled = false
**Severidad**: CRÍTICA  
**Pasos**:
1. `patients.ai_enabled = false`
2. Mensaje inbound de ese paciente

**Resultado esperado**:
- Mensaje guardado en inbox
- `shouldAgentReply()` = false → AI NO responde
- Staff ve conversación pendiente en inbox

---

### Flujo Doctor (WH-025 → WH-032)

#### WH-025 · Doctor confirma turno
**Severidad**: ALTA  
**Precondición**: `clinic.settings.doctor_whatsapp` configurado, hay appointment en status 'new'  
**Pasos**:
1. Doctor envía "1" o "confirmar" desde su número

**Resultado esperado**:
- Appointment status: 'new' → 'confirmed'
- Mensaje al doctor: "Turno confirmado ✅"
- Mensaje al paciente: "✅ Su turno del {fecha} fue *confirmado* por el médico"

---

#### WH-026 · Doctor rechaza turno
**Severidad**: ALTA  
**Pasos**:
1. Doctor envía "2" o "rechazar" o "no"

**Resultado esperado**:
- Appointment status: 'new' → 'cancelled'
- Mensaje al doctor: confirmación de rechazo
- Mensaje al paciente: cancelación
- `notify-waitlist` disparado

---

#### WH-027 · Doctor responde sin appointment pendiente
**Severidad**: MEDIA  
**Pasos**:
1. No hay appointments en status 'new'
2. Doctor envía "1"

**Resultado esperado**:
- Mensaje al doctor: "No hay turnos pendientes de confirmación"

---

#### WH-028 · Doctor respuesta ambigua
**Severidad**: MEDIA  
**Pasos**:
1. Doctor envía "quizás" o texto no reconocido

**Resultado esperado**:
- Mensaje de guía: "Responda *1* para confirmar o *2* para rechazarlo"

---

#### WH-029 · Doctor y paciente confirman simultáneamente
**Severidad**: CRÍTICA  
**Pasos**:
1. Paciente presiona botón "Confirmar" y doctor envía "1" al mismo tiempo

**Resultado esperado**:
- Update atómico: uno gana, otro falla
- Appointment queda en 'confirmed'
- El que pierde recibe dedup message
- Solo UN mensaje al paciente

---

#### WH-030 · Número de doctor no configurado
**Severidad**: BAJA  
**Pasos**:
1. `clinic.settings.doctor_whatsapp` vacío o null
2. Mensaje de número desconocido

**Resultado esperado**:
- Tratado como paciente desconocido (guest flow)
- NO flujo de doctor

---

#### WH-031 · Notificación al doctor — nuevo appointment creado por AI
**Severidad**: ALTA  
**Pasos**:
1. AI usa `schedule_appointment` tool exitosamente
2. `clinic.settings.doctor_whatsapp` configurado

**Resultado esperado**:
- Template WA enviado al doctor: "🔔 *Nuevo turno agendado*\n👤 Paciente: ...\n📅 ..."
- Con botones: Responda 1 para confirmar o 2 para rechazar

---

#### WH-032 · Notificación al doctor — falla envío WA
**Severidad**: MEDIA  
**Pasos**:
1. Error en API WA al enviar notificación al doctor

**Resultado esperado**:
- Error logueado
- Appointment creado igualmente (no rollback)
- Respuesta al paciente enviada igualmente

---

### Gate shouldAgentReply (WH-033 → WH-038)

#### WH-033 · ai_enabled = false → nunca responde
**Severidad**: CRÍTICA  
**Resultado**: AI bloqueada, inbox actualizado, staff debe responder

---

#### WH-034 · agent_mode = 'bot' → siempre responde
**Severidad**: ALTA  
**Resultado**: AI invocada en cada mensaje

---

#### WH-035 · agent_mode = 'human' + staff respondió < 2 min → AI espera
**Severidad**: ALTA  
**Pasos**:
1. Staff respondió hace 90 segundos
2. Nuevo mensaje inbound

**Resultado esperado**:
- `shouldAgentReply()` = false
- AI silenciada, staff sigue activo

---

#### WH-036 · agent_mode = 'human' + staff respondió > 2 min → AI retoma
**Severidad**: ALTA  
**Pasos**:
1. Staff respondió hace 3 minutos
2. Nuevo mensaje inbound sin respuesta staff

**Resultado esperado**:
- `shouldAgentReply()` = true
- AI retoma el hilo

---

#### WH-037 · Mensajes inbound consecutivos sin respuesta → AI retoma
**Severidad**: ALTA  
**Pasos**:
1. Staff saluda ("hola") → agent_mode = 'human'
2. Paciente envía 3 mensajes consecutivos sin respuesta
3. `consecutiveUnanswered >= 1` + staff inactivo > 2 min

**Resultado esperado**:
- AI retoma automáticamente
- Responde al paciente

---

#### WH-038 · Sin conversación previa → AI puede responder
**Severidad**: MEDIA  
**Pasos**:
1. Primer mensaje de número desconocido

**Resultado esperado**:
- No hay conversation → `shouldAgentReply()` = true (default)
- AI registra paciente + responde

---

## SECCIÓN AI — AGENT REPLY

### Flujo de registro de paciente (AI-001 → AI-006)

#### AI-001 · Registro nuevo paciente exitoso
**Severidad**: CRÍTICA  
**Pasos**:
1. Mensaje de número desconocido
2. Claude llama `register_patient({ full_name: "Juan Pérez" })`

**Resultado esperado**:
- Patient insertado en DB con phone de conversation
- `ai_enabled: true`
- Conversation actualizada con `patient_id`
- Respuesta de Claude continúa con oferta de turno

---

#### AI-002 · Registro con solo nombre (sin apellido)
**Severidad**: MEDIA  
**Pasos**:
1. Paciente dice solo "Juan"
2. Claude intenta `register_patient({ full_name: "Juan" })`

**Resultado esperado**:
- Tool falla: "Se requiere nombre completo (nombre y apellido)"
- Claude pide apellido al paciente

---

#### AI-003 · Registro — colisión de phone (paciente ya existe)
**Severidad**: ALTA  
**Pasos**:
1. Dos webhooks simultáneos del mismo número
2. Ambos intentan `register_patient`

**Resultado esperado**:
- DB unique constraint en phone → segundo falla
- Error capturado, Claude recibe error del tool
- Claude puede informar al paciente o continuar con el patient ya creado

---

#### AI-004 · Registro — intento de registrar con patient ya conocido
**Severidad**: MEDIA  
**Pasos**:
1. Paciente registrado en DB
2. Claude (incorrectamente) llama `register_patient`

**Resultado esperado**:
- Tool valida: si `resolvedPatientId` ya existe → error o ignorado
- NO crea duplicado

---

#### AI-005 · Continuar conversación post-registro
**Severidad**: ALTA  
**Pasos**:
1. Claude registra paciente
2. En mismo turno de tool use, ofrece agendar turno
3. Paciente acepta → Claude llama `schedule_appointment`

**Resultado esperado**:
- Multi-turn tool use funciona (máx 4 rondas)
- Appointment creado con `patient_id` correcto

---

#### AI-006 · Paciente nuevo — prompt del sistema (sin appointments previos)
**Severidad**: ALTA  

**Resultado esperado**:
- System prompt incluye: "Buenos días, le saluda {clinicName}"
- Pide nombre + apellido
- No muestra appointments (no hay)

---

### Agendamiento (AI-007 → AI-015)

#### AI-007 · schedule_appointment — happy path
**Severidad**: CRÍTICA  
**Pasos**:
1. Claude llama `schedule_appointment({ service: "Consulta", date: "2026-05-20", time: "10:00" })`

**Resultado esperado**:
- Validación: fecha en horario de atención
- No hay closure ese día
- Appointment creado en DB
- Notes: "[IA] Servicio: Consulta"
- Respuesta confirmando al paciente

---

#### AI-008 · schedule_appointment — día cerrado (closure)
**Severidad**: ALTA  
**Pasos**:
1. Claude intenta agendar en fecha con clinic_closure

**Resultado esperado**:
- Tool: `{ success: false, message: "La clínica no atiende ese día" }`
- Claude pide otra fecha al paciente

---

#### AI-009 · schedule_appointment — fuera de horario
**Severidad**: ALTA  
**Pasos**:
1. Claude intenta agendar a las 21:00 (horario cierre: 20:00)

**Resultado esperado**:
- Tool: `{ success: false, message: "Horario fuera del rango de atención" }`
- Claude ofrece horarios disponibles del sistema prompt

---

#### AI-010 · schedule_appointment — día no laborable
**Severidad**: ALTA  
**Pasos**:
1. Agendar un domingo (clínica no atiende domingos)

**Resultado esperado**:
- Tool rechaza → Claude redirige a días laborables

---

#### AI-011 · schedule_appointment — parámetros incompletos
**Severidad**: MEDIA  
**Pasos**:
1. Claude llama tool sin `time` (solo date y service)

**Resultado esperado**:
- Tool: `{ success: false, message: "Faltan parámetros: time" }`
- Claude pide hora al paciente en siguiente mensaje

---

#### AI-012 · schedule_appointment — Claude usa fecha ISO exacta (no calcula)
**Severidad**: ALTA  
**Verificación**: System prompt provee fechas ISO de los próximos 14 días

**Resultado esperado**:
- Claude COPIA la fecha del array provisto, NO calcula "next Monday"
- Fecha correcta incluso across month boundaries

---

#### AI-013 · reschedule_appointment — happy path
**Severidad**: ALTA  
**Pasos**:
1. Paciente pide cambiar turno del "martes a las 10" al "jueves a las 15"
2. Claude llama `reschedule_appointment({ old_appointment_ids: [X], date: "...", time: "15:00" })`

**Resultado esperado**:
- Appointment viejo → status: 'rescheduled'
- Nuevo appointment creado
- Service extraído de notes del viejo si no se provee
- Respuesta confirmando nuevo horario

---

#### AI-014 · cancel_appointments — cancelar todos los turnos
**Severidad**: ALTA  
**Pasos**:
1. Paciente: "quiero cancelar todos mis turnos"
2. Claude llama `cancel_appointments({ appointment_ids: [X, Y, Z] })`

**Resultado esperado**:
- Todos los IDs → status: 'cancelled'
- Respuesta con count de cancelados

---

#### AI-015 · confirm_appointment — AI confirma manualmente
**Severidad**: MEDIA  
**Pasos**:
1. Paciente dice "sí confirmo el del jueves"
2. Claude identifica el appointment correcto y llama `confirm_appointment`

**Resultado esperado**:
- Appointment → status: 'confirmed'
- Respuesta de confirmación al paciente

---

### Escalación (AI-016 → AI-021)

#### AI-016 · Escalación — solicitud explícita de hablar con humano
**Severidad**: CRÍTICA  
**Textos disparadores**:
- "quiero hablar con alguien", "necesito hablar con el médico", "hablar con una persona"

**Resultado esperado**:
- Claude detecta escalation pattern ANTES de generar respuesta
- `agent_mode = 'human'`
- System notice en inbox: "🤖 Bot escaló al staff"
- Mensaje al paciente sin [ESCALAR] marker

---

#### AI-017 · Escalación — emergencia médica
**Severidad**: CRÍTICA  
**Textos**:
- "emergencia", "dolor fuerte", "no puedo respirar", "sangrado", "me desmayé"

**Resultado esperado**:
- Escalación inmediata (igual que AUTH-016)
- Staff notificado urgentemente
- NO respuesta de AI sobre la emergencia médica

---

#### AI-018 · Escalación — queja fuerte / paciente molesto
**Severidad**: ALTA  
**Pasos**:
1. Claude responde con [ESCALAR] al final del mensaje
2. Post-processing detecta el marcador

**Resultado esperado**:
- Marcador removido del mensaje al paciente
- Mensaje limpio enviado
- System notice insertado
- `agent_mode = 'human'`

---

#### AI-019 · Escalación patterns en input vs en output Claude
**Severidad**: ALTA  

**Flujo 1** (patterns en input → pre-processing):
- Patron detectado antes de llamar a Claude
- Acción inmediata, sin costo de Claude API

**Flujo 2** (Claude decide escalar → [ESCALAR] en output):
- Pattern NO detectado en input
- Claude responde con [ESCALAR]
- Post-processing maneja

---

#### AI-020 · No escalar en respuesta negativa a recordatorio
**Severidad**: ALTA  
**Escenario**: Paciente responde "no" a recordatorio de turno  
**Pasos**:
1. Bot envió recordatorio "¿Va a poder asistir?"
2. Paciente responde "no"

**Resultado esperado**:
- AI NO cancela inmediatamente
- AI pregunta: "¿Desea reagendar o cancelar su turno?"
- Espera respuesta del paciente

---

#### AI-021 · Respuestas afirmativas a recordatorio
**Severidad**: ALTA  
**Textos**: "sí", "si", "ok", "dale", "voy", "confirmo"

**Resultado esperado**:
- AI confirma el turno (usando `confirm_appointment`)
- Respuesta amistosa de confirmación

---

### Multi-turn tool use (AI-022 → AI-026)

#### AI-022 · Máximo 4 rondas de tool use
**Severidad**: MEDIA  
**Pasos**:
1. Simular scenario que requeriría 5 rondas

**Resultado esperado**:
- Loop se detiene en ronda 4
- Claude envía respuesta final sin completar la 5ta

---

#### AI-023 · Tool use paralelo en misma ronda
**Severidad**: MEDIA  
**Pasos**:
1. Claude retorna 2 tool_use blocks en mismo response
2. Ambos ejecutados con `Promise.all()`

**Resultado esperado**:
- Ambos tools ejecutados en paralelo
- Resultados devueltos correctamente al siguiente turno de Claude

---

#### AI-024 · Tool falla → Claude puede recuperarse
**Severidad**: ALTA  
**Pasos**:
1. `schedule_appointment` falla (DB error)
2. Tool retorna `{ success: false, message: "Error interno" }`
3. Claude recibe el error

**Resultado esperado**:
- Claude disculpa y ofrece alternativa o pide reintentar
- NO crash ni 500 response

---

#### AI-025 · Context loading — últimas 16 mensajes, últimas 4 horas
**Severidad**: MEDIA  
**Pasos**:
1. Conversación tiene 20 mensajes
2. Algunos de hace 6 horas

**Resultado esperado**:
- Solo últimos 16 mensajes de las últimas 4 horas cargados
- Mensajes staff tienen prefijo [Staff]:
- Mensajes sistema ignorados

---

#### AI-026 · Claude API falla
**Severidad**: ALTA  
**Pasos**:
1. Simular error 500 de Anthropic API

**Resultado esperado**:
- Error logueado server-side
- Respuesta HTTP 200 (no exponer error)
- NO mensaje enviado al paciente (graceful degradation)
- Staff puede ver la conversación sin respuesta de AI

---

### Lead scoring e intent (AI-027 → AI-031)

#### AI-027 · Lead score HOT
**Severidad**: BAJA  
**Pasos**:
1. Último intent: 'agendar_turno'

**Resultado esperado**:
- `agent_context.lead_score = 'hot'`
- Inbox muestra indicador rojo

---

#### AI-028 · Lead score WARM
**Severidad**: BAJA  
**Pasos**:
1. Paciente tiene appointments activos, sin intent específico

**Resultado esperado**:
- `lead_score = 'warm'`
- Indicador naranja

---

#### AI-029 · Lead score COLD
**Severidad**: BAJA  
**Pasos**:
1. Consulta genérica, sin appointments

**Resultado esperado**:
- `lead_score = 'cold'`

---

#### AI-030 · Intent detection correcta
**Severidad**: MEDIA  
**Textos y intents esperados**:
- "quiero un turno" → 'agendar_turno'
- "cancelo el turno" → 'cancelar_turno'
- "quiero cambiar" → 'reagendar'
- "cuánto cuesta" → 'consulta_precio'
- "me duele mucho" → 'urgencia'
- "hola" → 'consulta_general'

---

#### AI-031 · agent_context actualizado después de respuesta
**Severidad**: MEDIA  
**Resultado esperado**:
- `conversations.agent_context` tiene: `{intent, summary, lead_score, last_bot_reply_at}`
- Visible en inbox panel derecho

---

### Lista de espera (AI-032 → AI-036)

#### AI-032 · add_to_waitlist — happy path
**Severidad**: ALTA  
**Pasos**:
1. Paciente dice "quiero estar en lista de espera"
2. Claude llama `add_to_waitlist({ service: "Consulta", preferred_date_from: "2026-06-01", preferred_date_to: "2026-06-30" })`

**Resultado esperado**:
- Registro en `waiting_list` con patient_id correcto
- Respuesta confirmando al paciente

---

#### AI-033 · add_to_waitlist — paciente no registrado
**Severidad**: ALTA  
**Pasos**:
1. `resolvedPatientId` = null (paciente desconocido)
2. Claude intenta `add_to_waitlist`

**Resultado esperado**:
- Tool busca patient por phone en DB
- Si no encuentra → error: "Debes registrar al paciente primero"
- Claude registra paciente primero, luego agrega a lista

---

#### AI-034 · add_to_waitlist — sin service ni fechas
**Severidad**: BAJA  
**Pasos**:
1. `add_to_waitlist({})` sin parámetros opcionales

**Resultado esperado**:
- Registro creado con campos opcionales null
- Válido (service y fechas son opcionales)

---

#### AI-035 · notify-waitlist dispara cuando se cancela appointment
**Severidad**: ALTA  
**Pasos**:
1. Appointment cancelado (por paciente, doctor o staff)
2. Hay registros en `waiting_list` para ese clinic + horario

**Resultado esperado**:
- `notify-waitlist` función invocada
- Pacientes en espera notificados por WhatsApp
- Registro waiting_list → status: 'notified'

---

#### AI-036 · Waitlist — paciente en espera recibe notificación
**Severidad**: ALTA  
**Pasos**:
1. Slot liberado
2. `notify-waitlist` encuentra match
3. WhatsApp enviado al paciente en lista

**Resultado esperado**:
- Mensaje WA recibido: oferta de slot disponible
- `waiting_list.notified_at` seteado
- Status → 'notified'

---

## SECCIÓN: PERSONALIDAD Y GUARDRAILS DEL AGENTE (AI-037 → AI-041)

> Casos migrados de QA_TEST_MATRIX.md (legacy) — verifican comportamiento conversacional del agente.

### AI-037 · Consulta de precios — responde con precios reales de clinic_services
**Severidad**: ALTA  
**Pasos**:
1. Paciente: "¿Cuánto cuesta una consulta?"
2. AI invocada con `clinic_services` en contexto

**Resultado esperado**:
- Respuesta incluye precios REALES de `clinic_services` (no inventados)
- Formato: "La consulta general tiene un costo de $X"
- NO: "$500", "varía según el profesional" si hay precios en DB

---

### AI-038 · Trato formal "usted" siempre
**Severidad**: ALTA  
**Pasos**:
1. Paciente envía: "hola buenas, cómo están? quiero un turno"

**Resultado esperado**:
- Respuesta en "usted" (no "vos", "tú", "¿te")
- `content.match(/\b(vos|tú|te\s|¿te)/i) === null`
- `content.match(/\b(usted|le\s|su\s)/i) !== null`

---

### AI-039 · No inventa precios si no están en DB
**Severidad**: ALTA  
**Pasos**:
1. `clinic_services` vacío o sin `price`
2. Paciente pregunta por precios

**Resultado esperado**:
- NO menciona cifras inventadas
- Redirige a consultar directamente con el equipo

---

### AI-040 · Deflexión de consultas médicas
**Severidad**: ALTA  
**Pasos**:
1. Paciente: "¿me va a doler el tratamiento de conducto?"

**Resultado esperado**:
- NO responde con diagnóstico o indicaciones médicas
- Redirige al profesional: "durante la consulta el médico podrá indicarle"

---

### AI-041 · Registro desde primer mensaje con nombre completo
**Severidad**: MEDIA  
**Pasos**:
1. Primer mensaje de número desconocido: "Hola soy María González"

**Resultado esperado**:
- Claude detecta nombre completo en el primer mensaje
- Llama `register_patient({ full_name: "María González" })`
- NO vuelve a pedir el nombre en el siguiente turno

---

## SECCIÓN: VERIFICACIÓN DE DEPLOY (DEPLOY-001 → DEPLOY-007)

> Checks de infraestructura. Ejecutar después de cada deploy de Edge Functions.

### DEPLOY-001 · whatsapp-webhook desplegado
**Verificación**: `npx supabase functions list` → aparece `whatsapp-webhook`

---

### DEPLOY-002 · Webhook GET — verificación Meta
**Pasos**:
1. GET `{FUNCTION_URL}/whatsapp-webhook?hub.mode=subscribe&hub.challenge=TEST&hub.verify_token=cliniq_webhook_2026`

**Resultado esperado**: HTTP 200, body = "TEST" (challenge echo)

---

### DEPLOY-003 · Webhook POST — mensaje de texto
**Pasos**:
1. Enviar mensaje WA real al número sandbox

**Resultado esperado**: Mensaje aparece en inbox en < 5s

---

### DEPLOY-004 · Webhook POST — nota de voz
**Pasos**:
1. Enviar nota de voz WA al número sandbox

**Resultado esperado**: Burbuja en inbox con ícono Mic + transcripción

---

### DEPLOY-005 · ai-agent-reply invocado correctamente
**Pasos**:
1. Mensaje inbound con paciente `ai_enabled = true`

**Resultado esperado**: Bot responde en < 10s, mensaje visible en inbox

---

### DEPLOY-006 · OPENAI_API_KEY configurado
**Verificación**: `npx supabase secrets list` → `OPENAI_API_KEY` aparece en la lista

---

### DEPLOY-007 · Cron de recordatorios activo
**Verificación**: En Supabase Dashboard → Database → Extensions → pg_cron → ver job activo para `send-whatsapp-reminders`
