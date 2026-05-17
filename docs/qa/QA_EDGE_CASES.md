# CLINIQ — QA: Edge Cases & Race Conditions
> Casos límite críticos que deben verificarse explícitamente · 2026-05-16

---

## RACE CONDITIONS (RC)

### RC-001 · Confirmación simultánea — paciente + doctor
**Escenario**: Paciente presiona botón "Confirmar" y el doctor envía "1" al mismo tiempo  
**Probabilidad**: Media (sistema activo en hora pico)  
**Severidad**: CRÍTICA

**Secuencia**:
```
T=0ms  Paciente presiona botón → webhook recibe, busca appointment status='pending'
T=0ms  Doctor envía "1"       → webhook recibe, busca appointment status='new'
T=5ms  Paciente: UPDATE appointments SET status='confirmed' WHERE id=X AND status='pending'
T=5ms  Doctor:   UPDATE appointments SET status='confirmed' WHERE id=X AND status='new'
```

**Resultado esperado**:
- UPDATE usa condición WHERE en status → atómico
- Uno retorna 0 rows → dedup message enviado
- Appointment en 'confirmed' exactamente una vez
- Solo UN mensaje de confirmación al paciente

**Verificación**:
- Insertar 2 requests simultáneos en staging
- Verificar `reminder_sent_at` seteado una sola vez
- Verificar 1 sola fila en `whatsapp_message_log` dirección outbound

---

### RC-002 · Toggle AI mientras AI está respondiendo
**Escenario**: Staff desactiva AI mientras Claude está generando respuesta  
**Probabilidad**: Baja  
**Severidad**: ALTA

**Secuencia**:
```
T=0ms   Paciente envía mensaje → webhook → ai-agent-reply invocado
T=100ms Staff desactiva AI (ai_enabled=false)
T=3000ms Claude termina → send-whatsapp-message → mensaje enviado
```

**Resultado esperado**:
- Mensaje de Claude enviado (ai-agent-reply no relee ai_enabled)
- Mensaje visible en inbox como 'outbound_ai'
- En próximo mensaje inbound: AI verificará ai_enabled → no responderá
- **Aceptable**: Una respuesta de AI puede "escapar" al deshabilitar

**Mitigación actual**: No existe. Si se requiere prevenir, ai-agent-reply debería re-verificar ai_enabled antes del último send.

---

### RC-003 · Doble press de botón (rápido)
**Escenario**: Paciente presiona "Confirmar" dos veces en menos de 500ms  
**Probabilidad**: Alta (especialmente en mobile)  
**Severidad**: ALTA

**Resultado esperado**:
- Dos webhooks recibidos casi simultáneamente
- Primer UPDATE: status pending→confirmed ✅
- Segundo UPDATE: WHERE status IN ('pending','new') → 0 rows (appointment ya confirmado)
- Mensaje dedup enviado en segundo webhook
- UN solo mensaje de confirmación al paciente

---

### RC-004 · Reminder + confirmación manual simultáneos
**Escenario**: Cron de recordatorio ejecuta mientras paciente confirma manualmente  
**Probabilidad**: Media  
**Severidad**: ALTA

**Secuencia**:
```
T=0ms   Cron: query appointments WHERE reminder_sent_at IS NULL → encuentra X
T=0ms   Paciente confirma → appointment.status='confirmed', reminder_sent_at=null aún
T=100ms Cron: UPDATE reminder_sent_at=NOW → OK (appointment en 'confirmed')
T=100ms Cron: UPDATE status='pending' → sobrescribe 'confirmed' con 'pending' ❌
```

**Problema**: Cron puede revertir status de confirmed a pending  
**Resultado esperado ACTUAL**: Potencial regresión de status  
**Fix sugerido**: Cron solo actualiza status si `status = 'new'` (no tocar confirmed):
```sql
UPDATE appointments SET status='pending', reminder_sent_at=NOW
WHERE id = X AND status = 'new' AND reminder_sent_at IS NULL
```

---

### RC-005 · Registro de paciente duplicado
**Escenario**: Dos mensajes del mismo número desconocido llegan en <100ms  
**Probabilidad**: Baja  
**Severidad**: ALTA

**Secuencia**:
```
T=0ms   Webhook 1 → no encuentra patient por phone → invoca AI
T=0ms   Webhook 2 → no encuentra patient por phone → invoca AI
T=2000ms AI 1: register_patient → INSERT patients (phone=+599123)
T=2000ms AI 2: register_patient → INSERT patients (phone=+599123) → UNIQUE VIOLATION
```

**Resultado esperado**:
- Segunda INSERT falla (unique constraint en `phone_number` per clinic)
- Tool retorna error → Claude maneja graciosamente
- Solo UN paciente creado
- Conversación puede quedar con `patient_id` inconsistente en segundo webhook

---

### RC-006 · Upsert conversación simultáneo
**Escenario**: Dos mensajes de mismo número → dos webhooks → dos UPSERT en conversations  
**Probabilidad**: Media  
**Severidad**: MEDIA

**Resultado esperado**:
- UPSERT con `onConflict: 'clinic_id,phone_number'` → idempotente
- Ambos retornan mismo `conversation.id`
- Mensajes insertados correctamente en misma conversación

---

## BOUNDARY CONDITIONS (BC)

### BC-001 · Ventana de 24h — exactamente en el límite
**Escenario**: Último mensaje inbound hace exactamente 24h 00m 00s

**Resultado esperado**: Ventana considerada CERRADA (≥ 24h = cerrada)

**Verificación**: 
```javascript
const WINDOW_MS = 24 * 60 * 60 * 1000;
const elapsed = Date.now() - lastInboundMs;
const isOpen = elapsed < WINDOW_MS; // Exactamente 24h → false → CERRADA
```

---

### BC-002 · No-show — exactamente 2h
**Escenario**: Appointment hace exactamente 2h sin confirmación

**Resultado esperado**: Considerado no-show (≥ 2h = no-show)

```javascript
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const isNoShow = Date.now() - apptTime >= TWO_HOURS_MS;
```

---

### BC-003 · Ventana de reminder ±30min — en el borde exacto
**Escenario**: `hours_before = 24`, appointment en exactamente `NOW + 23h 30m`

**Resultado esperado**: `windowStart = NOW + 23h 30m` → appointment EN el límite → INCLUIDO

---

### BC-004 · Template de 1000 caracteres exactos
**Escenario**: Template de automazione con exactamente 1000 chars

**Resultado esperado**:
- Aceptado (límite inclusivo)
- 1001 chars → rechazado

---

### BC-005 · hours_before = 12 (exactamente en el umbral)
**Escenario**: `hours_before = 12`

**Resultado esperado**:
- `useConversational = 12 < 12` → **false** → modo TEMPLATE (no conversacional)
- Verificar que el umbral sea `<` y no `<=`

---

### BC-006 · AI retoma con staff inactivo exactamente 2min
**Escenario**: `agent_last_human_reply_at = NOW - 2min 00s`

**Resultado esperado**:
- `elapsed >= 2 * 60 * 1000` → AI retoma
- En `2min - 1s` → AI NO retoma

---

## DATA INTEGRITY (DI)

### DI-001 · Appointment eliminado con reminder ya enviado
**Escenario**: Staff elimina appointment después de que se envió recordatorio

**Resultado esperado**:
- Appointment eliminado de DB
- `whatsapp_message_log` permanece (auditoría)
- `conversations` permanece con el mensaje histórico
- Sin FK violation

---

### DI-002 · Paciente eliminado con conversaciones activas
**Escenario**: Staff elimina paciente con historial de WA

**Resultado esperado**:
- `conversations.patient_id` → null (SET NULL) o error
- Mensajes históricos intactos
- Staff puede ver conversación sin nombre (phone como fallback)

---

### DI-003 · Clínica sin timezone configurada
**Escenario**: `clinics.timezone = null`

**Resultado esperado**:
- Fallback: `'America/Montevideo'`
- Sin crash en `formatForTimezone()`
- Fechas mostradas correctamente

---

### DI-004 · Appointment con patient_id null (legacy data)
**Escenario**: Appointment creado antes de que se registrara el paciente

**Resultado esperado**:
- Sin crash en agenda (patient puede ser null)
- Nombre mostrado: "Paciente sin nombre" o similar

---

### DI-005 · Template con placeholder desconocido
**Escenario**: Template: `"Hola {unknown_var} de {clinic_name}"`

**Resultado esperado**:
- `renderTemplate()`: `{unknown_var}` → `{unknown_var}` (no reemplazado)
- Mensaje enviado con `{unknown_var}` literal (no crash)

---

### DI-006 · Reminder enviado a número desactivado en WA
**Escenario**: `patient.phone_number` es número inválido o bloqueado

**Resultado esperado**:
- Meta API retorna error (no 200)
- `waId = null`
- `whatsapp_message_log` insertado con status: 'failed'
- `reminder_sent_at` NO seteado (puede reintentarse)

---

### DI-007 · Conversación con messages fuera de 4h context
**Escenario**: Conversación con mensajes de hace 5 horas

**Resultado esperado**:
- `ai-agent-reply` filtra: solo mensajes de las últimas 4h
- Claude no ve mensajes antiguos (evita confusión con contextos viejos)

---

## PERFORMANCE & LIMITS (PL)

### PL-001 · Clínica con 500+ appointments en un día
**Resultado esperado**: Vista día renderiza sin lag visible (< 1s)

### PL-002 · Inbox con 1000+ conversaciones
**Resultado esperado**: Lista renderiza con virtualización o paginación

### PL-003 · Conversación con 500+ mensajes
**Resultado esperado**: Scroll suave, mensajes paginados (no carga 500 a la vez)

### PL-004 · Claude API timeout (> 30s)
**Resultado esperado**: Deno request timeout → función retorna 200 sin error visible

### PL-005 · 20 clínicas con reminder el mismo minuto (cron)
**Resultado esperado**: `Promise.all()` procesa en paralelo sin timeout

---

## SECURITY (SEC)

### SEC-001 · RLS: usuario no puede ver appointments de otra clínica
**Verificación**:
```sql
-- Como user de clínica A, intentar:
SELECT * FROM appointments WHERE clinic_id = '{clinic_b_id}'
-- Resultado esperado: 0 filas (RLS filtra)
```

### SEC-002 · Token de invitación solo válido una vez
**Verificación**:
1. Aceptar invitación con token X
2. Intentar usar token X de nuevo
3. Resultado: `data.status === 'active'` → error "ya aceptada"

### SEC-003 · Webhook Meta — validación de firma
**Verificación**: Request sin `x-hub-signature-256` válida → 401/403

### SEC-004 · Edge functions — solo accesibles con service role o user jwt
**Verificación**: Request sin Authorization header → 401

### SEC-005 · No enumerar emails en signup/forgot-password
**Verificación**:
- Signup con email existente → mensaje genérico (no "ya existe")
- ForgotPassword con email inexistente → mismo mensaje de éxito

### SEC-006 · XSS en contenido de mensajes WhatsApp
**Verificación**:
- Mensaje con `<script>alert('xss')</script>`
- Resultado: renderizado como texto plano en UI

### SEC-007 · SQL injection en búsqueda de pacientes
**Verificación**:
- Buscar `'; DROP TABLE patients; --`
- Resultado: sin error, búsqueda trata como texto literal (Supabase usa prepared statements)

---

## OFFLINE & NETWORK (NET)

### NET-001 · Pérdida de conexión durante carga de agenda
**Resultado esperado**: Skeleton → error state → botón "Reintentar"

### NET-002 · Pérdida de conexión durante envío de mensaje
**Resultado esperado**: Toast de error, texto del input preservado

### NET-003 · Reconexión de Supabase Realtime
**Resultado esperado**: Realtime se reconecta automáticamente, sin mensajes perdidos

### NET-004 · API de WhatsApp no disponible (reminder cron)
**Resultado esperado**:
- `failed++`
- Log de error
- `reminder_sent_at` NO marcado → se reintentará en próxima ventana

### NET-005 · Claude API no disponible (ai-agent-reply)
**Resultado esperado**:
- Error logueado
- HTTP 200 retornado (no exponer error)
- Staff ve conversación sin respuesta de AI

---

## UX EDGE CASES (UX)

### UX-001 · Modal abierto, sesión expira
**Escenario**: Usuario tiene modal de edición abierto, token expira
**Resultado esperado**: Al intentar guardar → error de auth → redirigir a login

### UX-002 · Formulario de signup con JavaScript deshabilitado
**Resultado esperado**: Formulario funciona (React no requiere JS en cliente para forms, pero sí está en SPA)
**Nota**: App requiere JS obligatoriamente (es SPA)

### UX-003 · Upload de imagen como respuesta WA en Inbox
**Escenario**: Paciente envía imagen, staff ve `[image]` en inbox
**Resultado esperado**: Placeholder visible, sin crash

### UX-004 · Múltiples tabs del dashboard
**Escenario**: Staff abre 3 tabs del dashboard
**Resultado esperado**: Sin conflictos de Realtime, sin duplicados de mensajes

### UX-005 · Back button del browser en modal abierto
**Resultado esperado**: Modal cierra (si history.pushState usado) o navegación normal

### UX-006 · Copiar/pegar en campos de formulario
**Resultado esperado**: Funciona normalmente

### UX-007 · Paste de número internacional con espacios/guiones
**Escenario**: Pegar "+598 98 123 456" o "+598-98-123-456"
**Resultado esperado**: Normalizado antes de guardar (remover espacios/guiones)

### UX-008 · Timezone del browser vs timezone de clínica
**Escenario**: Staff en timezone diferente a la clínica
**Resultado esperado**: Todas las fechas mostradas en timezone de la CLÍNICA, no del browser

### UX-009 · Scroll en lista de mensajes al llegar nuevo
**Escenario**: Staff leyendo mensajes antiguos, llega mensaje nuevo
**Resultado esperado**: 
- Si estaba en el fondo: auto-scroll al nuevo
- Si estaba leyendo histórico: NO auto-scroll, badge "1 nuevo mensaje"

### UX-010 · Formulario con datos de otro usuario por autofill del browser
**Resultado esperado**: Autofill del browser no corrompe datos de formulario
