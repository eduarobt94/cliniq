import { useState, useMemo, memo } from 'react';
import { Button, Badge, Card, Avatar, Icons, MonoLabel, SectionLabel, Divider } from '../../components/ui';
import { usePatients } from '../../hooks/usePatients';
import { PATIENTS_MOCK } from '../../data/patients.mock';

const STATUS_MAP = {
  activo:   { tone: 'success', label: 'Activo'    },
  inactivo: { tone: 'outline', label: 'Inactivo'  },
  nuevo:    { tone: 'accent',  label: 'Nuevo'     },
};

const SkeletonRow = memo(function SkeletonRow() {
  return (
    <tr>
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="animate-pulse bg-[var(--cq-surface-2)] rounded-full h-9 w-9 shrink-0" />
          <div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-4 w-36" />
        </div>
      </td>
      <td className="px-5 py-3">
        <div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-4 w-32" />
      </td>
      <td className="px-5 py-3 hidden md:table-cell">
        <div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-4 w-24" />
      </td>
      <td className="px-5 py-3 hidden lg:table-cell">
        <div className="animate-pulse bg-[var(--cq-surface-2)] rounded h-4 w-24" />
      </td>
      <td className="px-5 py-3">
        <div className="animate-pulse bg-[var(--cq-surface-2)] rounded-full h-[22px] w-20" />
      </td>
    </tr>
  );
});

const PatientRow = memo(function PatientRow({ patient }) {
  const { tone, label } = STATUS_MAP[patient.status] ?? STATUS_MAP.activo;

  return (
    <tr className="hover:bg-[var(--cq-surface-2)] transition-colors cursor-pointer group border-b border-[var(--cq-border)] last:border-0">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={patient.name} size={36} />
          <span className="text-[14px] font-medium truncate max-w-[160px]">{patient.name}</span>
        </div>
      </td>
      <td className="px-5 py-3">
        <span className="font-mono text-[13px] text-[var(--cq-fg-muted)] whitespace-nowrap">{patient.phone}</span>
      </td>
      <td className="px-5 py-3 hidden md:table-cell">
        <span className="text-[13px] text-[var(--cq-fg-muted)]">{patient.lastVisit}</span>
      </td>
      <td className="px-5 py-3 hidden lg:table-cell">
        <span className="text-[13px] text-[var(--cq-fg-muted)]">{patient.nextAppt}</span>
      </td>
      <td className="px-5 py-3">
        <Badge tone={tone} dot>{label}</Badge>
      </td>
    </tr>
  );
});

export function Pacientes() {
  const { patients: liveData, loading } = usePatients();
  const [search, setSearch] = useState('');

  const patients = liveData && liveData.length > 0 ? liveData : PATIENTS_MOCK;

  const filtered = useMemo(() => {
    if (!search.trim()) return patients;
    const q = search.toLowerCase();
    return patients.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q)
    );
  }, [patients, search]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Pacientes</h1>
          <p className="text-[13px] text-[var(--cq-fg-muted)] mt-0.5">
            {loading ? 'Cargando…' : `${patients.length} pacientes en total`}
          </p>
        </div>
        <Button variant="accent" size="sm">
          <Icons.UserPlus size={14} />
          Agregar paciente
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--cq-fg-muted)] pointer-events-none">
            <Icons.Search size={15} />
          </span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o teléfono…"
            className="w-full h-9 pl-9 pr-3 rounded-[7px] border border-[var(--cq-border)] bg-[var(--cq-surface)] text-[13px] text-[var(--cq-fg)] placeholder:text-[var(--cq-fg-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--cq-accent)] transition"
          />
        </div>
        <button className="h-9 px-3 rounded-[7px] border border-[var(--cq-border)] bg-[var(--cq-surface)] text-[13px] text-[var(--cq-fg-muted)] inline-flex items-center gap-2 hover:bg-[var(--cq-surface-2)] transition-colors shrink-0">
          Todos los estados
          <Icons.More size={13} />
        </button>
      </div>

      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--cq-border)]">
                <th className="px-5 py-3 text-left">
                  <MonoLabel>Paciente</MonoLabel>
                </th>
                <th className="px-5 py-3 text-left">
                  <MonoLabel>Teléfono</MonoLabel>
                </th>
                <th className="px-5 py-3 text-left hidden md:table-cell">
                  <MonoLabel>Última visita</MonoLabel>
                </th>
                <th className="px-5 py-3 text-left hidden lg:table-cell">
                  <MonoLabel>Próximo turno</MonoLabel>
                </th>
                <th className="px-5 py-3 text-left">
                  <MonoLabel>Estado</MonoLabel>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-[var(--cq-fg-muted)]">
                      <Icons.Search size={32} />
                      <span className="text-[14px]">Sin resultados para esta búsqueda</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(p => <PatientRow key={p.id} patient={p} />)
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
