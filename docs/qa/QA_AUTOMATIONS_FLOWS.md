# CLINIQ — QA: Automatizaciones (Backend + UI)
> Módulos: REM · AUT · 50 test cases · 2026-05-16

---

## Archivos bajo prueba
- `supabase/functions/send-whatsapp-reminders/index.ts`
- `supabase/functions/send-patient-reactivation/index.ts`
- `supabase/functions/send-review-requests/index.ts`
- `src/pages/Automatizaciones/index.jsx`

---

## SECCIÓN REM — RECORDATORIOS BACKEND

### Ventana de tiempo (REM-001 → REM-006)

#### REM-001 · Ventana de ±30 minutos correcta
**Severidad**: ALTA  
**Escenario**: `hours_before = 24`  
**Cálculo**: `windowStart = NOW + (24*60 - 30) min`, `windowEnd = NOW + (24*60 + 30) min`

**Resultado esperado**:
- Appointments dentro de ±30 min del target son incluidos
- Appointments fuera de la ventana excluidos

---

#### REM-002 · No reenvío de recordatorio (reminder_sent_at no null)
**Severidad**: CRÍTICA  
**Pasos**:
1. Appointment con `reminder_sent_at` ya seteado

**Resultado esperado**:
- Query filtra `.is('reminder_sent_at', null)`
- Appointment excluido → no doble envío

---

#### REM-003 · Solo appointments en status new/confirmed
**Severidad**: ALTA  
**Pasos**:
1. Appointment en status 'cancelled' dentro de la ventana

**Resultado esperado**:
- `.in('status', ['new', 'confirmed'])` → excluido

---

#### REM-004 · Procesamiento paralelo de múltiples clínicas
**Severidad**: MEDIA  
**Pasos**:
1. 3 clínicas con automatización habilitada
2. Cron job dispara

**Resultado esperado**:
- `Promise.all(automations.map(processAutomation))` ejecuta en paralelo
- Resultados acumulados: sent/failed/skipped por clínica
- Total correcto en respuesta

---

#### REM-005 · Sin automatizaciones activas
**Severidad**: BAJA  
**Pasos**:
1. Todas las automatizaciones `enabled = false`

**Resultado esperado**:
- Respuesta: `{ ok: true, message: 'No active automations', sent: 0, failed: 0, skipped: 0 }`

---

#### REM-006 · Error al cargar automations
**Severidad**: ALTA  
**Pasos**:
1. Simular error en query `.from('clinic_automations')`

**Resultado esperado**:
- Respuesta HTTP 500 con mensaje de error
- No crash sin manejo

---

### Modo conversacional (< 12h) (REM-007 → REM-013)

#### REM-007 · Selección de modo conversacional
**Severidad**: CRÍTICA  
**Pasos**:
1. `hours_before = 6` (< 12)

**Resultado esperado**:
- `useConversational = true`
- `sendWaFreeText()` llamado (no template)
- `direction = 'outbound_ai'` en inbox

---

#### REM-008 · Template rendering con variables
**Severidad**: ALTA  
**Template**: `"Hola {patient_name} 👋 ... turno el {appointment_date} a las {appointment_time}"`

**Resultado esperado**:
- `{patient_name}` → nombre real del paciente
- `{clinic_name}` → nombre de la clínica
- `{appointment_date}` → fecha formateada en es-UY con timezone clínica
- `{appointment_time}` → hora formateada HH:MM
- `{service}` → extraído de notes (regex `Servicio:\s*([^—\n]+)`) o "su consulta"

---

#### REM-009 · Variable {service} extraída de notes
**Severidad**: ALTA  
**Pasos**:
1. `appointment.notes = "[IA] Servicio: Odontología — notas adicionales"`
2. Regex: `Servicio:\s*([^—\n]+)` → "Odontología"

**Resultado esperado**:
- Template: "...recordarle su turno de Odontología..."

---

#### REM-010 · Variable {service} — fallback sin notes
**Severidad**: MEDIA  
**Pasos**:
1. `appointment.notes = null` o sin "Servicio:" en notes

**Resultado esperado**:
- `service = 'su consulta'` (fallback)
- Template: "...recordarle su turno de su consulta..."

---

#### REM-011 · Template personalizado en DB (no default)
**Severidad**: ALTA  
**Pasos**:
1. `clinic_automations.message_template` tiene template personalizado
2. Cron ejecuta reminder

**Resultado esperado**:
- Template personalizado renderizado (no el default hardcoded)
- Variables reemplazadas correctamente

---

#### REM-012 · Template null — usa default
**Severidad**: MEDIA  
**Pasos**:
1. `clinic_automations.message_template = null`

**Resultado esperado**:
- `auto.message_template ?? defaultTemplate`
- Default: `"Hola {patient_name} 👋 Le escribimos desde {clinic_name}..."`

---

#### REM-013 · Conversacional: appointment actualizado post-envío
**Severidad**: CRÍTICA  
**Pasos**:
1. Reminder enviado exitosamente

**Resultado esperado**:
- `appointments.status` → 'pending' (de new/confirmed)
- `appointments.reminder_sent_at` → timestamp actual
- Conversation upserted
- Message insertado en inbox con direction: 'outbound_ai'

---

### Modo template (>= 12h) (REM-014 → REM-020)

#### REM-014 · Selección de modo template
**Severidad**: CRÍTICA  
**Pasos**:
1. `hours_before = 24` (>= 12)

**Resultado esperado**:
- `useConversational = false`
- `sendWaTemplate()` llamado
- `direction = 'system_template'`

---

#### REM-015 · Language fallback automático
**Severidad**: ALTA  
**Pasos**:
1. Primera llamada con `WA_TEMPLATE_LANG` (ej: 'es')
2. Meta API responde error 132001 (language not found)
3. Siguiente intento: 'es_AR'
4. Si error 132001 → 'es_ES', 'es_MX'...

**Resultado esperado**:
- Loop recorre todos los `LANG_CANDIDATES`
- Para cuando uno funciona
- Deduplicación de lang codes (Set)

---

#### REM-016 · Ningún language funciona
**Severidad**: ALTA  
**Pasos**:
1. Todos los lang codes retornan 132001

**Resultado esperado**:
- Log: "No valid language found for template {name}"
- `waId = null`
- Fallo registrado en `whatsapp_message_log` (status: 'failed')
- `results.failed++`

---

#### REM-017 · Error diferente a 132001 (no retry)
**Severidad**: ALTA  
**Pasos**:
1. Meta API responde error 131009 (phone number invalid)

**Resultado esperado**:
- Loop se detiene (errorCode != 132001)
- NO reintentar con otros langs
- Registrar como fallido

---

#### REM-018 · Template: parámetros correctos
**Severidad**: ALTA  
**Pasos**:
1. Modo template ejecutado

**Resultado esperado**:
- `components[0].parameters`:
  - `[0]` = patient.full_name
  - `[1]` = time (solo hora, sin fecha)
  - `[2]` = clinic.name
- Nombre correcto del template en `WA_TEMPLATE_NAME`

---

#### REM-019 · Appointment no actualizado si template falla
**Severidad**: CRÍTICA  
**Pasos**:
1. Template send falla (waId = null)

**Resultado esperado**:
- `appointments.reminder_sent_at` NO seteado
- Status NO cambia a 'pending'
- Cron puede reintentarlo en próxima ejecución (dentro de ventana)
- `whatsapp_message_log` insertado con status: 'failed'

---

#### REM-020 · PhoneNumberId por clínica vs global
**Severidad**: ALTA  
**Pasos**:
1. `clinic.wa_phone_number_id` configurado → usar ese
2. `clinic.wa_phone_number_id = null` → usar `WA_PHONE_NUMBER_ID_GLOBAL`
3. Ambos null → skip con log de error

**Resultado esperado**:
- Prioridad: clinic-specific > global
- Si ninguno: `results.skipped++`

---

### Skip conditions (REM-021 → REM-022)

#### REM-021 · Paciente sin phone_number
**Severidad**: ALTA  
**Pasos**:
1. `patient.phone_number = null` o vacío

**Resultado esperado**:
- `if (!patient?.phone_number) { r.skipped++; return; }`
- NO intento de envío
- Audit log NO insertado (skip silencioso)

---

#### REM-022 · Timezone por clínica
**Severidad**: ALTA  
**Pasos**:
1. Clínica en timezone 'America/Buenos_Aires'
2. Appointment a las 10:00 local

**Resultado esperado**:
- `formatForTimezone(iso, 'America/Buenos_Aires')` usado
- Fecha/hora mostradas en hora local de la clínica
- Capitalización de día/mes (charAt(0).toUpperCase())

---

## SECCIÓN AUT — AUTOMATIZACIONES UI

### Carga y visualización (AUT-001 → AUT-006)

#### AUT-001 · Carga inicial de automatizaciones
**Severidad**: ALTA  
**Pasos**:
1. Navegar a `/dashboard/automatizaciones`
2. Esperar carga

**Resultado esperado**:
- Skeleton loading mientras carga
- 3 cards visibles: reminder, reactivation, review
- Datos de cada automation desde DB

---

#### AUT-002 · Stats correctas en card
**Severidad**: ALTA  
**Pasos**:
1. Automation con `total_sent > 0`

**Resultado esperado**:
- "Mensajes enviados: {total_sent}"
- "Tasa de éxito: {Math.min(100, Math.round(success_rate))}%"
- Progress bar proporcional
- "Último envío: {fecha relativa}"

---

#### AUT-003 · Stats — sin datos (total_sent = 0)
**Severidad**: BAJA  
**Resultado esperado**:
- "Sin datos" en lugar de stats
- Progress bar vacía (gris)

---

#### AUT-004 · success_rate NO muestra > 100% (bug fix verificación)
**Severidad**: ALTA  
**Pasos**:
1. `v_automation_stats.success_rate = 139` (valor raw)

**Resultado esperado**:
- UI muestra: `Math.min(100, Math.round(139))` = "100%"
- NO "139%" en pantalla

---

#### AUT-005 · Cards de info "¿Cómo funciona?"
**Severidad**: BAJA  
**Resultado esperado**:
- 3 cajas explicativas visibles bajo las cards
- Texto correcto para cada tipo de automation

---

#### AUT-006 · Error al cargar automations
**Severidad**: MEDIA  
**Resultado esperado**:
- Mensaje de error o cards vacías
- No crash

---

### Toggle enable/disable (AUT-007 → AUT-010)

#### AUT-007 · Toggle enable → disable
**Severidad**: ALTA  
**Pasos**:
1. Automation activa
2. Click toggle

**Resultado esperado**:
- UI actualiza optimistamente
- `clinic_automations.enabled = false` en DB
- Toast: "Automatización desactivada"

---

#### AUT-008 · Toggle disable → enable
**Severidad**: ALTA  
**Resultado esperado**:
- `enabled = true` en DB
- Toast: "Automatización activada"

---

#### AUT-009 · Toggle — fallo en DB
**Severidad**: ALTA  
**Pasos**:
1. DB rechaza update (RLS, error red)

**Resultado esperado**:
- UI revierte al estado anterior (revert optimistic)
- Toast de error

---

#### AUT-010 · Toggle simultáneo (doble click)
**Severidad**: MEDIA  
**Pasos**:
1. Click rápido 2 veces en toggle

**Resultado esperado**:
- Solo un estado final en DB
- UI consistente con DB

---

### Edit Modal (AUT-011 → AUT-022)

#### AUT-011 · Abrir modal appointment_reminder
**Severidad**: ALTA  
**Pasos**:
1. Click "Configurar" en card reminder

**Resultado esperado**:
- Modal abre con datos actuales de DB
- Campo `hours_before` con valor actual
- MessageEditor visible SI `hours_before < 12`
- Aviso de "plantilla estándar" visible SI `hours_before >= 12`

---

#### AUT-012 · Cambio de hours_before < 12 → muestra MessageEditor
**Severidad**: ALTA  
**Pasos**:
1. Cambiar hours_before a 6

**Resultado esperado**:
- `isConversational = true`
- MessageEditor visible con template actual
- Subtítulo: "El asistente enviará el mensaje..."

---

#### AUT-013 · Cambio de hours_before >= 12 → oculta MessageEditor
**Severidad**: ALTA  
**Pasos**:
1. Cambiar hours_before a 24

**Resultado esperado**:
- `isConversational = false`
- MessageEditor oculto
- Aviso: "El paciente recibirá un recordatorio estándar de WhatsApp..."
- Sin mencionar términos técnicos (appointment_scheduling, Meta, etc.)

---

#### AUT-014 · Legacy template — auto-reemplazado en UI
**Severidad**: ALTA  
**Precondición**: `message_template` en DB contiene "*1*" o "*2*" o "{time}"

**Resultado esperado**:
- `isLegacyTemplate = true`
- useState inicializa con `DEFAULT_REMINDER_MSG` en lugar del legacy
- Usuario ve template humanizado
- Al guardar → se sobrescribe el legacy

---

#### AUT-015 · MessageEditor — inserción de placeholder
**Severidad**: MEDIA  
**Pasos**:
1. Click botón "{patient_name}"

**Resultado esperado**:
- Texto insertado en posición del cursor en textarea
- Preview actualizado en tiempo real

---

#### AUT-016 · MessageEditor — preview rendering
**Severidad**: MEDIA  
**Pasos**:
1. Template tiene `{patient_name}` y `{clinic_name}`
2. Preview activo

**Resultado esperado**:
- Preview muestra "María García" (valor de muestra)
- Preview muestra "Consultorio Ejemplo"
- `{variables_no_definidas}` → `{variable_no_definida}` (fallback visible)

---

#### AUT-017 · MessageEditor — contador de caracteres
**Severidad**: BAJA  
**Pasos**:
1. Escribir en textarea

**Resultado esperado**:
- Contador muestra `{N}/1000`
- Al superar 1000: contador en rojo o textarea bloqueada

---

#### AUT-018 · Validación hours_before fuera de rango
**Severidad**: MEDIA  
**Casos**:
- `hours_before = 0` → inválido (mínimo 1)
- `hours_before = 200` → inválido (máximo 168)
- `hours_before = ""` → inválido

**Resultado esperado**:
- Botón guardar deshabilitado
- Indicador de error en campo

---

#### AUT-019 · Guardar cambios — happy path
**Severidad**: CRÍTICA  
**Pasos**:
1. Editar hours_before y template
2. Click "Guardar"

**Resultado esperado**:
- `clinic_automations` actualizado en DB
- Modal cierra
- Toast: "Automatización actualizada"
- Card refleja nuevos valores

---

#### AUT-020 · Guardar — sin cambios (cancel)
**Severidad**: BAJA  
**Pasos**:
1. Abrir modal
2. Click "Cancelar" sin modificar nada

**Resultado esperado**:
- Modal cierra sin request a DB
- Estado sin cambios

---

#### AUT-021 · Modal reactivación — meses_inactivo
**Severidad**: ALTA  
**Pasos**:
1. Abrir modal patient_reactivation
2. Modificar `months_inactive` (rango 1-24)
3. Guardar

**Resultado esperado**:
- Actualización en DB
- Cron usa nuevo valor

---

#### AUT-022 · Modal review_request — hours_after y review_url
**Severidad**: ALTA  
**Pasos**:
1. Configurar `hours_after` y template con `{review_url}`

**Resultado esperado**:
- `{review_url}` en preview → URL configurada
- Validación range: 1-72 horas

---

## SECCIÓN: OTROS RECORDATORIOS BACKEND

### Reactivación de pacientes (REM-023 → REM-027)

#### REM-023 · Selección de pacientes inactivos
**Severidad**: ALTA  
**Condición**: `months_inactive` meses sin visita

**Resultado esperado**:
- Query filtra por `last_appointment_date < NOW - months_inactive months`
- Solo pacientes con phone_number
- Solo pacientes sin reactivation enviada recientemente

---

#### REM-024 · Template de reactivación renderizado
**Severidad**: ALTA  
**Resultado esperado**:
- Variables: `{patient_name}`, `{clinic_name}`
- Mensaje personalizado enviado como free-text

---

#### REM-025 · Skip paciente sin phone
**Severidad**: MEDIA  
**Resultado esperado**:
- Paciente sin `phone_number` → skipped, no error

---

#### REM-026 · No reinvitar si ya reactivado recientemente
**Severidad**: ALTA  
**Resultado esperado**:
- Filtro en query excluye pacientes reactivados en últimos N días

---

#### REM-027 · Marcado post-envío
**Severidad**: ALTA  
**Resultado esperado**:
- `patients.last_reactivation_sent_at` actualizado (o campo equivalente)
- Audit log insertado

---

### Review requests (REM-028 → REM-030)

#### REM-028 · Envío N horas post-visita
**Severidad**: ALTA  
**Condición**: `hours_after` horas desde `appointment_datetime` (status: completed o similar)

**Resultado esperado**:
- Solo appointments finalizados y recientes
- Template con `{review_url}` renderizado

---

#### REM-029 · No enviar si visita cancelada
**Severidad**: ALTA  
**Resultado esperado**:
- Appointments en status 'cancelled' → excluidos

---

#### REM-030 · No doble envío de review request
**Severidad**: ALTA  
**Resultado esperado**:
- Filtro: `review_sent_at IS NULL`
- Una vez enviado, marcado para no reenviar
