import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const UY_TZ              = 'America/Montevideo';
const STATUSES           = ['confirmed', 'pending', 'new', 'rescheduled', 'cancelled'];
const STATUSES_SET       = new Set(STATUSES);
const NO_SHOW_STATUSES   = new Set(['pending', 'new']);
const SKIP_COUNT_STATUSES = new Set(['cancelled', 'rescheduled']);

function getRangeStart(range) {
  const d = new Date();
  if      (range === '3m') d.setMonth(d.getMonth() - 3);
  else if (range === '6m') d.setMonth(d.getMonth() - 6);
  else if (range === '2a') d.setFullYear(d.getFullYear() - 2);
  else                     d.setMonth(d.getMonth() - 12); // '1a'
  return d.toISOString();
}

function buildMonthSeries(appts) {
  const monthMap = {};

  for (const appt of appts) {
    const dt  = new Date(appt.appointment_datetime);
    const yr  = dt.toLocaleDateString('en-CA', { year:  'numeric', timeZone: UY_TZ }).slice(0, 4);
    const mo  = dt.toLocaleDateString('en-CA', { month: '2-digit', timeZone: UY_TZ }).slice(-2);
    const key = `${yr}-${mo}`;

    if (!monthMap[key]) {
      monthMap[key] = { confirmed: 0, pending: 0, new: 0, rescheduled: 0, cancelled: 0 };
    }
    const s = appt.status;
    if (STATUSES_SET.has(s)) monthMap[key][s]++;
  }

  const allYears  = new Set(Object.keys(monthMap).map(k => k.slice(0, 4)));
  const multiYear = allYears.size > 1;

  return Object.keys(monthMap)
    .sort()
    .map(key => {
      const [yr, mo] = key.split('-');
      const d          = new Date(`${key}-15T12:00:00`);
      const monthShort = d.toLocaleDateString('es-UY', { month: 'short', timeZone: UY_TZ });
      const counts     = monthMap[key];
      const total      = STATUSES.reduce((acc, s) => acc + counts[s], 0);
      return {
        key,
        label:   multiYear ? `${monthShort} '${yr.slice(2)}` : monthShort,
        fullLabel: d.toLocaleDateString('es-UY', { month: 'long', year: 'numeric', timeZone: UY_TZ }),
        ...counts,
        total,
      };
    });
}

function buildQuarterSeries(monthSeries) {
  const quarterMap = {};

  for (const m of monthSeries) {
    const [yr, mo] = m.key.split('-');
    const q        = Math.ceil(parseInt(mo, 10) / 3);
    const qKey     = `${yr}-Q${q}`;

    if (!quarterMap[qKey]) {
      quarterMap[qKey] = {
        key:       qKey,
        label:     `T${q} '${yr.slice(2)}`,
        fullLabel: `Trimestre ${q} — ${yr}`,
        confirmed: 0, pending: 0, new: 0, rescheduled: 0, cancelled: 0, total: 0,
      };
    }
    for (const s of STATUSES) quarterMap[qKey][s] += m[s] ?? 0;
    quarterMap[qKey].total += m.total;
  }

  return Object.values(quarterMap).sort((a, b) => a.key.localeCompare(b.key));
}

export function useReportes(clinicId, range = '1a') {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!clinicId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const since = getRangeStart(range);

      try {
        // ── Intentar usar RPC get_report_summary (server-side, evita descargar todos los appointments) ──
        let rpcData = null;
        try {
          const { data: rpcResult, error: rpcErr } = await supabase.rpc('get_report_summary', {
            p_clinic_id: clinicId,
            p_since:     since,
          });
          if (rpcErr) throw rpcErr;
          rpcData = rpcResult;
        } catch (rpcErr) {
          console.warn('[useReportes] RPC get_report_summary not available, falling back to direct queries:', rpcErr.message);
        }

        if (cancelled) return;

        if (rpcData) {
          // ── Ruta RPC: mapear resultado del servidor al formato esperado por los componentes ──
          const {
            total        = 0,
            confirmed    = 0,
            cancelled: cancelled_count = 0,
            no_shows: noShows = 0,
            confirm_rate: confirmRate = 0,
            no_show_rate: noShowRate  = 0,
            by_month     = [],
            top_patients = [],
          } = rpcData;

          // by_month del RPC: [{ year, month, confirmed, pending, new, rescheduled, cancelled, total }]
          // Convertir al formato que usan buildMonthSeries / buildQuarterSeries
          const monthSeries = by_month.map(m => {
            const key = `${m.year}-${String(m.month).padStart(2, '0')}`;
            const d         = new Date(`${key}-15T12:00:00`);
            const allYears  = new Set(by_month.map(r => String(r.year)));
            const multiYear = allYears.size > 1;
            const monthShort = d.toLocaleDateString('es-UY', { month: 'short', timeZone: UY_TZ });
            return {
              key,
              label:     multiYear ? `${monthShort} '${String(m.year).slice(2)}` : monthShort,
              fullLabel: d.toLocaleDateString('es-UY', { month: 'long', year: 'numeric', timeZone: UY_TZ }),
              confirmed:   m.confirmed   ?? 0,
              pending:     m.pending     ?? 0,
              new:         m.new         ?? 0,
              rescheduled: m.rescheduled ?? 0,
              cancelled:   m.cancelled   ?? 0,
              total:       m.total       ?? 0,
            };
          });
          const quarterSeries = buildQuarterSeries(monthSeries);

          // top_patients del RPC devuelve [{ patient_id, visit_count }] — NO trae
          // nombre ni próximo turno (bug detectado en QA 2026-07-08: se mapeaba
          // p.id/p.name/p.visits, campos inexistentes → tabla en blanco). Se
          // enriquece con un lookup de nombres + próximo turno, igual que el fallback.
          const topIds = top_patients.map(p => p.patient_id).filter(Boolean);

          // msgCount, autoStats, nombres y próximos turnos — todo en paralelo
          const [
            { count: msgCount },
            { data: autoStats },
            { data: tpNames },
            { data: tpNext },
          ] = await Promise.all([
            supabase
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .eq('clinic_id', clinicId)
              .in('direction', ['outbound', 'outbound_ai', 'system_template'])
              .gte('created_at', since),
            supabase
              .from('v_automation_stats')
              .select('total_sent, ok, success_rate, last_sent_at')
              .eq('clinic_id', clinicId)
              .maybeSingle(),
            topIds.length
              ? supabase.from('patients').select('id, full_name').in('id', topIds)
              : Promise.resolve({ data: [] }),
            topIds.length
              ? supabase.from('appointments')
                  .select('patient_id, appointment_datetime')
                  .eq('clinic_id', clinicId)
                  .in('patient_id', topIds)
                  .in('status', ['new', 'pending', 'confirmed'])
                  .gte('appointment_datetime', new Date().toISOString())
                  .order('appointment_datetime', { ascending: true })
              : Promise.resolve({ data: [] }),
          ]);

          const nameById = {};
          for (const p of (tpNames ?? [])) nameById[p.id] = p.full_name;
          const nextById = {};
          for (const a of (tpNext ?? [])) {
            if (!nextById[a.patient_id]) nextById[a.patient_id] = a.appointment_datetime;
          }

          const topPatients = top_patients.map(p => ({
            id:     p.patient_id,
            name:   nameById[p.patient_id] ?? 'Paciente',
            visits: p.visit_count,
            next:   nextById[p.patient_id]
              ? new Date(nextById[p.patient_id]).toLocaleDateString('es-UY', {
                  day: 'numeric', month: 'short', timeZone: UY_TZ,
                })
              : '—',
          }));

          if (!cancelled) {
            setData({
              confirmRate,
              cancelled: cancelled_count,
              total,
              confirmed,
              noShows,
              noShowRate,
              msgCount:     msgCount ?? 0,
              monthSeries,
              quarterSeries,
              topPatients,
              autoStats:    autoStats ?? null,
            });
            setLoading(false);
          }

        } else {
          // ── Fallback: queries directas (mismo código original) ──
          const [
            { data: appts, error: apptErr },
            { count: msgCount },
            { data: autoStats },
          ] = await Promise.all([
            supabase
              .from('appointments')
              .select('id, status, appointment_datetime, patient_id')
              .eq('clinic_id', clinicId)
              .gte('appointment_datetime', since),

            supabase
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .eq('clinic_id', clinicId)
              .in('direction', ['outbound', 'outbound_ai', 'system_template'])
              .gte('created_at', since),

            supabase
              .from('v_automation_stats')
              .select('total_sent, ok, success_rate, last_sent_at')
              .eq('clinic_id', clinicId)
              .maybeSingle(),
          ]);

          if (cancelled) return;
          if (apptErr) throw apptErr;

          const allAppts  = appts ?? [];
          const total     = allAppts.length;
          const confirmed = allAppts.filter(a => a.status === 'confirmed').length;
          const cancelled_count = allAppts.filter(a => a.status === 'cancelled').length;
          const confirmRate = total > 0 ? Math.round(confirmed / total * 100) : 0;

          // ── No-shows: past appointments still in pending/new (never confirmed/cancelled) ──
          const noShowCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
          const noShows      = allAppts.filter(
            a => NO_SHOW_STATUSES.has(a.status) && a.appointment_datetime < noShowCutoff,
          ).length;
          const noShowRate   = total > 0 ? Math.round(noShows / total * 100) : 0;

          // ── Series ────────────────────────────────────────────────────────────
          const monthSeries   = buildMonthSeries(allAppts);
          const quarterSeries = buildQuarterSeries(monthSeries);

          // ── Top 5 patients ────────────────────────────────────────────────────
          const patientCounts = {};
          for (const appt of allAppts) {
            if (appt.patient_id && !SKIP_COUNT_STATUSES.has(appt.status)) {
              patientCounts[appt.patient_id] = (patientCounts[appt.patient_id] ?? 0) + 1;
            }
          }

          const topIds = Object.entries(patientCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id]) => id);

          let topPatients = [];
          if (topIds.length > 0) {
            const [{ data: patients }, { data: nextAppts }] = await Promise.all([
              supabase.from('patients').select('id, full_name').in('id', topIds),
              supabase
                .from('appointments')
                .select('patient_id, appointment_datetime')
                .eq('clinic_id', clinicId)
                .in('patient_id', topIds)
                .in('status', ['new', 'pending', 'confirmed'])
                .gte('appointment_datetime', new Date().toISOString())
                .order('appointment_datetime', { ascending: true }),
            ]);

            const nextByPatient = {};
            for (const a of (nextAppts ?? [])) {
              if (!nextByPatient[a.patient_id]) nextByPatient[a.patient_id] = a.appointment_datetime;
            }

            topPatients = topIds.map(id => {
              const p     = patients?.find(p => p.id === id);
              const nextDt = nextByPatient[id];
              return {
                id,
                name:   p?.full_name ?? 'Paciente',
                visits: patientCounts[id],
                next:   nextDt
                  ? new Date(nextDt).toLocaleDateString('es-UY', {
                      day: 'numeric', month: 'short', timeZone: UY_TZ,
                    })
                  : '—',
              };
            });
          }

          if (!cancelled) {
            setData({
              confirmRate,
              cancelled: cancelled_count,
              total,
              confirmed,
              noShows,
              noShowRate,
              msgCount:     msgCount ?? 0,
              monthSeries,
              quarterSeries,
              topPatients,
              autoStats:    autoStats ?? null,
            });
            setLoading(false);
          }
        }

      } catch (err) {
        if (!cancelled) {
          setError(err.message ?? 'Error al cargar reportes');
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [clinicId, range]);

  return { data, loading, error };
}
