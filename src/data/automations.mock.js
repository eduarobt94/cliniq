export const AUTOMATIONS_MOCK = [
  {
    id: 'ax1', name: 'Recordatorio de turno · WhatsApp', status: 'active',
    ok: 138, total: 142, lastRun: 'Hace 2 min',
    desc: 'Envía recordatorio 24h antes del turno vía WhatsApp.',
    trigger: 'Automático · 24h antes',
  },
  {
    id: 'ax2', name: 'Seguimiento de presupuestos', status: 'active',
    ok: 22, total: 23, lastRun: 'Hace 14 min',
    desc: 'Contacta pacientes con presupuestos sin respuesta después de 3 días.',
    trigger: 'Automático · cada 3 días',
  },
  {
    id: 'ax3', name: 'Reactivación pacientes inactivos', status: 'active',
    ok: 17, total: 18, lastRun: 'Hace 1 h',
    desc: 'Contacta pacientes que no vienen hace más de 6 meses.',
    trigger: 'Automático · mensual',
  },
  {
    id: 'ax4', name: 'Solicitud de reseñas en Google', status: 'active',
    ok: 8, total: 9, lastRun: 'Hace 3 h',
    desc: 'Pide reseña a pacientes 2 horas después de su visita.',
    trigger: 'Post-visita · 2h',
  },
  {
    id: 'ax5', name: 'Reporte semanal al dueño', status: 'active',
    ok: 1, total: 1, lastRun: 'Ayer 09:00',
    desc: 'Envía resumen de la semana por email al propietario.',
    trigger: 'Lunes · 09:00',
  },
  {
    id: 'ax6', name: 'Confirmación de turno nuevo', status: 'inactive',
    ok: 0, total: 0, lastRun: 'Nunca',
    desc: 'Envía mensaje de bienvenida cuando se agenda un turno nuevo.',
    trigger: 'Al crear turno',
  },
];
