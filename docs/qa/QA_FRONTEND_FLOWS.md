# CLINIQ — QA: Frontend UI (Todos los módulos)
> Módulos: AG · PAC · INB · CFG · LSE · DASH · REG · 176 test cases · 2026-05-16

---

## AGENDA (AG-001 → AG-034)

### Archivos: `src/pages/Agenda/index.jsx`, `src/pages/Dashboard/NewAppointmentModal.jsx`, `src/pages/Dashboard/EditApptModal.jsx`

### Vistas (AG-001 → AG-006)

#### AG-001 · Vista día — carga correcta
**Severidad**: ALTA  
**Pasos**:
1. Navegar a `/dashboard/agenda`
2. Vista por defecto: día actual

**Resultado esperado**:
- Appointments del día listados
- Cada uno: hora | avatar | nombre | tipo | profesional | status badge | menú acciones
- Fechas en timezone de la clínica
- Sin appointments: "No hay turnos para este día"

---

#### AG-002 · Vista semana — grid 7 columnas
**Severidad**: ALTA  
**Pasos**:
1. Click "Semana" en toggle de vista

**Resultado esperado**:
- Columnas Lun-Dom con fecha
- Chips de appointments coloreados por status
- Hoy resaltado en columna actual
- Máx chips por columna visible (scroll interno si overflow)

---

#### AG-003 · Vista mes — grid calendario
**Severidad**: ALTA  
**Pasos**:
1. Click "Mes" en toggle

**Resultado esperado**:
- Días del mes en grid
- Máx 3 chips por día
- "+N más" si hay más de 3
- Días de meses adyacentes griseados
- Hoy resaltado (blue background)

---

#### AG-004 · Tooltip en semana/mes
**Severidad**: MEDIA  
**Pasos**:
1. Hover sobre chip de appointment

**Resultado esperado**:
- Tooltip con: nombre + phone + hora + servicio + profesional + notas + status badge
- Auto-posicionado (no sale del viewport)
- Aparece debajo, o arriba si no hay espacio

---

#### AG-005 · Navegación de fechas
**Severidad**: ALTA  
**Pasos**:
1. Click "←" → retrocede (1 día / 7 días / 1 mes según vista)
2. Click "→" → avanza
3. Click "Hoy" → vuelve a hoy
4. "Hoy" se oculta cuando ya está en hoy

**Resultado esperado**:
- Navegación correcta en cada vista
- Label de fecha actualizado
- "Hoy" oculto cuando current date = hoy

---

#### AG-006 · Cambio de vista preserva fecha actual
**Severidad**: BAJA  
**Pasos**:
1. Navegar a semana del 20/mayo
2. Cambiar a vista mes

**Resultado esperado**:
- Vista mes muestra mayo (misma semana/fecha)

---

### Filtros (AG-007 → AG-011)

#### AG-007 · Filtro por status (vista día)
**Severidad**: ALTA  
**Pasos**:
1. Click "Confirmados"
2. Verificar que solo aparecen appointments status='confirmed'
3. Click "Todos" → vuelven todos

---

#### AG-008 · Búsqueda por texto (nombre/tipo)
**Severidad**: ALTA  
**Pasos**:
1. Escribir "García" en buscador
2. Solo appointments con paciente "García" visibles

**Resultado esperado**:
- Búsqueda case-insensitive
- Query param `?q=García` en URL
- Clear button (×) disponible

---

#### AG-009 · Búsqueda + filtro de status combinados
**Severidad**: MEDIA  
**Pasos**:
1. Filtro: Confirmados + búsqueda: "garcía"

**Resultado esperado**:
- Intersección de ambos filtros
- Solo García confirmados

---

#### AG-010 · Sin resultados en búsqueda
**Severidad**: BAJA  
**Resultado esperado**:
- "No hay turnos que coincidan con '{query}'" o similar
- Sin crash

---

#### AG-011 · Búsqueda preservada en cambio de fecha
**Severidad**: BAJA  
**Pasos**:
1. Buscar "García"
2. Navegar a otro día

**Resultado esperado**:
- Query `?q=García` se mantiene en URL
- Filtro activo en nueva fecha

---

### Crear appointment (AG-012 → AG-017)

#### AG-012 · Nuevo turno — modal desde botón header
**Severidad**: ALTA  
**Pasos**:
1. Click "Nuevo turno" en header de Agenda

**Resultado esperado**:
- Modal `EditApptModal` abre
- Fecha pre-cargada con día actual
- Todos los campos editables

---

#### AG-013 · Nuevo turno — click en celda vacía (día/semana)
**Severidad**: MEDIA  
**Pasos**:
1. Click en "+" de celda vacía en vista día o semana

**Resultado esperado**:
- Modal con fecha del día clickeado pre-cargada

---

#### AG-014 · Crear appointment — campos requeridos
**Severidad**: ALTA  
**Campos requeridos**:
- Paciente (búsqueda por nombre/phone)
- Fecha y hora
- Status inicial (default: 'new')

**Resultado esperado**:
- Sin paciente o sin fecha → botón guardar deshabilitado

---

#### AG-015 · Crear appointment — happy path
**Severidad**: CRÍTICA  
**Pasos**:
1. Seleccionar paciente
2. Ingresar fecha, hora, servicio, profesional, notas
3. Guardar

**Resultado esperado**:
- Appointment creado en DB
- Aparece en agenda sin refetch manual
- Toast: "Turno creado correctamente"
- Evento `cq_appointment_created` disparado

---

#### AG-016 · Crear appointment — paciente sin phone (sin WA)
**Severidad**: MEDIA  
**Pasos**:
1. Paciente sin `phone_number`
2. Crear appointment

**Resultado esperado**:
- Appointment creado
- Sin intento de recordatorio WA (no phone)
- Aviso visual si es relevante

---

#### AG-017 · Crear appointment — conflicto de horario
**Severidad**: MEDIA  
**Pasos**:
1. Intentar crear 2 appointments mismo paciente, mismo horario

**Resultado esperado**:
- DB: sin unique constraint en horario (múltiples pueden coincidir)
- UI: sin validación client-side de conflictos
- Ambos creados (clínica decide si es error)

---

### Editar appointment (AG-018 → AG-021)

#### AG-018 · Editar appointment — abrir modal
**Severidad**: ALTA  
**Pasos**:
1. Click "Editar" en menú de appointment (vista día)

**Resultado esperado**:
- Modal con datos actuales pre-cargados
- Todos los campos editables

---

#### AG-019 · Editar appointment — cambiar paciente
**Severidad**: MEDIA  
**Pasos**:
1. Buscar nuevo paciente en dropdown
2. Seleccionar
3. Guardar

**Resultado esperado**:
- `appointments.patient_id` actualizado
- Vista actualizada

---

#### AG-020 · Editar appointment — cambiar fecha/hora
**Severidad**: ALTA  
**Resultado esperado**:
- `appointment_datetime` actualizado
- Appointment aparece en nueva fecha en agenda

---

#### AG-021 · Editar appointment — sin cambios (solo cerrar)
**Severidad**: BAJA  
**Resultado esperado**:
- Sin request a DB si no hay cambios (o request idempotente)

---

### Cambio de status (AG-022 → AG-026)

#### AG-022 · Cambiar status appointment — todos los flujos
**Severidad**: ALTA  
**Transiciones válidas**:
- new → confirmed, pending, rescheduled, cancelled
- pending → confirmed, rescheduled, cancelled
- confirmed → pending, rescheduled, cancelled

**Resultado esperado**:
- `appointments.status` actualizado
- Badge actualizado en vista
- Toast: "Estado actualizado: {STATUS_LABEL}"

---

#### AG-023 · Status chip coloreado correcto
**Severidad**: BAJA  
**Status → Color**:
- new → accent (naranja)
- pending → warn (amarillo)
- confirmed → success (verde)
- rescheduled → outline (gris)
- cancelled → danger (rojo)

---

#### AG-024 · Cambio de status — actualización en tiempo real
**Severidad**: MEDIA  
**Pasos**:
1. Cambiar status desde otra sesión/tab
2. Vista actual sin refetch manual

**Resultado esperado**:
- Realtime listener detecta cambio
- UI actualizada automáticamente

---

#### AG-025 · Refetch en window focus
**Severidad**: MEDIA  
**Pasos**:
1. Hacer cambio en otra tab
2. Volver a tab de agenda

**Resultado esperado**:
- Datos refrescados al recuperar foco

---

#### AG-026 · Appointment en status cancelled/rescheduled — no mostrar en filtro Activos
**Severidad**: MEDIA  
**Resultado esperado**:
- Filtro "Activos" = [new, pending, confirmed]
- cancelled y rescheduled excluidos del filtro activos

---

### Eliminar appointment (AG-027 → AG-029)

#### AG-027 · Eliminar — requiere confirmación
**Severidad**: ALTA  
**Pasos**:
1. Click "Eliminar" en menú

**Resultado esperado**:
- Dialog de confirmación: "¿Eliminar este turno?"
- Botones: Cancelar / Eliminar

---

#### AG-028 · Eliminar — solo new/cancelled permitido
**Severidad**: ALTA  
**Pasos**:
1. Intentar eliminar appointment en status 'confirmed'

**Resultado esperado**:
- Botón de eliminar oculto o deshabilitado para confirmed/pending
- Solo new y cancelled pueden eliminarse

---

#### AG-029 · Eliminar — appointment desaparece de vista
**Severidad**: ALTA  
**Resultado esperado**:
- Appointment eliminado de DB
- Desaparece de lista sin refetch manual
- Toast: "Turno eliminado correctamente"

---

### Exportar CSV (AG-030 → AG-032)

#### AG-030 · Exportar CSV — descarga correcta
**Severidad**: MEDIA  
**Pasos**:
1. Click "Exportar" en toolbar

**Resultado esperado**:
- CSV descargado con appointments visibles (filtrados)
- Headers: fecha, hora, paciente, servicio, profesional, status, notas
- Encoding UTF-8 correcto (acentos, emojis)

---

#### AG-031 · Exportar CSV — sin appointments
**Severidad**: BAJA  
**Pasos**:
1. Vista sin appointments
2. Click exportar

**Resultado esperado**:
- CSV con solo headers
- Sin error

---

#### AG-032 · Exportar CSV — respeta filtros activos
**Severidad**: MEDIA  
**Resultado esperado**:
- Solo appointments visibles (post-filtro) incluidos en CSV

---

### Agenda realtime (AG-033 → AG-034)

#### AG-033 · Nuevo appointment en otra sesión aparece en tiempo real
**Severidad**: MEDIA  
**Resultado esperado**:
- Realtime INSERT detectado → refetch agenda

---

#### AG-034 · Servicio extraído de notes en tooltip
**Severidad**: MEDIA  
**Pasos**:
1. Appointment con notes: "[IA] Servicio: Kinesiología — sesión de rehabilitación"

**Resultado esperado**:
- Tooltip muestra "Kinesiología"
- Si notes sin Servicio: → usa appointment_type
- Si appointment_type null → "Consulta" (fallback)

---

## PACIENTES (PAC-001 → PAC-024)

### Archivos: `src/pages/Pacientes/index.jsx`, `src/components/AddPatientModal.jsx`

### Listado y búsqueda (PAC-001 → PAC-006)

#### PAC-001 · Carga lista de pacientes
**Severidad**: ALTA  
**Resultado esperado**:
- Tabla con columnas: Nombre, Teléfono, Última visita, Próximo turno, Cantidad visitas, Estado, No-show
- Skeleton mientras carga
- Sin pacientes: estado vacío amigable

---

#### PAC-002 · Búsqueda por nombre
**Severidad**: ALTA  
**Pasos**:
1. Escribir nombre en buscador
2. Lista filtra en tiempo real

**Resultado esperado**:
- Búsqueda case-insensitive, sin acentos
- Subrayado del match en nombre

---

#### PAC-003 · Búsqueda por teléfono
**Severidad**: ALTA  
**Pasos**:
1. Escribir número (parcial o completo)

**Resultado esperado**:
- Paciente con ese número visible

---

#### PAC-004 · Filtro por status
**Severidad**: ALTA  
**Status opciones**: Todos / Nuevos / Activos / Inactivos / No-show

**Resultado esperado**:
- Filtro aplicado correctamente
- Contador de resultados actualizado

---

#### PAC-005 · Sin resultados de búsqueda
**Severidad**: BAJA  
**Resultado esperado**:
- "No se encontraron pacientes" (no crash)

---

#### PAC-006 · Ordenamiento de columnas
**Severidad**: BAJA  
**Pasos**:
1. Click en header "Nombre" → ordena A-Z
2. Click again → Z-A

**Resultado esperado**:
- Orden correcto
- Indicador visual de columna activa

---

### Status derivado (PAC-007 → PAC-012)

#### PAC-007 · Status: 'new' (sin visitas)
**Severidad**: ALTA  
**Condición**: Paciente sin appointments completados

**Resultado esperado**:
- Badge "Nuevo" (accent)

---

#### PAC-008 · Status: 'active' (visita reciente)
**Severidad**: ALTA  
**Condición**: Última visita < 90 días

**Resultado esperado**:
- Badge "Activo" (success)

---

#### PAC-009 · Status: 'inactive' (> 90 días sin visita)
**Severidad**: ALTA  
**Condición**: Última visita hace 91+ días

**Resultado esperado**:
- Badge "Inactivo" (warn)

---

#### PAC-010 · Status: 'no_show' detectado
**Severidad**: ALTA  
**Condición**: Appointment pasó (> 2h) con status 'pending' sin confirmar

**Resultado esperado**:
- Indicador de no-show en fila del paciente
- Filtro "No-show" muestra este paciente

---

#### PAC-011 · Cutoff 2 horas para no-show
**Severidad**: ALTA  
**Pasos**:
1. Appointment hace 1h55min en status 'pending' → NO es no-show aún
2. Appointment hace 2h05min en status 'pending' → SÍ es no-show

**Resultado esperado**:
- Límite exacto de 2h (120 minutos)

---

#### PAC-012 · Próximo turno — fecha correcta
**Severidad**: MEDIA  
**Resultado esperado**:
- Próximo appointment futuro (no cancelado) mostrado
- Formato de fecha legible
- Si no hay próximo: "-"

---

### CRUD de pacientes (PAC-013 → PAC-020)

#### PAC-013 · Agregar paciente — happy path
**Severidad**: CRÍTICA  
**Pasos**:
1. Click "Nuevo paciente"
2. Ingresar: nombre completo, teléfono (+598...)
3. Guardar

**Resultado esperado**:
- Paciente creado en DB
- Aparece en lista
- Toast de confirmación

---

#### PAC-014 · Agregar paciente — campos requeridos
**Severidad**: ALTA  
**Campos**: nombre_completo (requerido), phone_number (requerido)

**Resultado esperado**:
- Sin nombre o sin phone → botón deshabilitado

---

#### PAC-015 · Teléfono — formato internacional
**Severidad**: ALTA  
**Casos**:
- "+59899123456" → válido
- "099123456" → puede aceptarse (sin prefijo)
- "abc123" → inválido

**Resultado esperado**:
- Validación de formato
- Normalización antes de guardar (con + prefijo)

---

#### PAC-016 · Teléfono duplicado
**Severidad**: ALTA  
**Pasos**:
1. Intentar crear paciente con mismo teléfono que otro existente

**Resultado esperado**:
- DB unique constraint en phone por clinic
- Error: "Ya existe un paciente con ese número"

---

#### PAC-017 · Editar paciente — nombre y teléfono
**Severidad**: ALTA  
**Pasos**:
1. Click editar en fila
2. Modificar nombre
3. Guardar

**Resultado esperado**:
- `patients` actualizado
- Lista refleja cambio

---

#### PAC-018 · Editar paciente — cambio de phone
**Severidad**: ALTA  
**Pasos**:
1. Cambiar número de teléfono
2. Verificar que conversations existentes se mantienen

**Resultado esperado**:
- Nuevo phone en `patients.phone_number`
- Conversations históricas intactas (FK por patient_id, no phone)

---

#### PAC-019 · Eliminar paciente — con appointments
**Severidad**: ALTA  
**Pasos**:
1. Intentar eliminar paciente con appointments activos

**Resultado esperado**:
- Advertencia: "Este paciente tiene turnos activos"
- Confirmación requerida
- On confirm: eliminar paciente + appointments en cascada (o soft delete)

---

#### PAC-020 · Eliminar paciente — sin appointments
**Severidad**: MEDIA  
**Resultado esperado**:
- Confirmación simple
- Paciente eliminado
- Toast confirmación

---

### Información de paciente (PAC-021 → PAC-024)

#### PAC-021 · Ver detalle de paciente
**Severidad**: MEDIA  
**Pasos**:
1. Click en nombre de paciente

**Resultado esperado**:
- Panel lateral o modal con historial
- Todos los appointments del paciente
- Estadísticas: total visitas, rate de no-show

---

#### PAC-022 · Link directo a inbox del paciente
**Severidad**: BAJA  
**Resultado esperado**:
- Botón "Ver conversación" o WhatsApp icon
- Link a inbox filtrado por este paciente

---

#### PAC-023 · Contador de visitas correcto
**Severidad**: MEDIA  
**Condición**: Count de appointments con status != cancelled/rescheduled

**Resultado esperado**:
- "5 visitas" muestra 5 appointments completados/confirmados

---

#### PAC-024 · Fecha de última visita correcta
**Severidad**: MEDIA  
**Condición**: Appointment más reciente en pasado (no futuro)

**Resultado esperado**:
- Solo appointments pasados (fecha < hoy) cuentan como "última visita"

---

## INBOX (INB-001 → INB-038)

### Archivos: `src/pages/Inbox/index.jsx`

### Listado de conversaciones (INB-001 → INB-008)

#### INB-001 · Carga lista de conversaciones
**Severidad**: ALTA  
**Resultado esperado**:
- Conversaciones ordenadas por último mensaje (más reciente primero)
- Cada item: avatar + nombre + preview + timestamp + badges (AI mode, lead score)
- Skeleton mientras carga

---

#### INB-002 · Ventana 24h — indicador visual
**Severidad**: ALTA  
**Condición**: Último mensaje inbound < 24h

**Resultado esperado**:
- Badge verde "Ventana abierta"
- Input habilitado

**Condición**: Último mensaje inbound >= 24h

**Resultado esperado**:
- Badge gris "Ventana cerrada"
- Input deshabilitado
- Mensaje: "La ventana de 24 hs expiró. Solo podés enviar plantillas."

---

#### INB-003 · Búsqueda en inbox — nombre, phone, contenido
**Severidad**: ALTA  
**Pasos**:
1. Escribir nombre parcial / número parcial / texto de mensaje

**Resultado esperado**:
- Filtrado en tiempo real (client-side)
- Case-insensitive, sin acentos (NFD normalization)

---

#### INB-004 · Lead score badge
**Severidad**: BAJA  
**Condición**: `agent_context.lead_score`

**Resultado esperado**:
- HOT → punto rojo junto al nombre
- WARM → punto naranja
- COLD → sin indicador visual (o punto gris)

---

#### INB-005 · Agent mode badge
**Severidad**: MEDIA  
**Badges esperados**:
- `agent_mode: 'bot'` → "IA activa" (verde)
- `agent_mode: 'human'` + staff activo < 2min → "Humano" (azul)
- `agent_mode: 'human'` + inactivo → "IA pausada" (amarillo)

---

#### INB-006 · Conversación sin mensajes (nueva)
**Severidad**: BAJA  
**Resultado esperado**:
- Preview: sin texto o "Conversación iniciada"
- Timestamp: fecha de creación

---

#### INB-007 · Ordering: último mensaje primero
**Severidad**: MEDIA  
**Pasos**:
1. Recibir mensaje en conversación antigua

**Resultado esperado**:
- Sube al top de la lista
- Realtime update sin refetch manual

---

#### INB-008 · Número de conversaciones sin mensajes no leídos
**Severidad**: BAJA  
**Resultado esperado**:
- Si hay sistema de "no leídos": badge con count

---

### Panel de mensajes (INB-009 → INB-018)

#### INB-009 · Carga de mensajes al seleccionar conversación
**Severidad**: ALTA  
**Resultado esperado**:
- Mensajes en orden cronológico
- Scroll automático al último mensaje
- Skeleton mientras carga primeros mensajes

---

#### INB-010 · Renderizado de mensajes por tipo
**Severidad**: ALTA  
**Tipos**:
- `direction: 'inbound'` → izquierda, fondo gris
- `direction: 'outbound'` (staff) → derecha, fondo azul
- `direction: 'outbound_ai'` → derecha, fondo azul claro, badge "IA"
- `direction: 'system_template'` → derecha, label "plantilla"
- `sender_type: null` + system notice → centrado, muted

---

#### INB-011 · Mensaje de audio — transcripción visible
**Severidad**: MEDIA  
**Resultado esperado**:
- Icono micrófono + texto transcripto
- Label "Nota de voz"
- Si transcripción falló: texto fallback visible

---

#### INB-012 · Timestamp y status de mensaje
**Severidad**: BAJA  
**Resultado esperado**:
- Formato: "HH:MM" para hoy, "dd mmm" para anteriores
- Si `status: 'failed'`: "HH:MM · fallido" en rojo
- Si `sender_type: 'bot'`: "HH:MM · IA"

---

#### INB-013 · Realtime: nuevos mensajes aparecen sin reload
**Severidad**: ALTA  
**Pasos**:
1. Conversación abierta
2. Llega nuevo mensaje inbound (Supabase Realtime)

**Resultado esperado**:
- Mensaje aparece inmediatamente
- Scroll auto al fondo
- Sin duplicados

---

#### INB-014 · Scroll al cambiar de conversación
**Severidad**: BAJA  
**Resultado esperado**:
- Al seleccionar otra conversación, scroll resetea al fondo (mensajes recientes)

---

#### INB-015 · Mensajes históricos — paginación o carga completa
**Severidad**: BAJA  
**Pasos**:
1. Conversación con 200+ mensajes

**Resultado esperado**:
- Carga paginada (no crash por volumen)
- "Cargar más mensajes" disponible si hay histórico

---

#### INB-016 · Mensaje de sistema notice — sin burbuja
**Severidad**: MEDIA  
**Condición**: `sender_type: 'system'` y contenido: "🤖 Bot escaló al staff"

**Resultado esperado**:
- No se muestra como burbuja de chat
- Texto centrado, muted, cursiva o diferenciado

---

#### INB-017 · Estado vacío de conversación
**Severidad**: BAJA  
**Condición**: Conversación sin mensajes

**Resultado esperado**:
- "Aún no hay mensajes en esta conversación" o similar

---

#### INB-018 · Selección de conversación en mobile
**Severidad**: MEDIA  
**Resultado esperado**:
- Lista ocultada al seleccionar
- Botón "Volver" visible
- Responsive funciona correctamente

---

### Envío de mensajes (INB-019 → INB-026)

#### INB-019 · Envío de mensaje — happy path (ventana abierta)
**Severidad**: CRÍTICA  
**Pasos**:
1. Conversación con ventana < 24h
2. Escribir mensaje y enviar (Enter o botón)

**Resultado esperado**:
- POST a `send-whatsapp-message`
- Input limpiado
- Mensaje aparece como outbound (staff)
- `agent_mode = 'human'`
- `agent_last_human_reply_at = NOW`

---

#### INB-020 · Envío — ventana cerrada (> 24h)
**Severidad**: ALTA  
**Resultado esperado**:
- Input deshabilitado
- Mensaje de aviso "La ventana de 24 hs expiró"
- NO se puede enviar texto libre

---

#### INB-021 · Envío — falla de red
**Severidad**: ALTA  
**Pasos**:
1. Simular offline al enviar

**Resultado esperado**:
- Toast de error
- Texto del input NO se borra (usuario puede reintentar)
- Estado consistente (mensaje no aparece como enviado)

---

#### INB-022 · Enter envía, Shift+Enter hace salto de línea
**Severidad**: BAJA  
**Resultado esperado**:
- Enter solo → envía
- Shift+Enter → nueva línea en textarea

---

#### INB-023 · Input vacío no se puede enviar
**Severidad**: BAJA  
**Resultado esperado**:
- Botón enviar deshabilitado si input vacío o solo espacios

---

#### INB-024 · Mensaje largo
**Severidad**: MEDIA  
**Pasos**:
1. Escribir mensaje de 5000 caracteres

**Resultado esperado**:
- API WhatsApp tiene límite (4096 chars para mensajes libres)
- Error manejado si excede
- Preferiblemente: límite en frontend con contador

---

#### INB-025 · Envío silencia AI (agent_mode: 'human')
**Severidad**: ALTA  
**Pasos**:
1. Staff envía mensaje
2. Paciente responde inmediatamente

**Resultado esperado**:
- `agent_mode = 'human'`
- AI no responde en los próximos 2 minutos
- Después de 2 min sin staff → AI puede retomar

---

#### INB-026 · Respuesta preservada en campo si envío falla
**Severidad**: MEDIA  
**Pasos**:
1. Escribir mensaje largo
2. Simular error de envío

**Resultado esperado**:
- Input conserva el texto
- Usuario puede reintentar sin reescribir

---

### Toggle AI y conversación (INB-027 → INB-034)

#### INB-027 · Toggle AI — enable (optimistic)
**Severidad**: ALTA  
**Pasos**:
1. `ai_enabled = false`, `agent_mode = 'human'`
2. Click toggle AI

**Resultado esperado**:
- UI actualiza optimistamente (toggle visual cambia)
- DB: `patients.ai_enabled = true`, `conversations.agent_mode = 'bot'`
- En siguientes mensajes AI responde

---

#### INB-028 · Toggle AI — disable (optimistic)
**Severidad**: ALTA  
**Resultado esperado**:
- `ai_enabled = false`, `agent_mode = 'human'`
- AI silenciada

---

#### INB-029 · Toggle AI — falla DB, revert
**Severidad**: ALTA  
**Pasos**:
1. Toggle → DB falla

**Resultado esperado**:
- UI revierte al estado anterior
- Toast de error

---

#### INB-030 · Nueva conversación — modal de inicio
**Severidad**: ALTA  
**Pasos**:
1. Click "Nueva conversación"
2. Buscar paciente
3. Seleccionar
4. Confirmar

**Resultado esperado**:
- POST a `initiate-conversation` con `patient_id`
- Conversación creada
- Si tiene appointment próximo: template de recordatorio enviado
- Toast: "Conversación iniciada"

---

#### INB-031 · Nueva conversación — paciente sin teléfono
**Severidad**: ALTA  
**Pasos**:
1. Seleccionar paciente sin `phone_number`

**Resultado esperado**:
- Error específico: "Este paciente no tiene número de teléfono registrado"
- NO se crea conversación

---

#### INB-032 · Eliminar conversación — confirmación
**Severidad**: ALTA  
**Pasos**:
1. Click eliminar conversación

**Resultado esperado**:
- Dialog: "Se borrarán todos los mensajes. ¿Continuar?"
- On confirm: conversación eliminada
- Redirige a lista

---

#### INB-033 · Panel derecho — contexto AI
**Severidad**: MEDIA  
**Resultado esperado**:
- Intent detectado con emoji icono
- Resumen de última interacción
- Lead score (hot/warm/cold)
- Toggle AI disponible

---

#### INB-034 · Reactivation banner
**Severidad**: MEDIA  
**Condición**: Conversaciones con `ai_enabled: false` + último mensaje > 12h

**Resultado esperado**:
- Banner: "{N} conversación(es) sin asistente IA desde hace más de 12h. ¿Reactivar?"
- "Reactivar todas" → batch update `ai_enabled: true`
- "Ignorar" → dismiss banner (sin cambiar DB)

---

### Edge cases Inbox (INB-035 → INB-038)

#### INB-035 · Conversación eliminada mientras está abierta
**Severidad**: MEDIA  
**Pasos**:
1. Staff A tiene conversación abierta
2. Staff B la elimina

**Resultado esperado**:
- Staff A: conversación desaparece (Realtime DELETE)
- Redirige a lista o muestra mensaje de error

---

#### INB-036 · Múltiples tabs con misma conversación
**Severidad**: BAJA  
**Resultado esperado**:
- Ambas tabs reciben mensajes en tiempo real
- Sin duplicados

---

#### INB-037 · Realtime cleanup al cambiar de conversación
**Severidad**: MEDIA  
**Pasos**:
1. Seleccionar conversación A → suscripción Realtime creada
2. Seleccionar conversación B

**Resultado esperado**:
- Suscripción de A cancelada antes de crear B
- Sin memory leaks de canales Supabase

---

#### INB-038 · Conversación con paciente no registrado (guest)
**Severidad**: MEDIA  
**Condición**: `patient_id = null` en conversation

**Resultado esperado**:
- Nombre mostrado: número de teléfono
- Funcionalidad básica de chat disponible
- Sin crash por patient null

---

## CONFIGURACIÓN (CFG-001 → CFG-026)

### Archivos: `src/pages/Configuracion/index.jsx`, `ScheduleSection.jsx`, `ServicesSection.jsx`

### General (CFG-001 → CFG-008)

#### CFG-001 · Carga de configuración
**Severidad**: ALTA  
**Resultado esperado**:
- Nombre clínica, teléfono, dirección, timezone cargados
- Campos pre-rellenados con valores actuales

---

#### CFG-002 · Editar nombre de clínica
**Severidad**: ALTA  
**Pasos**:
1. Modificar nombre
2. Guardar

**Resultado esperado**:
- `clinics.name` actualizado
- Sidebar actualiza nombre (si usa AuthContext)
- Toast de confirmación

---

#### CFG-003 · Editar timezone
**Severidad**: ALTA  
**Pasos**:
1. Cambiar timezone a "America/Buenos_Aires"
2. Guardar

**Resultado esperado**:
- `clinics.timezone` actualizado
- Agenda y recordatorios usan nueva timezone

---

#### CFG-004 · Validación campos obligatorios
**Severidad**: ALTA  
**Resultado esperado**:
- Nombre clínica vacío → botón guardar deshabilitado o error

---

#### CFG-005 · Stats de WhatsApp — success_rate correcto
**Severidad**: ALTA  
**Condición**: `v_automation_stats.success_rate = 139`

**Resultado esperado**:
- UI muestra `Math.min(100, Math.round(139))` = "100%"
- NO "1390%"

---

#### CFG-006 · Stats de WhatsApp — sin datos
**Severidad**: BAJA  
**Condición**: `total_sent = 0`

**Resultado esperado**:
- "Sin mensajes enviados" o similar
- Sin NaN o Infinity

---

#### CFG-007 · Invitar miembro — happy path
**Severidad**: ALTA  
**Pasos**:
1. Ingresar email
2. Seleccionar rol (staff/viewer)
3. Click "Invitar"

**Resultado esperado**:
- RPC `create_member_invite` llamado
- Edge function `send-invite-email` invocada
- Toast: "Invitación enviada a {email}"
- Fila en tabla de miembros con status "pendiente"

---

#### CFG-008 · Invitar miembro — email ya miembro
**Severidad**: MEDIA  
**Resultado esperado**:
- Error específico: "Este usuario ya es miembro de la clínica"

---

### Horarios (CFG-009 → CFG-015)

#### CFG-009 · Visualización horarios por día
**Severidad**: ALTA  
**Resultado esperado**:
- 7 días (Lun-Dom) listados
- Cada día: toggle activo/inactivo + campos hora inicio/fin
- Días sin horario: toggle desactivado

---

#### CFG-010 · Habilitar día
**Severidad**: ALTA  
**Pasos**:
1. Toggle "Sábado" de inactivo a activo
2. Ingresar 9:00 - 13:00
3. Guardar

**Resultado esperado**:
- `clinic_schedule` upserted para Sábado
- AI usa nuevo horario para scheduling
- Validación: hora inicio < hora fin

---

#### CFG-011 · Deshabilitar día
**Severidad**: ALTA  
**Pasos**:
1. Toggle "Sábado" de activo a inactivo

**Resultado esperado**:
- Registro eliminado de `clinic_schedule` para Sábado
- AI rechaza agendamientos ese día

---

#### CFG-012 · Horario inválido (inicio > fin)
**Severidad**: MEDIA  
**Pasos**:
1. Hora inicio: 18:00, hora fin: 09:00

**Resultado esperado**:
- Error de validación
- Guardar deshabilitado

---

#### CFG-013 · Horario se refleja en AI (schedule_appointment)
**Severidad**: ALTA  
**Pasos**:
1. Clínica cerrada jueves
2. Paciente intenta agendar jueves

**Resultado esperado**:
- Tool `schedule_appointment` rechaza: "La clínica no atiende ese día"

---

#### CFG-014 · Defaults de horario sin schedule configurado
**Severidad**: MEDIA  
**Condición**: `clinic_schedule` vacío

**Resultado esperado**:
- AI usa horarios default hardcodeados (Lun-Vie 9-18h)

---

#### CFG-015 · Guardar múltiples días a la vez
**Severidad**: MEDIA  
**Pasos**:
1. Modificar 3 días diferentes
2. Click "Guardar horarios"

**Resultado esperado**:
- Todos los cambios guardados en un solo batch
- Toast confirmación

---

### Servicios (CFG-016 → CFG-021)

#### CFG-016 · Listar servicios
**Severidad**: ALTA  
**Resultado esperado**:
- Lista de servicios del clinic (nombre + duración)
- Sin servicios: estado vacío

---

#### CFG-017 · Agregar servicio
**Severidad**: ALTA  
**Pasos**:
1. Nombre: "Consulta general"
2. Duración: 30 min
3. Guardar

**Resultado esperado**:
- Insertado en `clinic_services`
- Aparece en lista
- AI puede ofrecer este servicio al agendar

---

#### CFG-018 · Editar servicio existente
**Severidad**: MEDIA  
**Resultado esperado**:
- `clinic_services` actualizado
- Lista actualizada

---

#### CFG-019 · Eliminar servicio
**Severidad**: MEDIA  
**Pasos**:
1. Click eliminar en servicio

**Resultado esperado**:
- Confirmación requerida
- Eliminado de `clinic_services`
- Appointments existentes con ese servicio no afectados (FK nullable)

---

#### CFG-020 · Validación nombre de servicio vacío
**Severidad**: BAJA  
**Resultado esperado**:
- Nombre vacío → guardar deshabilitado

---

#### CFG-021 · Duración en minutos — validación
**Severidad**: BAJA  
**Casos**:
- 0 → inválido
- 5 → válido
- 480 → válido (8 horas)
- -10 → inválido
- "abc" → inválido

---

#### CFG-021b · Descuento porcentual en servicio
**Severidad**: MEDIA  
**Pasos**:
1. Crear servicio con precio $1000 + descuento 10%
2. Guardar

**Resultado esperado**:
- `discount_type = 'percent'`, `discount_value = 10`
- Precio final calculado: $900
- Mostrado correctamente en UI

---

#### CFG-021c · Descuento fijo en servicio
**Severidad**: MEDIA  
**Pasos**:
1. Crear servicio con precio $1000 + descuento fijo $200
2. Guardar

**Resultado esperado**:
- `discount_type = 'fixed'`, `discount_value = 200`
- Precio final: $800

---

#### CFG-021d · Toggle activo/inactivo de servicio
**Severidad**: MEDIA  
**Pasos**:
1. Toggle servicio activo → inactivo
2. Verificar en DB: `is_active = false`
3. Toggle de vuelta

**Resultado esperado**:
- Estado persiste en `clinic_services.is_active`
- UI actualizada sin reload

---

### Miembros y roles (CFG-022 → CFG-026)

#### CFG-022 · Ver miembros del equipo
**Severidad**: ALTA  
**Resultado esperado**:
- Lista de miembros: nombre, email, rol, status (activo/pendiente)
- Owner siempre visible

---

#### CFG-023 · Cambiar rol de miembro (owner only)
**Severidad**: ALTA  
**Pasos**:
1. Cambiar staff → viewer o viceversa

**Resultado esperado**:
- Solo owner puede cambiar roles
- `clinic_members.role` actualizado
- Permisos actualizados inmediatamente

---

#### CFG-024 · Eliminar miembro (owner only)
**Severidad**: ALTA  
**Resultado esperado**:
- Confirmación requerida
- `clinic_members` eliminado o `status = 'removed'`
- Usuario pierde acceso

---

#### CFG-025 · Owner no puede eliminarse a sí mismo
**Severidad**: CRÍTICA  
**Resultado esperado**:
- Botón eliminar deshabilitado para el propio owner
- Error si se intenta via API

---

#### CFG-026 · Miembro con rol viewer — no puede editar configuración
**Severidad**: ALTA  
**Resultado esperado**:
- Campos de configuración en modo solo lectura
- RLS rechaza mutaciones en DB

---

## LISTA DE ESPERA (LSE-001 → LSE-018)

### Archivos: `src/pages/ListaEspera/index.jsx`

#### LSE-001 · Carga lista de espera
**Severidad**: ALTA  
**Resultado esperado**:
- Tabla: paciente, servicio, preferencia de fecha, status, fecha registro
- Skeleton mientras carga
- Vacío: estado amigable

---

#### LSE-002 · Filtro por status
**Severidad**: ALTA  
**Status**: Todos / Esperando / Notificado / Reservado / Cancelado / Expirado

**Resultado esperado**:
- Filtro aplicado
- Contador por status visible

---

#### LSE-003 · Marcar como notificado
**Severidad**: ALTA  
**Pasos**:
1. Registro en status 'waiting'
2. Click "Marcar como notificado"

**Resultado esperado**:
- `waiting_list.status = 'notified'`
- `waiting_list.notified_at = NOW`
- Fila actualizada en UI

---

#### LSE-004 · Marcar como reservado
**Severidad**: ALTA  
**Pasos**:
1. Paciente notificado y confirmó turno

**Resultado esperado**:
- `status = 'booked'`
- Appointment creado (manualmente por staff o via AI)

---

#### LSE-005 · Marcar como cancelado / expirado
**Severidad**: MEDIA  
**Resultado esperado**:
- Status actualizado
- Registro permanece (histórico)

---

#### LSE-006 · Notificación automática al cancelar appointment
**Severidad**: ALTA  
**Pasos**:
1. Appointment en slot X cancelado
2. Hay registros en waiting_list para ese horario

**Resultado esperado**:
- `notify-waitlist` function ejecutada
- Pacientes en espera notificados automáticamente

---

#### LSE-007 · Sin candidatos en waiting_list
**Severidad**: BAJA  
**Pasos**:
1. Appointment cancelado
2. Sin pacientes en waiting_list para ese horario

**Resultado esperado**:
- `notify-waitlist` ejecuta silenciosamente
- Sin error, sin notificaciones

---

#### LSE-008 · Agregar a lista de espera manualmente (staff)
**Severidad**: ALTA  
**Pasos**:
1. Click "Agregar a lista"
2. Seleccionar paciente, servicio, rango de fechas
3. Guardar

**Resultado esperado**:
- `waiting_list` insertado
- Status inicial: 'waiting'

---

#### LSE-009 · Bot agrega a lista de espera
**Severidad**: ALTA  
**Pasos**:
1. Paciente escribe "quiero estar en lista de espera"
2. AI llama `add_to_waitlist`

**Resultado esperado**:
- Registro en `waiting_list`
- Aparece en tabla de staff
- Paciente notificado de registro

---

#### LSE-010 · Expiración automática
**Severidad**: MEDIA  
**Condición**: `preferred_date_to` pasó sin notificación

**Resultado esperado**:
- Cron o trigger cambia status a 'expired'
- No se notifica

---

#### LSE-011 · Ordenamiento por fecha de registro
**Severidad**: BAJA  
**Resultado esperado**:
- Más recientes primero (o más antiguos primero)
- Ordenamiento por `created_at`

---

#### LSE-012 → LSE-018: Edge cases lista de espera

- **LSE-012**: Paciente en lista con phone deleted → skip notificación
- **LSE-013**: Mismo paciente en lista 2 veces → permitir (distintas fechas/servicios) o error
- **LSE-014**: Notificar waitlist: múltiples candidatos → todos notificados (no solo el primero)
- **LSE-015**: Waitlist sin service ni fechas → válido (campos opcionales)
- **LSE-016**: Eliminar registro de waitlist (soft delete)
- **LSE-017**: Filtro combinado status + búsqueda por nombre
- **LSE-018**: Export CSV de lista de espera

---

## DASHBOARD (DASH-001 → DASH-016)

### Archivos: `src/pages/Dashboard/index.jsx`, `AgendaBlock.jsx`, `AutomationsBlock.jsx`, `InboxBlock.jsx`, etc.

#### DASH-001 · KPIs del día — valores correctos
**Severidad**: ALTA  
**Vista `v_clinic_kpis_today`**:
- Confirmados hoy
- Total hoy
- Mensajes enviados (últimas 24h)
- Tasa de confirmación (%)
- Auto-confirmados por AI

**Resultado esperado**:
- Valores numéricos correctos
- % calculado correctamente (no > 100%)

---

#### DASH-002 · Saludo personalizado
**Severidad**: BAJA  
**Resultado esperado**:
- "Buenos días, {first_name}!" según hora
- "Buenos días" (6-12), "Buenas tardes" (12-19), "Buenas noches" (19+)

---

#### DASH-003 · AgendaBlock — turnos de hoy
**Severidad**: ALTA  
**Resultado esperado**:
- Lista de appointments de hoy
- Status correctos
- Click → abre EditApptModal

---

#### DASH-004 · AgendaBlock — exportar CSV
**Severidad**: MEDIA  
**Resultado esperado**:
- Descarga CSV de appointments de hoy

---

#### DASH-005 · InboxBlock — últimas conversaciones
**Severidad**: MEDIA  
**Resultado esperado**:
- 3-5 conversaciones recientes
- Link "Ver todas" → /inbox

---

#### DASH-006 · AutomationsBlock — estado de automatizaciones
**Severidad**: MEDIA  
**Resultado esperado**:
- Status de cada automation (activa/inactiva)
- Última actividad

---

#### DASH-007 · QuickActionsBlock — acciones rápidas
**Severidad**: MEDIA  
**Resultado esperado**:
- "Nuevo turno" → abre modal
- "Nuevo paciente" → abre modal
- "Ir a inbox" → /inbox

---

#### DASH-008 · Error en carga de KPIs
**Severidad**: MEDIA  
**Resultado esperado**:
- DashboardErrorBoundary captura
- Botón "Reintentar" disponible
- Resto del dashboard funcional

---

#### DASH-009 → DASH-016: Edge cases

- **DASH-009**: KPIs = 0 (primer día) → "0" sin NaN
- **DASH-010**: Sin appointments hoy → "Sin turnos hoy"
- **DASH-011**: Sin conversaciones recientes → estado vacío
- **DASH-012**: Realtime: appointment nuevo aparece en AgendaBlock
- **DASH-013**: Onboarding incompleto → redirect a /onboarding
- **DASH-014**: Network error en KPIs → fallback con skeleton
- **DASH-015**: Cambio de clínica (multi-clinic futuro) → datos actualizados
- **DASH-016**: Timezone correcta en saludo y KPIs

---

## REPORTES (REG-001 → REG-012)

### Archivos: `src/pages/Reportes/index.jsx`

#### REG-001 · Carga de datos históricos
**Severidad**: ALTA  
**Resultado esperado**:
- Gráfico de barras apiladas cargado
- Datos desde DB para rango seleccionado

---

#### REG-002 · Selector de rango de fechas
**Severidad**: ALTA  
**Opciones**: 3m / 6m / 1a / 2a

**Resultado esperado**:
- Datos actualizados al cambiar rango
- Eje X con labels correctos

---

#### REG-003 · Granularidad mes/trimestre
**Severidad**: MEDIA  
**Pasos**:
1. Toggle "Mes" / "Trimestre"

**Resultado esperado**:
- Datos agrupados correctamente
- Labels de eje X actualizados

---

#### REG-004 · Tooltip del gráfico
**Severidad**: MEDIA  
**Resultado esperado**:
- Hover muestra breakdown por status
- Valores numéricos correctos
- Porcentajes calculados

---

#### REG-005 · Sin datos para el período
**Severidad**: BAJA  
**Resultado esperado**:
- "No hay datos para este período" o gráfico vacío
- Sin crash

---

#### REG-006 → REG-012: Edge cases

- **REG-006**: Solo appointments cancelled → barra roja completa
- **REG-007**: Datos de hace 2 años → sin timeout en query
- **REG-008**: Leyenda correcta para cada status
- **REG-009**: Responsive chart en mobile
- **REG-010**: Error en carga → mensaje de error
- **REG-011**: Export de datos del gráfico (si disponible)
- **REG-012**: Timezone correcto en agrupación temporal
