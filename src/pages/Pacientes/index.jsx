import { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Badge, Card, Avatar, Icons, MonoLabel } from '../../components/ui';
import { usePatients } from '../../hooks/usePatients';
import { useClinic } from '../../hooks/useClinic';
import { deletePatient, updatePatient } from '../../lib/appointmentService';
import { filterPhoneInput } from '../../lib/phoneUtils';
import { AddPatientModal } from '../../components/AddPatientModal';

const NAME_RE  = /^[a-zA-ZÀ-ÿ\s'\-]+$/;
const PHONE_RE = /^\+?[0-9]{7,15}$/;

function validateName(value) {
  const v = value.trim();
  if (v.length === 0)   return 'El nombre es obligatorio.';
  if (v.length < 2)     return 'El nombre debe tener al menos 2 caracteres.';
  if (v.length > 100)   return 'El nombre no puede superar los 100 caracteres.';
  if (!NAME_RE.test(v)) return 'El nombre solo puede contener letras.';
  return null;
}

function validatePhone(value) {
  const v = value.trim();
  if (v.length === 0) return null;
  if (!PHONE_RE.test(v)) return 'Ingresá un teléfono válido (7-15 dígitos, puede empezar con +).';
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-UY', { day: 'numeric', month: 'short', year: 'numeric' });
}

const NO_SHOW_CUTOFF_MS    = 2 * 60 * 60 * 1000; // 2 hours
const NO_SHOW_STATUSES_SET = new Set(['pending', 'new']);

function derivePatient(raw) {
  const now    = new Date();
  const cutoff = new Date(now - NO_SHOW_CUTOFF_MS);
  const appts  = raw.appointments ?? [];
  const past   = appts
    .filter(a => new Date(a.appointment_datetime) < now)
    .sort((a, b) => new Date(b.appointment_datetime) - new Date(a.appointment_datetime));
  const future = appts
    .filter(a => new Date(a.appointment_datetime) >= now)
    .sort((a, b) => new Date(a.appointment_datetime) - new Date(b.appointment_datetime));

  const lastVisit = past[0]?.appointment_datetime ?? null;
  const nextAppt  = future[0]?.appointment_datetime ?? null;

  // No-show: past appointment still in pending/new (no confirmation, no cancellation)
  const noShowCount = appts.filter(
    a => NO_SHOW_STATUSES_SET.has(a.status) && new Date(a.appointment_datetime) < cutoff,
  ).length;

  let status = 'activo';
  if (appts.length === 0) {
    status = 'nuevo';
  } else if (!nextAppt && lastVisit) {
    const daysSince = (now - new Date(lastVisit)) / 86_400_000;
    if (daysSince > 90) status = 'inactivo';
  }

  return { ...raw, lastVisit, nextAppt, status, appointmentCount: appts.length, noShowCount };
}

// ─── Status + filters ─────────────────────────────────────────────────────────
const STATUS_MAP = {
  activo:   { tone: 'success', label: 'Activo'   },
  inactivo: { tone: 'outline', label: 'Inactivo' },
  nuevo:    { tone: 'accent',  label: 'Nuevo'    },
};

const FILTERS = [
  { key: 'all',      label: 'Todos'     },
  { key: 'activo',   label: 'Activos'   },
  { key: 'nuevo',    label: 'Nuevos'    },
  { key: 'inactivo', label: 'Inactivos' },
];

// ─── Edit patient modal ───────────────────────────────────────────────────────
const EMPTY_PATIENTS = [];
function EditPatientModal({ patient, onClose, onSuccess, existingPatients = EMPTY_PATIENTS }) {
  const [name,    setName]    = useState(patient.full_name);
  const [phone,   setPhone]   = useState(patient.phone_number);
  const [saving,  setSaving]  = useState(false);
  const [nameErr, setNameErr] = useState(null);
  const [phoneErr,setPhoneErr]= useState(null);
  const [formErr, setFormErr] = useState(null);
  const nameRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const handleSubmit = async () => {
    const nErr = validateName(name);
    const pErr = phone.trim() ? validatePhone(phone) : 'El teléfono es obligatorio.';
    setNameErr(nErr);
    setPhoneErr(pErr);
    if (nErr || pErr) return;

    const nameLower = name.trim().toLowerCase();
    const dupName = existingPatients.some(
      p => p.id !== patient.id && p.full_name.trim().toLowerCase() === nameLower
    );
    if (dupName) {
      setFormErr('Ya existe un paciente con ese nombre en esta clínica.');
      return;
    }
    setFormErr(null);
    setSaving(true);
    try {
      await updatePatient(patient.id, { fullName: name.trim(), phoneNumber: phone.trim() });
      onSuccess();
    } catch (err) {
      const msg = err?.message ?? '';
      if (msg.includes('23505') || msg.includes('unique') || msg.includes('phone')) {
        setFormErr('Ya existe un paciente con ese número de teléfono.');
      } else {
        setFormErr('No se pudo actualizar. Intentá más tarde.');
      }
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-patient-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="cq-backdrop-in absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className="cq-modal-in relative w-full max-w-[400px] bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[16px] p-6"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <MonoLabel>Editar paciente</MonoLabel>
            <h3 id="edit-patient-title" className="mt-1 text-[20px] font-semibold tracking-tight">
              Editar datos
            </h3>
          </div>
          <button
            onClick={onClose}
            className="size-11 rounded-[8px] hover:bg-[var(--cq-surface-2)] flex items-center justify-center"
            aria-label="Cerrar modal"
          >
            <Icons.Close size={16} />
          </button>
        </div>

        <div className="space-y-3">
          {/* Name */}
          <div>
            <label htmlFor="edit-patient-name">
              <MonoLabel>Nombre completo *</MonoLabel>
            </label>
            <div className={`mt-1.5 flex items-center gap-2 h-11 px-3 rounded-[9px] border bg-[var(--cq-bg)] focus-within:border-[var(--cq-fg)] transition-colors ${nameErr ? 'border-[var(--cq-danger)]' : 'border-[var(--cq-border)]'}`}>
              <input
                id="edit-patient-name"
                ref={nameRef}
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setNameErr(null); setFormErr(null); }}
                onBlur={e => { const err = validateName(e.target.value); if (err) setNameErr(err); }}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="Nombre completo del paciente"
                maxLength={100}
                autoComplete="name"
                aria-invalid={nameErr ? 'true' : 'false'}
                aria-describedby={nameErr ? 'edit-patient-name-err' : undefined}
                className="flex-1 bg-transparent outline-none text-[13.5px]"
              />
            </div>
            {nameErr && (
              <p id="edit-patient-name-err" role="alert" className="text-[12.5px] text-[var(--cq-danger)] mt-1">
                {nameErr}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="edit-patient-phone">
              <MonoLabel>Teléfono *</MonoLabel>
            </label>
            <div className={`mt-1.5 flex items-center gap-2 h-11 px-3 rounded-[9px] border bg-[var(--cq-bg)] focus-within:border-[var(--cq-fg)] transition-colors ${phoneErr ? 'border-[var(--cq-danger)]' : 'border-[var(--cq-border)]'}`}>
              <input
                id="edit-patient-phone"
                type="tel"
                value={phone}
                onChange={e => { setPhone(filterPhoneInput(e.target.value)); setPhoneErr(null); setFormErr(null); }}
                onBlur={e => { const v = e.target.value.trim(); if (v) { const err = validatePhone(v); if (err) setPhoneErr(err); } }}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="+598 99 123 456"
                maxLength={16}
                autoComplete="tel"
                aria-invalid={phoneErr ? 'true' : 'false'}
                aria-describedby={phoneErr ? 'edit-patient-phone-err' : undefined}
                className="flex-1 bg-transparent outline-none text-[13.5px]"
              />
            </div>
            {phoneErr && (
              <p id="edit-patient-phone-err" role="alert" className="text-[12.5px] text-[var(--cq-danger)] mt-1">
                {phoneErr}
              </p>
            )}
          </div>

          {formErr && (
            <p role="alert" className="text-[12.5px] text-[var(--cq-danger)] mt-1">{formErr}</p>
          )}
        </div>

        <div className="mt-6 flex items-center gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={saving}
            className="h-9 px-4 rounded-[8px] text-[13.5px] font-medium text-[var(--cq-fg-muted)] hover:bg-[var(--cq-surface-2)] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="h-9 px-4 rounded-[8px] bg-[var(--cq-fg)] text-[var(--cq-bg)] text-[13.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 inline-flex items-center gap-2"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Patient actions menu (portal-based to escape overflow clipping) ──────────
function PatientActionsMenu({ patient, onEdit, onDelete }) {
  const [open,          setOpen]          = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [pos,           setPos]           = useState({ top: 0, right: 0 });
  const btnRef  = useRef(null);
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (
        menuRef.current  && !menuRef.current.contains(e.target) &&
        btnRef.current   && !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!open) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen(v => !v);
    if (open) setConfirmDelete(false);
  };

  const close = () => { setOpen(false); setConfirmDelete(false); setDeleting(false); };

  const handleDelete = async (e) => {
    e.stopPropagation();
    setDeleting(true);
    await onDelete(patient.id);
    close();
  };

  const menu = open && createPortal(
    <div
      ref={menuRef}
      className="fixed z-[200] w-52 bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[10px] shadow-xl overflow-hidden py-1"
      style={{ top: pos.top, right: pos.right }}
    >
      {confirmDelete ? (
        <div className="px-3 py-2.5">
          <p className="text-[12.5px] font-medium text-[var(--cq-fg)] mb-1 leading-snug">
            ¿Eliminar a {patient.full_name}?
          </p>
          <p className="text-[11.5px] text-[var(--cq-fg-muted)] mb-3 leading-snug">
            Esta acción eliminará al paciente y todos sus datos. No se puede deshacer.
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 h-7 rounded-[6px] bg-[var(--cq-danger)] text-white text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
              disabled={deleting}
              className="flex-1 h-7 rounded-[6px] text-[12px] font-medium text-[var(--cq-fg-muted)] border border-[var(--cq-border)] hover:bg-[var(--cq-surface-2)] transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(patient); close(); }}
            className="w-full text-left px-3 py-2 text-[13px] text-[var(--cq-fg)] hover:bg-[var(--cq-surface-2)] transition-colors"
          >
            Editar
          </button>
          <div className="h-px bg-[var(--cq-border)] mx-1 my-0.5" />
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
            className="w-full text-left px-3 py-2 text-[13px] text-[var(--cq-danger)] hover:bg-[var(--cq-surface-2)] transition-colors"
          >
            Eliminar
          </button>
        </>
      )}
    </div>,
    document.body
  );

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        aria-label="Acciones del paciente"
        className="opacity-0 group-hover:opacity-100 size-8 rounded-[6px] hover:bg-[var(--cq-surface-2)] flex items-center justify-center transition-opacity"
      >
        <Icons.More size={15} />
      </button>
      {menu}
    </>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
const SkeletonRow = memo(function SkeletonRow() {
  return (
    <tr>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="animate-pulse bg-[var(--cq-surface-2)] rounded-full size-9 shrink-0" />
          <div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-4 w-36" />
        </div>
      </td>
      <td className="px-5 py-3.5"><div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-4 w-32" /></td>
      <td className="px-5 py-3.5 hidden md:table-cell"><div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-4 w-24" /></td>
      <td className="px-5 py-3.5 hidden lg:table-cell"><div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-4 w-24" /></td>
      <td className="px-5 py-3.5 hidden xl:table-cell"><div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-4 w-8" /></td>
      <td className="px-5 py-3.5"><div className="animate-pulse bg-[var(--cq-surface-2)] rounded-full h-[22px] w-20" /></td>
      <td className="px-5 py-3.5 w-10" />
    </tr>
  );
});

// ─── Patient row ──────────────────────────────────────────────────────────────
const PatientRow = memo(function PatientRow({ patient, onEdit, onDelete }) {
  const { tone, label } = STATUS_MAP[patient.status] ?? STATUS_MAP.activo;
  return (
    <tr className="group border-b border-[var(--cq-border)] last:border-0 hover:bg-[var(--cq-surface-2)] transition-colors">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar name={patient.full_name} size={36} />
          <span className="text-[14px] font-medium truncate max-w-[180px]">{patient.full_name}</span>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <span className="font-mono text-[13px] text-[var(--cq-fg-muted)] whitespace-nowrap">{patient.phone_number}</span>
      </td>
      <td className="px-5 py-3.5 hidden md:table-cell">
        <span className="text-[13px] text-[var(--cq-fg-muted)]">{fmtDate(patient.lastVisit)}</span>
      </td>
      <td className="px-5 py-3.5 hidden lg:table-cell">
        <span className={`text-[13px] ${patient.nextAppt ? 'text-[var(--cq-fg)] font-medium' : 'text-[var(--cq-fg-muted)]'}`}>
          {fmtDate(patient.nextAppt)}
        </span>
      </td>
      <td className="px-5 py-3.5 hidden xl:table-cell">
        <span className="font-mono text-[13px] text-[var(--cq-fg-muted)]">{patient.appointmentCount}</span>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Badge tone={tone} dot>{label}</Badge>
          {patient.noShowCount > 0 && (
            <span
              title={`${patient.noShowCount} no-show${patient.noShowCount !== 1 ? 's' : ''}`}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] bg-[color-mix(in_oklch,var(--cq-warn)_15%,transparent)] text-[var(--cq-warn)] text-[11px] font-mono font-semibold leading-none"
            >
              !{patient.noShowCount}
            </span>
          )}
        </div>
      </td>
      <td className="px-5 py-3.5 w-10">
        <PatientActionsMenu patient={patient} onEdit={onEdit} onDelete={onDelete} />
      </td>
    </tr>
  );
});

// ─── Patient table with pagination ───────────────────────────────────────────
const PAGE_SIZE = 50;

function PatientTable({ loading, filtered, patients, onEdit, onDelete, onAddOpen }) {
  const [page, setPage] = useState(0);

  // Reset to first page whenever the filtered list changes (search / filter)
  useEffect(() => {
    setPage(0);
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages - 1);
  const paginated  = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-0">
      <div className="rounded-[12px] border border-[var(--cq-border)] overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--cq-border)] bg-[var(--cq-surface-2)]">
              <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-[var(--cq-fg-muted)] uppercase tracking-wide">Nombre</th>
              <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-[var(--cq-fg-muted)] uppercase tracking-wide">Teléfono</th>
              <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-[var(--cq-fg-muted)] uppercase tracking-wide hidden md:table-cell">Última visita</th>
              <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-[var(--cq-fg-muted)] uppercase tracking-wide hidden lg:table-cell">Próximo turno</th>
              <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-[var(--cq-fg-muted)] uppercase tracking-wide hidden xl:table-cell">Turnos</th>
              <th className="px-5 py-3 text-left text-[11.5px] font-semibold text-[var(--cq-fg-muted)] uppercase tracking-wide">Estado</th>
              <th className="px-5 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }, (_, i) => <SkeletonRow key={i} />)
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-[13px] text-[var(--cq-fg-muted)]">
                  {patients.length === 0
                    ? <>Todavía no hay pacientes. <button onClick={onAddOpen} className="underline hover:text-[var(--cq-fg)] transition-colors">Agregá el primero</button>.</>
                    : 'Sin resultados para esa búsqueda.'}
                </td>
              </tr>
            ) : (
              paginated.map(patient => (
                <PatientRow
                  key={patient.id}
                  patient={patient}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {!loading && filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-3 px-1">
          <span className="text-[12.5px] text-[var(--cq-fg-muted)]">
            Mostrando {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="h-8 px-3 rounded-[7px] text-[13px] font-medium border border-[var(--cq-border)] text-[var(--cq-fg-muted)] hover:bg-[var(--cq-surface-2)] hover:text-[var(--cq-fg)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ‹ Anterior
            </button>
            <span className="px-3 text-[12.5px] text-[var(--cq-fg-muted)]">
              Página {safePage + 1} de {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={safePage >= totalPages - 1}
              className="h-8 px-3 rounded-[7px] text-[13px] font-medium border border-[var(--cq-border)] text-[var(--cq-fg-muted)] hover:bg-[var(--cq-surface-2)] hover:text-[var(--cq-fg)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function Pacientes() {
  const { push } = useOutletContext() ?? {};
  const { clinic } = useClinic();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('q') ?? '');
  // MEDIO-10: la búsqueda va al servidor (encuentra pacientes más allá de los primeros 100)
  const { patients: rawPatients, loading, refetch: refetchPatients, totalCount, hasMore, searching } = usePatients(debouncedSearch);

  // Clear the URL param once applied so back-nav doesn't re-filter
  useEffect(() => {
    if (searchParams.get('q')) setSearchParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 300 ms debounce for search filtering
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  const [statusFilter,   setStatusFilter]   = useState('all');
  const [addOpen,        setAddOpen]        = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);

  const patients = useMemo(() => rawPatients.map(derivePatient), [rawPatients]);

  const filtered = useMemo(() => {
    let list = statusFilter !== 'all' ? patients.filter(p => p.status === statusFilter) : patients;
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(p =>
        p.full_name.toLowerCase().includes(q) ||
        (p.phone_number ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [patients, statusFilter, debouncedSearch]);

  const handleDelete = useCallback(async (patientId) => {
    try {
      await deletePatient(patientId);
      refetchPatients();
      push?.('Paciente eliminado.', 'success');
    } catch (err) {
      const msg = err?.message ?? '';
      if (msg.includes('23503') || msg.includes('foreign key') || msg.includes('violates')) {
        push?.('No se puede eliminar: el paciente tiene turnos registrados.', 'error');
      } else {
        push?.('No se pudo eliminar el paciente. Intentá más tarde.', 'error');
      }
    }
  }, [push, refetchPatients]);

  const handleEditSuccess = useCallback(() => {
    refetchPatients();
    push?.('Datos del paciente actualizados.', 'success');
    setEditingPatient(null);
  }, [push, refetchPatients]);

  return (
    <>
      <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">Pacientes</h1>
            <p className="text-[13px] text-[var(--cq-fg-muted)] mt-0.5">
              {loading
                ? 'Cargando…'
                : searching
                  ? `${totalCount} resultado${totalCount !== 1 ? 's' : ''}`
                  : `${totalCount} paciente${totalCount !== 1 ? 's' : ''} en total`}
            </p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[8px] bg-[var(--cq-fg)] text-[var(--cq-bg)] text-[13px] font-medium hover:opacity-90 transition-opacity shrink-0"
          >
            <Icons.UserPlus size={14} />
            Agregar paciente
          </button>
        </div>

        {/* Search + status filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cq-fg-muted)] pointer-events-none">
              <Icons.Search size={15} />
            </span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar paciente por nombre o teléfono…"
              className="w-full h-9 pl-9 pr-3 rounded-[7px] border border-[var(--cq-border)] bg-[var(--cq-surface)] text-[13px] placeholder:text-[var(--cq-fg-muted)] focus:outline-none focus:border-[var(--cq-fg)] transition-colors"
            />
          </div>

          <div className="flex items-center bg-[var(--cq-surface-2)] rounded-[8px] p-0.5 gap-0.5">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 h-7 rounded-[6px] text-[12.5px] font-medium transition-colors ${
                  statusFilter === f.key
                    ? 'bg-[var(--cq-surface)] text-[var(--cq-fg)] shadow-sm'
                    : 'text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <PatientTable
          loading={loading}
          filtered={filtered}
          patients={patients}
          onEdit={setEditingPatient}
          onDelete={handleDelete}
          onAddOpen={() => setAddOpen(true)}
        />
        {searching && totalCount > 100 && (
          <p className="text-[12px] text-[var(--cq-fg-muted)] text-center py-2">
            Mostrando 100 de {totalCount} coincidencias. Refiná la búsqueda para acotar.
          </p>
        )}
        {hasMore && (
          <p className="text-[12px] text-[var(--cq-fg-muted)] text-center py-2">
            Mostrando los primeros 100 pacientes. Usá la búsqueda para encontrar pacientes específicos.
          </p>
        )}
      </div>

      <AddPatientModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={refetchPatients}
        clinicId={clinic?.id}
        push={push}
        existingPatients={patients}
      />

      {editingPatient && (
        <EditPatientModal
          patient={editingPatient}
          onClose={() => setEditingPatient(null)}
          onSuccess={handleEditSuccess}
          existingPatients={patients}
        />
      )}
    </>
  );
}
