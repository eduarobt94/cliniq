/**
 * Validates a datetime against clinic_schedule + clinic_closures.
 *
 * @param {string}  datetimeISO  - ISO string like "2026-05-10T14:30" (local datetime input value)
 * @param {Array}   schedule     - rows from clinic_schedule (7 days)
 * @param {Array}   closures     - rows from clinic_closures
 * @returns {{ allowed: boolean, reason?: string, warning?: string, closure?: object, open?: string, close?: string }}
 */
export function isDatetimeAllowed(datetimeISO, schedule, closures) {
  if (!schedule || !datetimeISO) return { allowed: true };

  // Parse date and time from the ISO string
  const [datePart, timePart] = datetimeISO.includes('T')
    ? datetimeISO.split('T')
    : [datetimeISO, '09:00'];

  const timeStr = timePart.slice(0, 5); // "HH:MM"
  const dt      = new Date(datetimeISO);
  const dow     = dt.getDay(); // 0=Sun..6=Sat

  // 1. Check closure overrides (specific date takes priority over weekly schedule)
  const closure = closures?.find(c => c.date === datePart);
  if (closure) {
    if (closure.accepts_emergencies) {
      return { allowed: true, warning: 'urgency_only', closure };
    }
    return { allowed: false, reason: 'closure', closure };
  }

  // 2. Check weekly schedule
  const day = schedule?.find(d => d.day_of_week === dow);
  if (!day || !day.is_open) {
    return { allowed: false, reason: 'closed_day' };
  }

  if (timeStr < day.open_time || timeStr >= day.close_time) {
    return { allowed: false, reason: 'outside_hours', open: day.open_time, close: day.close_time };
  }

  return { allowed: true };
}

/**
 * Returns a human-readable error string or null if allowed.
 */
export function getScheduleError(check) {
  if (check.allowed && !check.warning) return null;
  if (check.warning === 'urgency_only') {
    return null; // warning shown separately, not an error
  }
  if (check.reason === 'closure') {
    const label = REASON_LABELS[check.closure?.reason] ?? 'cierre programado';
    const extra = check.closure?.reason_label ? ` — ${check.closure.reason_label}` : '';
    return `La clínica está cerrada ese día (${label}${extra}).`;
  }
  if (check.reason === 'closed_day') {
    return 'La clínica no atiende ese día de la semana.';
  }
  if (check.reason === 'outside_hours') {
    return `Fuera del horario de atención (${check.open} a ${check.close}).`;
  }
  return 'No se puede agendar en ese horario.';
}

/**
 * Returns a warning string (amber) or null.
 */
export function getScheduleWarning(check) {
  if (check.warning === 'urgency_only') {
    return 'La clínica solo atiende urgencias ese día.';
  }
  return null;
}

export const REASON_LABELS = {
  holiday:         'Feriado',
  vacation:        'Vacaciones',
  repair:          'Reparación',
  remodeling:      'Remodelación',
  emergency_close: 'Cierre de emergencia',
  other:           'Otro motivo',
};

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Display order: Mon→Sun (avoids starting on Sunday)
export const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
