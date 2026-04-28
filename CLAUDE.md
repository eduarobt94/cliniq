# Cliniq — Project Instructions

## ⚡ INICIO RÁPIDO DE SESIÓN
> Leé esta sección primero. Resume el estado actual y qué hacer a continuación.

**Último trabajo completado (2026-04-28):**
- **Features:** `useMembers` con join de `profiles` (displayName); `Configuracion` con miembros reales + invite modal funcional + botón de eliminar; `useInbox` (nuevo hook); página `Inbox` conectada a Supabase con Realtime
- **Seguridad (Trail of Bits audit):** `'unsafe-inline'` removido de `script-src` en prod; mensajes de error genéricos en Login/Signup; validación E.164 + normalización de teléfonos; checkbox "Mantener sesión" eliminado (era no-funcional)

**Próximas tareas priorizadas:**
1. 🔴 Ejecutar migraciones pendientes en Supabase (SQL Editor del dashboard):
   - `20260423000000_clinic_members.sql`
   - `20260424000000_profiles_and_rpc.sql`
   - `20260425000000_invite_flow.sql`
   - `20260428000000_whatsapp_automations.sql`
2. 🔴 Configurar WhatsApp en Supabase: secrets `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` + cron job pg_cron
3. 🟡 Conectar `RevenueBlock` a datos reales (tabla `appointments`)
4. 🟢 Envío real de mensajes desde Inbox (requiere Edge Function outbound)

**Usuario de prueba:** `maria@bonomi.uy` / `demo1234`
**Dev server:** `npm run dev` → localhost:5173

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
  hooks/
    useClinic.js           ← clínica del usuario autenticado
    useAppointments.js     ← turnos de hoy + Realtime
    useKpis.js             ← KPIs desde v_clinic_kpis_today
    usePatients.js         ← lista de pacientes (limit 50)
    useMembers.js          ← miembros + profiles batch + addMember/removeMember/refetch
    useAutomations.js      ← clinic_automations + v_automation_stats
    useWhatsappInbox.js    ← últimos N mensajes inbound (para InboxBlock del dashboard)
    useInbox.js            ← conversaciones completas agrupadas por phone (para página Inbox)
    useAgenda.js / useAgendaRange.js
    useNotifications.js
  lib/
    supabase.js            ← cliente Supabase singleton
    authService.js         ← signUp, signIn, createClinic, inviteMember, acceptInvite, sendInviteEmail
    appointmentService.js  ← CRUD de patients y appointments; normaliza teléfonos a E.164
    phoneUtils.js          ← isValidPhone(), normalizePhone() — validación E.164
  pages/
    Landing/               ← LandingHero, LandingProduct, LandingHow, LandingStory, LandingPricing, LandingNav, LandingFooter
    Login/                 ← formulario con toast de error + Google OAuth
    Signup/                ← registro con nombre de clínica o modo invitación
    Onboarding/            ← recuperación si clinic creation falló post-signup
    ForgotPassword/ / ResetPassword/ / VerifyEmail/ / AuthCallback/ / AcceptInvite/
    Dashboard/             ← AgendaBlock, KPIs, AutomationsBlock, InboxBlock, NewAppointmentModal, InviteMemberModal
    Agenda/                ← vista completa de agenda
    Pacientes/             ← tabla de pacientes con CRUD, búsqueda y filtros
    Inbox/                 ← chat de WhatsApp conectado a Supabase via useInbox
    Automatizaciones/ / Reportes/ / Configuracion/
    NotFound/
  styles/globals.css       ← variables --cq-* (design tokens) + keyframes CSS
  App.jsx                  ← ErrorBoundary + AuthProvider + ProtectedRoute + Routes
  main.jsx
supabase/
  migrations/              ← ver tabla de migraciones más abajo
  seed.sql                 ← 6 pacientes + 6 turnos de prueba (reemplazar UUID antes de ejecutar)
netlify.toml               ← headers de seguridad + redirect SPA
vercel.json                ← headers de seguridad + rewrite SPA
```

---

## Base de datos (Supabase)
**Proyecto ID:** `jmpyygecgqkeuwwaioew` — región: São Paulo
**URL:** `https://jmpyygecgqkeuwwaioew.supabase.co`

### Tablas
| Tabla | Descripción |
|---|---|
| `clinics` | Raíz multi-tenant. `owner_id` FK → `auth.users.id` |
| `profiles` | Nombre y apellido de cada usuario. Creado por trigger al registrarse |
| `clinic_members` | Multi-usuario por clínica. Roles: `owner / staff / viewer`. Estados: `invited / active` |
| `patients` | `UNIQUE(clinic_id, phone_number)`. Teléfono en formato E.164 |
| `appointments` | Tabla central. ENUM status: `new/pending/confirmed/rescheduled/cancelled` |
| `clinic_automations` | Config de recordatorios por clínica. `UNIQUE(clinic_id, type)` |
| `whatsapp_message_log` | Auditoría de mensajes WA. `direction: inbound/outbound` |

### Vistas (SECURITY INVOKER — respetan RLS)
- `v_today_appointments` — turnos de hoy + datos del paciente + timezone de la clínica
- `v_clinic_kpis_today` — conteos del día por clínica
- `v_automation_stats` — estadísticas de mensajes outbound por clínica

### RPCs
- `fn_user_clinic_ids()` — STABLE SECURITY DEFINER, devuelve UUIDs de clínicas del usuario
- `create_clinic_with_owner(clinic_name, p_first_name, p_last_name)` — crea clínica + perfil atómicamente
- `create_member_invite(p_clinic_id, p_email, p_role)` — crea/renueva invite_token, devuelve UUID
- `get_invite_by_token(p_token)` — consulta pública del estado de una invitación
- `accept_member_invite(p_token)` — vincula auth.uid() a la invitación

### Migraciones
| Archivo | Estado |
|---|---|
| `20260420000000_cliniq_mvp.sql` | ✅ Ejecutada |
| `20260422000000_cliniq_optimizations.sql` | ✅ Ejecutada |
| `20260423000000_clinic_members.sql` | ⚠️ Pendiente |
| `20260424000000_profiles_and_rpc.sql` | ⚠️ Pendiente |
| `20260425000000_invite_flow.sql` | ⚠️ Pendiente |
| `20260428000000_whatsapp_automations.sql` | ⚠️ Pendiente |
| `20260428000000_fix_whatsapp_rls.sql` | ⚠️ Pendiente |

**⚠️ Nunca volver a ejecutar las ya aplicadas en producción.**

---

## Variables de entorno
Archivo `.env` en la raíz del proyecto (en `.gitignore`, no se sube):
```
VITE_SUPABASE_URL=https://jmpyygecgqkeuwwaioew.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...  ← Settings → API Keys → Publishable key
```

---

## Auth
- `AuthContext.jsx` usa solo `onAuthStateChange` (dispara `INITIAL_SESSION` al montar — sin doble llamada)
- `authService.js` — lógica pura: signUp crea user + clinic; si clinic falla → needsOnboarding=true
- `ProtectedRoute` → redirige a `/login` si no hay sesión, a `/onboarding` si needsOnboarding
- Flujo normal: `/signup` → crea user + clinic → `/dashboard`
- Flujo invitación: `/accept-invite?token=X` → login/signup → acepta automáticamente → `/dashboard`

---

## Hooks de datos (src/hooks/)
| Hook | Retorna | Notas |
|---|---|---|
| `useClinic()` | `{ clinic, loading }` | Join clinic_members → clinics |
| `useAppointments()` | `{ appointments, loading }` | Hoy + Realtime |
| `useKpis()` | `{ kpis, loading }` | Desde `v_clinic_kpis_today` |
| `usePatients()` | `{ patients, loading }` | Limit 50, incluye appointments |
| `useMembers(clinicId)` | `{ members, loading, addMember, removeMember, refetch }` | Batch-fetch de profiles; `displayName` = nombre completo o email |
| `useAutomations(clinicId)` | `{ automation, stats, loading, toggle, save }` | clinic_automations + v_automation_stats |
| `useWhatsappInbox(clinicId, limit)` | `{ messages, unreadCount, loading }` | Inbound recientes para InboxBlock del dashboard |
| `useInbox(clinicId)` | `{ conversations, getThread(phone), loading }` | Todas direcciones; agrupa por phone; timestamps es-UY |

---

## UI Components (src/components/ui/)
- `Button`, `Badge`, `Card`, `Avatar`, `Icons`, `MonoLabel`, `SectionLabel`, `Divider`
- `Toast` / `ToastContainer` / `useToast` — notificaciones auto-dismiss (4s), rojo mate para errores
- **Regla:** Colores siempre `var(--cq-*)`, nunca hardcodeados
- **Fuentes:** Geist (sans), Geist Mono, Instrument Serif (solo itálicas)
- **Idioma:** español rioplatense / Uruguay en toda la UI

---

## Estado actual de páginas y bloques
| Componente | Estado | Notas |
|---|---|---|
| KPI cards | ✅ Real | useKpis → v_clinic_kpis_today |
| Saludo + nombre clínica | ✅ Real | useClinic |
| AgendaBlock | ✅ Real | useAppointments + skeleton + Realtime |
| NewAppointmentModal | ✅ Real | appointmentService → patients + appointments |
| AutomationsBlock | ✅ Real | useAutomations → clinic_automations + v_automation_stats |
| InboxBlock (dashboard) | ✅ Real | useWhatsappInbox → inbound + Realtime |
| Página Inbox | ✅ Real | useInbox → todas direcciones, conversaciones por phone + Realtime |
| Configuracion → Equipo | ✅ Real | useMembers + InviteMemberModal funcional para owners |
| Configuracion → WhatsApp | ⏳ Mock | Hardcodeado — requiere configurar WA primero |
| RevenueBlock | ⏳ Mock | Hardcodeado |
| RiskBlock | ⏳ Mock | Hardcodeado |
| QuickActionsBlock | ⏳ Mock | Hardcodeado |
| SystemBlock | ⏳ Mock | Hardcodeado |

---

## Seguridad
| Aspecto | Estado |
|---|---|
| RLS | ✅ Activado en todas las tablas; 23+ políticas |
| CORS | ✅ Gestionado por Supabase (verificar Allowed Origins en dashboard) |
| Headers HTTP | ✅ CSP + HSTS + X-Frame-Options + Permissions-Policy en netlify.toml / vercel.json |
| CSP script-src (prod) | ✅ `'self'` únicamente — sin `'unsafe-inline'` |
| CSP script-src (dev) | ⚠️ `'unsafe-inline'` en index.html solo para Vite HMR — los headers HTTP lo sobreescriben en prod |
| Error disclosure | ✅ Mensajes genéricos en Login y Signup; sin filtración de `err.message` internos |
| Phone validation | ✅ `phoneUtils.js`: isValidPhone() + normalizePhone() antes de persistir |
| Dependencias | ✅ `npm audit`: 0 vulnerabilidades conocidas |
| XSS | ✅ Sin `dangerouslySetInnerHTML`; React escapa todo el contenido de DB |
| CSRF | ✅ No aplica — Bearer tokens en headers, no cookies |
| SQL injection | ✅ No aplica — PostgREST parametriza todas las queries |

---

## Comandos útiles
```bash
npm run dev      # servidor local → localhost:5173
npm run build    # build de producción (debe pasar sin errores)
npm audit        # verificar vulnerabilidades en dependencias
git add -p       # revisar cambios antes de commit
git push origin main
```

---

## Superpowers Skills
Invocar con la herramienta Skill antes de tareas no triviales:
- Nuevas features → `brainstorming`
- Bugs → `systematic-debugging`
- Implementación → `test-driven-development`
- Planes → `writing-plans` → `executing-plans`
- Antes de terminar → `verification-before-completion`
