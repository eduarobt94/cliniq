import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icons, Badge, Avatar, MonoLabel } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useWaitlistBadge } from '../../hooks/useWaitingList';


const NAV_ITEMS = [
  { id: 'overview',        label: 'Resumen',          icon: Icons.Home,     path: '/dashboard'                                                 },
  { id: 'agenda',          label: 'Agenda',            icon: Icons.Calendar, path: '/dashboard/agenda',           dynamic: 'agendaCount'       },
  { id: 'pacientes',       label: 'Pacientes',         icon: Icons.Users,    path: '/dashboard/pacientes'                                       },
  { id: 'automatizaciones',label: 'Automatizaciones',  icon: Icons.Zap,      path: '/dashboard/automatizaciones', dynamic: 'automationsCount'  },
  { id: 'inbox',           label: 'Inbox WhatsApp',    icon: Icons.Chat,     path: '/dashboard/inbox',            dynamic: 'inboxCount'        },
  { id: 'lista-espera',   label: 'Lista de espera',   icon: Icons.Waitlist, path: '/dashboard/lista-espera',     dynamic: 'waitlistCount'     },
  { id: 'reportes',        label: 'Reportes',          icon: Icons.Chart,    path: '/dashboard/reportes'                                        },
];

/**
 * Count conversations where the last message is inbound (patient wrote last,
 * staff hasn't replied yet) — these are the "unread / needs attention" chats.
 */
function useInboxBadge(clinicId) {
  const [count, setCount] = useState(null);

  useEffect(() => {
    if (!clinicId) return;

    async function load() {
      const { count: n } = await supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .eq('last_message_direction', 'inbound');
      setCount(n > 0 ? Math.min(n, 99) : null);
    }

    load();

    const channel = supabase
      .channel(`inbox-badge-${clinicId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'conversations',
        filter: `clinic_id=eq.${clinicId}`,
      }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clinicId]);

  return count;
}

/**
 * Count active appointments (new + pending + confirmed) from today onwards.
 */
function useAgendaBadge(clinicId) {
  const [count, setCount] = useState(null);

  useEffect(() => {
    if (!clinicId) return;

    async function load() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: n } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .in('status', ['new', 'pending', 'confirmed'])
        .gte('appointment_datetime', today.toISOString());
      setCount(n > 0 ? Math.min(n, 99) : null);
    }

    load();

    const channel = supabase
      .channel(`agenda-badge-${clinicId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'appointments',
        filter: `clinic_id=eq.${clinicId}`,
      }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clinicId]);

  return count;
}

/**
 * Count enabled automations for this clinic.
 */
function useAutomationsBadge(clinicId) {
  const [count, setCount] = useState(null);

  useEffect(() => {
    if (!clinicId) return;

    async function load() {
      const { count: n } = await supabase
        .from('clinic_automations')
        .select('id', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .eq('enabled', true);
      setCount(n > 0 ? Math.min(n, 99) : null);
    }

    load();

    const channel = supabase
      .channel(`automations-badge-${clinicId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'clinic_automations',
        filter: `clinic_id=eq.${clinicId}`,
      }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clinicId]);

  return count;
}

const SECONDARY_ITEMS = [
  { id: 'config', label: 'Configuración', icon: Icons.Settings, path: '/dashboard/configuracion' },
];

const ROLE_LABEL = { owner: 'Propietario', staff: 'Staff', viewer: 'Observador' };

function clinicInitials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

export function Sidebar({ variant, collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { clinic, profile, role, logout } = useAuth();
  const inboxCount       = useInboxBadge(clinic?.id);
  const agendaCount      = useAgendaBadge(clinic?.id);
  const automationsCount = useAutomationsBadge(clinic?.id);
  const waitlistCount    = useWaitlistBadge(clinic?.id);
  const isFloating = variant === 'floating';

  const getDynamicBadge = (item) => {
    if (item.dynamic === 'inboxCount')       return inboxCount       ? String(inboxCount)       : null;
    if (item.dynamic === 'agendaCount')      return agendaCount      ? String(agendaCount)      : null;
    if (item.dynamic === 'automationsCount') return automationsCount ? String(automationsCount) : null;
    if (item.dynamic === 'waitlistCount')    return waitlistCount    ? String(waitlistCount)    : null;
    return item.badge ?? null;
  };
  const isIconOnly = variant === 'icon' || collapsed;
  const width = isIconOnly ? 'w-[68px]' : 'w-[240px]';
  const base = isFloating
    ? `m-4 rounded-[16px] border border-[var(--cq-border)] bg-[var(--cq-surface)] ${width}`
    : `border-r border-[var(--cq-border)] bg-[var(--cq-surface)] ${width}`;

  const isActive = useCallback((path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  const handleNavClick = useCallback((path) => {
    navigate(path);
    setMobileOpen(false);
  }, [navigate, setMobileOpen]);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        aria-label="Navegación lateral"
        className={`fixed lg:static inset-y-0 left-0 z-50 lg:z-0 transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${base} flex flex-col shrink-0 h-screen lg:h-auto`}
      >
        {/* Brand */}
        <div className={`flex items-center ${isIconOnly ? 'justify-center px-0' : 'justify-between px-4'} h-16 ${!isFloating && 'border-b border-[var(--cq-border)]'}`}>
          <div className="flex items-center gap-2.5">
            <Icons.Logo size={22} />
            {!isIconOnly && <span className="text-[16px] font-semibold tracking-tight">Cliniq</span>}
          </div>
          {!isIconOnly && variant !== 'icon' && (
            <button
              onClick={() => setCollapsed(true)}
              className="hidden lg:inline-flex size-8 items-center justify-center rounded-[6px] text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] hover:bg-[var(--cq-surface-2)]"
              aria-label="Colapsar menú"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {isIconOnly && variant !== 'icon' && (
            <button
              onClick={() => setCollapsed(false)}
              className="hidden lg:inline-flex size-8 absolute top-4 right-[-16px] items-center justify-center rounded-full bg-[var(--cq-surface)] border border-[var(--cq-border)] text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)]"
              aria-label="Expandir menú"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <button onClick={() => setMobileOpen(false)} className="lg:hidden size-11 flex items-center justify-center" aria-label="Cerrar menú">
            <Icons.Close size={16} />
          </button>
        </div>

        {/* Clinic switcher */}
        {!isIconOnly && (
          <div className="px-3 pt-3">
            <button className="w-full flex items-center gap-2.5 px-2.5 h-11 rounded-[9px] hover:bg-[var(--cq-surface-2)] transition-colors border border-[var(--cq-border)] text-left">
              <div className="size-7 rounded-[6px] bg-[var(--cq-fg)] text-[var(--cq-bg)] flex items-center justify-center text-[11px] font-semibold shrink-0">
                {clinic ? clinicInitials(clinic.name) : '…'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">{clinic?.name ?? 'Cargando…'}</div>
                <MonoLabel>Plan Pro · UY</MonoLabel>
              </div>
              <Icons.More size={14} />
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto min-h-0" aria-label="Secciones">
          {!isIconOnly && <MonoLabel className="px-2.5 block mb-2 mt-2">Espacio de trabajo</MonoLabel>}
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((it) => {
              const Icon = it.icon;
              const active = isActive(it.path);
              return (
                <li key={it.id}>
                  <button
                    onClick={() => handleNavClick(it.path)}
                    aria-current={active ? 'page' : undefined}
                    title={isIconOnly ? it.label : undefined}
                    className={`w-full flex items-center gap-2.5 ${isIconOnly ? 'justify-center px-0' : 'px-2.5'} h-11 rounded-[8px] text-[13.5px] transition-colors relative ${
                      active
                        ? 'bg-[var(--cq-surface-2)] text-[var(--cq-fg)] font-medium'
                        : 'text-[var(--cq-fg-muted)] hover:bg-[var(--cq-surface-2)] hover:text-[var(--cq-fg)]'
                    }`}
                  >
                    {active && !isIconOnly && (
                      <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-[var(--cq-accent)]" />
                    )}
                    <Icon size={16} />
                    {!isIconOnly && <span className="flex-1 text-left">{it.label}</span>}
                    {!isIconOnly && getDynamicBadge(it) && (
                      <Badge tone={it.badgeTone || 'accent'}>{getDynamicBadge(it)}</Badge>
                    )}
                    {isIconOnly && getDynamicBadge(it) && (
                      <span className="absolute top-1.5 right-2 size-1.5 rounded-full bg-[var(--cq-accent)]" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {!isIconOnly && <MonoLabel className="px-2.5 block mb-2 mt-6">Sistema</MonoLabel>}
          <ul className="space-y-0.5">
            {SECONDARY_ITEMS.map((it) => {
              const Icon = it.icon;
              const active = isActive(it.path);
              return (
                <li key={it.id}>
                  <button
                    onClick={() => handleNavClick(it.path)}
                    title={isIconOnly ? it.label : undefined}
                    className={`w-full flex items-center gap-2.5 ${isIconOnly ? 'justify-center px-0' : 'px-2.5'} h-11 rounded-[8px] text-[13.5px] transition-colors ${
                      active
                        ? 'bg-[var(--cq-surface-2)] text-[var(--cq-fg)] font-medium'
                        : 'text-[var(--cq-fg-muted)] hover:bg-[var(--cq-surface-2)] hover:text-[var(--cq-fg)]'
                    }`}
                  >
                    <Icon size={16} />
                    {!isIconOnly && <span className="flex-1 text-left">{it.label}</span>}
                  </button>
                </li>
              );
            })}
            <li>
              <button
                onClick={() => { logout(); navigate('/login'); }}
                title={isIconOnly ? 'Cerrar sesión' : undefined}
                className={`w-full flex items-center gap-2.5 ${isIconOnly ? 'justify-center px-0' : 'px-2.5'} h-11 rounded-[8px] text-[13.5px] transition-colors text-[var(--cq-fg-muted)] hover:bg-[var(--cq-surface-2)] hover:text-[var(--cq-danger)]`}
              >
                <Icons.LogOut size={16} />
                {!isIconOnly && <span className="flex-1 text-left">Cerrar sesión</span>}
              </button>
            </li>
          </ul>
        </nav>

        {/* Upgrade card */}
        {!isIconOnly && (
          <div className="m-3 p-4 rounded-[12px] bg-[var(--cq-fg)] text-[var(--cq-bg)] relative overflow-hidden">
            <div className="absolute -right-6 -top-6 size-24 rounded-full bg-[var(--cq-accent)] opacity-40 blur-2xl" />
            <MonoLabel className="text-[var(--cq-bg)]/60">Plan Pro</MonoLabel>
            <div className="mt-2 text-[13px] font-medium leading-snug">Sumá Sistema Completo</div>
            <p className="mt-1 text-[12px] text-[var(--cq-bg)]/70">CRM, chatbot y facturación DGI.</p>
            <button className="mt-3 w-full h-8 rounded-[7px] bg-[var(--cq-bg)] text-[var(--cq-fg)] text-[12px] font-medium hover:bg-[var(--cq-accent)] hover:text-white transition-colors">
              Ver upgrade
            </button>
          </div>
        )}

        {/* User */}
        <div className={`${isFloating ? '' : 'border-t border-[var(--cq-border)]'} p-3 flex items-center gap-2.5 ${isIconOnly ? 'justify-center' : ''}`}>
          <Avatar name={profile ? `${profile.first_name} ${profile.last_name}` : '…'} size={32} tone="accent" />
          {!isIconOnly && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">
                  {profile ? `${profile.first_name} ${profile.last_name}` : '…'}
                </div>
                <MonoLabel>{ROLE_LABEL[role] ?? 'Usuario'}</MonoLabel>
              </div>
              <button className="text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)]" aria-label="Más opciones">
                <Icons.More size={16} />
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
