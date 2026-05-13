import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Button, Badge, Avatar, Icons, MonoLabel, Divider } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useMembers } from '../../hooks/useMembers';
import { useAutomations } from '../../hooks/useAutomations';
import { InviteMemberModal } from '../Dashboard/InviteMemberModal';
import { updateClinicProfile, updateClinicSettings } from '../../lib/clinicService';
import { filterPhoneInput } from '../../lib/phoneUtils';
import { ScheduleSection } from './ScheduleSection';
import { ServicesSection } from './ServicesSection';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMEZONES = [
  { value: 'America/Montevideo',              label: 'America/Montevideo (UTC-3)'  },
  { value: 'America/Argentina/Buenos_Aires',  label: 'America/Buenos_Aires (UTC-3)'},
  { value: 'America/Sao_Paulo',               label: 'America/Sao_Paulo (UTC-3)'  },
  { value: 'America/Santiago',                label: 'America/Santiago (UTC-4)'   },
  { value: 'America/Bogota',                  label: 'America/Bogota (UTC-5)'     },
  { value: 'America/Lima',                    label: 'America/Lima (UTC-5)'       },
  { value: 'America/Caracas',                 label: 'America/Caracas (UTC-4)'    },
  { value: 'America/Mexico_City',             label: 'America/Mexico_City (UTC-6)'},
  { value: 'America/New_York',                label: 'America/New_York (UTC-5)'   },
];

const DURATIONS = [15, 20, 30, 45, 60];

const roleBadgeTone = { owner: 'outline', staff: 'accent', viewer: 'outline' };
const roleLabel     = { owner: 'Propietario', staff: 'Staff', viewer: 'Lectura' };

const TABS = [
  { id: 'general',   label: 'Configuración general' },
  { id: 'horarios',  label: 'Horarios y servicios'  },
];

// ─── Small UI helpers ─────────────────────────────────────────────────────────

function SectionCard({ children }) {
  return (
    <div className="bg-[var(--cq-bg)] border border-[var(--cq-border)] rounded-[14px] p-6">
      {children}
    </div>
  );
}

function FieldGroup({ label, children, fullWidth = false }) {
  return (
    <div className={fullWidth ? 'col-span-2' : ''}>
      <MonoLabel className="block mb-1.5">{label}</MonoLabel>
      {children}
    </div>
  );
}

const inputCls =
  'h-10 px-3 rounded-[8px] border border-[var(--cq-border)] bg-[var(--cq-surface-2)] text-[13.5px] ' +
  'text-[var(--cq-fg)] w-full focus:outline-none focus:ring-1 focus:ring-[var(--cq-accent)] ' +
  'transition-shadow disabled:opacity-60 disabled:cursor-default';

function Toggle({ on, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => !disabled && onChange(!on)}
      className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors disabled:opacity-50 disabled:cursor-default ${
        on ? 'bg-[var(--cq-success)]' : 'bg-[var(--cq-surface-3)]'
      }`}
    >
      <span className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function ToggleRow({ label, on, onChange, disabled, last = false }) {
  return (
    <div className={`flex items-center justify-between h-12 ${!last ? 'border-b border-[var(--cq-border)]' : ''}`}>
      <span className="text-[13.5px] text-[var(--cq-fg)]">{label}</span>
      <Toggle on={on} onChange={onChange} disabled={disabled} />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-8 h-8 rounded-full bg-[var(--cq-surface-3)] animate-pulse shrink-0" />
      <div className="flex-1">
        <div className="h-3 w-32 bg-[var(--cq-surface-3)] rounded animate-pulse" />
        <div className="h-2.5 w-20 bg-[var(--cq-surface-3)] rounded animate-pulse mt-1" />
      </div>
      <div className="h-[22px] w-16 bg-[var(--cq-surface-3)] rounded-full animate-pulse" />
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({ active, onChange }) {
  return (
    <div className="flex gap-1 border-b border-[var(--cq-border)] mb-6">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 h-10 text-[13.5px] font-medium rounded-t-[6px] transition-colors relative ${
            active === tab.id
              ? 'text-[var(--cq-fg)]'
              : 'text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)]'
          }`}
        >
          {tab.label}
          {active === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--cq-accent)] rounded-t-full" />
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Configuracion() {
  const { clinic, role, refreshMembership } = useAuth();
  const { push } = useOutletContext() ?? {};
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('general');

  const { members, loading: membersLoading, removeMember, refetch: refetchMembers } =
    useMembers(clinic?.id);
  const { automations, stats, loading: waLoading } = useAutomations(clinic?.id);

  const isOwner = role === 'owner';

  // ── Team ──────────────────────────────────────────────────────────────────
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removing,   setRemoving]   = useState(null);

  // ── Clinic profile form ───────────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    name:             '',
    phone:            '',
    address:          '',
    emailContact:     '',
    timezone:         'America/Montevideo',
    waPhoneNumberId:  '',
    reviewUrl:        '',
  });
  const [profileDirty,  setProfileDirty]  = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!clinic) return;
    setProfileForm({
      name:             clinic.name                ?? '',
      phone:            clinic.phone               ?? '',
      address:          clinic.address             ?? '',
      emailContact:     clinic.email_contact       ?? '',
      timezone:         clinic.timezone            ?? 'America/Montevideo',
      waPhoneNumberId:  clinic.wa_phone_number_id  ?? '',
      reviewUrl:        clinic.review_url          ?? '',
    });
    setProfileDirty(false);
  }, [clinic?.id]);

  function handleProfileChange(field, value) {
    const normalized = field === 'phone' ? filterPhoneInput(value) : value;
    setProfileForm(prev => ({ ...prev, [field]: normalized }));
    setProfileDirty(true);
  }

  async function handleSaveProfile() {
    if (profileForm.emailContact && !profileForm.emailContact.includes('@')) {
      push?.('El email de contacto debe contener "@".', 'error');
      return;
    }
    setSavingProfile(true);
    try {
      await updateClinicProfile(clinic.id, profileForm);
      await refreshMembership();
      setProfileDirty(false);
      push?.('Perfil actualizado.', 'success');
    } catch (err) {
      const msg = err.message ?? '';
      if (msg.includes('address') || msg.includes('schema cache') || msg.includes('column')) {
        push?.('Columnas faltantes: ejecutá la migración en el dashboard de Supabase.', 'error');
      } else {
        push?.('No se pudo guardar: ' + (msg || 'error desconocido'), 'error');
      }
    } finally {
      setSavingProfile(false);
    }
  }

  // ── Preferences ───────────────────────────────────────────────────────────
  const [prefs, setPrefs] = useState(() => ({
    email_notifications:          clinic?.settings?.email_notifications          ?? true,
    auto_reminders:               clinic?.settings?.auto_reminders               ?? true,
    default_appointment_duration: clinic?.settings?.default_appointment_duration ?? 30,
    compact_mode:                 localStorage.getItem('cq_compact_mode') === 'true',
  }));
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    if (!clinic) return;
    setPrefs(prev => ({
      ...prev,
      email_notifications:          clinic.settings?.email_notifications          ?? true,
      auto_reminders:               clinic.settings?.auto_reminders               ?? true,
      default_appointment_duration: clinic.settings?.default_appointment_duration ?? 30,
    }));
  }, [clinic?.id]);

  async function handlePrefChange(key, value) {
    setPrefs(prev => ({ ...prev, [key]: value }));
    if (key === 'compact_mode') {
      localStorage.setItem('cq_compact_mode', String(value));
      window.dispatchEvent(new Event('cq_compact_mode'));
      return;
    }
    if (!clinic?.id) return;
    setSavingPrefs(true);
    try {
      await updateClinicSettings(clinic.id, { ...clinic?.settings, [key]: value });
    } catch {
      push?.('No se pudo guardar la preferencia.', 'error');
      setPrefs(prev => ({ ...prev, [key]: !value }));
    } finally {
      setSavingPrefs(false);
    }
  }

  // ── WhatsApp status ───────────────────────────────────────────────────────
  const waConnected  = automations.length > 0;
  const waActiveAuto = automations.find(a => a.enabled) ?? null;
  const lastSentAt   = stats?.last_sent_at
    ? new Date(stats.last_sent_at).toLocaleString('es-UY', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      })
    : null;

  // ── Team handlers ─────────────────────────────────────────────────────────
  const handleRemove = async (memberId) => {
    setRemoving(memberId);
    await removeMember(memberId);
    setRemoving(null);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col p-6 max-w-[860px] mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-[var(--cq-fg)]">Configuración</h1>
        <p className="text-[13.5px] text-[var(--cq-fg-muted)] mt-0.5">
          Administrá tu clínica, equipo y preferencias.
        </p>
      </div>

      {/* Tab bar */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: CONFIGURACIÓN GENERAL
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'general' && (
        <div className="flex flex-col gap-6">

          {/* SECTION 1 — Perfil de la clínica */}
          <SectionCard>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-semibold text-[var(--cq-fg)]">Perfil de la clínica</h2>
              {!isOwner && <Badge tone="outline">Solo propietarios pueden editar</Badge>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldGroup label="Nombre de la clínica">
                <input
                  className={inputCls}
                  value={profileForm.name}
                  onChange={e => handleProfileChange('name', e.target.value)}
                  disabled={!isOwner}
                  placeholder="Mi Clínica"
                />
              </FieldGroup>

              <FieldGroup label="Teléfono">
                <input
                  className={inputCls}
                  value={profileForm.phone}
                  onChange={e => handleProfileChange('phone', e.target.value)}
                  disabled={!isOwner}
                  placeholder="+598 2 900 0000"
                />
              </FieldGroup>

              <FieldGroup label="Dirección" fullWidth>
                <input
                  className={inputCls}
                  value={profileForm.address}
                  onChange={e => handleProfileChange('address', e.target.value)}
                  disabled={!isOwner}
                  placeholder="Av. 18 de Julio 1234, Montevideo"
                />
              </FieldGroup>

              <FieldGroup label="Email de contacto">
                <input
                  type="email"
                  className={inputCls}
                  value={profileForm.emailContact}
                  onChange={e => handleProfileChange('emailContact', e.target.value)}
                  disabled={!isOwner}
                  placeholder="contacto@clinica.uy"
                />
              </FieldGroup>

              <FieldGroup label="Zona horaria">
                <select
                  className={inputCls}
                  value={profileForm.timezone}
                  onChange={e => handleProfileChange('timezone', e.target.value)}
                  disabled={!isOwner}
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </FieldGroup>

              <FieldGroup label="URL de reseña en Google">
                <input
                  type="url"
                  className={inputCls}
                  value={profileForm.reviewUrl}
                  onChange={e => handleProfileChange('reviewUrl', e.target.value)}
                  disabled={!isOwner}
                  placeholder="https://g.page/r/XXXXX/review"
                />
                <p className="mt-1 text-[11.5px] text-[var(--cq-fg-muted)]">
                  Se usa en el placeholder <code className="font-mono">{'{review_url}'}</code> del mensaje post-consulta.
                </p>
              </FieldGroup>
            </div>

            {isOwner && (
              <div className="mt-5 flex items-center gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!profileDirty || savingProfile}
                  onClick={handleSaveProfile}
                >
                  {savingProfile ? 'Guardando…' : 'Guardar perfil'}
                </Button>
                {profileDirty && (
                  <span className="text-[12px] text-[var(--cq-fg-muted)]">Hay cambios sin guardar</span>
                )}
              </div>
            )}
          </SectionCard>

          <Divider />

          {/* SECTION 2 — Equipo */}
          <SectionCard>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-semibold text-[var(--cq-fg)]">Equipo</h2>
              {isOwner && (
                <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)} className="gap-1.5">
                  <Icons.UserPlus size={14} />
                  Invitar miembro
                </Button>
              )}
            </div>

            {membersLoading ? (
              <div className="flex flex-col divide-y divide-[var(--cq-border)]">
                {[0, 1, 2].map(i => <SkeletonRow key={i} />)}
              </div>
            ) : members.length === 0 ? (
              <p className="text-[13px] text-[var(--cq-fg-muted)] py-2">
                No hay miembros en el equipo todavía.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-[var(--cq-border)]">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-3 py-2.5">
                    <Avatar name={m.displayName} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] text-[var(--cq-fg)] truncate">{m.displayName}</div>
                      <div className="text-[11.5px] text-[var(--cq-fg-muted)] truncate">{m.email}</div>
                    </div>
                    <Badge tone={roleBadgeTone[m.role] ?? 'outline'}>{roleLabel[m.role] ?? m.role}</Badge>
                    {m.status === 'active'
                      ? <Badge tone="success" dot>Activo</Badge>
                      : <Badge tone="outline">Pendiente</Badge>
                    }
                    {isOwner && m.role !== 'owner' && (
                      <button
                        onClick={() => handleRemove(m.id)}
                        disabled={removing === m.id}
                        className="ml-1 text-[var(--cq-fg-muted)] hover:text-[var(--cq-danger)] transition-colors disabled:opacity-40"
                        aria-label={`Eliminar a ${m.displayName}`}
                      >
                        {removing === m.id
                          ? <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin inline-block" />
                          : <Icons.Close size={14} />
                        }
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <Divider />

          {/* SECTION 3 — Preferencias */}
          <SectionCard>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[16px] font-semibold text-[var(--cq-fg)]">Preferencias</h2>
              {savingPrefs && (
                <span className="text-[11.5px] text-[var(--cq-fg-muted)]">Guardando…</span>
              )}
            </div>

            <ToggleRow
              label="Recordatorios automáticos por WhatsApp"
              on={prefs.auto_reminders}
              onChange={v => handlePrefChange('auto_reminders', v)}
              disabled={!isOwner}
            />
            <ToggleRow
              label="Notificaciones por email"
              on={prefs.email_notifications}
              onChange={v => handlePrefChange('email_notifications', v)}
              disabled={!isOwner}
            />
            <ToggleRow
              label="Modo compacto del dashboard"
              on={prefs.compact_mode}
              onChange={v => handlePrefChange('compact_mode', v)}
            />

            <div className="flex items-center justify-between h-12">
              <span className="text-[13.5px] text-[var(--cq-fg)]">Duración predeterminada de turnos</span>
              <select
                className="h-8 pl-2 pr-7 rounded-[7px] border border-[var(--cq-border)] bg-[var(--cq-surface-2)] text-[13px] text-[var(--cq-fg)] focus:outline-none focus:ring-1 focus:ring-[var(--cq-accent)] disabled:opacity-60"
                value={prefs.default_appointment_duration}
                onChange={e => handlePrefChange('default_appointment_duration', Number(e.target.value))}
                disabled={!isOwner}
              >
                {DURATIONS.map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>

            <div className="flex items-center justify-between h-12 border-t border-[var(--cq-border)]">
              <span className="text-[13.5px] text-[var(--cq-fg)]">Idioma</span>
              <div className="h-8 px-3 rounded-[7px] border border-[var(--cq-border)] bg-[var(--cq-surface-2)] text-[13px] text-[var(--cq-fg)] flex items-center select-none">
                Español (Uruguay)
              </div>
            </div>
          </SectionCard>

          <Divider />

          {/* SECTION 4 — WhatsApp */}
          <SectionCard>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-semibold text-[var(--cq-fg)]">WhatsApp</h2>
              {!waLoading && (
                <Badge tone={waConnected ? 'success' : 'outline'} dot={waConnected}>
                  {waConnected ? 'Configurado' : 'Sin configurar'}
                </Badge>
              )}
            </div>

            {/* Phone Number ID */}
            {isOwner && (
              <div className="mb-5">
                <MonoLabel className="block mb-1.5">Phone Number ID (Meta Business)</MonoLabel>
                <input
                  className={inputCls}
                  value={profileForm.waPhoneNumberId}
                  onChange={e => handleProfileChange('waPhoneNumberId', e.target.value.trim())}
                  placeholder="123456789012345"
                  spellCheck={false}
                />
                <p className="mt-1.5 text-[11.5px] text-[var(--cq-fg-muted)]">
                  Lo encontrás en Meta Business Suite → WhatsApp → Configuración de API.
                  Guardá el perfil en la sección superior para aplicar el cambio.
                </p>
              </div>
            )}

            {profileForm.waPhoneNumberId && !isOwner && (
              <div className="mb-4 flex items-center gap-2 text-[13.5px] text-[var(--cq-fg)]">
                <Icons.Whatsapp size={15} />
                <span className="font-mono">{profileForm.waPhoneNumberId}</span>
              </div>
            )}

            {waLoading ? (
              <div className="h-12 flex items-center justify-center">
                <span className="w-5 h-5 border-2 border-[var(--cq-accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : waConnected ? (
              <div className="flex flex-col gap-3">
                <div className="bg-[var(--cq-surface-2)] rounded-[10px] p-4 flex flex-col gap-2">
                  {waActiveAuto && (
                    <div className="text-[13px] text-[var(--cq-fg-muted)]">
                      Automatización activa:{' '}
                      <span className="text-[var(--cq-fg)]">{waActiveAuto.hours_before}h antes del turno</span>
                    </div>
                  )}
                  {lastSentAt && (
                    <div className="text-[13px] text-[var(--cq-fg-muted)]">
                      Último envío: <span className="font-mono text-[var(--cq-fg)]">{lastSentAt}</span>
                    </div>
                  )}
                  {stats?.total_sent != null && (
                    <div className="text-[13px] text-[var(--cq-fg-muted)]">
                      Total enviados:{' '}
                      <span className="font-mono text-[var(--cq-fg)]">{stats.total_sent}</span>
                      {stats.success_rate != null && (
                        <span className="ml-2 text-[var(--cq-success)]">
                          ({Math.round(stats.success_rate * 100)}% éxito)
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/automatizaciones')}>
                  Ir a Automatizaciones
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-[13.5px] text-[var(--cq-fg-muted)]">
                  Ingresá el Phone Number ID y activá una automatización para que los recordatorios
                  se envíen desde el número de tu clínica.
                </p>
                <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/automatizaciones')}>
                  Configurar automatizaciones
                </Button>
              </div>
            )}
          </SectionCard>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: HORARIOS Y SERVICIOS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'horarios' && (
        <div className="flex flex-col gap-6">
          <SectionCard>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-semibold text-[var(--cq-fg)]">Horarios de atención</h2>
            </div>
            <ScheduleSection clinicId={clinic?.id} isOwner={isOwner} push={push} />
            <ServicesSection clinicId={clinic?.id} isOwner={isOwner} push={push} />
          </SectionCard>
        </div>
      )}

      <InviteMemberModal
        open={inviteOpen}
        onClose={() => { setInviteOpen(false); refetchMembers(); }}
        clinicId={clinic?.id}
      />
    </div>
  );
}
