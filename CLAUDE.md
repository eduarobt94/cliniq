# Cliniq — Project Instructions

## ⚡ INICIO RÁPIDO DE SESIÓN
> Leé esta sección primero. Resume el estado actual y qué hacer a continuación.

**Último trabajo completado (2026-04-28):**
- `useMembers` — ahora incluye `email`, `status` y join de `profiles` (displayName)
- `Configuracion` — miembros reales con nombres/emails; botón "Invitar miembro" funcional para owners; botón de eliminar miembro (solo owners, no owner-members); badge de estado Activo/Pendiente
- `useInbox` (nuevo hook) — agrupa mensajes de `whatsapp_message_log` por phone_number; timestamps localizados; Realtime
- Página `Inbox` — conectada a `useInbox`; loading skeletons; hilo por conversación; empty state si no hay mensajes WA configurados

**Próximas tareas priorizadas:**
1. 🔴 Ejecutar migraciones pendientes en Supabase (SQL Editor del dashboard):
   - `20260423000000_clinic_members.sql` (tabla multi-usuario)
   - `20260424000000_profiles_and_rpc.sql`
   - `20260425000000_invite_flow.sql` (invite_token + RPCs)
   - `20260428000000_whatsapp_automations.sql` (clinic_automations + whatsapp_message_log)
2. 🔴 Configurar WhatsApp en Supabase: secrets `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` + cron job pg_cron
3. 🟡 Conectar `RevenueBlock` a datos reales (tabla `appointments` con precio/ingreso)
4. 🟢 Envío real de mensajes desde el Inbox (actualmente solo UI — requiere Edge Function outbound)

**Usuario de prueba:** `maria@bonomi.uy` / `demo1234`
**Dev server:** `cd /home/claude/repo && npm run dev`

---

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
  components/ui/          ← Button, Badge, Card, Avatar, Icons, Typography, Toast
  components/ErrorBoundary.jsx
  components/ProtectedRoute.jsx
  context/AuthContext.jsx  ← Auth con Supabase real (solo onAuthStateChange, sin race condition)
  hooks/                   ← useClinic, useAppointments, useKpis, usePatients, useMembers
  lib/
    supabase.js            ← cliente Supabase singleton
    authService.js         ← lógica pura de auth (signUp, createClinic)
  pages/Landing/           ← LandingHero, LandingProduct, LandingHow, LandingStory, LandingPricing, LandingNav, LandingFooter
  pages/Login/             ← formulario con toast de error rojo + stagger animation
  pages/Signup/            ← registro con nombre de clínica
  pages/Onboarding/        ← recuperación si clinic creation falló post-signup
  pages/Dashboard/         ← AgendaBlock y KPIs conectados a Supabase; resto mockeado
  pages/NotFound/
  styles/globals.css       ← variables --cq-* (design tokens) + keyframes CSS
  App.jsx                  ← ErrorBoundary + AuthProvider + ProtectedRoute + Routes
  main.jsx
supabase/
  migrations/
    20260420000000_cliniq_mvp.sql            ← tablas, RLS, vistas, triggers (YA EJECUTADA)
    20260422000000_cliniq_optimizations.sql  ← índices extra, fn_user_clinic_ids() (YA EJECUTADA)
    20260423000000_clinic_members.sql        ← tabla clinic_members, multi-user (⚠️ PENDIENTE ejecutar)
  seed.sql                 ← 6 pacientes + 6 turnos de prueba (reemplazar UUID antes de ejecutar)
netlify.toml               ← headers de seguridad + redirect SPA para Netlify
vercel.json                ← headers de seguridad + rewrite SPA para Vercel
```

---

## Base de datos (Supabase)
**Proyecto ID:** `jmpyygecgqkeuwwaioew` — región: São Paulo
**URL:** `https://jmpyygecgqkeuwwaioew.supabase.co`

### Tablas
- `clinics` — raíz multi-tenant. `owner_id` FK → `auth.users.id`
- `clinic_members` — multi-usuario por clínica. roles: owner / staff / viewer *(migración pendiente)*
- `patients` — UNIQUE(clinic_id, phone_number). Teléfono en formato E.164
- `appointments` — tabla central. ENUM status: new/pending/confirmed/rescheduled/cancelled

### Vistas (SECURITY INVOKER — respetan RLS)
- `v_today_appointments` — turnos de hoy + datos del paciente + timezone de la clínica
- `v_clinic_kpis_today` — conteos del día por clínica

### Seguridad
- RLS activado en clinics, patients, appointments, clinic_members
- `fn_user_clinic_ids()` — STABLE SECURITY DEFINER con UNION para owner + membership
- CSP, HSTS, X-Frame-Options configurados en netlify.toml / vercel.json / index.html

### ⚠️ Migraciones — NO volver a ejecutar las ya aplicadas en producción

---

## Variables de entorno
Archivo `.env` en la raíz del proyecto (NO se sube a GitHub):
```
VITE_SUPABASE_URL=https://jmpyygecgqkeuwwaioew.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...clave de Supabase → Settings → API Keys → Publishable key
```

---

## Auth
- `AuthContext.jsx` usa solo `onAuthStateChange` (dispara `INITIAL_SESSION` al montar — no hay doble llamada)
- `authService.js` — lógica pura: signUp crea user + clinic; si clinic falla → needsOnboarding=true
- `ProtectedRoute` → redirige a `/login` si no hay sesión, a `/onboarding` si needsOnboarding
- Usuario de prueba: `maria@bonomi.uy` / `demo1234`
- Flujo: `/signup` → crea user + clinic → `/dashboard`; si falla clinic → `/onboarding`

---

## Hooks de datos (src/hooks/)
Todos leen de Supabase. Retornan `{ data, loading, error }`.
- `useClinic()` — clínica del usuario (query a clinic_members con join)
- `useAppointments()` — turnos de hoy + suscripción Realtime automática
- `useKpis()` — KPIs del dashboard desde v_clinic_kpis_today
- `usePatients()` — lista de pacientes (limit 50)
- `useMembers(clinicId)` — miembros de la clínica + addMember / removeMember

---

## UI Components (src/components/ui/)
- `Button`, `Badge`, `Card`, `Avatar`, `Icons`, `MonoLabel`, `SectionLabel`, `Divider`
- `Toast` / `ToastContainer` / `useToast` — notificaciones auto-dismiss (4s), rojo mate (`--cq-danger`) para errores
- Colores: siempre `var(--cq-*)`, nunca hardcoded
- Fuentes: Geist (sans), Geist Mono, Instrument Serif (solo itálicas)
- Idioma: español rioplatense / Uruguay en toda la UI

---

## Estado actual del dashboard
| Componente | Estado | Notas |
|---|---|---|
| KPI cards | ✅ Real | useKpis → v_clinic_kpis_today |
| Saludo + nombre clínica | ✅ Real | useClinic |
| AgendaBlock | ✅ Real | useAppointments + skeleton + Realtime |
| NewAppointmentModal | ✅ Real | appointmentService.js → patients + appointments |
| AutomationsBlock | ✅ Real | useAutomations → clinic_automations + v_automation_stats |
| InboxBlock | ✅ Real | useWhatsappInbox → whatsapp_message_log (inbound) + Realtime |
| Página Inbox | ✅ Real | useInbox → whatsapp_message_log (todas direcciones) + Realtime |
| RevenueBlock | ⏳ Mock | Datos hardcodeados |
| RiskBlock | ⏳ Mock | Datos hardcodeados |
| QuickActionsBlock | ⏳ Mock | Datos hardcodeados |
| SystemBlock | ⏳ Mock | Datos hardcodeados |

---

## Seguridad implementada
| Aspecto | Estado |
|---|---|
| RLS (Row Level Security) | ✅ 23 políticas, todas las tablas |
| CORS | ✅ Gestionado por Supabase (verificar Allowed Origins en dashboard) |
| Security Headers | ✅ CSP + HSTS + X-Frame-Options + Permissions-Policy en netlify.toml / vercel.json |
| CSP script-src | ✅ `'self'` solo — `'unsafe-inline'` removido de producción (netlify + vercel) |
| CSP index.html | ⚠️ Mantiene `'unsafe-inline'` en script-src solo para Vite HMR en dev — sobrescrito por headers en prod |
| Error disclosure | ✅ Mensajes de error genéricos en Login y Signup — sin filtración de detalles internos |
| Phone validation | ✅ Validación E.164 en formularios de pacientes; normalización antes de persistir |
| Dependencias | ✅ npm audit: 0 vulnerabilidades conocidas |
| XSS | ✅ Sin dangerouslySetInnerHTML; React escapa todo; no hay concatenación de HTML |
| CSRF | ✅ No aplica — Supabase usa Bearer tokens en headers, no cookies |
| SQL injection | ✅ No aplica — PostgREST parametriza todas las queries |

---

## Comandos útiles
```bash
npm run dev      # servidor local → localhost:5173
npm run build    # build de producción (debe pasar sin errores)
git add -p       # revisar cambios antes de commit
git push -u origin main
```

---

## Superpowers Skills
Skills en `.claude/skills/`. Invocar con la herramienta Skill antes de tareas no triviales:
- Nuevas features → `brainstorming`
- Bugs → `systematic-debugging`
- Implementación → `test-driven-development`
- Planes → `writing-plans` → `executing-plans`
- Antes de terminar → `verification-before-completion`
