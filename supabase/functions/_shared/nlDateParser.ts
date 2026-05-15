/**
 * Natural Language Date/Time Parser — Cliniq
 *
 * Converts Spanish scheduling expressions into timezone-aware ISO-8601 datetimes.
 * Locale: DD/MM (Uruguay). Deterministic rules, no AI guessing.
 */

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ParseResult {
  resolved_datetime: string | null;
  confidence: number;
  interpretation?: string;
  needs_clarification?: boolean;
  options?: string[];
}

interface LocalComponents {
  year: number;
  month: number;   // 1-12
  day: number;     // 1-31
  hour: number;    // 0-23
  minute: number;  // 0-59
}

// ─── Text normalization ───────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // strip combining diacritical marks
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Timezone utilities ───────────────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Module-level cache: re-use Intl.DateTimeFormat instances per timezone
const _dtfCache = new Map<string, Intl.DateTimeFormat>();
function getDateTimeFormat(tz: string): Intl.DateTimeFormat {
  let fmt = _dtfCache.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    _dtfCache.set(tz, fmt);
  }
  return fmt;
}

/**
 * Returns the wall-clock components of a UTC Date in the given IANA timezone.
 */
function getLocalComponents(utcDate: Date, tz: string): LocalComponents {
  const fmt = getDateTimeFormat(tz);

  const parts = fmt.formatToParts(utcDate);
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)!.value, 10);

  let hour = get("hour");
  if (hour === 24) hour = 0; // some engines return 24 for midnight

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour,
    minute: get("minute"),
  };
}

/**
 * Converts local wall-clock components to a UTC Date for the given timezone.
 *
 * Strategy: start from naïve UTC, measure the TZ offset at that point,
 * then adjust. Works for all UTC offsets including DST boundaries.
 */
function localToUTC(
  year: number, month: number, day: number,
  hour: number, minute: number,
  tz: string
): Date {
  const naiveUTC = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const local = getLocalComponents(naiveUTC, tz);

  const wantMs = Date.UTC(year, month - 1, day, hour, minute);
  const gotMs  = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);

  return new Date(naiveUTC.getTime() + (wantMs - gotMs));
}

/**
 * Formats a UTC Date as a timezone-aware ISO-8601 string (e.g. 2026-05-11T10:00:00-03:00).
 */
function formatWithOffset(utcDate: Date, tz: string): string {
  const local = getLocalComponents(utcDate, tz);

  // Compute offset: local wall-clock minus actual UTC
  const localMs = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
  // Strip sub-minute precision from utcDate before computing offset
  const utcMs = utcDate.getTime()
    - utcDate.getUTCSeconds() * 1_000
    - utcDate.getUTCMilliseconds();
  const offsetMin = Math.round((localMs - utcMs) / 60_000);

  const sign = offsetMin >= 0 ? "+" : "-";
  const abs  = Math.abs(offsetMin);
  const oh   = Math.floor(abs / 60);
  const om   = abs % 60;

  return (
    `${local.year}-${pad(local.month)}-${pad(local.day)}` +
    `T${pad(local.hour)}:${pad(local.minute)}:00` +
    `${sign}${pad(oh)}:${pad(om)}`
  );
}

// ─── Calendar utilities ───────────────────────────────────────────────────────

/**
 * Adds N calendar days to a local date (timezone-safe: uses UTC noon to avoid DST edge cases).
 */
function addCalendarDays(
  local: LocalComponents, days: number
): { year: number; month: number; day: number } {
  const d = new Date(Date.UTC(local.year, local.month - 1, local.day, 12, 0, 0));
  d.setUTCDate(d.getUTCDate() + days);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** JavaScript Sunday=0…Saturday=6 → Monday=1…Sunday=7 */
function jsToMondayFirst(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

function getCurrentDow(local: LocalComponents): number {
  const d = new Date(Date.UTC(local.year, local.month - 1, local.day, 12, 0, 0));
  return jsToMondayFirst(d.getUTCDay());
}

// ─── Static maps ──────────────────────────────────────────────────────────────

// Normalized (no-accent) Spanish day names → Monday-first index (1-7)
const DAY_NAMES: Record<string, number> = {
  lunes: 1, martes: 2, miercoles: 3, jueves: 4,
  viernes: 5, sabado: 6, domingo: 7,
};

const DAY_DISPLAY: Record<string, string> = {
  lunes: "lunes", martes: "martes", miercoles: "miércoles",
  jueves: "jueves", viernes: "viernes", sabado: "sábado", domingo: "domingo",
};

const DAY_PATTERN = Object.keys(DAY_NAMES).join("|");

// ─── Regex patterns ───────────────────────────────────────────────────────────

// Order matters — more specific first
const RX_PASADO_MANANA   = /\bpasado\s+manana\b/;
const RX_MANANA          = /\bmanana\b/;
const RX_HOY             = /\bhoy\b/;
const RX_QUALIFIED_DAY   = new RegExp(`\\b(proximo|este|el)\\s+(${DAY_PATTERN})\\b`);
const RX_BARE_DAY        = new RegExp(`\\b(${DAY_PATTERN})\\b`);
const RX_EN_HORAS        = /\ben\s+(\d+)\s+horas?\b/;
const RX_EN_DIAS         = /\ben\s+(\d+)\s+dias?\b/;
const RX_EN_SEMANAS      = /\ben\s+(\d+)\s+semanas?\b/;
const RX_ABSOLUTE_DATE   = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;

// Time
const RX_A_LAS           = /\ba\s+las\s+(\d{1,2})(?::(\d{2}))?\b/;
const RX_COLON_TIME      = /(?<!\d)(\d{1,2}):(\d{2})(?!\d)/;
const RX_BARE_H          = /\b(\d{1,2})\s*h\b/;
const RX_VAGUE_TIME      = /\b(temprano|tarde|noche)\b/;

// ─── Time extractor ───────────────────────────────────────────────────────────

interface TimeResult {
  hour: number;
  minute: number;
  explicit: boolean;
  desc: string;
}

function extractTime(text: string): TimeResult {
  // "a las HH" / "a las HH:MM"
  const alas = text.match(RX_A_LAS);
  if (alas) {
    let h = parseInt(alas[1], 10);
    const m = alas[2] ? parseInt(alas[2], 10) : 0;
    if (h >= 1 && h <= 7) h += 12;    // "a las 3" → 15:00 (business context)
    return { hour: h, minute: m, explicit: true, desc: `a las ${pad(h)}:${pad(m)}` };
  }

  // "HH:MM" standalone
  const colon = text.match(RX_COLON_TIME);
  if (colon) {
    let h = parseInt(colon[1], 10);
    const m = parseInt(colon[2], 10);
    if (h >= 1 && h <= 7) h += 12;
    return { hour: h, minute: m, explicit: true, desc: `${pad(h)}:${pad(m)}` };
  }

  // "Nh" bare hour
  const bareh = text.match(RX_BARE_H);
  if (bareh) {
    let h = parseInt(bareh[1], 10);
    if (h >= 1 && h <= 7) h += 12;
    return { hour: h, minute: 0, explicit: true, desc: `${pad(h)}:00` };
  }

  // Vague modifiers
  const vague = text.match(RX_VAGUE_TIME);
  if (vague) {
    const map: Record<string, [number, number]> = {
      temprano: [9, 0], tarde: [15, 0], noche: [20, 0],
    };
    const [h, m] = map[vague[1]];
    return { hour: h, minute: m, explicit: false, desc: `${vague[1]} → ${pad(h)}:${pad(m)}` };
  }

  // Default
  return { hour: 9, minute: 0, explicit: false, desc: "default 09:00" };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function parseNLDate(
  message_text: string,
  current_datetime: string,
  timezone: string
): ParseResult {
  const text  = normalize(message_text);
  const now   = new Date(current_datetime);
  const local = getLocalComponents(now, timezone);
  const curDow = getCurrentDow(local);

  let targetDate: { year: number; month: number; day: number } | null = null;
  let dateDesc   = "";
  let confidence = 0.9;

  // ── 1. Resolve date ─────────────────────────────────────────────────────────

  // (A) "pasado mañana"
  if (RX_PASADO_MANANA.test(text)) {
    targetDate = addCalendarDays(local, 2);
    dateDesc   = "pasado mañana";
    confidence = 0.97;
  }

  // (B) "mañana"
  else if (RX_MANANA.test(text)) {
    const tomorrow = addCalendarDays(local, 1);
    targetDate = tomorrow;
    dateDesc   = "mañana";
    confidence = 0.97;

    // Conflict: "mañana lunes" where tomorrow isn't Monday
    const dayM = text.match(RX_BARE_DAY);
    if (dayM) {
      const namedDow = DAY_NAMES[dayM[1]];
      const tomorrowLocal: LocalComponents = { ...local, ...tomorrow };
      const tomorrowDow = getCurrentDow(tomorrowLocal);
      if (namedDow !== tomorrowDow) {
        return {
          resolved_datetime: null,
          confidence: 0.2,
          needs_clarification: true,
          options: [
            `¿"${dayM[1]}" o "mañana"? Mañana es ${DAY_DISPLAY[Object.keys(DAY_NAMES).find(k => DAY_NAMES[k] === tomorrowDow)!] ?? "otro día"}.`,
          ],
        };
      }
    }
  }

  // (C) "hoy"
  else if (RX_HOY.test(text)) {
    targetDate = { year: local.year, month: local.month, day: local.day };
    dateDesc   = "hoy";
    confidence = 0.97;
  }

  // (D) Qualified weekday: "próximo", "este", "el" + day
  else if (RX_QUALIFIED_DAY.test(text)) {
    const m         = text.match(RX_QUALIFIED_DAY)!;
    const qualifier = m[1];
    const dayKey    = m[2];
    const targetDow = DAY_NAMES[dayKey];
    let   daysUntil = targetDow - curDow;

    if (qualifier === "proximo") {
      // Strictly after today — same day of week today means next week
      if (daysUntil <= 0) daysUntil += 7;
      dateDesc   = `próximo ${DAY_DISPLAY[dayKey]}`;
      confidence = 0.95;
    } else {
      // "este" / "el" — this week's occurrence; next week if already passed
      if (daysUntil < 0) daysUntil += 7;
      dateDesc   = daysUntil === 0
        ? `hoy (${DAY_DISPLAY[dayKey]})`
        : `este ${DAY_DISPLAY[dayKey]}`;
      confidence = 0.9;
    }

    targetDate = addCalendarDays(local, daysUntil);
  }

  // (E) Relative: "en N horas"
  else if (RX_EN_HORAS.test(text)) {
    const m = text.match(RX_EN_HORAS)!;
    const n = parseInt(m[1], 10);
    const result = new Date(now.getTime() + n * 3_600_000);
    return {
      resolved_datetime: formatWithOffset(result, timezone),
      confidence: 0.97,
      interpretation: `en ${n} hora${n !== 1 ? "s" : ""} desde ahora`,
    };
  }

  // (F) Relative: "en N semanas"
  else if (RX_EN_SEMANAS.test(text)) {
    const m = text.match(RX_EN_SEMANAS)!;
    const n = parseInt(m[1], 10);
    targetDate = addCalendarDays(local, n * 7);
    dateDesc   = `en ${n} semana${n !== 1 ? "s" : ""}`;
    confidence = 0.95;
  }

  // (G) Relative: "en N días"
  else if (RX_EN_DIAS.test(text)) {
    const m = text.match(RX_EN_DIAS)!;
    const n = parseInt(m[1], 10);
    targetDate = addCalendarDays(local, n);
    dateDesc   = `en ${n} día${n !== 1 ? "s" : ""}`;
    confidence = 0.95;
  }

  // (H) Absolute date: DD/MM or DD/MM/YYYY
  else if (RX_ABSOLUTE_DATE.test(text)) {
    const m   = text.match(RX_ABSOLUTE_DATE)!;
    const day = parseInt(m[1], 10);
    const mon = parseInt(m[2], 10);

    if (day < 1 || day > 31 || mon < 1 || mon > 12) {
      return {
        resolved_datetime: null,
        confidence: 0.1,
        needs_clarification: true,
        options: ["La fecha ingresada no es válida."],
      };
    }

    let year = m[3] ? parseInt(m[3], 10) : local.year;
    if (year < 100) year += 2000;

    // If date already passed (and no year given) → assume next year
    if (!m[3]) {
      const todayUTC     = Date.UTC(local.year, local.month - 1, local.day);
      const candidateUTC = Date.UTC(year, mon - 1, day);
      if (candidateUTC < todayUTC) year++;
    }

    targetDate = { year, month: mon, day };
    dateDesc   = `${pad(day)}/${pad(mon)}/${year} (DD/MM)`;
    confidence = 0.92;
  }

  // (I) Bare weekday without qualifier → ambiguous
  else if (RX_BARE_DAY.test(text)) {
    const dayKey    = text.match(RX_BARE_DAY)![1];
    const targetDow = DAY_NAMES[dayKey];
    let   daysThis  = targetDow - curDow;
    if (daysThis <= 0) daysThis += 7;
    let   daysNext  = daysThis + 7;

    const dateThis = addCalendarDays(local, daysThis);
    const dateNext = addCalendarDays(local, daysNext);

    const fmt = (d: typeof dateThis) =>
      `${pad(d.day)}/${pad(d.month)}/${d.year}`;

    return {
      resolved_datetime: null,
      confidence: 0.4,
      needs_clarification: true,
      options: [
        `Este ${DAY_DISPLAY[dayKey]}: ${fmt(dateThis)}`,
        `Próximo ${DAY_DISPLAY[dayKey]}: ${fmt(dateNext)}`,
      ],
    };
  }

  // No date expression found at all
  if (!targetDate) {
    // Time-only input ("a las 15") → interpret as today
    const timeOnly = RX_A_LAS.test(text) || RX_COLON_TIME.test(text) ||
                     RX_BARE_H.test(text) || RX_VAGUE_TIME.test(text);

    if (timeOnly) {
      targetDate = { year: local.year, month: local.month, day: local.day };
      dateDesc   = "hoy (implícito)";
      confidence = 0.75;
    } else {
      return {
        resolved_datetime: null,
        confidence: 0.2,
        needs_clarification: true,
        options: ["No se pudo identificar una fecha. Por favor indicá el día."],
      };
    }
  }

  // ── 2. Resolve time ─────────────────────────────────────────────────────────

  const time = extractTime(text);

  if (time.hour < 0 || time.hour > 23 || time.minute < 0 || time.minute > 59) {
    return {
      resolved_datetime: null,
      confidence: 0.1,
      needs_clarification: true,
      options: ["Hora inválida."],
    };
  }

  if (time.explicit) {
    confidence = Math.min(1.0, confidence + 0.05);
  } else {
    confidence = Math.max(0.0, confidence - 0.05);
  }

  // ── 3. Build result ─────────────────────────────────────────────────────────

  const utcResult = localToUTC(
    targetDate.year, targetDate.month, targetDate.day,
    time.hour, time.minute,
    timezone
  );

  return {
    resolved_datetime: formatWithOffset(utcResult, timezone),
    confidence: Math.round(confidence * 100) / 100,
    interpretation: `${dateDesc} · ${time.desc}`,
  };
}
