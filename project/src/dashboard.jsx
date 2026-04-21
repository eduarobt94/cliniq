// Cliniq — Dashboard (Command Center)
// Sidebar + grid: today, automations, KPIs, inbox
(function(){
const { CliniqIcons, CliniqButton, CliniqBadge, CliniqCard, MonoLabel, SectionLabel, Divider, CliniqAvatar } = window;

// Sidebar
const Sidebar = ({ active, setActive, variant, collapsed, setCollapsed, mobileOpen, setMobileOpen }) => {
  const items = [
    { id: 'overview', label: 'Resumen', icon: CliniqIcons.Home },
    { id: 'agenda', label: 'Agenda', icon: CliniqIcons.Calendar, badge: '14' },
    { id: 'pacientes', label: 'Pacientes', icon: CliniqIcons.Users },
    { id: 'automatizaciones', label: 'Automatizaciones', icon: CliniqIcons.Zap, badge: '6' },
    { id: 'inbox', label: 'Inbox WhatsApp', icon: CliniqIcons.Chat, badge: '3', badgeTone: 'accent' },
    { id: 'reportes', label: 'Reportes', icon: CliniqIcons.Chart },
  ];
  const secondary = [
    { id: 'config', label: 'Configuración', icon: CliniqIcons.Settings },
  ];

  const isFloating = variant === 'floating';
  const isIconOnly = variant === 'icon' || collapsed;

  const width = isIconOnly ? 'w-[68px]' : 'w-[240px]';
  const base = isFloating
    ? `m-4 rounded-[16px] border border-[var(--cq-border)] bg-[var(--cq-surface)] ${width}`
    : `border-r border-[var(--cq-border)] bg-[var(--cq-surface)] ${width}`;

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        aria-label="Navegación lateral"
        className={`fixed lg:static inset-y-0 left-0 z-50 lg:z-0 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${base} flex flex-col shrink-0`}
      >
        {/* Brand */}
        <div className={`flex items-center ${isIconOnly ? 'justify-center px-0' : 'justify-between px-4'} h-16 ${!isFloating && 'border-b border-[var(--cq-border)]'}`}>
          <div className="flex items-center gap-2.5">
            <CliniqIcons.Logo size={22}/>
            {!isIconOnly && <span className="text-[16px] font-semibold tracking-tight">Cliniq</span>}
          </div>
          {!isIconOnly && variant !== 'icon' && (
            <button
              onClick={() => setCollapsed(true)}
              className="hidden lg:inline-flex w-7 h-7 items-center justify-center rounded-[6px] text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] hover:bg-[var(--cq-surface-2)]"
              aria-label="Colapsar menú"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
          {isIconOnly && variant !== 'icon' && (
            <button
              onClick={() => setCollapsed(false)}
              className="hidden lg:inline-flex w-7 h-7 absolute top-4 right-[-14px] items-center justify-center rounded-full bg-[var(--cq-surface)] border border-[var(--cq-border)] text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)]"
              aria-label="Expandir menú"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
          <button onClick={() => setMobileOpen(false)} className="lg:hidden w-7 h-7 flex items-center justify-center" aria-label="Cerrar menú">
            <CliniqIcons.Close size={16}/>
          </button>
        </div>

        {/* Clinic switcher */}
        {!isIconOnly && (
          <div className="px-3 pt-3">
            <button className="w-full flex items-center gap-2.5 px-2.5 h-11 rounded-[9px] hover:bg-[var(--cq-surface-2)] transition-colors border border-[var(--cq-border)] text-left">
              <div className="w-7 h-7 rounded-[6px] bg-[var(--cq-fg)] text-[var(--cq-bg)] flex items-center justify-center text-[11px] font-semibold">CB</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">Clínica Bonomi</div>
                <MonoLabel>Plan Pro · UY</MonoLabel>
              </div>
              <CliniqIcons.More size={14}/>
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 overflow-y-auto" aria-label="Secciones">
          {!isIconOnly && <MonoLabel className="px-2.5 block mb-2 mt-2">Espacio de trabajo</MonoLabel>}
          <ul className="space-y-0.5">
            {items.map(it => (
              <li key={it.id}>
                <button
                  onClick={() => { setActive(it.id); setMobileOpen(false); }}
                  aria-current={active === it.id ? 'page' : undefined}
                  title={isIconOnly ? it.label : undefined}
                  className={`w-full flex items-center gap-2.5 ${isIconOnly ? 'justify-center px-0' : 'px-2.5'} h-9 rounded-[8px] text-[13.5px] transition-colors relative ${
                    active === it.id
                      ? 'bg-[var(--cq-surface-2)] text-[var(--cq-fg)] font-medium'
                      : 'text-[var(--cq-fg-muted)] hover:bg-[var(--cq-surface-2)] hover:text-[var(--cq-fg)]'
                  }`}
                >
                  {active === it.id && !isIconOnly && (
                    <span className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-[var(--cq-accent)]"/>
                  )}
                  <it.icon size={16}/>
                  {!isIconOnly && <span className="flex-1 text-left">{it.label}</span>}
                  {!isIconOnly && it.badge && (
                    <CliniqBadge tone={it.badgeTone || 'outline'}>{it.badge}</CliniqBadge>
                  )}
                  {isIconOnly && it.badge && (
                    <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-[var(--cq-accent)]"/>
                  )}
                </button>
              </li>
            ))}
          </ul>

          {!isIconOnly && <MonoLabel className="px-2.5 block mb-2 mt-6">Sistema</MonoLabel>}
          <ul className="space-y-0.5">
            {secondary.map(it => (
              <li key={it.id}>
                <button
                  onClick={() => setActive(it.id)}
                  title={isIconOnly ? it.label : undefined}
                  className={`w-full flex items-center gap-2.5 ${isIconOnly ? 'justify-center px-0' : 'px-2.5'} h-9 rounded-[8px] text-[13.5px] transition-colors ${
                    active === it.id
                      ? 'bg-[var(--cq-surface-2)] text-[var(--cq-fg)] font-medium'
                      : 'text-[var(--cq-fg-muted)] hover:bg-[var(--cq-surface-2)] hover:text-[var(--cq-fg)]'
                  }`}
                >
                  <it.icon size={16}/>
                  {!isIconOnly && <span className="flex-1 text-left">{it.label}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Upgrade card */}
        {!isIconOnly && (
          <div className="m-3 p-4 rounded-[12px] bg-[var(--cq-fg)] text-[var(--cq-bg)] relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-[var(--cq-accent)] opacity-40 blur-2xl"/>
            <MonoLabel className="text-[var(--cq-bg)]/60">Plan Pro</MonoLabel>
            <div className="mt-2 text-[13px] font-medium leading-snug">
              Sumá Sistema Completo
            </div>
            <p className="mt-1 text-[12px] text-[var(--cq-bg)]/70">
              CRM, chatbot y facturación DGI.
            </p>
            <button className="mt-3 w-full h-8 rounded-[7px] bg-[var(--cq-bg)] text-[var(--cq-fg)] text-[12px] font-medium hover:bg-[var(--cq-accent)] hover:text-white transition-colors">
              Ver upgrade
            </button>
          </div>
        )}

        {/* User */}
        <div className={`${isFloating ? '' : 'border-t border-[var(--cq-border)]'} p-3 flex items-center gap-2.5 ${isIconOnly ? 'justify-center' : ''}`}>
          <CliniqAvatar name="María Bonomi" size={32} tone="accent"/>
          {!isIconOnly && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate">Dra. María Bonomi</div>
                <MonoLabel>Administradora</MonoLabel>
              </div>
              <button className="text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)]" aria-label="Más opciones"><CliniqIcons.More size={16}/></button>
            </>
          )}
        </div>
      </aside>
    </>
  );
};

// Top bar inside dashboard
const TopBar = ({ onMobileMenu, onNewAppointment }) => {
  const [q, setQ] = React.useState('');
  return (
    <header className="h-16 border-b border-[var(--cq-border)] bg-[var(--cq-bg)] flex items-center gap-3 px-5 lg:px-8 shrink-0">
      <button onClick={onMobileMenu} className="lg:hidden w-9 h-9 rounded-[8px] border border-[var(--cq-border)] flex items-center justify-center" aria-label="Abrir menú">
        <CliniqIcons.Menu size={16}/>
      </button>
      <div className="hidden md:flex items-center gap-2 text-[13.5px] text-[var(--cq-fg-muted)]">
        <span className="hover:text-[var(--cq-fg)] cursor-pointer">Clínica Bonomi</span>
        <span className="opacity-40">/</span>
        <span className="text-[var(--cq-fg)]">Resumen</span>
      </div>

      <div className="flex-1 max-w-[420px] mx-auto">
        <div className="flex items-center gap-2 h-9 px-3 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-surface)] hover:border-[var(--cq-fg-muted)] transition-colors focus-within:ring-2 focus-within:ring-[var(--cq-accent)]">
          <CliniqIcons.Search size={14}/>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar paciente, turno, automatización…"
            aria-label="Buscar"
            className="flex-1 bg-transparent outline-none text-[13.5px] placeholder:text-[var(--cq-fg-muted)]"
          />
          <MonoLabel className="hidden md:inline">⌘ K</MonoLabel>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button className="w-9 h-9 rounded-[8px] hover:bg-[var(--cq-surface-2)] flex items-center justify-center relative" aria-label="Notificaciones">
          <CliniqIcons.Bell size={15}/>
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--cq-accent)]"/>
        </button>
        <CliniqButton variant="primary" size="sm" onClick={onNewAppointment}>
          <CliniqIcons.Plus size={12}/> Nuevo turno
        </CliniqButton>
      </div>
    </header>
  );
};

// KPI card
const KpiCard = ({ label, value, delta, trend, hint }) => (
  <div className="p-5 bg-[var(--cq-bg)]">
    <div className="flex items-center justify-between">
      <MonoLabel>{label}</MonoLabel>
      {delta && (
        <span className={`inline-flex items-center gap-1 text-[12px] font-medium ${trend === 'up' ? 'text-[var(--cq-success)]' : trend === 'down' ? 'text-[var(--cq-danger)]' : 'text-[var(--cq-fg-muted)]'}`}>
          {trend === 'up' ? <CliniqIcons.TrendUp size={12}/> : trend === 'down' ? <CliniqIcons.TrendDown size={12}/> : null}
          {delta}
        </span>
      )}
    </div>
    <div className="mt-3 text-[30px] md:text-[34px] tracking-tight font-semibold leading-none">{value}</div>
    <div className="mt-2 text-[12.5px] text-[var(--cq-fg-muted)]">{hint}</div>
  </div>
);

// Sparkline
const Sparkline = ({ data = [], height = 40, color = 'var(--cq-accent)' }) => {
  const w = 200, h = height;
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 6) - 3;
    return [x, y];
  });
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = path + ` L${w} ${h} L0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" aria-hidden="true">
      <path d={area} fill={color} opacity="0.1"/>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map(([x, y], i) => i === pts.length - 1 && <circle key={i} cx={x} cy={y} r="3" fill={color}/>)}
    </svg>
  );
};

// Today appointments
const AgendaBlock = () => {
  const appts = [
    { t: '09:00', name: 'Camila Álvarez', type: 'Control', prof: 'Dr. Bonomi', status: 'confirmed' },
    { t: '09:30', name: 'Martín Pérez', type: 'Limpieza', prof: 'Dra. Silva', status: 'confirmed' },
    { t: '10:00', name: 'Lucía Fernández', type: 'Ortodoncia', prof: 'Dr. Bonomi', status: 'pending' },
    { t: '10:30', name: 'Roberto Castro', type: 'Endodoncia', prof: 'Dr. Bonomi', status: 'confirmed' },
    { t: '11:00', name: 'Ana Rodríguez', type: 'Primera visita', prof: 'Dra. Silva', status: 'new' },
    { t: '11:30', name: 'Diego Méndez', type: 'Control', prof: 'Dr. Bonomi', status: 'rescheduled' },
  ];
  const now = 2; // highlight after index 2
  return (
    <CliniqCard className="lg:col-span-2" padded={false}>
      <div className="flex items-center justify-between p-5 pb-4">
        <div>
          <MonoLabel>Agenda · Hoy</MonoLabel>
          <h3 className="mt-1 text-[18px] font-semibold tracking-tight">Lunes 20 abril</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <CliniqBadge tone="success" dot>14 confirmados</CliniqBadge>
          <CliniqBadge tone="warn" dot>3 pendientes</CliniqBadge>
        </div>
      </div>
      <Divider/>
      <ul className="divide-y divide-[var(--cq-border)]">
        {appts.map((a, i) => (
          <li key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-[var(--cq-surface-2)] transition-colors cursor-pointer group relative">
            {i === now && (
              <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-[var(--cq-accent)]"/>
            )}
            <div className="w-14 shrink-0">
              <div className="font-mono text-[13px] font-medium">{a.t}</div>
              <MonoLabel>{a.prof.split(' ')[1]}</MonoLabel>
            </div>
            <CliniqAvatar name={a.name} size={34}/>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium truncate">{a.name}</div>
              <div className="text-[12.5px] text-[var(--cq-fg-muted)] truncate">{a.type} · {a.prof}</div>
            </div>
            <StatusPill status={a.status}/>
            <button className="w-7 h-7 rounded-[6px] hover:bg-[var(--cq-surface-3)] opacity-0 group-hover:opacity-100 flex items-center justify-center" aria-label="Acciones">
              <CliniqIcons.More size={14}/>
            </button>
          </li>
        ))}
      </ul>
      <div className="p-4 flex items-center justify-between">
        <MonoLabel>8 turnos más hoy</MonoLabel>
        <button className="text-[13px] font-medium inline-flex items-center gap-1 hover:text-[var(--cq-accent)] transition-colors">
          Ver agenda completa <CliniqIcons.ArrowUpRight size={12}/>
        </button>
      </div>
    </CliniqCard>
  );
};

const StatusPill = ({ status }) => {
  const map = {
    confirmed: { tone: 'success', label: 'Confirmado' },
    pending: { tone: 'warn', label: 'Esperando' },
    new: { tone: 'accent', label: 'Nuevo' },
    rescheduled: { tone: 'outline', label: 'Reagendó' },
  };
  const { tone, label } = map[status] || map.pending;
  return <CliniqBadge tone={tone} dot>{label}</CliniqBadge>;
};

// Automations
const AutomationsBlock = () => {
  const flows = [
    { code: 'AX-001', name: 'Recordatorio de turno · WhatsApp', runs: 142, ok: 138, status: 'active', last: 'hace 2 min' },
    { code: 'AX-002', name: 'Seguimiento de presupuestos', runs: 23, ok: 22, status: 'active', last: 'hace 14 min' },
    { code: 'AX-003', name: 'Reactivación pacientes inactivos', runs: 18, ok: 17, status: 'active', last: 'hace 1 h' },
    { code: 'AX-004', name: 'Reseñas en Google', runs: 9, ok: 8, status: 'warn', last: 'hace 3 h' },
    { code: 'AX-005', name: 'Reporte semanal al dueño', runs: 1, ok: 1, status: 'idle', last: 'ayer 09:00' },
  ];
  return (
    <CliniqCard padded={false}>
      <div className="flex items-center justify-between p-5 pb-4">
        <div>
          <MonoLabel>Automatizaciones</MonoLabel>
          <h3 className="mt-1 text-[18px] font-semibold tracking-tight">Estado del sistema</h3>
        </div>
        <CliniqButton variant="ghost" size="sm">
          <CliniqIcons.Plus size={12}/> Nueva
        </CliniqButton>
      </div>
      <Divider/>
      <ul className="divide-y divide-[var(--cq-border)]">
        {flows.map((f) => (
          <li key={f.code} className="px-5 py-3 hover:bg-[var(--cq-surface-2)] transition-colors cursor-pointer">
            <div className="flex items-center gap-3 mb-1.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                f.status === 'active' ? 'bg-[var(--cq-success)]' :
                f.status === 'warn' ? 'bg-[var(--cq-warn)]' : 'bg-[var(--cq-fg-muted)]'
              } ${f.status === 'active' && 'animate-pulse'}`}/>
              <MonoLabel>{f.code}</MonoLabel>
              <MonoLabel className="ml-auto">{f.last}</MonoLabel>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-medium truncate">{f.name}</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-[var(--cq-surface-3)] overflow-hidden max-w-[120px]">
                    <div className="h-full bg-[var(--cq-success)]" style={{ width: `${(f.ok / f.runs) * 100}%` }}/>
                  </div>
                  <MonoLabel>{f.ok}/{f.runs} OK</MonoLabel>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="p-4">
        <button className="w-full h-9 text-[13px] font-medium text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] inline-flex items-center justify-center gap-1">
          Ver todas las automatizaciones <CliniqIcons.Arrow size={12}/>
        </button>
      </div>
    </CliniqCard>
  );
};

// Revenue chart
const RevenueBlock = () => {
  const series = [42, 48, 45, 52, 58, 54, 62, 68, 72, 69, 76, 82];
  const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return (
    <CliniqCard className="lg:col-span-2">
      <div className="flex items-start justify-between mb-5">
        <div>
          <MonoLabel>Facturación · 2026</MonoLabel>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[32px] font-semibold tracking-tight leading-none">USD 82.450</span>
            <span className="text-[var(--cq-success)] text-[13px] font-medium inline-flex items-center gap-1">
              <CliniqIcons.TrendUp size={12}/> +18.4%
            </span>
          </div>
          <div className="mt-1 text-[12.5px] text-[var(--cq-fg-muted)]">
            <span className="text-[var(--cq-accent)] font-medium">USD 12.340</span> recuperados por Cliniq este año
          </div>
        </div>
        <div className="flex gap-1">
          {['3m', '6m', '1a'].map((p, i) => (
            <button key={p} className={`px-2.5 h-7 rounded-[6px] text-[12px] font-medium ${i === 2 ? 'bg-[var(--cq-fg)] text-[var(--cq-bg)]' : 'text-[var(--cq-fg-muted)] hover:bg-[var(--cq-surface-2)]'}`}>{p}</button>
          ))}
        </div>
      </div>
      <RevenueChart series={series} labels={labels}/>
    </CliniqCard>
  );
};

const RevenueChart = ({ series, labels }) => {
  const w = 600, h = 140, pad = 8;
  const max = Math.max(...series), min = Math.min(...series) * 0.85;
  const pts = series.map((v, i) => {
    const x = (i / (series.length - 1)) * (w - pad * 2) + pad;
    const y = h - ((v - min) / (max - min)) * (h - pad * 2) - pad;
    return [x, y];
  });
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = path + ` L${w - pad} ${h} L${pad} ${h} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" aria-hidden="true" style={{ height: 140 }}>
        <defs>
          <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--cq-accent)" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="var(--cq-accent)" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={pad} x2={w - pad} y1={h * f} y2={h * f} stroke="var(--cq-border)" strokeWidth="0.5" strokeDasharray="2 3"/>
        ))}
        <path d={area} fill="url(#g1)"/>
        <path d={path} fill="none" stroke="var(--cq-accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 4 : 2.5} fill="var(--cq-accent)" stroke="var(--cq-bg)" strokeWidth="1.5"/>
        ))}
      </svg>
      <div className="mt-2 grid grid-cols-12 text-[10.5px] font-mono uppercase tracking-wider text-[var(--cq-fg-muted)]">
        {labels.map(l => <span key={l} className="text-center">{l}</span>)}
      </div>
    </div>
  );
};

// Inbox
const InboxBlock = () => {
  const msgs = [
    { name: 'Camila Álvarez', msg: '1 — Confirmo el turno de mañana, gracias', time: 'ahora', unread: true, tone: 'success', auto: true },
    { name: 'Martín Pérez', msg: 'Hola, ¿tienen turno esta semana para limpieza?', time: '12m', unread: true, tone: 'accent' },
    { name: 'Lucía Fernández', msg: '¿Cuánto sale la primera consulta?', time: '34m', unread: true, tone: 'accent', bot: true },
    { name: 'Roberto Castro', msg: 'Perfecto, nos vemos el jueves', time: '1h', unread: false, tone: 'neutral' },
  ];
  return (
    <CliniqCard padded={false}>
      <div className="flex items-center justify-between p-5 pb-4">
        <div>
          <MonoLabel>Inbox · WhatsApp</MonoLabel>
          <h3 className="mt-1 text-[18px] font-semibold tracking-tight">3 sin leer</h3>
        </div>
        <CliniqBadge tone="success" dot>Bot activo</CliniqBadge>
      </div>
      <Divider/>
      <ul className="divide-y divide-[var(--cq-border)]">
        {msgs.map((m, i) => (
          <li key={i} className="px-5 py-3 hover:bg-[var(--cq-surface-2)] cursor-pointer transition-colors flex items-start gap-3">
            <div className="relative shrink-0">
              <CliniqAvatar name={m.name} size={34}/>
              {m.unread && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--cq-accent)] ring-2 ring-[var(--cq-surface)]"/>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[13.5px] truncate ${m.unread ? 'font-semibold' : 'font-medium'}`}>{m.name}</span>
                {m.auto && <MonoLabel className="text-[var(--cq-success)]">auto</MonoLabel>}
                {m.bot && <MonoLabel className="text-[var(--cq-accent)]">bot</MonoLabel>}
                <span className="ml-auto font-mono text-[10.5px] text-[var(--cq-fg-muted)]">{m.time}</span>
              </div>
              <div className="text-[12.5px] text-[var(--cq-fg-muted)] truncate mt-0.5">{m.msg}</div>
            </div>
          </li>
        ))}
      </ul>
      <div className="p-4">
        <button className="w-full h-9 text-[13px] font-medium text-[var(--cq-fg-muted)] hover:text-[var(--cq-fg)] inline-flex items-center justify-center gap-1">
          Abrir bandeja <CliniqIcons.ArrowUpRight size={12}/>
        </button>
      </div>
    </CliniqCard>
  );
};

// Money at risk
const RiskBlock = () => {
  const items = [
    { name: 'Presupuestos sin respuesta', amount: 'USD 3.240', count: '8 pacientes', tone: 'warn' },
    { name: 'Pacientes inactivos >6m', amount: 'USD 5.800', count: '23 pacientes', tone: 'danger' },
    { name: 'Turnos no confirmados', amount: 'USD 560', count: '3 turnos', tone: 'warn' },
  ];
  return (
    <CliniqCard>
      <div className="flex items-start justify-between mb-5">
        <div>
          <MonoLabel>Dinero en riesgo</MonoLabel>
          <div className="mt-2 text-[26px] font-semibold tracking-tight leading-none">USD 9.600</div>
          <div className="mt-1.5 text-[12.5px] text-[var(--cq-fg-muted)]">
            Cliniq puede recuperar ~<span className="text-[var(--cq-accent)] font-medium">USD 4.100</span>
          </div>
        </div>
        <span className="w-8 h-8 rounded-[8px] bg-[var(--cq-accent-soft)] text-[var(--cq-accent)] flex items-center justify-center">
          <CliniqIcons.Pulse size={16}/>
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-3 py-2">
            <span className={`w-1 h-8 rounded-full ${it.tone === 'danger' ? 'bg-[var(--cq-danger)]' : 'bg-[var(--cq-warn)]'}`}/>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate">{it.name}</div>
              <MonoLabel>{it.count}</MonoLabel>
            </div>
            <div className="text-[13px] font-mono font-semibold">{it.amount}</div>
          </li>
        ))}
      </ul>
      <button className="mt-4 w-full h-9 rounded-[8px] bg-[var(--cq-fg)] text-[var(--cq-bg)] text-[12.5px] font-medium hover:bg-[var(--cq-accent)] transition-colors inline-flex items-center justify-center gap-1.5">
        Activar recuperación <CliniqIcons.Sparkle size={11}/>
      </button>
    </CliniqCard>
  );
};

// Greeting strip
const GreetingStrip = () => (
  <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
    <div>
      <MonoLabel>Lun · 20 abr · 2026 · 09:14 UYT</MonoLabel>
      <h2 className="mt-2 text-[28px] md:text-[34px] tracking-[-0.02em] font-semibold leading-tight">
        Buen día, María.
      </h2>
      <p className="text-[14px] text-[var(--cq-fg-muted)]">
        Mientras desayunabas, Cliniq confirmó <strong className="text-[var(--cq-fg)] font-medium">11 turnos</strong> y agendó <strong className="text-[var(--cq-fg)] font-medium">2 consultas nuevas</strong>.
      </p>
    </div>
    <div className="flex items-center gap-2">
      <CliniqButton variant="outline" size="sm">
        <CliniqIcons.Calendar size={14}/> Agenda
      </CliniqButton>
      <CliniqButton variant="secondary" size="sm">
        Exportar reporte
      </CliniqButton>
    </div>
  </div>
);

// New appointment modal
const NewAppointmentModal = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="new-appt-title" className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-[520px] bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[16px] p-6" style={{ animation: 'cqModalIn 220ms cubic-bezier(.2,.7,.2,1)' }}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <MonoLabel>Nuevo turno</MonoLabel>
            <h3 id="new-appt-title" className="mt-1 text-[22px] font-semibold tracking-tight">Agendar paciente</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-[8px] hover:bg-[var(--cq-surface-2)] flex items-center justify-center" aria-label="Cerrar">
            <CliniqIcons.Close size={16}/>
          </button>
        </div>
        <div className="space-y-3">
          <MiniField label="Paciente" icon={<CliniqIcons.Users size={14}/>} placeholder="Buscar o crear…"/>
          <div className="grid grid-cols-2 gap-3">
            <MiniField label="Fecha" icon={<CliniqIcons.Calendar size={14}/>} value="Mar 21 abr"/>
            <MiniField label="Hora" value="10:30"/>
          </div>
          <MiniField label="Profesional" value="Dr. Bonomi"/>
          <MiniField label="Tipo de consulta" value="Control"/>
          <div className="flex items-center gap-2 pt-2">
            <span className="w-4 h-4 rounded-[4px] bg-[var(--cq-fg)] flex items-center justify-center">
              <CliniqIcons.Check size={10}/>
            </span>
            <span className="text-[13px]">Enviar recordatorio automático por WhatsApp</span>
            <CliniqBadge tone="accent" className="ml-auto">AX-001</CliniqBadge>
          </div>
        </div>
        <div className="mt-6 flex items-center gap-2 justify-end">
          <CliniqButton variant="ghost" size="md" onClick={onClose}>Cancelar</CliniqButton>
          <CliniqButton variant="primary" size="md" onClick={onClose}>Agendar <CliniqIcons.Arrow size={12}/></CliniqButton>
        </div>
      </div>
    </div>
  );
};

const MiniField = ({ label, icon, placeholder, value }) => (
  <div>
    <label className="block">
      <MonoLabel>{label}</MonoLabel>
      <div className="mt-1.5 flex items-center gap-2 h-10 px-3 rounded-[9px] border border-[var(--cq-border)] bg-[var(--cq-bg)] focus-within:border-[var(--cq-fg)]">
        {icon && <span className="text-[var(--cq-fg-muted)]">{icon}</span>}
        <input defaultValue={value} placeholder={placeholder} className="flex-1 bg-transparent outline-none text-[13.5px]"/>
      </div>
    </label>
  </div>
);

// Main Dashboard export
const CliniqDashboard = ({ onNavigate, sidebarVariant, density }) => {
  const [active, setActive] = React.useState('overview');
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);

  const gapClass = density === 'compact' ? 'gap-3' : 'gap-5';
  const padClass = density === 'compact' ? 'p-5 md:p-6' : 'p-5 md:p-8';

  return (
    <div className="min-h-screen bg-[var(--cq-surface-2)] text-[var(--cq-fg)] flex">
      <Sidebar
        active={active} setActive={setActive}
        variant={sidebarVariant}
        collapsed={collapsed} setCollapsed={setCollapsed}
        mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          onMobileMenu={() => setMobileOpen(true)}
          onNewAppointment={() => setModalOpen(true)}
        />
        <main className={`flex-1 overflow-y-auto ${padClass}`}>
          <GreetingStrip/>

          {/* KPI strip */}
          <div className={`grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--cq-border)] border border-[var(--cq-border)] rounded-[14px] overflow-hidden mb-5`}>
            <KpiCard label="Turnos confirmados" value="14 / 17" delta="+23%" trend="up" hint="vs. semana pasada"/>
            <KpiCard label="Mensajes enviados" value="142" delta="+12" trend="up" hint="automáticos · 24h"/>
            <KpiCard label="Tasa de confirmación" value="92%" delta="+6 pts" trend="up" hint="objetivo: 90%"/>
            <KpiCard label="Ahorro estimado" value="4.2 h" delta="esta semana" trend="flat" hint="recepción"/>
          </div>

          {/* Main grid */}
          <div className={`grid lg:grid-cols-3 ${gapClass} mb-5`}>
            <AgendaBlock/>
            <AutomationsBlock/>
          </div>
          <div className={`grid lg:grid-cols-3 ${gapClass}`}>
            <RevenueBlock/>
            <InboxBlock/>
          </div>
          <div className={`grid lg:grid-cols-3 ${gapClass} mt-5`}>
            <RiskBlock/>
            <QuickActionsBlock onNew={() => setModalOpen(true)}/>
            <SystemBlock/>
          </div>

          <div className="mt-8 flex items-center justify-between text-[12px] text-[var(--cq-fg-muted)]">
            <MonoLabel>Cliniq v2.4.1 · Sistema operativo</MonoLabel>
            <button onClick={() => onNavigate('landing')} className="hover:text-[var(--cq-fg)]">
              Cerrar sesión
            </button>
          </div>
        </main>
      </div>
      <NewAppointmentModal open={modalOpen} onClose={() => setModalOpen(false)}/>
    </div>
  );
};

const QuickActionsBlock = ({ onNew }) => (
  <CliniqCard>
    <MonoLabel>Acciones rápidas</MonoLabel>
    <div className="mt-3 grid grid-cols-2 gap-2">
      {[
        { l: 'Nuevo turno', i: CliniqIcons.Plus, onClick: onNew },
        { l: 'Nuevo paciente', i: CliniqIcons.Users },
        { l: 'Enviar encuesta', i: CliniqIcons.Chat },
        { l: 'Emitir factura', i: CliniqIcons.Zap },
      ].map((a, i) => (
        <button
          key={i}
          onClick={a.onClick}
          className="h-20 rounded-[10px] border border-[var(--cq-border)] hover:border-[var(--cq-fg)] hover:bg-[var(--cq-surface-2)] transition-all flex flex-col items-start justify-between p-3 text-left group"
        >
          <a.i size={16}/>
          <span className="text-[12.5px] font-medium">{a.l}</span>
        </button>
      ))}
    </div>
  </CliniqCard>
);

const SystemBlock = () => (
  <CliniqCard>
    <div className="flex items-center justify-between mb-3">
      <MonoLabel>Estado del sistema</MonoLabel>
      <CliniqBadge tone="success" dot>Todo OK</CliniqBadge>
    </div>
    <ul className="space-y-2.5">
      {[
        { n: 'WhatsApp API · Meta', v: '99.9%' },
        { n: 'Google Calendar', v: 'sincronizado' },
        { n: 'DGI · Facturación', v: 'disponible' },
        { n: 'Backup diario', v: '02:14 UYT' },
      ].map((s, i) => (
        <li key={i} className="flex items-center justify-between text-[12.5px]">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--cq-success)]"/>
            {s.n}
          </span>
          <MonoLabel>{s.v}</MonoLabel>
        </li>
      ))}
    </ul>
  </CliniqCard>
);

window.CliniqDashboard = CliniqDashboard;
})();
