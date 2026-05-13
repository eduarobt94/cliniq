/**
 * gen-doc.cjs — Generador del documento Word de Cliniq
 * Run: node gen-doc.cjs
 * Requires: npm install docx (already in devDependencies)
 */
'use strict';
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  PageBreak, Header, Footer, PageNumber,
} = require('docx');
const fs = require('fs');
const path = require('path');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const border  = { style: BorderStyle.SINGLE, size: 1, color: 'D0D5E1' };
const borders = { top: border, bottom: border, left: border, right: border };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 160 },
    children: [new TextRun({ text, bold: true, size: 40, font: 'Calibri', color: '1E2A3A' })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, size: 32, font: 'Calibri', color: '1E2A3A' })],
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: 26, font: 'Calibri', color: '334155' })],
  });
}
function body(text) {
  return new Paragraph({
    spacing: { before: 60, after: 80 },
    children: [new TextRun({ text, size: 24, font: 'Calibri', color: '334155' })],
  });
}
function bodyBold(text) {
  return new Paragraph({
    spacing: { before: 60, after: 80 },
    children: [new TextRun({ text, size: 24, font: 'Calibri', bold: true, color: '1E2A3A' })],
  });
}
function bullet(text) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    indent: { left: 480, hanging: 240 },
    children: [
      new TextRun({ text: '• ', size: 24, font: 'Calibri', color: '5B6E9C' }),
      new TextRun({ text, size: 24, font: 'Calibri', color: '334155' }),
    ],
  });
}
function note(text) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    indent: { left: 480 },
    children: [new TextRun({ text: `💡 ${text}`, size: 22, font: 'Calibri', italics: true, color: '64748B' })],
  });
}
function divider() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' } },
    children: [],
  });
}
function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}
function infoBox(rows) {
  return new Table({
    width: { size: 9200, type: WidthType.DXA },
    columnWidths: [2200, 7000],
    rows: rows.map(([label, value]) => new TableRow({
      children: [
        new TableCell({
          borders, width: { size: 2200, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          shading: { fill: 'EFF6FF', type: ShadingType.CLEAR },
          children: [new Paragraph({ children: [new TextRun({ text: label, size: 22, font: 'Calibri', bold: true, color: '3B5998' })] })],
        }),
        new TableCell({
          borders, width: { size: 7000, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: value, size: 22, font: 'Calibri', color: '334155' })] })],
        }),
      ],
    })),
  });
}

// ─── Document content ─────────────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Calibri', size: 24 } } },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 40, bold: true, font: 'Calibri', color: '1E2A3A' },
        paragraph: { spacing: { before: 400, after: 160 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Calibri', color: '1E2A3A' },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 },
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Calibri', color: '334155' },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 },
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1260, bottom: 1440, left: 1260 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0', space: 8 } },
          children: [new TextRun({ text: 'Cliniq — Documentación de Funcionalidades', size: 20, font: 'Calibri', color: '94A3B8' })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0', space: 8 } },
          children: [
            new TextRun({ text: 'Pág. ', size: 20, font: 'Calibri', color: '94A3B8' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 20, font: 'Calibri', color: '94A3B8' }),
          ],
        })],
      }),
    },
    children: [

      // ══════════════════════════════════════════════════════════
      // PORTADA
      // ══════════════════════════════════════════════════════════
      new Paragraph({
        spacing: { before: 1200, after: 200 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'CLINIQ', size: 72, bold: true, font: 'Calibri', color: '1E2A3A' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 600 },
        children: [new TextRun({ text: 'Documentación de Funcionalidades', size: 40, font: 'Calibri', color: '5B6E9C' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [new TextRun({ text: 'Sistema de Gestión de Clínicas', size: 28, font: 'Calibri', color: '64748B', italics: true })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 600, after: 0 },
        children: [new TextRun({ text: `Versión 2.2 — ${new Date().toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })}`, size: 22, font: 'Calibri', color: '94A3B8' })],
      }),

      pageBreak(),

      // ══════════════════════════════════════════════════════════
      // SECCIÓN 0 — SISTEMA
      // ══════════════════════════════════════════════════════════
      h1('1. Descripción General del Sistema'),
      body('Cliniq es una plataforma SaaS de gestión de clínicas médicas que automatiza la administración de turnos, la comunicación con pacientes vía WhatsApp y el seguimiento del negocio mediante reportes en tiempo real.'),

      h2('Stack Tecnológico'),
      infoBox([
        ['Frontend',    'React 18 + Vite · Tailwind CSS · React Router v6'],
        ['Backend',     'Supabase (PostgreSQL + Auth + Storage + Realtime)'],
        ['Edge Functions', 'Deno / TypeScript (corre en Supabase Edge Runtime)'],
        ['IA',          'Anthropic Claude (claude-3-haiku-20240307) — recepcionista virtual'],
        ['WhatsApp',    'Meta Graph API v19 — WhatsApp Business'],
        ['Scheduler',   'pg_cron (PostgreSQL extension) + net.http_post'],
        ['Hosting',     'Supabase Cloud · Vite dev server (local)'],
      ]),

      divider(),

      // ══════════════════════════════════════════════════════════
      // FEAT 1 — AGENDA
      // ══════════════════════════════════════════════════════════
      pageBreak(),
      h1('2. Funcionalidades Implementadas'),
      h2('2.1 Agenda de Turnos'),

      body('Vista central de la clínica para gestionar todos los turnos del día, semana o mes. Permite crear, editar y cambiar el estado de los turnos en tiempo real.'),
      h3('Componentes principales'),
      bullet('Vista Día / Semana con navegación por flechas'),
      bullet('Modal "Nuevo turno": selección de paciente, fecha, hora, servicio y notas'),
      bullet('Selector de estado inline: Nuevo → Pendiente → Confirmado → Completado / Cancelado'),
      bullet('Indicadores de color por estado del turno'),
      bullet('Sincronización en tiempo real vía Supabase Realtime'),

      h3('Flujo típico'),
      bullet('Recepcionista crea turno desde el botón "+ Nuevo turno"'),
      bullet('Paciente recibe recordatorio automático 24h antes (si la automatización está activa)'),
      bullet('Paciente confirma por WhatsApp → turno cambia a "Confirmado" automáticamente'),
      bullet('El día del turno, la recepcionista lo marca como "Completado"'),

      divider(),

      // ══════════════════════════════════════════════════════════
      // FEAT 2 — PACIENTES
      // ══════════════════════════════════════════════════════════
      h2('2.2 Gestión de Pacientes'),
      body('Listado completo de pacientes con búsqueda, filtros y acciones rápidas. Cada fila muestra el historial resumido del paciente.'),

      h3('Datos por paciente'),
      bullet('Nombre completo + avatar con iniciales'),
      bullet('Teléfono en formato internacional (+598...)'),
      bullet('Última visita y próximo turno'),
      bullet('Cantidad total de turnos'),
      bullet('Estado: Activo / Inactivo (>90 días sin visita) / Nuevo'),
      bullet('Indicador de no-show (⚠ !N) — nuevo en v2.2'),

      note('El estado "Inactivo" se calcula automáticamente cuando el paciente no tiene turnos futuros y su última visita fue hace más de 90 días.'),

      divider(),

      // ══════════════════════════════════════════════════════════
      // FEAT 3 — INBOX WHATSAPP
      // ══════════════════════════════════════════════════════════
      h2('2.3 Inbox WhatsApp'),
      body('Panel de conversaciones entrantes de WhatsApp Business. Permite a la clínica leer y responder los mensajes de los pacientes. El agente IA atiende automáticamente en modo "bot"; el staff puede tomar el control en modo "human".'),

      h3('Modos de agente'),
      bullet('Bot: el agente IA responde automáticamente. Agenda turnos, confirma y cancela.'),
      bullet('Human takeover: el staff escribe manualmente. El bot se silencia.'),
      bullet('Reactivación automática: el bot retoma si el staff no escribe en 2 minutos.'),

      h3('Agente IA — Capacidades'),
      bullet('Registrar pacientes nuevos (nombre + teléfono)'),
      bullet('Agendar turnos (servicio + fecha + hora en lenguaje natural)'),
      bullet('Confirmar, cancelar o reagendar turnos'),
      bullet('Responder consultas sobre horarios, dirección y servicios'),
      bullet('Inscribir pacientes en la lista de espera automática'),
      bullet('Atención siempre de usted, con tono cálido y profesional'),

      divider(),

      // ══════════════════════════════════════════════════════════
      // FEAT 4 — AUTOMATIZACIONES
      // ══════════════════════════════════════════════════════════
      h2('2.4 Automatizaciones'),
      body('Motor de mensajes automáticos vía WhatsApp. Permite configurar hasta 3 tipos de automatización con mensajes personalizables.'),

      h3('Tipos disponibles'),
      bullet('Recordatorio de turno: envía X horas antes. Botones de acción: Confirmar / Cancelar / Reagendar.'),
      bullet('Reactivación de pacientes: contacta pacientes inactivos después de N meses.'),
      bullet('Pedido de reseña: envía tras la visita con link directo a Google Reviews.'),

      h3('Placeholders disponibles'),
      bullet('{patient_name} — Nombre del paciente'),
      bullet('{clinic_name} — Nombre de la clínica'),
      bullet('{date} — Fecha del turno'),
      bullet('{time} — Hora del turno'),
      bullet('{review_url} — URL de reseña en Google (solo para tipo "Pedido de reseña")'),

      h3('Ejecución'),
      bullet('Cada automatización corre vía pg_cron cada 5 minutos'),
      bullet('Deduplicación: cada turno/paciente solo recibe el mensaje una vez (columnas _sent_at)'),

      divider(),

      // ══════════════════════════════════════════════════════════
      // FEAT 5 — REPORTES + NO-SHOW
      // ══════════════════════════════════════════════════════════
      h2('2.5 Reportes'),
      body('Panel de analítica con gráficos y KPIs del negocio. Permite filtrar por período (3M / 6M / 1A / 2A).'),

      h3('KPIs disponibles (v2.2)'),
      bullet('Tasa de confirmación: % de turnos confirmados sobre el total'),
      bullet('Turnos cancelados: cantidad en el período'),
      bullet('No-shows: turnos en estado "nuevo" o "pendiente" con fecha pasada hace más de 2 horas (nunca confirmados ni cancelados). Se muestra en color de advertencia.'),
      bullet('Mensajes enviados: total de mensajes outbound vía WhatsApp'),

      h3('No-show — Definición técnica'),
      body('Un turno es considerado no-show cuando:'),
      bullet('status IN (\'pending\', \'new\') — el paciente nunca confirmó ni canceló'),
      bullet('appointment_datetime < NOW() - 2 horas — la fecha del turno ya pasó'),

      note('En la lista de pacientes, los pacientes con ≥1 no-show muestran un badge de advertencia con el conteo (ej: !2).'),

      h3('Visualizaciones'),
      bullet('Gráfico de barras apiladas por mes o trimestre'),
      bullet('Top 5 pacientes más frecuentes con próximo turno'),
      bullet('Rendimiento de automatizaciones (envíos, tasa de éxito)'),

      divider(),

      // ══════════════════════════════════════════════════════════
      // FEAT 6 — LISTA DE ESPERA
      // ══════════════════════════════════════════════════════════
      pageBreak(),
      h2('2.6 Lista de Espera Automática'),
      body('Cuando se cancela un turno, el sistema notifica automáticamente por WhatsApp a los pacientes que están en la lista de espera para esa clínica, invitándolos a aprovechar el horario liberado.'),

      h3('Tabla: waiting_list'),
      infoBox([
        ['clinic_id',           'UUID de la clínica'],
        ['patient_id',          'UUID del paciente en espera'],
        ['service',             'Servicio deseado (opcional)'],
        ['preferred_date_from', 'Inicio del rango de fechas preferido (opcional)'],
        ['preferred_date_to',   'Fin del rango de fechas preferido (opcional)'],
        ['status',              'waiting | notified | booked | expired | cancelled'],
        ['notified_at',         'Timestamp del último envío de notificación'],
      ]),

      h3('Flujo completo'),
      bullet('1. Paciente le dice al bot: "quiero anotarme en la lista de espera"'),
      bullet('2. El bot llama al tool add_to_waitlist con el servicio y rango de fechas (opcionales)'),
      bullet('3. Se crea entrada en waiting_list con status = "waiting"'),
      bullet('4. Cuando algún turno se cancela: el webhook dispara notify-waitlist'),
      bullet('5. La función find matches activas y les envía WhatsApp avisando del horario libre'),
      bullet('6. El entry pasa a status = "notified"'),
      bullet('7. El paciente puede responder para agendar (el bot lo asiste)'),

      h3('Antidupli cación'),
      bullet('La columna appointments.waitlist_notified_at previene notificar dos veces para el mismo turno cancelado'),
      bullet('El índice parcial idx_appointments_waitlist_pending acelera la consulta del cron'),

      h3('Dashboard — Lista de espera'),
      bullet('Tabla con filtros por estado y rango de fechas'),
      bullet('Acciones: marcar como "agendado" o eliminar (soft-delete → cancelled)'),
      bullet('Badge en el sidebar muestra el conteo de entradas activas en tiempo real'),

      divider(),

      // ══════════════════════════════════════════════════════════
      // FEAT 7 — RECORDATORIO DE RESEÑA CON URL
      // ══════════════════════════════════════════════════════════
      h2('2.7 Recordatorio de Reseña con URL de Google'),
      body('Completa el flujo de pedido de reseña post-visita permitiendo incluir el link directo a Google Reviews en el mensaje. Antes, el mensaje solo mencionaba "Google" sin un enlace clicable.'),

      h3('Configuración'),
      bullet('En Configuración → Conexión WhatsApp → "URL de reseña en Google"'),
      bullet('Ingresar la URL de Google Business (formato: https://g.page/r/XXXXX/review)'),
      bullet('La URL se guarda en clinics.settings.google_review_url'),

      h3('Uso en Automatizaciones'),
      bullet('En el editor de mensaje de la automatización "Pedido de reseña", aparece el botón "+ Link de reseña Google"'),
      bullet('Inserta el placeholder {review_url} en el mensaje'),
      bullet('La preview muestra la URL de ejemplo en tiempo real'),
      bullet('Al enviar, send-review-requests reemplaza {review_url} con la URL real de la clínica'),

      h3('Ejemplo de mensaje'),
      body('"¡Gracias por su visita a {clinic_name}, {patient_name}! 🙏 Si le pareció bien la atención, nos ayudaría mucho una reseña en Google: {review_url} ¡Muchas gracias!"'),
      note('Si la clínica no configuró la URL, el placeholder {review_url} se envía vacío en el mensaje (sin error).'),

      divider(),

      // ══════════════════════════════════════════════════════════
      // FEAT 8 — CONFIRMACIÓN POR MÉDICO
      // ══════════════════════════════════════════════════════════
      h2('2.8 Confirmación de Turno por el Médico'),
      body('Flujo nuevo: cuando el bot agenda un turno, envía automáticamente un WhatsApp al número del médico configurado. El médico puede responder 1 para confirmar o 2 para rechazar, y el sistema actualiza el turno y notifica al paciente.'),

      h3('Configuración'),
      bullet('En Configuración → Conexión WhatsApp → "WhatsApp del médico"'),
      bullet('Ingresar el número en formato internacional (+598...)'),
      bullet('Se guarda en clinics.settings.doctor_whatsapp'),

      h3('Flujo cuando el bot agenda un turno'),
      bullet('1. Paciente conversa con el bot y coordina: servicio + fecha + hora'),
      bullet('2. Bot llama tool schedule_appointment → turno creado con status = "new"'),
      bullet('3. Bot responde al paciente confirmando el turno'),
      bullet('4. Sistema envía WhatsApp al médico: "🔔 Nuevo turno agendado\n👤 Paciente: [nombre]\n📅 [fecha] a las [hora]\nResponda 1 para confirmar o 2 para rechazar"'),

      h3('Flujo de respuesta del médico'),
      bullet('1. Médico responde "1" → turno pasa a status = "confirmed"'),
      bullet('   Médico recibe: "✅ Turno de [paciente] confirmado."'),
      bullet('   Paciente recibe: "✅ Su turno fue confirmado por el médico. ¡Le esperamos!"'),
      bullet('2. Médico responde "2" → turno pasa a status = "cancelled"'),
      bullet('   Médico recibe: "❌ Turno rechazado."'),
      bullet('   Paciente recibe: "Su turno no pudo confirmarse. Comuníquese para reagendar."'),
      bullet('   Sistema notifica a la lista de espera (si hay pacientes esperando)'),

      h3('Reconocimiento de intents del médico'),
      infoBox([
        ['Confirmar',  '"1", "confirmar", "confirmo", "sí", "si", "ok"'],
        ['Rechazar',   '"2", "rechazar", "rechazo", "bloquear", "bloqueo", "no"'],
        ['Desconocido','El sistema responde con instrucciones: "Responda 1 para confirmar o 2 para rechazar."'],
      ]),

      note('Si el médico no tiene el número configurado, el flujo funciona igual pero sin la notificación al médico (backward compatible).'),

      divider(),

      // ══════════════════════════════════════════════════════════
      // SECCIÓN 3 — CONFIGURACIÓN
      // ══════════════════════════════════════════════════════════
      pageBreak(),
      h1('3. Configuración del Sistema'),
      h2('3.1 Perfil de la Clínica'),
      infoBox([
        ['Nombre',              'Nombre visible para pacientes y en documentos'],
        ['Teléfono',            'Teléfono de contacto de la clínica'],
        ['Dirección',           'Dirección física (opcional)'],
        ['Email de contacto',   'Email para notificaciones (opcional)'],
        ['Zona horaria',        'Timezone para calcular fechas y horarios (default: America/Montevideo)'],
        ['URL de reseña',       'Link de Google Business para pedidos de reseña (nuevo en v2.2)'],
      ]),

      h2('3.2 WhatsApp / Integración Meta'),
      infoBox([
        ['Phone Number ID',   'ID del número de WhatsApp Business (Meta Business Suite)'],
        ['WhatsApp del médico','Número para notificación y confirmación de turnos (nuevo en v2.2)'],
        ['Access Token',      'Token de acceso de la Graph API (variable de entorno)'],
        ['Verify Token',      'Token de verificación del webhook (variable de entorno)'],
      ]),

      h2('3.3 Horarios de Atención'),
      body('Se configuran por día de la semana (lunes a domingo) con hora de apertura y cierre. Los días sin horario configurado se consideran cerrados. El bot respeta estos horarios al agendar turnos.'),

      h2('3.4 Variables de Entorno (Edge Functions)'),
      infoBox([
        ['SUPABASE_URL',               'URL base del proyecto Supabase'],
        ['SUPABASE_SERVICE_ROLE_KEY',  'Clave de servicio (omite RLS)'],
        ['ANTHROPIC_API_KEY',          'Clave de Anthropic para el agente IA'],
        ['WHATSAPP_ACCESS_TOKEN',      'Token de acceso de Meta Graph API'],
        ['WHATSAPP_PHONE_NUMBER_ID',   'Phone Number ID global de fallback'],
        ['WHATSAPP_VERIFY_TOKEN',      'Token para verificación del webhook'],
      ]),

      divider(),

      // ══════════════════════════════════════════════════════════
      // SECCIÓN 4 — ARQUITECTURA
      // ══════════════════════════════════════════════════════════
      pageBreak(),
      h1('4. Arquitectura y Flujos Técnicos'),
      h2('4.1 Edge Functions'),
      infoBox([
        ['whatsapp-webhook',        'Recibe todos los mensajes entrantes de WhatsApp. Detecta intent (confirm/cancel/reschedule), identifica al paciente o médico, delega al agente IA o procesa directamente.'],
        ['ai-agent-reply',          'Agente IA basado en Claude. Herramientas: schedule_appointment, cancel_appointments, reschedule_appointment, register_patient, add_to_waitlist, get_available_slots, confirm_appointment. Notifica al médico al crear turno.'],
        ['send-whatsapp-reminders', 'Cron job (cada 5 min): busca turnos sin recordatorio y envía WA. Usa plantillas con botones de acción.'],
        ['send-review-requests',    'Cron job (cada 5 min): busca turnos confirmados/completados sin review enviado. Reemplaza placeholders incluyendo {review_url}.'],
        ['notify-waitlist',         'Invocado al cancelar un turno. Busca entradas activas en waiting_list y notifica por WhatsApp.'],
      ]),

      h2('4.2 Tablas Principales'),
      infoBox([
        ['clinics',             'Datos de la clínica. Columna settings JSONB para configuración flexible (google_review_url, doctor_whatsapp, preferencias).'],
        ['patients',            'Pacientes de la clínica. Campo ai_enabled para habilitar/deshabilitar el bot por paciente.'],
        ['appointments',        'Turnos. Estados: new → pending → confirmed → completed / cancelled / rescheduled. Columnas: waitlist_notified_at, review_request_sent_at.'],
        ['conversations',       'Conversaciones WA activas. Campo agent_mode: bot | human. Campo last_message_direction para el badge del inbox.'],
        ['messages',            'Historial de mensajes. Directions: inbound | outbound | outbound_ai | system_template.'],
        ['waiting_list',        'Lista de espera. Campos: service, preferred_date_from/to, status (waiting/notified/booked/expired/cancelled).'],
        ['clinic_automations',  'Configuración de automatizaciones por clínica y tipo.'],
        ['clinic_schedule',     'Horarios de atención por día. Usado por el bot para validar disponibilidad.'],
        ['whatsapp_message_log','Log de auditoría de todos los mensajes WA enviados/recibidos.'],
      ]),

      divider(),

      // ══════════════════════════════════════════════════════════
      // SECCIÓN 5 — SEGURIDAD
      // ══════════════════════════════════════════════════════════
      pageBreak(),
      h1('5. Seguridad y Row Level Security'),
      body('Todas las tablas tienen RLS habilitado. Las políticas permiten:'),
      bullet('SELECT/UPDATE: owner de la clínica (clinics.owner_id = auth.uid()) y miembros activos (clinic_members con status = "active")'),
      bullet('INSERT desde el bot: solo service_role (Edge Functions con SUPABASE_SERVICE_ROLE_KEY)'),
      bullet('Las Edge Functions siempre usan service_role para operaciones de escritura, nunca el JWT del usuario'),
      bullet('Deduplicación de mensajes WA: whatsapp_message_log.wa_message_id previene procesar el mismo evento dos veces'),

      divider(),

      // ══════════════════════════════════════════════════════════
      // SECCIÓN 6 — AUDITORÍA Y CORRECCIONES TÉCNICAS
      // ══════════════════════════════════════════════════════════
      pageBreak(),
      h1('6. Auditoría Técnica y Correcciones (2026-05-07)'),
      body('Se realizó una auditoría completa del proyecto detectando y corrigiendo los siguientes problemas:'),

      h2('6.1 Seguridad — CRÍTICO'),
      infoBox([
        ['RLS en ai_config', 'La tabla ai_config (que almacena SERVICE_ROLE_KEY y OPENAI_API_KEY) no tenía RLS habilitado. Cualquier usuario autenticado podía leerla via REST. Fix: ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY sin políticas públicas → solo service_role accede.'],
        ['DELETE policies faltantes', 'waiting_list y clinic_automations tenían políticas SELECT/INSERT/UPDATE pero no DELETE. Las acciones de eliminar desde el dashboard fallaban silenciosamente. Fix: políticas DELETE para clinic_members de la clínica.'],
      ]),

      h2('6.2 Rendimiento — ALTA'),
      infoBox([
        ['N+1 en useNotifications', 'Cada evento realtime disparaba una query individual a patients para obtener el nombre. Fix: caché de módulo (_patientNameCache Map) que evita queries repetidas para el mismo paciente en la sesma sesión.'],
        ['useKpis .single() crash', 'Cuando no hay turnos hoy la vista v_clinic_kpis_today devuelve 0 filas. .single() lanzaba error PGRST116. Fix: .maybeSingle() con fallback a objeto de ceros.'],
        ['useAutomations sin try/catch', 'La función load() no capturaba errores de red ni de Supabase. Fix: bloque try/catch/finally con manejo de cancelled para evitar actualizaciones de estado post-unmount.'],
        ['Índices compuestos faltantes', 'messages y whatsapp_message_log carecían de índices compuestos para las consultas más frecuentes (clinic_id + direction + created_at). Fix: índices CREATE INDEX IF NOT EXISTS.'],
        ['Vite manualChunks', 'Solo se definía vendor-react. recharts (~800KB) y @supabase/supabase-js (~200KB) se incluían en el bundle principal. Fix: chunks vendor-recharts y vendor-supabase separados.'],
      ]),

      h2('6.3 React — ALTA'),
      infoBox([
        ['DashboardErrorBoundary', 'Sin error boundary en rutas del dashboard: un crash desmontaba toda la app incluyendo AuthProvider. Fix: DashboardErrorBoundary component que aísla cada ruta con UI de recuperación y botón "Reintentar" (sin reload).'],
        ['useCallback faltantes', 'handleStatusChange (ListaEspera), handleConversationCreated y handleDeleteConversation (Inbox) se recreaban en cada render causando efectos secundarios innecesarios. Fix: envueltos en useCallback con dependencias correctas.'],
        ['useMemo en Automatizaciones', 'activeCount, inactiveCount, statCards y sorted se recalculaban en cada render. Fix: todos memoizados con useMemo.'],
      ]),

      h2('6.4 Accesibilidad (WCAG 2.1) — MEDIA'),
      infoBox([
        ['Contraste --cq-fg-muted', 'oklch(0.55) daba ratio ~4.2:1 sobre fondo blanco, insuficiente para texto < 18px (WCAG AA requiere 4.5:1). Fix: cambiado a oklch(0.48) → ratio ~5.1:1.'],
        ['scope="col" en <th>', 'Tablas de Pacientes, ListaEspera y Reportes carecían de scope="col" en los encabezados, dificultando la navegación con screen readers. Fix: scope="col" en todos los <th>.'],
        ['aria-label en botón cerrar', 'El botón cerrar del EditModal de Automatizaciones solo tenía un ícono sin etiqueta accesible. Fix: aria-label="Cerrar" agregado.'],
        ['Animaciones y prefers-reduced-motion', '8 modales usaban style={{ animation: "cqModalIn..." }} (inline), que no puede ser suprimido por el bloque @media (prefers-reduced-motion) del CSS externo (inline styles > !important en cascade CSS). Fix: clases .cq-modal-in y .cq-modal-in-fast definidas en globals.css, donde el media query sí puede suprimirlas.'],
      ]),

      divider(),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 600 },
        children: [
          new TextRun({ text: 'Cliniq v2.3 — ', size: 20, font: 'Calibri', color: '94A3B8' }),
          new TextRun({ text: new Date().toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' }), size: 20, font: 'Calibri', color: '94A3B8' }),
        ],
      }),
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  const outPath = path.join(__dirname, 'Cliniq - Documentacion de Funcionalidades.docx');
  fs.writeFileSync(outPath, buf);
  console.log('✅ Documento generado:', outPath, `(${(buf.length / 1024).toFixed(1)} KB)`);
}).catch(err => {
  console.error('❌ Error generando documento:', err);
  process.exit(1);
});
