import { useState } from 'react';
import { Icons, Badge, Button, Divider } from '../../components/ui';

export function LandingNav({ onLogin, onSignup }) {
  const [open, setOpen] = useState(false);

  return (
    <nav
      aria-label="Navegación principal"
      className="sticky top-0 z-30 bg-[color-mix(in_oklch,var(--cq-bg)_82%,transparent)] backdrop-blur-md border-b border-[var(--cq-border)]"
    >
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2.5" aria-label="Cliniq — inicio">
          <Icons.Logo size={22} />
          <span className="text-[17px] font-semibold tracking-tight">Cliniq</span>
          <Badge tone="outline" className="ml-2 hidden sm:inline-flex">
            UY · Beta
          </Badge>
        </a>

        <div className="hidden md:flex items-center gap-7 text-[14px] text-[var(--cq-fg-muted)]">
          <a href="#producto" className="hover:text-[var(--cq-fg)] transition-colors">Producto</a>
          <a href="#producto" className="hover:text-[var(--cq-fg)] transition-colors">Automatizaciones</a>
          <a href="#precios" className="hover:text-[var(--cq-fg)] transition-colors">Precios</a>
          <a href="#historias" className="hover:text-[var(--cq-fg)] transition-colors">Historias</a>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onLogin}>
            Iniciar sesión
          </Button>
          <Button variant="primary" size="sm" onClick={onSignup}>
            Probar gratis <Icons.Arrow size={12} />
          </Button>
        </div>

        <button
          className="md:hidden p-2 -mr-2"
          onClick={() => setOpen(!open)}
          aria-label="Abrir menú"
          aria-expanded={open}
        >
          {open ? <Icons.Close size={18} /> : <Icons.Menu size={18} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-[var(--cq-border)] px-5 py-4 flex flex-col gap-4">
          <a href="#producto" onClick={() => setOpen(false)}>Producto</a>
          <a href="#automatizaciones" onClick={() => setOpen(false)}>Automatizaciones</a>
          <a href="#precios" onClick={() => setOpen(false)}>Precios</a>
          <a href="#historias" onClick={() => setOpen(false)}>Historias</a>
          <Divider />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onLogin} className="flex-1">
              Iniciar sesión
            </Button>
            <Button variant="primary" size="sm" onClick={onSignup} className="flex-1">
              Probar gratis
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
