import { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Badge, Card, Avatar, Icons, MonoLabel } from '../../components/ui';
import { usePatients } from '../../hooks/usePatients';
import { useClinic } from '../../hooks/useClinic';
import { deletePatient, updatePatient } from '../../lib/appointmentService';
import { isValidPhone, filterPhoneInput } from '../../lib/phoneUtils';
import { AddPatientModal } from '../../components/AddPatientModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-UY', { day: 'numeric', month: 'short', year: 'numeric' });
}

function derivePatient(raw) {
  const now    = new Date();
  const appts  = raw.appointments ?? [];
  const past   = appts
    .filter(a => new Date(a.appointment_datetime) < now)
    .sort((a, b) => new Date(b.appointment_datetime) - new Date(a.appointment_datetime));
  const future = appts
    .filter(a => new Date(a.appointment_datetime) >= now)
    .sort((a, b) => new Date(a.appointment_datetime) - new Date(b.appointment_datetime));

  const lastVisit = past[0]?.appointment_datetime ?? null;
  const nextAppt  = future[0]?.appointment_datetime ?? null;

  let status = 'activo';
  if (appts.length === 0) {
    status = 'nuevo';
  } else if (!nextAppt && lastVisit) {
    const daysSince = (now - new Date(lastVisit)) / 86_400_000;
    if (daysSince > 90) status = 'inactivo';
  }

  return { ...raw, lastVisit, nextAppt, status, appointmentCount: appts.length };
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
function EditPatientModal({ patient, onClose, onSuccess, existingPatients = [] }) {
  const [name,       setName]       = useState(patient.full_name);
  const [phone,      setPhone]      = useState(patient.phone_number);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState(null);
  const nameRef = useRef(null);

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 60);
  }, []);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      setError('El nombre y el teléfono son obligatorios.');
      return;
    }
    if (!isValidPhone(phone)) {
      setError('El teléfono debe estar en formato internacional: +598XXXXXXXX');
      return;
    }
    const nameLower = name.trim().toLowerCase();
    const dupName = existingPatients.some(
      p => p.id !== patient.id && p.full_name.trim().toLowerCase() === nameLower
    );
    if (dupName) {
      setError('Ya existe un paciente con ese nombre en esta clínica.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await updatePatient(patient.id, { fullName: name, phoneNumber: phone });
      onSuccess();
    } catch (err) {
      const msg = err?.message ?? '';
      if (msg.includes('23505') || msg.includes('unique') || msg.includes('phone')) {
        setError('Ya existe un paciente con ese número de teléfono.');
      } else {
        setError('No se pudo actualizar. Intentá más tarde.');
      }
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-patient-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className="relative w-full max-w-[400px] bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[16px] p-6"
        style={{ animation: 'cqModalIn 220ms cubic-bezier(.2,.7,.2,1)' }}
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
            className="w-11 h-11 rounded-[8px] hover:bg-[var(--cq-surface-2)] flex items-center justify-center"
            aria-label="Cerrar"
          >
            <Icons.Close size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <MonoLabel>Nombre completo *</MonoLabel>
            <div className="mt-1.5 flex items-center gap-2 h-11 px-3 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-bg)] focus-within:border-[var(--cq-fg)] transition-colors">
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="Nombre Apellido"
                className="flex-1 bg-transparent outline-none text-[13.5px]"
                autoComplete="name"
              />
            </div>
          </label>

          <label className="block">
            <MonoLabel>Teléfono *</MonoLabel>
            <div className="mt-1.5 flex items-center gap-2 h-11 px-3 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-bg)] focus-within:border-[var(--cq-fg)] transition-colors">
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(filterPhoneInput(e.target.value))}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="+59899123456"
                className="flex-1 bg-transparent outline-none text-[13.5px]"
                autoComplete="tel"
              />
            </div>
          </label>

          {error && (
            <p role="alert" className="text-[13px] text-[var(--cq-danger)]">{error}</p>
          )}
        </div>

        <div className="mt-6 flex items-center gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={submitting}
            className="h-9 px-4 rounded-[8px] text-[13.5px] font-medium text-[var(--cq-fg-muted)] hover:bg-[var(--cq-surface-2)] transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !name.trim() || !phone.trim()}
            className="h-9 px-4 rounded-[8px] bg-[var(--cq-fg)] text-[var(--cq-bg)] text-[13.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 inline-flex items-center gap-2"
          >
            {submitting ? 'Guardando…' : 'Guardar cambios'}
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

  const close = () => { setOpen(false); setConfirmDelete(false); };

  const menu = open && createPortal(
    <div
      ref={menuRef}
      className="fixed z-[200] w-44 bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[10px] shadow-xl overflow-hidden py-1"
      style={{ top: pos.top, right: pos.right }}
    >
      {confirmDelete ? (
        <div className="px-3 py-2.5">
          <p className="text-[12.5px] text-[var(--cq-fg-muted)] mb-2 leading-snug">
            ¿Eliminar este paciente?
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(patient.id); close(); }}
              className="flex-1 h-7 rounded-[6px] bg-[var(--cq-danger)] text-white text-[12px] font-medium hover:opacity-90 transition-opacity"
            >
              Sí, eliminar
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
              className="flex-1 h-7 rounded-[6px] text-[12px] font-medium text-[var(--cq-fg-muted)] hover:bg-[var(--cq-surface-2)] transition-colors"
            >
              No
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
        className="opacity-0 group-hover:opacity-100 w-8 h-8 rounded-[6px] hover:bg-[var(--cq-surface-2)] flex items-center justify-center transition-opacity"
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
          <div className="animate-pulse bg-[var(--cq-surface-2)] rounded-full h-9 w-9 shrink-0" />
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
        <Badge tone={tone} dot>{label}</Badge>
      </td>
      <td className="px-5 py-3.5 w-10">
        <PatientActionsMenu patient={patient} onEdit={onEdit} onDelete={onDelete} />
      </td>
    </tr>
  );
});

// ─── Main ─────────────────────────────────────────────────────────────────────
export function Pacientes() {
  const { push } = useOutletContext() ?? {};
  const { patients: rawPatients, loading, refetch: refetchPatients } = usePatients();
  const { clinic } = useClinic();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');

  // Clear the URL param once applied so back-nav doesn't re-filter
  useEffect(() => {
    if (searchParams.get('q')) setSearchParams({}, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [statusFilter,   setStatusFilter]   = useState('all');
  const [addOpen,        setAddOpen]        = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);

  const patients = useMemo(() => rawPatients.map(derivePatient), [rawPatients]);

  const filtered = useMemo(() => {
    let list = statusFilter !== 'all' ? patients.filter(p => p.status === statusFilter) : patients;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.full_name.toLowerCase().includes(q) ||
        (p.phone_number ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [patients, statusFilter, search]);

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
                : `${patients.length} paciente${patients.length !== 1 ? 's' : ''} en total`}
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
              placeholder="Buscar por nombre o teléfono…"
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
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--cq-border)]">
                  <th className="px-5 py-3 text-left"><MonoLabel>Paciente</MonoLabel></th>
                  <th className="px-5 py-3 text-left"><MonoLabel>Teléfono</MonoLabel></th>
                  <th className="px-5 py-3 text-left hidden md:table-cell"><MonoLabel>Última visita</MonoLabel></th>
                  <th className="px-5 py-3 text-left hidden lg:table-cell"><MonoLabel>Próximo turno</MonoLabel></th>
                  <th className="px-5 py-3 text-left hidden xl:table-cell"><MonoLabel>Turnos</MonoLabel></th>
                  <th className="px-5 py-3 text-left"><MonoLabel>Estado</MonoLabel></th>
                  <th className="px-5 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--cq-fg-muted)]">
                        <Icons.Users size={32} />
                        <div className="text-center">
                          <p className="text-[14px] font-medium">
                            {patients.length === 0
                              ? 'Todavía no hay pacientes registrados'
                              : 'Sin resultados para esta búsqueda'}
                          </p>
                          {patients.length === 0 && (
                            <button
                              onClick={() => setAddOpen(true)}
                              className="mt-2 text-[13px] text-[var(--cq-accent)] hover:underline"
                            >
                              Agregar el primero
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(p => (
                    <PatientRow
                      key={p.id}
                      patient={p}
                      onEdit={setEditingPatient}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Filtered count footer */}
          {!loading && filtered.length > 0 && filtered.length < patients.length && (
            <div className="px-5 py-2.5 border-t border-[var(--cq-border)]">
              <span className="text-[12.5px] text-[var(--cq-fg-muted)]">
                Mostrando {filtered.length} de {patients.length} pacientes
              </span>
            </div>
          )}
        </Card>
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
