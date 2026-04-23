import { useCallback } from 'react';
import { Icons, Badge, Avatar, MonoLabel } from '../../components/ui';

const NAV_ITEMS = [
  { id: 'overview', label: 'Resumen', icon: Icons.Home },
  { id: 'agenda', label: 'Agenda', icon: Icons.Calendar, badge: '14' },
  { id: 'pacientes', label: 'Pacientes', icon: Icons.Users },
  { id: 'automatizaciones', label: 'Automatizaciones', icon: Icons.Zap, badge: '6' },
  { id: 'inbox', label: 'Inbox WhatsApp', icon: Icons.Chat, badge: '3', badgeTone: 'accent' },
  { id: 'reportes', label: 'Reportes', icon: Icons.Chart },
];

const SECONDARY_ITEMS = [{ id: 'config', label: 'Configuración', icon: Icons.Settings }];

export function Sidebar({ active, setActive, variant, collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const isFloating = variant === 'floating';

  const handleNavClick = useCallback((id) => {
    setActive(id);
    setMobileOpen(false);
  }, [setActive, setMobileOpen]);
  const isIconOnly = variant === 'icon' || collapsed;
  const width = isIconOnly ? 'w-[68px]' : 'w-[240px]';
  const base = isFloating
    ? `m-4 rounded-[16px] border border-[var(--cq-border)] bg-[var(--cq-surface)] ${width}`
    : `border-r border-[var(--cq-border)] bg-[var(--cq-surface)] ${width}`;

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
        <div
          className={`flex items-center ${
            isIconOnly ? 'justify-center px-0' : 'justify-between px-4'
          } h-16 ${!isFloating && 'border-b border-[var(--cq-border)]'}`}
        >
          <div className="flex items-center gap-2.5">
            <Icons.Logo size={22} />
            {!isIconOnly && <span className="text-[16px] font-semibold tracking-tight">Cliniq</span>}
          </div>
          {!isIconOnly && variant !== 'icon' && (
            <button
              onClick={() => setCollapsed(true)}
              className="hidden lg:inline-flex w-7 h-7 items-center justify-center rounded-[6px] text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] hover:bg-[var(--cq-surface-2)]"
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
              className="hidden lg:inline-flex w-7 h-7 absolute top-4 right-[-14px] items-center justify-center rounded-full bg-[var(--cq-surface)] border border-[var(--cq-border)] text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)]"
              aria-label="Expandir menú"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden w-7 h-7 flex items-center justify-center"
            aria-label="Cerrar menú"
          >
            <Icons.Close size={16} />
          </button>
        </div>

        {/* Clinic switcher */}
        {!isIconOnly && (
          <div className="px-3 pt-3">
            <button className="w-full flex items-center gap-2.5 px-2.5 h-11 rounded-[9px] hover:bg-[var(--cq-surface-2)] transition-colors border border-[var(--cq-border)] text-left">
              <div className="w-7 h-7 rounded-[6px] bg-[var(--cq-fg)] text-[var(--cq-bg)] flex items-center justify-center text-[11px] font-semibold">
                CB
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">Clínica Bonomi</div>
                <MonoLabel>Plan Pro · UY</MonoLabel>
              </div>
              <Icons.More size={14} />
            </button>
          </div>
        )}

        {/* Nav — ocupa el espacio disponible, scroll interno solo si hay muchos ítems */}
        <nav className="flex-1 p-3 overflow-y-auto min-h-0" aria-label="Secciones">
          {!isIconOnly && (
            <MonoLabel className="px-2.5 block mb-2 mt-2">Espacio de trabajo</MonoLabel>
          )}
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((it) => {
              const Icon = it.icon;
              return (
                <li key={it.id}>
                  <button
                    onClick={() => handleNavClick(it.id)}
                    aria-current={active === it.id ? 'page' : undefined}
                    title={isIconOnly ? it.label : undefined}
                    className={`w-full flex items-center gap-2.5 ${
                      isIconOnly ? 'justify-center px-0' : 'px-2.5'
                    } h-9 rounded-[8px] text-[13.5px] transition-colors relative ${
                      active === it.id
                        ? 'bg-[var(--cq-surface-2)] text-[var(--cq-fg)] font-medium'
                        : 'text-[var(--cq-fg-muted)] hover:bg-[var(--cq-surface-2)] hover:text-[var(--cq-fg)]'
                    }`}
                  >
                    {active === it.id && !isIconOnly && (
                      <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-[var(--cq-accent)]" />
                    )}
                    <Icon size={16} />
                    {!isIconOnly && <span className="flex-1 text-left">{it.label}</span>}
                    {!isIconOnly && it.badge && (
                      <Badge tone={it.badgeTone || 'outline'}>{it.badge}</Badge>
                    )}
                    {isIconOnly && it.badge && (
                      <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-[var(--cq-accent)]" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {!isIconOnly && (
            <MonoLabel className="px-2.5 block mb-2 mt-6">Sistema</MonoLabel>
          )}
          <ul className="space-y-0.5">
            {SECONDARY_ITEMS.map((it) => {
              const Icon = it.icon;
              return (
                <li key={it.id}>
                  <button
                    onClick={() => setActive(it.id)}
                    title={isIconOnly ? it.label : undefined}
                    className={`w-full flex items-center gap-2.5 ${
                      isIconOnly ? 'justify-center px-0' : 'px-2.5'
                    } h-9 rounded-[8px] text-[13.5px] transition-colors ${
                      active === it.id
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
          </ul>
        </nav>

        {/* Upgrade card */}
        {!isIconOnly && (
          <div className="m-3 p-4 rounded-[12px] bg-[var(--cq-fg)] text-[var(--cq-bg)] relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-[var(--cq-accent)] opacity-40 blur-2xl" />
            <MonoLabel className="text-[var(--cq-bg)]/60">Plan Pro</MonoLabel>
            <div className="mt-2 text-[13px] font-medium leading-snug">Sumá Sistema Completo</div>
            <p className="mt-1 text-[12px] text-[var(--cq-bg)]/70">
              CRM, chatbot y facturación DGI.
            </p>
            <button className="mt-3 w-full h-8 rounded-[7px] bg-[var(--cq-bg)] text-[var(--cq-fg)] text-[12px] font-medium hover:bg-[var(--cq-accent)] hover:text-white transition-colors">
              Ver upgrade
            </button>
          </div>
        )}

        {/* User */}
        <div
          className={`${
            isFloating ? '' : 'border-t border-[var(--cq-border)]'
          } p-3 flex items-center gap-2.5 ${isIconOnly ? 'justify-center' : ''}`}
        >
          <Avatar name="María Bonomi" size={32} tone="accent" />
          {!isIconOnly && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">Dra. María Bonomi</div>
                <MonoLabel>Administradora</MonoLabel>
              </div>
              <button
                className="text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)]"
                aria-label="Más opciones"
              >
                <Icons.More size={16} />
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
