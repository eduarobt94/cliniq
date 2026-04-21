// Cliniq — App shell: routing + Tweaks + theme
(function(){
const { CliniqLanding, CliniqLogin, CliniqDashboard, CliniqIcons, MonoLabel } = window;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "teal",
  "theme": "light",
  "density": "comfortable",
  "sidebarVariant": "expanded"
}/*EDITMODE-END*/;

// Low-saturation medical palette. Chroma stays ≤ 0.09.
const ACCENTS = {
  teal:    { l: 'oklch(0.58 0.08 195)', soft: 'oklch(0.95 0.025 195)', label: 'Verde-teal clínico' },
  sage:    { l: 'oklch(0.62 0.07 155)', soft: 'oklch(0.95 0.022 155)', label: 'Salvia' },
  mist:    { l: 'oklch(0.58 0.07 220)', soft: 'oklch(0.95 0.023 220)', label: 'Bruma' },
  slate:   { l: 'oklch(0.52 0.065 245)', soft: 'oklch(0.94 0.022 245)', label: 'Azul pizarra' },
  seafoam: { l: 'oklch(0.66 0.06 175)', soft: 'oklch(0.96 0.022 175)', label: 'Agua marina' },
};

function applyTheme({ accent, theme }) {
  const root = document.documentElement;
  const a = ACCENTS[accent] || ACCENTS.teal;
  root.style.setProperty('--cq-accent', a.l);
  root.style.setProperty('--cq-accent-soft', a.soft);

  if (theme === 'dark') {
    // Deep clinical navy, low chroma
    root.style.setProperty('--cq-bg', 'oklch(0.22 0.018 235)');
    root.style.setProperty('--cq-surface', 'oklch(0.26 0.020 235)');
    root.style.setProperty('--cq-surface-2', 'oklch(0.24 0.018 235)');
    root.style.setProperty('--cq-surface-3', 'oklch(0.30 0.020 235)');
    root.style.setProperty('--cq-fg', 'oklch(0.96 0.008 220)');
    root.style.setProperty('--cq-fg-muted', 'oklch(0.68 0.015 225)');
    root.style.setProperty('--cq-border', 'oklch(0.32 0.020 235)');
    root.style.setProperty('--cq-success', 'oklch(0.72 0.09 160)');
    root.style.setProperty('--cq-warn', 'oklch(0.78 0.10 80)');
    root.style.setProperty('--cq-danger', 'oklch(0.68 0.12 20)');
    root.style.colorScheme = 'dark';
  } else {
    // Cool clinical neutral. Very soft blue-tinted surfaces.
    root.style.setProperty('--cq-bg', 'oklch(0.985 0.006 220)');
    root.style.setProperty('--cq-surface', 'oklch(1 0 0)');
    root.style.setProperty('--cq-surface-2', 'oklch(0.97 0.008 220)');
    root.style.setProperty('--cq-surface-3', 'oklch(0.94 0.010 220)');
    // Primary foreground: soft slate, not pure black. This is the key change.
    root.style.setProperty('--cq-fg', 'oklch(0.32 0.025 235)');
    root.style.setProperty('--cq-fg-muted', 'oklch(0.55 0.018 230)');
    root.style.setProperty('--cq-border', 'oklch(0.91 0.010 220)');
    root.style.setProperty('--cq-success', 'oklch(0.60 0.09 160)');
    root.style.setProperty('--cq-warn', 'oklch(0.68 0.10 80)');
    root.style.setProperty('--cq-danger', 'oklch(0.58 0.11 25)');
    root.style.colorScheme = 'light';
  }
}

// Tweaks panel
const TweaksPanel = ({ tweaks, setTweak, onClose }) => (
  <div className="fixed bottom-5 right-5 z-[60] w-[280px] bg-[var(--cq-surface)] border border-[var(--cq-border)] rounded-[14px] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.3)] p-4" role="dialog" aria-label="Tweaks">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <CliniqIcons.Sparkle size={12}/>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em]">Tweaks</span>
      </div>
      <button onClick={onClose} className="w-6 h-6 rounded-[6px] hover:bg-[var(--cq-surface-2)] flex items-center justify-center" aria-label="Cerrar">
        <CliniqIcons.Close size={12}/>
      </button>
    </div>

    <div className="space-y-4">
      {/* Accent */}
      <div>
        <MonoLabel>Acento</MonoLabel>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {Object.entries(ACCENTS).map(([k, v]) => (
            <button
              key={k}
              title={v.label}
              onClick={() => setTweak('accent', k)}
              aria-label={`Acento ${v.label}`}
              className={`h-8 rounded-[7px] border transition-all ${tweaks.accent === k ? 'border-[var(--cq-fg)] ring-2 ring-[var(--cq-fg)] ring-offset-2 ring-offset-[var(--cq-surface)]' : 'border-[var(--cq-border)]'}`}
              style={{ background: v.l }}
            />
          ))}
        </div>
      </div>

      {/* Theme */}
      <div>
        <MonoLabel>Tema</MonoLabel>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {[['light', 'Claro'], ['dark', 'Oscuro']].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTweak('theme', k)}
              className={`h-9 rounded-[8px] text-[12px] font-medium transition-all ${tweaks.theme === k ? 'bg-[var(--cq-fg)] text-[var(--cq-bg)]' : 'bg-[var(--cq-surface-2)] border border-[var(--cq-border)] hover:border-[var(--cq-fg)]'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Density */}
      <div>
        <MonoLabel>Densidad</MonoLabel>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {[['comfortable', 'Cómoda'], ['compact', 'Compacta']].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTweak('density', k)}
              className={`h-9 rounded-[8px] text-[12px] font-medium transition-all ${tweaks.density === k ? 'bg-[var(--cq-fg)] text-[var(--cq-bg)]' : 'bg-[var(--cq-surface-2)] border border-[var(--cq-border)] hover:border-[var(--cq-fg)]'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div>
        <MonoLabel>Sidebar (dashboard)</MonoLabel>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {[['expanded', 'Expand.'], ['icon', 'Íconos'], ['floating', 'Flotante']].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTweak('sidebarVariant', k)}
              className={`h-9 rounded-[8px] text-[11.5px] font-medium transition-all ${tweaks.sidebarVariant === k ? 'bg-[var(--cq-fg)] text-[var(--cq-bg)]' : 'bg-[var(--cq-surface-2)] border border-[var(--cq-border)] hover:border-[var(--cq-fg)]'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Route skeletons for suspense-style lazy loading UX
const LoadingSkeleton = () => (
  <div className="min-h-screen bg-[var(--cq-bg)] flex items-center justify-center">
    <div className="flex items-center gap-3 text-[var(--cq-fg-muted)]">
      <CliniqIcons.Logo size={22}/>
      <span className="font-mono text-[11px] uppercase tracking-[0.14em]">Cargando Cliniq…</span>
    </div>
  </div>
);

// Persistent route state
function useRoute() {
  const [route, setRoute] = React.useState(() => {
    try { return localStorage.getItem('cliniq:route') || 'landing'; } catch { return 'landing'; }
  });
  const navigate = React.useCallback((r) => {
    setRoute(r);
    try { localStorage.setItem('cliniq:route', r); } catch {}
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  return [route, navigate];
}

// Tweaks state with edit-mode protocol
function useTweaks() {
  const [tweaks, setTweaks] = React.useState(() => {
    try { return { ...TWEAK_DEFAULTS, ...JSON.parse(localStorage.getItem('cliniq:tweaks') || '{}') }; } catch { return TWEAK_DEFAULTS; }
  });
  const [editMode, setEditMode] = React.useState(false);

  React.useEffect(() => { applyTheme(tweaks); }, [tweaks.accent, tweaks.theme]);

  React.useEffect(() => {
    const handler = (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === '__activate_edit_mode') setEditMode(true);
      if (e.data.type === '__deactivate_edit_mode') setEditMode(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const setTweak = (k, v) => {
    setTweaks(t => {
      const next = { ...t, [k]: v };
      try { localStorage.setItem('cliniq:tweaks', JSON.stringify(next)); } catch {}
      window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
      return next;
    });
  };

  return { tweaks, setTweak, editMode, setEditMode };
}

// App
const App = () => {
  const [route, navigate] = useRoute();
  const { tweaks, setTweak, editMode, setEditMode } = useTweaks();
  const [loading, setLoading] = React.useState(false);

  // Simulated lazy-load transition
  const nav = React.useCallback((r) => {
    setLoading(true);
    setTimeout(() => {
      navigate(r);
      setTimeout(() => setLoading(false), 80);
    }, 180);
  }, [navigate]);

  const view = (() => {
    if (loading) return <LoadingSkeleton/>;
    if (route === 'login') return <CliniqLogin onNavigate={nav}/>;
    if (route === 'dashboard') return (
      <CliniqDashboard
        onNavigate={nav}
        sidebarVariant={tweaks.sidebarVariant}
        density={tweaks.density}
      />
    );
    return <CliniqLanding onNavigate={nav}/>;
  })();

  return (
    <>
      <div data-screen-label={
        route === 'login' ? 'Login' : route === 'dashboard' ? 'Dashboard' : 'Landing'
      }>
        {view}
      </div>
      {editMode && <TweaksPanel tweaks={tweaks} setTweak={setTweak} onClose={() => setEditMode(false)}/>}
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
})();
