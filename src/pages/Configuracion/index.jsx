import { Button, Badge, Avatar, Icons, MonoLabel, Divider } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useMembers } from '../../hooks/useMembers';

const roleBadgeTone = {
  owner: 'outline',
  staff: 'accent',
  viewer: 'outline',
};

const roleLabel = {
  owner: 'Propietario',
  staff: 'Staff',
  viewer: 'Lectura',
};

function FieldGroup({ label, children, fullWidth = false }) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <MonoLabel className="block mb-1.5">{label}</MonoLabel>
      {children}
    </div>
  );
}

function DisabledInput({ value }) {
  return (
    <input
      type="text"
      value={value}
      readOnly
      disabled
      className="h-10 px-3 rounded-[8px] border border-[var(--cq-border)] bg-[var(--cq-surface-2)] text-[13.5px] text-[var(--cq-fg)] w-full disabled:opacity-70 cursor-default focus:outline-none"
    />
  );
}

function ToggleRow({ label, on, last = false }) {
  return (
    <div
      className={`flex items-center justify-between h-12 ${
        !last ? 'border-b border-[var(--cq-border)]' : ''
      }`}
    >
      <span className="text-[13.5px] text-[var(--cq-fg)]">{label}</span>
      <div
        className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${
          on ? 'bg-[var(--cq-success)]' : 'bg-[var(--cq-surface-3)]'
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            on ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-8 h-8 rounded-full bg-[var(--cq-surface-3)] animate-pulse shrink-0" />
      <div className="flex-1">
        <div className="h-3 w-32 bg-[var(--cq-surface-3)] rounded animate-pulse" />
      </div>
      <div className="h-[22px] w-16 bg-[var(--cq-surface-3)] rounded-full animate-pulse" />
    </div>
  );
}

function SectionCard({ children }) {
  return (
    <div className="bg-[var(--cq-bg)] border border-[var(--cq-border)] rounded-[14px] p-6">
      {children}
    </div>
  );
}

export function Configuracion() {
  const { clinic, profile, role } = useAuth();
  const { members, loading } = useMembers(clinic?.id);

  const clinicEmail = clinic
    ? `contacto@${clinic.name?.toLowerCase().replace(/\s+/g, '')}.uy`
    : '';

  const mockMembers = [
    {
      name: `${profile?.first_name ?? 'Usuario'} ${profile?.last_name ?? ''}`.trim(),
      role: role ?? 'owner',
    },
    { name: 'Dra. Silva', role: 'staff' },
    { name: 'Recepción', role: 'viewer' },
  ];

  const displayMembers =
    !loading && members.length > 0
      ? members.map((m) => ({ name: m.user_id, role: m.role }))
      : mockMembers;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[860px] mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-[22px] font-semibold text-[var(--cq-fg)]">Configuración</h1>
        <p className="text-[13.5px] text-[var(--cq-fg-muted)] mt-0.5">
          Administrá tu clínica, equipo y preferencias.
        </p>
      </div>

      {/* ── SECTION 1: Perfil de la clínica ── */}
      <SectionCard>
        <h2 className="text-[16px] font-semibold text-[var(--cq-fg)] mb-5">
          Perfil de la clínica
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldGroup label="Nombre de la clínica">
            <DisabledInput value={clinic?.name ?? ''} />
          </FieldGroup>

          <FieldGroup label="Teléfono">
            <DisabledInput value="+598 2 900 0000" />
          </FieldGroup>

          <FieldGroup label="Dirección" fullWidth>
            <DisabledInput value="Av. 18 de Julio 1234, Montevideo" />
          </FieldGroup>

          <FieldGroup label="Email de contacto">
            <DisabledInput value={clinicEmail} />
          </FieldGroup>

          <FieldGroup label="Zona horaria" fullWidth>
            <DisabledInput value="America/Montevideo (UTC-3)" />
          </FieldGroup>
        </div>
      </SectionCard>

      <Divider />

      {/* ── SECTION 2: Equipo ── */}
      <SectionCard>
        <h2 className="text-[16px] font-semibold text-[var(--cq-fg)] mb-5">Equipo</h2>
        <div className="flex flex-col divide-y divide-[var(--cq-border)]">
          {loading
            ? [0, 1, 2].map((i) => <SkeletonRow key={i} />)
            : displayMembers.map((m, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5">
                  <Avatar name={m.name} size={32} />
                  <span className="flex-1 text-[13.5px] text-[var(--cq-fg)] truncate">
                    {m.name}
                  </span>
                  <Badge tone={roleBadgeTone[m.role] ?? 'outline'}>
                    {roleLabel[m.role] ?? m.role}
                  </Badge>
                  <Badge tone="success" dot>
                    Activo
                  </Badge>
                </div>
              ))}
        </div>
        <div className="mt-4">
          <Button variant="outline" size="sm" disabled className="gap-1.5">
            <Icons.UserPlus size={14} />
            + Invitar miembro
          </Button>
        </div>
      </SectionCard>

      <Divider />

      {/* ── SECTION 3: Conexión WhatsApp ── */}
      <SectionCard>
        <h2 className="text-[16px] font-semibold text-[var(--cq-fg)] mb-5">
          Conexión WhatsApp
        </h2>

        {/* Status row */}
        <div className="flex items-center gap-3 mb-4">
          <span className="w-2 h-2 rounded-full bg-[var(--cq-success)] shrink-0" />
          <Badge tone="success">Conectado</Badge>
          <span className="text-[13px] text-[var(--cq-fg-muted)]">Meta Business API</span>
        </div>

        {/* Info card */}
        <div className="bg-[var(--cq-surface-2)] rounded-[10px] p-4 flex flex-col gap-2 mb-4">
          <div className="flex items-center gap-2 text-[13.5px] text-[var(--cq-fg)]">
            <Icons.Whatsapp size={15} />
            <span>Número: <span className="font-mono">+598 98 000 000</span></span>
          </div>
          <div className="text-[13px] text-[var(--cq-fg-muted)]">
            Última sincronización: hace 2 min
          </div>
          <div className="text-[13px] text-[var(--cq-fg-muted)]">
            Mensajes enviados hoy:{' '}
            <span className="font-mono text-[var(--cq-fg)]">47</span>
          </div>
        </div>

        <Button variant="outline" size="sm" disabled>
          Reconectar
        </Button>
      </SectionCard>

      <Divider />

      {/* ── SECTION 4: Preferencias ── */}
      <SectionCard>
        <h2 className="text-[16px] font-semibold text-[var(--cq-fg)] mb-2">Preferencias</h2>

        <ToggleRow label="Recordatorios automáticos" on={true} />
        <ToggleRow label="Notificaciones por email" on={true} />
        <ToggleRow label="Modo compacto del dashboard" on={false} />

        {/* Language row */}
        <div className="flex items-center justify-between h-12">
          <span className="text-[13.5px] text-[var(--cq-fg)]">Idioma</span>
          <div className="h-8 px-3 rounded-[7px] border border-[var(--cq-border)] bg-[var(--cq-surface-2)] text-[13px] text-[var(--cq-fg)] flex items-center cursor-default select-none">
            Español (Uruguay)
          </div>
        </div>
      </SectionCard>

      {/* Save button */}
      <div className="flex flex-col items-stretch gap-2">
        <Button variant="primary" disabled className="w-full">
          Guardar cambios
        </Button>
        <MonoLabel className="text-center">
          Los cambios se guardan automáticamente.
        </MonoLabel>
      </div>
    </div>
  );
}
