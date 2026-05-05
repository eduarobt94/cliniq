/**
 * Tests for nlDateParser — run with:
 *   deno test supabase/functions/_shared/nlDateParser.test.ts
 */
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseNLDate } from "./nlDateParser.ts";

const TZ = "America/Montevideo";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dt(iso: string) {
  return iso; // just a label alias for readability
}

function assertDate(result: ReturnType<typeof parseNLDate>, expectedISO: string, label: string) {
  assertExists(result.resolved_datetime, `${label}: should have resolved_datetime`);
  assertEquals(result.resolved_datetime, expectedISO, label);
}

function assertClarification(result: ReturnType<typeof parseNLDate>, label: string) {
  assertEquals(result.needs_clarification, true, `${label}: should need clarification`);
  assertEquals(result.resolved_datetime, null, `${label}: resolved_datetime should be null`);
}

// ─── Relative days ────────────────────────────────────────────────────────────

Deno.test("hoy default time → today 09:00", () => {
  const r = parseNLDate("hoy", dt("2026-05-04T14:00:00-03:00"), TZ);
  assertDate(r, "2026-05-04T09:00:00-03:00", "hoy default");
});

Deno.test("mañana default time → tomorrow 09:00", () => {
  const r = parseNLDate("mañana", dt("2026-05-04T14:00:00-03:00"), TZ);
  assertDate(r, "2026-05-05T09:00:00-03:00", "mañana default");
});

Deno.test("pasado mañana → day after tomorrow 09:00", () => {
  const r = parseNLDate("pasado mañana", dt("2026-05-04T14:00:00-03:00"), TZ);
  assertDate(r, "2026-05-06T09:00:00-03:00", "pasado mañana");
});

Deno.test("mañana a las 9:30 → tomorrow 09:30", () => {
  const r = parseNLDate("mañana 9:30", dt("2026-05-04T14:00:00-03:00"), TZ);
  assertDate(r, "2026-05-05T09:30:00-03:00", "mañana 9:30");
});

// ─── Relative weekdays ────────────────────────────────────────────────────────

// May 4 2026 is Monday (dow=1)
Deno.test("próximo lunes · today IS Monday → next Monday +7d", () => {
  const r = parseNLDate("próximo lunes", dt("2026-05-04T14:00:00-03:00"), TZ);
  assertDate(r, "2026-05-11T09:00:00-03:00", "próximo lunes on Monday");
});

Deno.test("próximo lunes · today is Wednesday → next Monday in 5d", () => {
  const r = parseNLDate("próximo lunes", dt("2026-05-06T14:00:00-03:00"), TZ);
  assertDate(r, "2026-05-11T09:00:00-03:00", "próximo lunes on Wednesday");
});

Deno.test("próximo viernes · today is Monday → this Friday +4d", () => {
  const r = parseNLDate("próximo viernes", dt("2026-05-04T14:00:00-03:00"), TZ);
  assertDate(r, "2026-05-08T09:00:00-03:00", "próximo viernes on Monday");
});

Deno.test("este viernes · today is Monday → this Friday +4d", () => {
  const r = parseNLDate("este viernes", dt("2026-05-04T14:00:00-03:00"), TZ);
  assertDate(r, "2026-05-08T09:00:00-03:00", "este viernes on Monday");
});

Deno.test("este lunes · today IS Monday → today", () => {
  const r = parseNLDate("este lunes", dt("2026-05-04T14:00:00-03:00"), TZ);
  assertDate(r, "2026-05-04T09:00:00-03:00", "este lunes on Monday → today");
});

Deno.test("este lunes · today is Wednesday → next Monday (passed)", () => {
  const r = parseNLDate("este lunes", dt("2026-05-06T14:00:00-03:00"), TZ);
  assertDate(r, "2026-05-11T09:00:00-03:00", "este lunes on Wednesday → next Monday");
});

Deno.test("el martes · today is Monday → this Tuesday +1d", () => {
  const r = parseNLDate("el martes", dt("2026-05-04T14:00:00-03:00"), TZ);
  assertDate(r, "2026-05-05T09:00:00-03:00", "el martes on Monday");
});

Deno.test("próximo lunes a las 15 → next Monday 15:00", () => {
  const r = parseNLDate("próximo lunes a las 15", dt("2026-05-04T14:00:00-03:00"), TZ);
  assertDate(r, "2026-05-11T15:00:00-03:00", "próximo lunes a las 15");
});

// ─── Relative offsets ─────────────────────────────────────────────────────────

Deno.test("en 3 horas → now + 3h", () => {
  const r = parseNLDate("en 3 horas", dt("2026-05-04T14:00:00-03:00"), TZ);
  assertDate(r, "2026-05-04T17:00:00-03:00", "en 3 horas");
});

Deno.test("en 3 horas crossing midnight → rolls over to next day", () => {
  const r = parseNLDate("en 3 horas", dt("2026-05-04T22:00:00-03:00"), TZ);
  assertDate(r, "2026-05-05T01:00:00-03:00", "en 3 horas midnight rollover");
});

Deno.test("en 10 días → 10 calendar days from today", () => {
  const r = parseNLDate("en 10 días", dt("2026-05-04T14:00:00-03:00"), TZ);
  assertDate(r, "2026-05-14T09:00:00-03:00", "en 10 dias");
});

Deno.test("en 2 semanas → 14 calendar days", () => {
  const r = parseNLDate("en 2 semanas", dt("2026-05-04T14:00:00-03:00"), TZ);
  assertDate(r, "2026-05-18T09:00:00-03:00", "en 2 semanas");
});

// ─── Absolute dates ───────────────────────────────────────────────────────────

Deno.test("10/5 → 10 May (DD/MM)", () => {
  const r = parseNLDate("10/5", dt("2026-05-04T14:00:00-03:00"), TZ);
  assertDate(r, "2026-05-10T09:00:00-03:00", "10/5 DD/MM");
});

Deno.test("5/10 → 5 October (DD/MM, not US)", () => {
  const r = parseNLDate("5/10", dt("2026-05-04T14:00:00-03:00"), TZ);
  assertDate(r, "2026-10-05T09:00:00-03:00", "5/10 DD/MM");
});

Deno.test("10/5 already passed → next year", () => {
  const r = parseNLDate("10/5", dt("2026-05-15T14:00:00-03:00"), TZ);
  assertDate(r, "2027-05-10T09:00:00-03:00", "10/5 past → next year");
});

Deno.test("10/5 a las 14:00 → 10 May 14:00", () => {
  const r = parseNLDate("10/5 a las 14:00", dt("2026-05-04T14:00:00-03:00"), TZ);
  assertDate(r, "2026-05-10T14:00:00-03:00", "10/5 a las 14:00");
});

// ─── Time handling ────────────────────────────────────────────────────────────

Deno.test("mañana temprano → tomorrow 09:00", () => {
  const r = parseNLDate("mañana temprano", dt("2026-05-04T14:00:00-03:00"), TZ);
  assertDate(r, "2026-05-05T09:00:00-03:00", "mañana temprano");
});

Deno.test("mañana tarde → tomorrow 15:00", () => {
  const r = parseNLDate("mañana tarde", dt("2026-05-04T14:00:00-03:00"), TZ);
  assertDate(r, "2026-05-05T15:00:00-03:00", "mañana tarde");
});

Deno.test("mañana noche → tomorrow 20:00", () => {
  const r = parseNLDate("mañana noche", dt("2026-05-04T14:00:00-03:00"), TZ);
  assertDate(r, "2026-05-05T20:00:00-03:00", "mañana noche");
});

Deno.test("a las 3 → 15:00 (business hours PM default)", () => {
  const r = parseNLDate("a las 3", dt("2026-05-04T14:00:00-03:00"), TZ);
  assertDate(r, "2026-05-04T15:00:00-03:00", "a las 3 → 15:00");
});

Deno.test("a las 10 → 10:00 (morning)", () => {
  const r = parseNLDate("hoy a las 10", dt("2026-05-04T08:00:00-03:00"), TZ);
  assertDate(r, "2026-05-04T10:00:00-03:00", "a las 10");
});

// ─── Ambiguity / clarification ────────────────────────────────────────────────

Deno.test("bare 'lunes' → needs clarification with options", () => {
  const r = parseNLDate("lunes", dt("2026-05-04T14:00:00-03:00"), TZ);
  assertClarification(r, "bare lunes");
  assertEquals(r.options?.length, 2, "should offer 2 options");
});

Deno.test("'mañana lunes' when tomorrow is Tuesday → conflict", () => {
  // May 4 is Monday, mañana = May 5 (Tuesday) but user says 'lunes' → conflict
  const r = parseNLDate("mañana lunes", dt("2026-05-04T14:00:00-03:00"), TZ);
  assertClarification(r, "mañana lunes conflict");
});

// ─── Confidence ───────────────────────────────────────────────────────────────

Deno.test("explicit time raises confidence above default", () => {
  const withTime    = parseNLDate("mañana a las 10", dt("2026-05-04T14:00:00-03:00"), TZ);
  const withDefault = parseNLDate("mañana", dt("2026-05-04T14:00:00-03:00"), TZ);
  assertEquals(withTime.confidence > withDefault.confidence, true, "explicit time → higher confidence");
});
