import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icons, Badge, MonoLabel, Avatar } from '../../components/ui';
import { Button } from '../../components/ui';
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

const NOTIF_SEEN_KEY = 'cq_notif_seen';

function useDebounce(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-UY', { day: 'numeric', month: 'short' });
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ─── Search panel ─────────────────────────────────────────────────────────────
function SearchPanel({ q, patients, appointments, onSelectPatient, onSelectAppt }) {
  const hasPatients = patients.length > 0;
  const hasAppts    = appointments.length > 0;
  const hasAny      = hasPatients || hasAppts;

  if (!hasAny) {
    return (
      <div className="px-4 py-7 text-center">
        <p className="text-[13px] text-[var(--cq-fg-muted)]">Sin resultados para <span className="font-medium text-[var(--cq-fg)]">"{q}"</span></p>
      </div>
    );
  }

  return (
    <>
      {hasPatients && (
        <section>
          <div className="px-4 pt-3 pb-1.5">
            <MonoLabel>Pacientes</MonoLabel>
          </div>
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
          <div className="px-4 pt-3 pb-1.5">
            <MonoLabel>Turnos</MonoLabel>
          </div>
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

// ─── Notifications panel ──────────────────────────────────────────────────────
function NotifPanel({ notifs, onClose, onNavigate }) {
  const STATUS_TONE = { new: 'accent', pending: 'warn' };
  const STATUS_LABEL = { new: 'Nuevo', pending: 'Pendiente' };

  return (
    <div
      className="absolute right-0 top-[calc(100%+6px)] z-30 w-80 bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[14px] shadow-xl overflow-hidden"
      style={{ animation: 'cqModalIn 200ms cubic-bezier(.2,.7,.2,1)' }}
    >
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

      {notifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-[var(--cq-fg-muted)]">
          <Icons.Bell size={24} />
          <p className="text-[13px]">Sin notificaciones pendientes</p>
          <p className="text-[11.5px] text-center px-6">Los turnos nuevos y pendientes de hoy aparecerán aquí.</p>
        </div>
      ) : (
        <>
          <div className="px-4 pt-3 pb-1">
            <p className="text-[12px] text-[var(--cq-fg-muted)]">Turnos de hoy sin confirmar — {notifs.length}</p>
          </div>
          <div className="max-h-[320px] overflow-y-auto divide-y divide-[var(--cq-border)]">
            {notifs.map(n => (
              <button
                key={n.id}
                onClick={() => { onClose(); onNavigate('/dashboard/agenda'); }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--cq-surface-2)] transition-colors text-left"
              >
                <Avatar name={n.patients?.full_name ?? '?'} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{n.patients?.full_name ?? '—'}</p>
                  <p className="text-[11.5px] text-[var(--cq-fg-muted)]">
                    {fmtTime(n.appointment_datetime)}
                    {n.appointment_type ? ` · ${n.appointment_type}` : ''}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[n.status] ?? 'accent'} dot>
                  {STATUS_LABEL[n.status] ?? n.status}
                </Badge>
              </button>
            ))}
          </div>
        </>
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

// ─── TopBar ───────────────────────────────────────────────────────────────────
export function TopBar({ onMobileMenu, onNewAppointment }) {
  const location = useLocation();
  const navigate  = useNavigate();
  const { clinic } = useAuth();

  // Search state
  const [q,           setQ]           = useState('');
  const [patients,    setPatients]    = useState([]);
  const [appointments,setAppointments]= useState([]);
  const [searching,   setSearching]   = useState(false);
  const [showSearch,  setShowSearch]  = useState(false);
  const searchRef = useRef(null);
  const inputRef  = useRef(null);
  const dq = useDebounce(q, 260);

  // Notifications state
  const [notifs,     setNotifs]     = useState([]);
  const [unread,     setUnread]     = useState(0);
  const [notifOpen,  setNotifOpen]  = useState(false);
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

  // Debounced search against Supabase
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

  // Load today's unconfirmed appointments as notifications
  const loadNotifs = useCallback(async () => {
    if (!clinic?.id) return;
    const now   = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
    const { data } = await supabase
      .from('appointments')
      .select('id, appointment_datetime, appointment_type, status, patients(full_name)')
      .eq('clinic_id', clinic.id)
      .in('status', ['new', 'pending'])
      .gte('appointment_datetime', start)
      .lt('appointment_datetime', end)
      .order('appointment_datetime');
    const list = data ?? [];
    setNotifs(list);

    const seenAt  = parseInt(localStorage.getItem(NOTIF_SEEN_KEY) ?? '0', 10);
    const newCount = seenAt === 0 ? list.length : list.filter(n => {
      const created = new Date(n.appointment_datetime).getTime();
      return created > seenAt;
    }).length;
    setUnread(Math.min(newCount, list.length));
  }, [clinic?.id]);

  useEffect(() => { loadNotifs(); }, [loadNotifs]);

  // Close notif on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const h = (e) => { if (!notifRef.current?.contains(e.target)) setNotifOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [notifOpen]);

  const openNotifPanel = () => {
    const next = !notifOpen;
    setNotifOpen(next);
    if (next) {
      localStorage.setItem(NOTIF_SEEN_KEY, Date.now().toString());
      setUnread(0);
    }
  };

  const clearSearch = () => { setQ(''); setShowSearch(false); };

  const handleSelectPatient = (p) => {
    clearSearch();
    navigate('/dashboard/pacientes');
  };

  const handleSelectAppt = (a) => {
    clearSearch();
    navigate('/dashboard/agenda');
  };

  return (
    <header className="h-16 border-b border-[var(--cq-border)] bg-[var(--cq-bg)] flex items-center gap-3 px-5 lg:px-8 shrink-0">
      <button
        onClick={onMobileMenu}
        className="lg:hidden w-9 h-9 rounded-[8px] border border-[var(--cq-border)] flex items-center justify-center"
        aria-label="Abrir menú"
      >
        <Icons.Menu size={16} />
      </button>

      <div className="hidden md:flex items-center gap-2 text-[13.5px] text-[var(--cq-fg-muted)]">
        <span className="hover:text-[var(--cq-fg)] cursor-pointer">{clinicName}</span>
        <span className="opacity-40">/</span>
        <span className="text-[var(--cq-fg)]">{activeLabel}</span>
      </div>

      {/* Search */}
      <div ref={searchRef} className="flex-1 max-w-[420px] mx-auto relative">
        <div className="flex items-center gap-2 h-9 px-3 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-surface)] hover:border-[var(--cq-fg-muted)] transition-colors focus-within:ring-2 focus-within:ring-[var(--cq-accent)] focus-within:border-[var(--cq-accent)]">
          {searching ? <SpinnerIcon /> : <Icons.Search size={14} className="text-[var(--cq-fg-muted)] shrink-0" />}
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
            <button
              onClick={clearSearch}
              className="text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] shrink-0"
              aria-label="Limpiar búsqueda"
            >
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
              onSelectPatient={handleSelectPatient}
              onSelectAppt={handleSelectAppt}
            />
          </div>
        )}
      </div>

      {/* Notifications + New appointment */}
      <div className="flex items-center gap-1.5">
        <div ref={notifRef} className="relative">
          <button
            onClick={openNotifPanel}
            className="w-10 h-10 rounded-[8px] hover:bg-[var(--cq-surface-2)] flex items-center justify-center relative transition-colors"
            aria-label={`Notificaciones${unread > 0 ? ` (${unread} sin leer)` : ''}`}
          >
            <Icons.Bell size={15} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] px-[3px] rounded-full bg-[var(--cq-accent)] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <NotifPanel
              notifs={notifs}
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
