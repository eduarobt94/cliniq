import { useState, useCallback, useMemo } from 'react';
import { useAuth }         from '../../context/AuthContext';
import { useWaitingList }  from '../../hooks/useWaitingList';
import { supabase }        from '../../lib/supabase';
import { Card, MonoLabel, Badge, Icons, useToast } from '../../components/ui';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  waiting:  { label: 'Esperando',  tone: 'warn'    },
  notified: { label: 'Notificado', tone: 'accent'  },
  booked:   { label: 'Agendado',   tone: 'success' },
  expired:  { label: 'Expirado',   tone: 'neutral' },
  cancelled:{ label: 'Cancelado',  tone: 'danger'  },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-[var(--cq-surface-3)] rounded ${className}`} />;
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="size-10 rounded-full bg-[var(--cq-surface-2)] flex items-center justify-center text-[var(--cq-fg-muted)]">
        <Icons.Bell size={18} />
      </div>
      <p className="text-[14px] font-medium text-[var(--cq-fg)]">Sin pacientes en lista de espera</p>
      <p className="text-[12.5px] text-[var(--cq-fg-muted)] max-w-[300px]">
        Cuando un paciente pida anotarse, aparecerá aquí. También se agrega automáticamente vía WhatsApp.
      </p>
    </div>
  );
}

// ─── Format date range ────────────────────────────────────────────────────────

function formatDateRange(from, to) {
  if (!from && !to) return '—';
  const fmt = (d) => new Date(d + 'T12:00:00').toLocaleDateString('es-UY', {
    day: 'numeric', month: 'short',
  });
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return `Desde ${fmt(from)}`;
  return `Hasta ${fmt(to)}`;
}

// ─── Row actions ──────────────────────────────────────────────────────────────

function WaitlistRow({ entry, onStatusChange }) {
  const [loading, setLoading] = useState(false);
  const patient = entry.patients;
  const statusCfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.waiting;
  const createdAtStr = new Date(entry.created_at).toLocaleDateString('es-UY', {
    day: 'numeric', month: 'short', year: '2-digit',
  });

  const handleMark = async (newStatus) => {
    setLoading(true);
    await onStatusChange(entry.id, newStatus);
    setLoading(false);
  };

  return (
    <tr className="border-b border-[var(--cq-border)] last:border-0 hover:bg-[var(--cq-surface-2)] transition-colors">
      {/* Paciente */}
      <td className="py-3 pl-4 pr-2">
        <div className="text-[13.5px] font-medium text-[var(--cq-fg)]">{patient?.full_name ?? '—'}</div>
        <div className="text-[11.5px] text-[var(--cq-fg-muted)] font-mono">{patient?.phone_number ?? ''}</div>
      </td>

      {/* Servicio */}
      <td className="py-3 px-2 text-[13px] text-[var(--cq-fg-muted)]">
        {entry.service ?? <span className="italic text-[var(--cq-fg-muted)]">Cualquiera</span>}
      </td>

      {/* Fechas preferidas */}
      <td className="py-3 px-2 text-[12.5px] font-mono text-[var(--cq-fg-muted)]">
        {formatDateRange(entry.preferred_date_from, entry.preferred_date_to)}
      </td>

      {/* Estado */}
      <td className="py-3 px-2">
        <Badge tone={statusCfg.tone}>{statusCfg.label}</Badge>
      </td>

      {/* Anotado */}
      <td className="py-3 px-2 text-[12px] text-[var(--cq-fg-muted)]">
        {createdAtStr}
      </td>

      {/* Acciones */}
      <td className="py-3 px-2 pr-4">
        {(entry.status === 'waiting' || entry.status === 'notified') && (
          <div className="flex items-center gap-1.5">
            {/* Mark as notified — only for 'waiting' entries */}
            {entry.status === 'waiting' && (
              <button
                onClick={() => handleMark('notified')}
                disabled={loading}
                title="Marcar como notificado"
                className="p-1.5 rounded-[6px] text-[var(--cq-accent)] hover:bg-[color-mix(in_oklch,var(--cq-accent)_12%,transparent)] transition-colors disabled:opacity-50"
              >
                <Icons.Bell size={14} />
              </button>
            )}
            {/* Mark as booked */}
            <button
              onClick={() => handleMark('booked')}
              disabled={loading}
              title="Marcar como agendado"
              className="p-1.5 rounded-[6px] text-[var(--cq-success)] hover:bg-[color-mix(in_oklch,var(--cq-success)_12%,transparent)] transition-colors disabled:opacity-50"
            >
              <Icons.Check size={14} />
            </button>
            {/* Remove */}
            <button
              onClick={() => handleMark('cancelled')}
              disabled={loading}
              title="Eliminar de la lista"
              className="p-1.5 rounded-[6px] text-[var(--cq-fg-muted)] hover:text-[var(--cq-danger)] hover:bg-[color-mix(in_oklch,var(--cq-danger)_12%,transparent)] transition-colors disabled:opacity-50"
            >
              <Icons.Trash size={14} />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Manual add form ──────────────────────────────────────────────────────────

function AddToWaitlistForm({ clinicId, onSuccess, onCancel }) {
  const [search,    setSearch]   = useState('');
  const [results,   setResults]  = useState([]);
  const [patient,   setPatient]  = useState(null);
  const [service,   setService]  = useState('');
  const [dateFrom,  setDateFrom] = useState('');
  const [dateTo,    setDateTo]   = useState('');
  const [notes,     setNotes]    = useState('');
  const [saving,    setSaving]   = useState(false);
  const [err,       setErr]      = useState('');

  const handleSearch = async (q) => {
    setSearch(q);
    setPatient(null);
    if (q.trim().length < 2) { setResults([]); return; }
    const { data } = await supabase
      .from('patients')
      .select('id, full_name, phone_number')
      .eq('clinic_id', clinicId)
      .or(`full_name.ilike.%${q}%,phone_number.ilike.%${q}%`)
      .limit(8);
    setResults(data ?? []);
  };

  const handleSubmit = async () => {
    if (!patient) { setErr('Seleccioná un paciente.'); return; }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setErr('La fecha de inicio debe ser anterior a la de fin.');
      return;
    }
    setErr('');
    setSaving(true);
    const { error: insertErr } = await supabase.from('waiting_list').insert({
      clinic_id:          clinicId,
      patient_id:         patient.id,
      service:            service.trim() || null,
      preferred_date_from: dateFrom || null,
      preferred_date_to:   dateTo   || null,
      notes:              notes.trim() || null,
      status:             'waiting',
    });
    setSaving(false);
    if (insertErr) {
      setErr(insertErr.message);
    } else {
      onSuccess?.();
    }
  };

  const inputCls = 'w-full h-8 rounded-[7px] border border-[var(--cq-border)] bg-[var(--cq-surface)] px-3 text-[13px] text-[var(--cq-fg)] placeholder:text-[var(--cq-fg-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--cq-accent)]';

  return (
    <div className="border border-[var(--cq-border)] rounded-[10px] bg-[var(--cq-surface-2)] p-4 flex flex-col gap-3">
      <p className="text-[13px] font-medium text-[var(--cq-fg)]">Agregar a lista de espera</p>

      {/* Patient search */}
      <div className="relative">
        <input
          className={inputCls}
          placeholder="Buscar paciente por nombre o teléfono…"
          value={patient ? patient.full_name : search}
          onChange={e => { setPatient(null); handleSearch(e.target.value); }}
        />
        {results.length > 0 && !patient && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[8px] shadow-lg overflow-hidden">
            {results.map(p => (
              <button
                key={p.id}
                onClick={() => { setPatient(p); setSearch(''); setResults([]); }}
                className="w-full text-left px-3 py-2 text-[13px] hover:bg-[var(--cq-surface-2)] transition-colors"
              >
                <span className="font-medium text-[var(--cq-fg)]">{p.full_name}</span>
                {p.phone_number && (
                  <span className="ml-2 text-[11.5px] font-mono text-[var(--cq-fg-muted)]">{p.phone_number}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Service */}
      <input
        className={inputCls}
        placeholder="Servicio (opcional)"
        value={service}
        onChange={e => setService(e.target.value)}
      />

      {/* Date range */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] text-[var(--cq-fg-muted)] mb-0.5 block">Desde</label>
          <input type="date" className={inputCls} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="text-[11px] text-[var(--cq-fg-muted)] mb-0.5 block">Hasta</label>
          <input type="date" className={inputCls} value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      </div>

      {/* Notes */}
      <textarea
        className={`${inputCls} h-16 resize-none pt-1.5`}
        placeholder="Notas internas (opcional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />

      {err && <p className="text-[12px] text-[var(--cq-danger)]">{err}</p>}

      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={onCancel}
          disabled={saving}
          className="h-7 px-3 rounded-[6px] text-[12.5px] text-[var(--cq-fg-muted)] hover:bg-[var(--cq-surface-3)] transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !patient}
          className="h-7 px-3 rounded-[6px] text-[12.5px] font-medium bg-[var(--cq-fg)] text-[var(--cq-bg)] hover:opacity-80 disabled:opacity-50 transition-opacity"
        >
          {saving ? 'Guardando…' : 'Agregar'}
        </button>
      </div>
    </div>
  );
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

const FILTERS = [
  { id: 'waiting',  label: 'En espera'  },
  { id: 'notified', label: 'Notificados'},
  { id: 'all',      label: 'Todos'      },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export function ListaEspera() {
  const { clinic }              = useAuth();
  const [filter, setFilter]     = useState('waiting');
  const [showForm, setShowForm] = useState(false);
  const { toast }               = useToast();

  const statusFilter = filter === 'all' ? null : filter;
  const { entries, loading, error, refetch } = useWaitingList(clinic?.id, statusFilter);

  const handleStatusChange = useCallback(async (entryId, newStatus) => {
    const { error: updateErr } = await supabase
      .from('waiting_list')
      .update({
        status:      newStatus,
        notified_at: newStatus === 'notified' ? new Date().toISOString() : undefined,
      })
      .eq('id', entryId);

    if (updateErr) {
      toast({ title: 'Error al actualizar', description: updateErr.message, tone: 'danger' });
    } else {
      const msg = {
        notified: 'Marcado como notificado',
        booked:   'Marcado como agendado',
        cancelled:'Eliminado de la lista',
      }[newStatus] ?? 'Estado actualizado';
      toast({ title: msg, tone: 'success' });
      refetch();
    }
  }, [toast, refetch]);

  const waitingCount = useMemo(() => entries.filter(e => e.status === 'waiting').length, [entries]);

  return (
    <div className="flex flex-col gap-6 max-w-[1100px] mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold text-[var(--cq-fg)]">Lista de espera</h1>
          <p className="text-[13.5px] text-[var(--cq-fg-muted)] mt-0.5">
            Pacientes que esperan un turno disponible
          </p>
        </div>
        <div className="flex items-center gap-3">
          {waitingCount > 0 && (
            <Badge tone="warn" dot>{waitingCount} en espera</Badge>
          )}
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-[8px] text-[12.5px] font-medium bg-[var(--cq-fg)] text-[var(--cq-bg)] hover:opacity-80 transition-opacity"
          >
            <Icons.Plus size={13} />
            Agregar manualmente
          </button>
        </div>
      </div>

      {/* Manual add form */}
      {showForm && (
        <AddToWaitlistForm
          clinicId={clinic?.id}
          onSuccess={() => { setShowForm(false); refetch(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Error */}
      {error && (
        <div className="rounded-[10px] bg-[color-mix(in_oklch,var(--cq-danger)_12%,transparent)] border border-[color-mix(in_oklch,var(--cq-danger)_30%,transparent)] px-4 py-3 text-[13px] text-[var(--cq-danger)]">
          Error al cargar la lista: {error}
        </div>
      )}

      {/* Info banner */}
      <div className="rounded-[10px] bg-[color-mix(in_oklch,var(--cq-accent)_8%,transparent)] border border-[color-mix(in_oklch,var(--cq-accent)_20%,transparent)] px-4 py-3 flex items-start gap-3">
        <Icons.Info size={15} className="text-[var(--cq-accent)] mt-0.5 shrink-0" />
        <p className="text-[12.5px] text-[var(--cq-fg-muted)]">
          Cuando un turno se cancela, el sistema notifica automáticamente a los pacientes en espera por WhatsApp.
          También pueden anotarse enviando un mensaje al bot.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[9px] p-1 w-fit">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`px-3 h-7 rounded-[6px] text-[12px] font-medium transition-colors duration-150 ${
              filter === id
                ? 'bg-[var(--cq-fg)] text-[var(--cq-bg)]'
                : 'text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] hover:bg-[var(--cq-surface-2)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card padded={false}>
        {loading ? (
          <div className="flex flex-col gap-2 p-4">
            {['sk-1','sk-2','sk-3','sk-4'].map(k => <Skeleton key={k} className="h-12 w-full" />)}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--cq-border)]">
                  <th scope="col" className="py-2.5 pl-4 pr-2"><MonoLabel>Paciente</MonoLabel></th>
                  <th scope="col" className="py-2.5 px-2"><MonoLabel>Servicio</MonoLabel></th>
                  <th scope="col" className="py-2.5 px-2"><MonoLabel>Fechas preferidas</MonoLabel></th>
                  <th scope="col" className="py-2.5 px-2"><MonoLabel>Estado</MonoLabel></th>
                  <th scope="col" className="py-2.5 px-2"><MonoLabel>Anotado</MonoLabel></th>
                  <th scope="col" className="py-2.5 px-2 pr-4"><MonoLabel>Acciones</MonoLabel></th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => (
                  <WaitlistRow
                    key={entry.id}
                    entry={entry}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
