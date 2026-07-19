# 001 — Popovers y dropdowns escalan desde el trigger, no desde el centro

- **Status**: DONE
- **Commit**: 67e9c76
- **Severity**: MEDIUM
- **Category**: Physicality & origin (AUDIT §3)
- **Estimated scope**: 1 archivo CSS + ~4 sitios de uso (solo className), cambio chico

## Problem

Los dropdowns/popovers anclados a su trigger reusan la animación `.cq-modal-in` / `.cq-modal-in-fast`, cuyo keyframe (`cqModalIn`) escala con `transform-origin: center` (el default). Un popover que aparece **debajo** de su trigger (`top: calc(100% + 4px)`) debería escalar **desde arriba**, no desde su centro — así el ojo lo lee como que "sale" del trigger. Con origin centro, crece desde su mitad, lo que se siente desconectado del punto de origen.

Keyframe actual — `src/styles/globals.css:62`:

```css
@keyframes cqModalIn {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to   { opacity: 1; transform: none; }
}
.cq-modal-in       { animation: cqModalIn 220ms var(--ease-out); }
.cq-modal-in-fast  { animation: cqModalIn 160ms var(--ease-out); }
```

Sitios que usan la clase como **popover anclado** (no como modal):

```jsx
// src/pages/Dashboard/TopBar.jsx:101 — dropdown de búsqueda ⌘K (anclado top, alineado a la derecha)
className="cq-modal-in absolute right-0 top-[calc(100%+6px)] z-30 w-[340px] ..."

// src/components/ui/DateTimePicker.jsx:210 — popover del date picker (anclado top-left)
className="cq-modal-in-fast absolute left-0 top-[calc(100%+4px)] z-50 ..."

// src/components/ui/DateTimePicker.jsx:368 — popover del time picker (anclado top-left)
className="cq-modal-in-fast absolute left-0 top-[calc(100%+4px)] z-50 ..."

// src/pages/Dashboard/NewAppointmentModal.jsx:83 — dropdown de servicio (anclado top, full width)
className="cq-modal-in-fast absolute left-0 right-0 top-[calc(100%+4px)] z-50 ..."
```

Los **modales** (que también usan `.cq-modal-in`) están exentos — aparecen centrados en pantalla y `transform-origin: center` es correcto ahí (AUDIT §3: "Modals are exempt"). Por eso NO se debe tocar la clase `.cq-modal-in` en sí, sino agregar una variante para popovers.

## Target

Agregar una utilidad `.cq-pop-*` con `transform-origin: top` (y variantes por alineación), y cambiar los 4 popovers anclados a usarla. Los modales siguen con `.cq-modal-in` sin cambios.

```css
/* target — src/styles/globals.css, junto a .cq-modal-in */
.cq-pop        { animation: cqModalIn 160ms var(--ease-out); transform-origin: top; }
.cq-pop-left   { animation: cqModalIn 160ms var(--ease-out); transform-origin: top left; }
.cq-pop-right  { animation: cqModalIn 160ms var(--ease-out); transform-origin: top right; }
```

Mapeo por sitio (según su alineación horizontal):
- TopBar búsqueda (`right-0`) → `cq-pop-right`
- DateTimePicker date (`left-0`) → `cq-pop-left`
- DateTimePicker time (`left-0`) → `cq-pop-left`
- NewAppointmentModal servicio (`left-0 right-0`, full width) → `cq-pop` (top centro está bien en full-width)

## Repo conventions to follow

- El token de easing ya existe: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` en `src/styles/globals.css` (dentro de `:root`). Usarlo, no tipear cubic-beziers.
- Las utilidades de animación viven en `src/styles/globals.css` como clases `.cq-*` (ej. `.cq-modal-in`, `.cq-modal-in-fast`). Agregar las nuevas ahí, en el mismo bloque.
- Exemplar de "clase de animación reutilizable": `.cq-modal-in-fast` en `src/styles/globals.css:97`.

## Steps

1. En `src/styles/globals.css`, justo debajo de la línea `.cq-modal-in-fast  { ... }`, agregar las tres clases `.cq-pop`, `.cq-pop-left`, `.cq-pop-right` del bloque **Target**.
2. `src/pages/Dashboard/TopBar.jsx:101` — reemplazar `cq-modal-in` por `cq-pop-right` en ese className (es el dropdown de búsqueda, alineado a la derecha).
3. `src/components/ui/DateTimePicker.jsx:210` — reemplazar `cq-modal-in-fast` por `cq-pop-left`.
4. `src/components/ui/DateTimePicker.jsx:368` — reemplazar `cq-modal-in-fast` por `cq-pop-left`.
5. `src/pages/Dashboard/NewAppointmentModal.jsx:83` — reemplazar `cq-modal-in-fast` por `cq-pop`.

## Boundaries

- Do NOT tocar `.cq-modal-in` ni `.cq-modal-in-fast` (las usan los modales, que deben quedar con origin centro).
- Do NOT cambiar los modales reales: `NewAppointmentModal.jsx:385`, `Pacientes/index.jsx:145`, `AddPatientModal.jsx:95`, `EditApptModal.jsx:151` siguen con `cq-modal-in`.
- Do NOT cambiar markup ni posicionamiento — solo el className de la animación.
- Do NOT agregar dependencias.
- Si algún `file:line` no coincide (drift desde el commit 67e9c76), PARAR y reportar en vez de improvisar.

## Verification

- **Mechanical**: `pnpm run build` → debe compilar sin errores.
- **Feel check**: correr el dev server de Cliniq, loguear, y:
  - Abrir la búsqueda ⌘K (TopBar): el panel debe **crecer desde arriba-derecha** (desde el input), no desde su centro.
  - Abrir el date picker y el time picker (modal Nuevo turno → fecha/hora): deben crecer desde arriba-izquierda (desde el campo).
  - En DevTools → Animations, poner playback a 10% y confirmar que el escalado arranca desde el borde superior, no desde el medio.
  - Confirmar que los **modales** (Nuevo turno, Editar) siguen apareciendo centrados con su escala desde el centro (sin regresión).
- **Done when**: los 4 popovers escalan desde su borde ancla y los modales quedan intactos.
