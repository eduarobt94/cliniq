# Cliniq — Project Instructions

## Qué es este proyecto
SaaS de automatización para clínicas médicas en Uruguay. Gestiona turnos, pacientes y automatizaciones de WhatsApp. Stack: Vite 6 + React 18 + Tailwind CSS v3 + Supabase.

**Repo GitHub:** https://github.com/eduarobt94/cliniq

---

## Tech Stack
- **Framework:** React 18 + Vite 6
- **Styling:** Tailwind CSS v3 + CSS custom properties (`--cq-*`)
- **Routing:** React Router v6
- **Backend:** Supabase (PostgreSQL 15, Auth, Realtime)
- **Language:** JavaScript (JSX) — sin TypeScript

---

## Estructura del proyecto
```
src/
  components/ui/          ← Button, Badge, Card, Avatar, Icons, Typography
  components/ErrorBoundary.jsx
  components/ProtectedRoute.jsx
  context/AuthContext.jsx  ← Auth con Supabase real
  hooks/                   ← useClinic, useAppointments, useKpis, usePatients
  lib/supabase.js          ← cliente Supabase singleton
  pages/Landing/
  pages/Login/
  pages/Dashboard/         ← AgendaBlock y KPIs ya conectados a Supabase
  pages/NotFound/
  styles/globals.css       ← variables --cq-* (design tokens)
  App.jsx                  ← ErrorBoundary + AuthProvider + ProtectedRoute + Routes
  main.jsx
supabase/
  migrations/
    20260420000000_cliniq_mvp.sql         ← tablas, RLS, vistas, triggers (YA EJECUTADA)
    20260422000000_cliniq_optimizations.sql ← índices extra, fn_user_clinic_ids() (YA EJECUTADA)
  seed.sql                 ← 6 pacientes + 6 turnos de prueba (reemplazar UUID antes de ejecutar)
```

---

## Base de datos (Supabase)
**Proyecto ID:** `jmpyygecgqkeuwwaioew` — región: São Paulo
**URL:** `https://jmpyygecgqkeuwwaioew.supabase.co`

### Tablas
- `clinics` — raíz multi-tenant. `owner_id` FK → `auth.users.id`
- `patients` — UNIQUE(clinic_id, phone_number). Teléfono en formato E.164
- `appointments` — tabla central. ENUM status: new/pending/confirmed/rescheduled/cancelled

### Vistas (SECURITY INVOKER — respetan RLS)
- `v_today_appointments` — turnos de hoy + datos del paciente + timezone de la clínica
- `v_clinic_kpis_today` — conteos del día por clínica

### Seguridad
- RLS activado en clinics, patients, appointments
- `fn_user_clinic_ids()` — función STABLE SECURITY DEFINER que deduplica subqueries RLS
- Realtime habilitado solo en `appointments`

### ⚠️ Migraciones — NO volver a ejecutar, ya están aplicadas en producción

---

## Variables de entorno
Archivo `.env` en la raíz del proyecto (NO se sube a GitHub):
```
VITE_SUPABASE_URL=https://jmpyygecgqkeuwwaioew.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...clave de Supabase → Settings → API Keys → Publishable key
```

---

## Auth
- `AuthContext.jsx` usa `supabase.auth` (signInWithPassword, signUp, signOut, onAuthStateChange)
- `ProtectedRoute` → redirige a `/login` si no hay sesión activa
- Usuario de prueba creado: `maria@bonomi.uy` / `demo1234`
- Para crear usuarios: Supabase Dashboard → Authentication → Users → Add user → copiar UUID

---

## Hooks de datos (src/hooks/)
Todos leen de Supabase. Retornan `{ data, loading, error }`.
- `useClinic()` — clínica del usuario logueado
- `useAppointments()` — turnos de hoy + suscripción Realtime automática
- `useKpis()` — KPIs del dashboard desde v_clinic_kpis_today
- `usePatients()` — lista de pacientes (limit 50)

---

## Estado actual del dashboard
| Componente | Datos |
|---|---|
| KPI cards | ✅ Reales (useKpis) |
| Saludo / nombre clínica | ✅ Real (useClinic) |
| AgendaBlock | ✅ Real (useAppointments) + skeleton |
| AutomationsBlock | ⏳ Mockeado |
| RevenueBlock | ⏳ Mockeado |
| InboxBlock | ⏳ Mockeado |
| RiskBlock | ⏳ Mockeado |

---

## Diseño
- Colores: siempre `var(--cq-*)`, nunca hardcoded. Definidos en `src/styles/globals.css`
- Fuentes: Geist (sans), Geist Mono, Instrument Serif (solo itálicas)
- UI primitives en `src/components/ui/` — nunca duplicar
- Idioma: español rioplatense / Uruguay en toda la UI

---

## Comandos útiles
```bash
npm run dev      # servidor local → localhost:5173
npm run build    # build de producción (debe pasar sin errores)
git add .
git commit -m "mensaje"
git push
```

---

## Superpowers Skills
Skills en `.claude/skills/`. Invocar con la herramienta Skill antes de tareas no triviales:
- Nuevas features → `brainstorming`
- Bugs → `systematic-debugging`
- Implementación → `test-driven-development`
- Planes → `writing-plans` → `executing-plans`
- Antes de terminar → `verification-before-completion`
