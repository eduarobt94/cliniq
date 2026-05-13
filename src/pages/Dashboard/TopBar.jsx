import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icons, Badge, MonoLabel, Avatar, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const ROUTE_LABELS = {
  '/dashboard':                  'Resumen',
  '/dashboard/agenda':           'Agenda',
  '/dashboard/pacientes':        'Pacientes',
  '/dashboard/automatizaciones': 'Automatizaciones',
  '/dashboard/inbox':            'Inbox WhatsApp',
  '/dashboard/reportes':         'Reportes',
  '/dashboard/configuracion':    'Configuración',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-UY', { day: 'numeric', month: 'short' });
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' });
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24) return `hace ${hrs} h`;
  return `hace ${Math.floor(hrs / 24)} d`;
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ─── Notification type config ─────────────────────────────────────────────────
const NOTIF_CONFIG = {
  success: {
    dot:  'bg-[var(--cq-success)]',
    text: 'text-[var(--cq-success)]',
    Icon: () => (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  error: {
    dot:  'bg-[var(--cq-danger)]',
    text: 'text-[var(--cq-danger)]',
    Icon: () => (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
  },
  info: {
    dot:  'bg-[var(--cq-accent)]',
    text: 'text-[var(--cq-accent)]',
    Icon: () => (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="8" strokeWidth="3" /><line x1="12" y1="12" x2="12" y2="16" />
      </svg>
    ),
  },
  warn: {
    dot:  'bg-[var(--cq-warn)]',
    text: 'text-[var(--cq-warn)]',
    Icon: () => (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3" />
      </svg>
    ),
  },
};

// ─── Notification Center Panel ────────────────────────────────────────────────
function NotifPanel({ notifications, onClose, onNavigate }) {
  return (
    <div
      className="cq-modal-in absolute right-0 top-[calc(100%+6px)] z-30 w-[340px] bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[14px] shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--cq-border)]">
        <MonoLabel>Notificaciones</MonoLabel>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-[6px] hover:bg-[var(--cq-surface-2)] flex items-center justify-center text-[var(--cq-fg-muted)]"
          aria-label="Cerrar"
        >
          <Icons.Close size={12} />
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-[var(--cq-fg-muted)]">
          <Icons.Bell size={26} />
          <p className="text-[13px] font-medium">Sin notificaciones</p>
          <p className="text-[11.5px] text-center px-6 leading-relaxed">
            Los nuevos turnos y cambios de estado aparecerán aquí.
          </p>
        </div>
      ) : (
        <ul className="max-h-[380px] overflow-y-auto divide-y divide-[var(--cq-border)]">
          {notifications.map(n => {
            const cfg = NOTIF_CONFIG[n.type] ?? NOTIF_CONFIG.info;
            return (
              <li key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--cq-surface-2)] transition-colors">
                {/* Type indicator */}
                <div className={`mt-0.5 w-[28px] h-[28px] rounded-full flex items-center justify-center shrink-0 ${cfg.text}`}
                  style={{ background: `color-mix(in oklch, currentColor 12%, transparent)` }}>
                  <cfg.Icon />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] leading-snug ${!n.read ? 'font-medium' : ''}`}>
                    {n.message}
                  </p>
                  <p className="text-[11.5px] text-[var(--cq-fg-muted)] mt-0.5">{timeAgo(n.timestamp)}</p>
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} aria-label="No leída" />
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-[var(--cq-border)] px-4 py-3 text-center">
        <button
          onClick={() => { onClose(); onNavigate('/dashboard/agenda'); }}
          className="text-[12.5px] text-[var(--cq-accent)] hover:underline"
        >
          Ver agenda completa →
        </button>
      </div>
    </div>
  );
}

// ─── Search dropdown ──────────────────────────────────────────────────────────
function SearchPanel({ q, patients, appointments, onSelectPatient, onSelectAppt }) {
  const hasPatients = patients.length > 0;
  const hasAppts    = appointments.length > 0;

  if (!hasPatients && !hasAppts) {
    return (
      <div className="px-4 py-7 text-center">
        <p className="text-[13px] text-[var(--cq-fg-muted)]">
          Sin resultados para <span className="font-medium text-[var(--cq-fg)]">"{q}"</span>
        </p>
      </div>
    );
  }

  return (
    <>
      {hasPatients && (
        <section>
          <div className="px-4 pt-3 pb-1.5"><MonoLabel>Pacientes</MonoLabel></div>
          {patients.map(p => (
            <button
              key={p.id}
              onClick={() => onSelectPatient(p)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--cq-surface-2)] transition-colors text-left"
            >
              <Avatar name={p.full_name} size={30} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{p.full_name}</p>
                <p className="text-[11.5px] text-[var(--cq-fg-muted)]">{p.phone_number}</p>
              </div>
              <Icons.Arrow size={12} />
            </button>
          ))}
        </section>
      )}

      {hasAppts && (
        <section className={hasPatients ? 'border-t border-[var(--cq-border)]' : ''}>
          <div className="px-4 pt-3 pb-1.5"><MonoLabel>Turnos</MonoLabel></div>
          {appointments.map(a => (
            <button
              key={a.id}
              onClick={() => onSelectAppt(a)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--cq-surface-2)] transition-colors text-left"
            >
              <div className="w-[30px] h-[30px] rounded-full bg-[var(--cq-surface-2)] flex items-center justify-center shrink-0 text-[var(--cq-fg-muted)]">
                <Icons.Calendar size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{a.patients?.full_name ?? '—'}</p>
                <p className="text-[11.5px] text-[var(--cq-fg-muted)]">
                  {fmtDate(a.appointment_datetime)} · {fmtTime(a.appointment_datetime)}
                  {a.appointment_type ? ` · ${a.appointment_type}` : ''}
                </p>
              </div>
              <Icons.Arrow size={12} />
            </button>
          ))}
        </section>
      )}
    </>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────
export function TopBar({ onMobileMenu, onNewAppointment, notifications = [], unreadCount = 0, onMarkAllRead }) {
  const location = useLocation();
  const navigate  = useNavigate();
  const { clinic } = useAuth();

  // Search state
  const [q,            setQ]            = useState('');
  const [patients,     setPatients]     = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [searching,    setSearching]    = useState(false);
  const [showSearch,   setShowSearch]   = useState(false);
  const searchRef = useRef(null);
  const inputRef  = useRef(null);
  const dq = useDebounce(q, 260);

  // Notifications panel state
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const activeLabel = ROUTE_LABELS[location.pathname] ?? 'Resumen';
  const clinicName  = clinic?.name ?? '…';

  // ⌘K / Ctrl+K → focus search
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setShowSearch(q.length >= 2);
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [q]);

  // Debounced Supabase search
  useEffect(() => {
    if (!dq || dq.length < 2 || !clinic?.id) {
      setPatients([]);
      setAppointments([]);
      setShowSearch(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    Promise.all([
      supabase
        .from('patients')
        .select('id, full_name, phone_number')
        .eq('clinic_id', clinic.id)
        .ilike('full_name', `%${dq.trim()}%`)
        .limit(5),
      supabase
        .from('appointments')
        .select('id, appointment_datetime, appointment_type, status, patients(full_name)')
        .eq('clinic_id', clinic.id)
        .ilike('appointment_type', `%${dq.trim()}%`)
        .order('appointment_datetime', { ascending: false })
        .limit(4),
    ]).then(([pr, ar]) => {
      if (cancelled) return;
      setPatients(pr.data ?? []);
      setAppointments(ar.data ?? []);
      setShowSearch(true);
      setSearching(false);
    }).catch(() => { if (!cancelled) setSearching(false); });
    return () => { cancelled = true; };
  }, [dq, clinic?.id]);

  // Close search on outside click
  useEffect(() => {
    if (!showSearch) return;
    const h = (e) => { if (!searchRef.current?.contains(e.target)) setShowSearch(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showSearch]);

  // Close notif panel on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const h = (e) => { if (!notifRef.current?.contains(e.target)) setNotifOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [notifOpen]);

  const openNotifPanel = () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) onMarkAllRead?.();
  };

  const clearSearch = () => { setQ(''); setShowSearch(false); };

  return (
    <header className="h-16 border-b border-[var(--cq-border)] bg-[var(--cq-bg)] flex items-center gap-3 px-5 lg:px-8 shrink-0">
      {/* Mobile menu */}
      <button
        onClick={onMobileMenu}
        className="lg:hidden w-9 h-9 rounded-[8px] border border-[var(--cq-border)] flex items-center justify-center"
        aria-label="Abrir menú"
      >
        <Icons.Menu size={16} />
      </button>

      {/* Breadcrumb */}
      <div className="hidden md:flex items-center gap-2 text-[13.5px] text-[var(--cq-fg-muted)]">
        <span className="hover:text-[var(--cq-fg)] cursor-default">{clinicName}</span>
        <span className="opacity-40">/</span>
        <span className="text-[var(--cq-fg)]">{activeLabel}</span>
      </div>

      {/* Search */}
      <div ref={searchRef} className="flex-1 max-w-[420px] mx-auto relative">
        <div className="flex items-center gap-2 h-9 px-3 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-surface)] hover:border-[var(--cq-fg-muted)] transition-colors focus-within:ring-2 focus-within:ring-[var(--cq-accent)] focus-within:border-[var(--cq-accent)]">
          {searching
            ? <SpinnerIcon />
            : <Icons.Search size={14} className="text-[var(--cq-fg-muted)] shrink-0" />
          }
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => { if (q.length >= 2) setShowSearch(true); }}
            onKeyDown={(e) => { if (e.key === 'Escape') clearSearch(); }}
            placeholder="Buscar paciente o tipo de consulta…"
            aria-label="Buscar"
            className="flex-1 bg-transparent outline-none text-[13.5px] placeholder:text-[var(--cq-fg-muted)]"
          />
          {q ? (
            <button onClick={clearSearch} className="text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] shrink-0" aria-label="Limpiar">
              <Icons.Close size={12} />
            </button>
          ) : (
            <MonoLabel className="hidden md:inline shrink-0">⌘ K</MonoLabel>
          )}
        </div>

        {showSearch && (
          <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-30 bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[12px] shadow-xl overflow-hidden pb-2">
            <SearchPanel
              q={q}
              patients={patients}
              appointments={appointments}
              onSelectPatient={(p) => { clearSearch(); navigate(`/dashboard/pacientes?q=${encodeURIComponent(p.full_name)}`); }}
              onSelectAppt={(a) => {
                clearSearch();
                const term = a.appointment_type || a.patients?.full_name || '';
                navigate(`/dashboard/agenda?q=${encodeURIComponent(term)}`);
              }}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={openNotifPanel}
            className="w-10 h-10 rounded-[8px] hover:bg-[var(--cq-surface-2)] flex items-center justify-center relative transition-colors"
            aria-label={`Notificaciones${unreadCount > 0 ? ` — ${unreadCount} sin leer` : ''}`}
          >
            <Icons.Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-[3px] rounded-full bg-[var(--cq-accent)] text-white text-[9px] font-bold flex items-center justify-center leading-none pointer-events-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <NotifPanel
              notifications={notifications}
              onClose={() => setNotifOpen(false)}
              onNavigate={navigate}
            />
          )}
        </div>

        <Button variant="primary" size="sm" onClick={onNewAppointment}>
          <Icons.Plus size={12} /> Nuevo turno
        </Button>
      </div>
    </header>
  );
}
