import { useState } from 'react';
import { Badge, Icons, MonoLabel } from '../../components/ui';
import { useClinic } from '../../hooks/useClinic';
import { useWaitingList } from '../../hooks/useWaitingList';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso + 'T12:00:00Z').toLocaleDateString('es-UY', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

function fmtCreated(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-UY', {
    day: 'numeric', month: 'short', timeZone: 'America/Montevideo',
  });
}

const STATUS_MAP = {
  pending:   { label: 'Pendiente', tone: 'warn'    },
  notified:  { label: 'Avisado',   tone: 'success'  },
  cancelled: { label: 'Cancelado', tone: 'outline'  },
};

const FILTERS = [
  { key: 'all',       label: 'Todos'      },
  { key: 'pending',   label: 'Pendientes' },
  { key: 'notified',  label: 'Avisados'   },
  { key: 'cancelled', label: 'Cancelados' },
];

// ─── Row ──────────────────────────────────────────────────────────────────────

function WaitlistRow({ entry, onNotify, onCancel, onDelete, updating, deleting }) {
  const { label: statusLabel, tone: statusTone } = STATUS_MAP[entry.status] ?? STATUS_MAP.pending;
  const busy = updating === entry.id || deleting === entry.id;

  const dateRange = (entry.date_from || entry.date_to)
    ? [fmtDate(entry.date_from), fmtDate(entry.date_to)].filter(Boolean).join(' → ')
    : null;

  const displayName = entry.patients?.full_name || entry.full_name || entry.phone_number || '—';

  return (
    <tr className="group border-b border-[var(--cq-border)] last:border-0 hover:bg-[var(--cq-surface-2)] transition-colors">
      {/* Nombre + teléfono */}
      <td className="py-3 px-4">
        <div className="text-[13.5px] font-medium text-[var(--cq-fg)]">{displayName}</div>
        <div className="text-[12px] text-[var(--cq-fg-muted)] font-mono mt-0.5">{entry.phone_number}</div>
      </td>

      {/* Servicio */}
      <td className="py-3 px-4 text-[13px] text-[var(--cq-fg)]">
        {entry.service || <span className="text-[var(--cq-fg-muted)] italic">Sin especificar</span>}
      </td>

      {/* Fechas preferidas */}
      <td className="py-3 px-4 text-[12.5px] text-[var(--cq-fg-muted)]">
        {dateRange ?? <span className="text-[var(--cq-fg-muted)]">—</span>}
      </td>

      {/* Estado */}
      <td className="py-3 px-4">
        <Badge tone={statusTone}>{statusLabel}</Badge>
      </td>

      {/* Recibido */}
      <td className="py-3 px-4 text-[12px] text-[var(--cq-fg-muted)]">
        {fmtCreated(entry.created_at)}
      </td>

      {/* Acciones */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {entry.status === 'pending' && (
            <button
              onClick={() => onNotify(entry.id)}
              disabled={busy}
              title="Marcar como avisado"
              className="h-7 px-2 rounded-[6px] text-[11.5px] font-medium bg-[var(--cq-success)]/10 text-[var(--cq-success)] hover:bg-[var(--cq-success)]/20 disabled:opacity-40 transition-colors"
            >
              Avisar
            </button>
          )}
          {entry.status === 'pending' && (
            <button
              onClick={() => onCancel(entry.id)}
              disabled={busy}
              title="Cancelar solicitud"
              className="h-7 px-2 rounded-[6px] text-[11.5px] font-medium text-[var(--cq-fg-muted)] hover:bg-[var(--cq-surface-3)] disabled:opacity-40 transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={() => onDelete(entry.id)}
            disabled={busy}
            title="Eliminar"
            className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[var(--cq-fg-muted)] hover:bg-[var(--cq-danger)]/10 hover:text-[var(--cq-danger)] disabled:opacity-40 transition-colors"
          >
            {deleting === entry.id
              ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
              : <Icons.Close size={12} />
            }
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ListaEspera() {
  const { clinic } = useClinic();
  const { entries, loading, error, updateStatus, deleteEntry } = useWaitingList(clinic?.id);

  const [filter,   setFilter]   = useState('all');
  const [search,   setSearch]   = useState('');
  const [updating, setUpdating] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const filtered = entries.filter(e => {
    // 1. status filter — normalize to guard against trailing spaces or case differences
    const statusVal = (e.status ?? '').toLowerCase().trim();
    if (filter !== 'all' && statusVal !== filter) return false;
    // 2. search (only applied when there's text)
    if (!search) return true;
    const q   = search.toLowerCase();
    const name = (e.patients?.full_name ?? e.full_name ?? '').toLowerCase();
    const tel  = e.phone_number ?? '';
    const svc  = (e.service ?? '').toLowerCase();
    return name.includes(q) || tel.includes(q) || svc.includes(q);
  });

  const pendingCount = entries.filter(e => (e.status ?? '').toLowerCase().trim() === 'pending').length;

  async function handleNotify(id) {
    setUpdating(id);
    try { await updateStatus(id, 'notified'); }
    catch { /* silencioso */ }
    finally { setUpdating(null); }
  }

  async function handleCancel(id) {
    setUpdating(id);
    try { await updateStatus(id, 'cancelled'); }
    catch { /* silencioso */ }
    finally { setUpdating(null); }
  }

  async function handleDelete(id) {
    setDeleting(id);
    try { await deleteEntry(id); }
    catch { /* silencioso */ }
    finally { setDeleting(null); }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--cq-fg)]">Lista de espera</h1>
          <p className="text-[13px] text-[var(--cq-fg-muted)] mt-0.5">
            Pacientes que pidieron ser avisados cuando se libere un turno
            {pendingCount > 0 && (
              <span className="ml-2 text-[var(--cq-warn)] font-medium">
                · {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Error — tabla no existe */}
      {error && (
        <div className="mb-4 p-3 rounded-[8px] border text-[13px]
          bg-[color-mix(in_oklch,var(--cq-danger)_8%,transparent)]
          border-[color-mix(in_oklch,var(--cq-danger)_20%,transparent)]
          text-[var(--cq-danger)]">
          {error.includes('relation "waiting_list" does not exist') || error.includes("relation 'waiting_list' does not exist")
            ? '⚠️ La tabla waiting_list aún no existe. Ejecutá la migración 20260507000004_waiting_list.sql en el SQL Editor de Supabase.'
            : error}
        </div>
      )}

      {/* Filters + search */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Filter pills */}
        <div className="flex items-center gap-1 p-1 rounded-[9px] bg-[var(--cq-surface)] border border-[var(--cq-border)]">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 h-7 rounded-[6px] text-[12.5px] font-medium transition-colors duration-150 ${
                filter === f.key
                  ? 'bg-[var(--cq-fg)] text-[var(--cq-bg)]'
                  : 'text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] hover:bg-[var(--cq-surface-2)]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cq-fg-muted)] pointer-events-none">
            <Icons.Search size={14} />
          </span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar nombre, teléfono, servicio…"
            className="w-full h-9 pl-9 pr-3 rounded-[8px] border border-[var(--cq-border)] bg-[var(--cq-surface-2)] text-[13px] text-[var(--cq-fg)] placeholder:text-[var(--cq-fg-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--cq-accent)] transition-shadow"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-14 animate-pulse bg-[var(--cq-surface-2)] rounded-[8px]" />
          ))}
        </div>
      ) : !error && filtered.length === 0 ? (
        <div className="py-16 text-center">
          <div className="flex justify-center mb-3 text-[var(--cq-fg-muted)] opacity-40">
            <Icons.Waitlist size={32} />
          </div>
          <p className="text-[14px] text-[var(--cq-fg-muted)]">
            {search || filter !== 'all'
              ? 'No hay resultados para ese filtro.'
              : 'No hay pacientes en lista de espera todavía.'}
          </p>
          {!search && filter === 'all' && (
            <p className="text-[12px] text-[var(--cq-fg-muted)] mt-1 opacity-70">
              Cuando el bot anote a alguien, aparecerá aquí.
            </p>
          )}
        </div>
      ) : !error ? (
        <div className="rounded-[10px] border border-[var(--cq-border)] overflow-hidden bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--cq-border)]">
              <th className="py-2.5 px-4 text-left font-normal"><MonoLabel>Paciente</MonoLabel></th>
              <th className="py-2.5 px-4 text-left font-normal"><MonoLabel>Servicio</MonoLabel></th>
              <th className="py-2.5 px-4 text-left font-normal"><MonoLabel>Fechas pref.</MonoLabel></th>
              <th className="py-2.5 px-4 text-left font-normal"><MonoLabel>Estado</MonoLabel></th>
              <th className="py-2.5 px-4 text-left font-normal"><MonoLabel>Recibido</MonoLabel></th>
              <th className="py-2.5 px-4 text-left font-normal w-10" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(entry => (
              <WaitlistRow
                key={entry.id}
                entry={entry}
                onNotify={handleNotify}
                onCancel={handleCancel}
                onDelete={handleDelete}
                updating={updating}
                deleting={deleting}
              />
            ))}
          </tbody>
        </table>
        </div>
      ) : null}

      {/* Count footer */}
      {!error && !loading && filtered.length > 0 && (
        <p className="mt-3 text-[12px] text-[var(--cq-fg-muted)]">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} · {entries.length} en total
        </p>
      )}
    </div>
  );
}
