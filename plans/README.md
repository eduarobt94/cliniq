# Planes de mejora de animaciones — Cliniq

Generados por el skill `improve-animations` (auditoría 2026-07, commit `67e9c76`).
Cada plan es autocontenido: un agente sin contexto puede ejecutarlo. Los planes
**no** tocan código por sí solos — hay que ejecutarlos.

## Estado

| # | Plan | Severidad | Estado |
|---|---|---|---|
| — | `transition-all` → `transition` (Button + dashboard) | HIGH | ✅ APLICADO (Tanda 1) |
| — | Token `--ease-out` + consolidación en modal keyframes | LOW | ✅ APLICADO (Tanda 1) |
| 001 | Popovers escalan desde el trigger (transform-origin) | MEDIUM | ✅ DONE (verificado en vivo) |
| 002 | Fade-in del backdrop de modales | MEDIUM | ✅ DONE (verificado en vivo) |

## Orden de ejecución recomendado

_(Tandas 1 y 2 ya aplicadas y verificadas en vivo el 2026-07 sobre Cliniq @ localhost:5177.)_

1. ~~**001** (popover transform-origin)~~ ✅
2. ~~**002** (backdrop fade)~~ ✅

Ambos dependían del token `--ease-out` de la Tanda 1 (también aplicado).

## Pendientes NO planificados (necesitan conversión layout→transform)

Detectados en la auditoría pero fuera de estos planes porque animan propiedades
de layout (requieren reescribir a `transform`, no solo swap de clase):

- **Toggle de IA del Inbox** (`src/pages/Inbox/index.jsx:148`) — anima `left` con
  `transition-all`. Debería usar `transform: translateX()` + `transition-transform`.
- **Progress bar de Automatizaciones** (`src/pages/Automatizaciones/index.jsx:418`)
  — anima `width` con `transition-all`. Debería usar `transform: scaleX()`.
- **`transition-all` en páginas de auth/landing** (~15 sitios) — baja frecuencia
  (AUDIT §1: la frecuencia manda), por eso no se priorizaron. Swap trivial a
  `transition` cuando se quiera cerrar el barrido completo.

## Opportunities aditivas (no correctivas)

- Animación de **salida** de modales/dropdowns (hoy hacen unmount directo).
- **Stagger** (30–80ms) en la entrada de las tarjetas de KPIs/agenda del dashboard.
