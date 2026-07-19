# 002 — El backdrop de los modales debe hacer fade-in, no aparecer de golpe

- **Status**: DONE
- **Commit**: 67e9c76
- **Severity**: MEDIUM
- **Category**: Cohesion (AUDIT §7) / Missed opportunity (§8)
- **Estimated scope**: 1 archivo CSS (utilidad + keyframe) + 5 sitios de uso (solo className)

## Problem

En cada modal, el panel anima su entrada con `.cq-modal-in`, pero el **backdrop** (`bg-black/30 backdrop-blur-sm`) aparece **instantáneamente**. El resultado es un salto: el fondo oscuro + blur "popean" de golpe mientras la tarjeta anima suave. El backdrop-blur apareciendo instantáneo es especialmente brusco.

Backdrops sin animación (todos idénticos):

```jsx
// src/pages/Dashboard/NewAppointmentModal.jsx:382
<div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

// src/pages/Pacientes/index.jsx:143
<div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

// src/components/AddPatientModal.jsx:93
<div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

// src/components/EditApptModal.jsx:148
<div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
```

También `src/pages/Automatizaciones/index.jsx:113` usa un backdrop propio (`bg-black/40 backdrop-blur-sm`) en el contenedor del modal — mismo problema.

## Target

Una utilidad `.cq-backdrop-in` que haga fade-in del backdrop en ~200ms con `var(--ease-out)`, aplicada a los 5 backdrops. Solo anima `opacity` (barato, GPU-friendly; el `backdrop-blur` se revela junto con la opacidad, sin animar el radio del blur).

```css
/* target — src/styles/globals.css */
@keyframes cqBackdropIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.cq-backdrop-in { animation: cqBackdropIn 200ms var(--ease-out); }
```

Uso (agregar la clase al div del backdrop):

```jsx
<div className="cq-backdrop-in absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
```

## Repo conventions to follow

- Token `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` ya existe en `:root` de `src/styles/globals.css`.
- Los keyframes viven en `src/styles/globals.css` (ej. `@keyframes cqModalIn`, `@keyframes cqToastIn`). Agregar `cqBackdropIn` ahí.
- El bloque `@media (prefers-reduced-motion: reduce)` en `src/styles/globals.css:112` ya reduce todas las `animation-duration` a `0.01ms` globalmente — el fade del backdrop queda cubierto automáticamente (aparece instantáneo bajo reduced-motion, que es lo correcto). No hace falta media query adicional.
- Exemplar de keyframe + clase: `@keyframes cqToastIn` + su uso, en `src/styles/globals.css`.

## Steps

1. En `src/styles/globals.css`, agregar el keyframe `@keyframes cqBackdropIn` y la clase `.cq-backdrop-in` del bloque **Target** (junto a los demás keyframes).
2. Agregar `cq-backdrop-in` al className del backdrop en:
   - `src/pages/Dashboard/NewAppointmentModal.jsx:382`
   - `src/pages/Pacientes/index.jsx:143`
   - `src/components/AddPatientModal.jsx:93`
   - `src/components/EditApptModal.jsx:148`
3. `src/pages/Automatizaciones/index.jsx:113` — el backdrop está en el mismo div que centra el modal (`fixed inset-0 ... bg-black/40 backdrop-blur-sm`). Agregar `cq-backdrop-in` a ese div. (Verificar que el panel hijo tenga su propia animación de entrada; si no, no es parte de este plan.)

## Boundaries

- Do NOT animar el `backdrop-filter`/blur radius — solo `opacity`.
- Do NOT tocar la animación del panel del modal (`.cq-modal-in`) — este plan es solo el backdrop.
- Do NOT cambiar el `onClick={onClose}` ni el markup/estructura.
- Do NOT agregar dependencias.
- Si algún `file:line` no coincide (drift desde 67e9c76), PARAR y reportar.

## Verification

- **Mechanical**: `pnpm run build` → sin errores.
- **Feel check**: correr Cliniq, y abrir cada modal (Nuevo turno, Editar paciente, Agregar paciente, Editar turno, y el de Automatizaciones):
  - El fondo oscuro + blur debe **aparecer gradualmente** (~200ms) junto con el panel, no de golpe.
  - En DevTools → Animations a 10%, confirmar que backdrop y panel entran en paralelo (no el backdrop instantáneo y el panel después).
  - Activar `prefers-reduced-motion` (Rendering panel) y confirmar que el backdrop aparece instantáneo (sin fade) — correcto bajo reduced-motion.
- **Done when**: los 5 backdrops hacen fade-in sincronizado con su panel; ninguno aparece de golpe.
