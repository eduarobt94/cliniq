# CLINIQ — QA: Autenticación & Autorización
> Módulo: AUTH · 42 test cases · 2026-05-16

---

## Archivos bajo prueba
- `src/pages/Login/index.jsx`
- `src/pages/Signup/index.jsx`
- `src/pages/ForgotPassword/index.jsx`
- `src/pages/ResetPassword/index.jsx`
- `src/pages/AuthCallback/index.jsx`
- `src/pages/AcceptInvite/index.jsx`
- `src/pages/VerifyEmail/index.jsx`
- `src/pages/Onboarding/index.jsx`
- `src/context/AuthContext.jsx`
- `src/lib/authService.js`
- `src/components/ProtectedRoute.jsx`

---

## LOGIN (AUTH-001 → AUTH-010)

### AUTH-001 · Login email/password exitoso
**Severidad**: CRÍTICA  
**Precondición**: Usuario con email verificado existe en DB  
**Pasos**:
1. Navegar a `/login`
2. Ingresar email válido y contraseña correcta
3. Click "Iniciar sesión"

**Resultado esperado**:
- Botón muestra spinner "Iniciando…"
- Redirección a `/dashboard`
- Sidebar muestra nombre del usuario y clínica

---

### AUTH-002 · Login con credenciales incorrectas
**Severidad**: ALTA  
**Pasos**:
1. Navegar a `/login`
2. Ingresar email válido pero contraseña incorrecta
3. Click "Iniciar sesión"

**Resultado esperado**:
- Toast/error: "Email o contraseña incorrectos…"
- NO redirección
- Formulario sigue habilitado para reintentar

---

### AUTH-003 · Login con email no registrado
**Severidad**: ALTA  
**Pasos**:
1. Email inexistente + cualquier contraseña

**Resultado esperado**:
- Mismo mensaje genérico que AUTH-002 (no revelar si email existe)

---

### AUTH-004 · Login con email no verificado
**Severidad**: ALTA  
**Precondición**: Usuario registrado pero sin verificar email  
**Pasos**:
1. Intentar login con esas credenciales

**Resultado esperado**:
- Error específico sobre email no confirmado
- Opción "Reenviar correo de confirmación" visible
- NO acceso al dashboard

---

### AUTH-005 · Login con Google (happy path)
**Severidad**: CRÍTICA  
**Pasos**:
1. Click "Continuar con Google"
2. Seleccionar cuenta Google en popup
3. Autorizar permisos

**Resultado esperado**:
- Botón muestra spinner durante redirección
- `AuthCallback` maneja el callback
- Redirección correcta: `/dashboard` (usuario existente) o `/onboarding` (nuevo)

---

### AUTH-006 · Login con Google — popup cancelado por usuario
**Severidad**: MEDIA  
**Pasos**:
1. Click "Continuar con Google"
2. Cerrar popup sin seleccionar cuenta

**Resultado esperado**:
- Toast de error "No se pudo conectar con Google. Intentá de nuevo."
- Botón Google vuelve a estar habilitado (no queda en loading forever)
- Safety reset de 15s activo

---

### AUTH-007 · Login con Google — error de servidor OAuth
**Severidad**: ALTA  
**Pasos**:
1. Simular respuesta `?error=server_error&error_description=...` en `/auth/callback`

**Resultado esperado**:
- Página AuthCallback muestra: "Error al conectar con Google"
- Descripción técnica del error visible
- Link "Volver al login"
- NO redirección al dashboard

---

### AUTH-008 · Google loading safety reset (15s timeout)
**Severidad**: MEDIA  
**Pasos**:
1. Click "Continuar con Google"
2. No completar el flujo (bloquear redirect)
3. Esperar 15 segundos

**Resultado esperado**:
- Botón vuelve a habilitarse automáticamente a los 15s
- Usuario puede reintentar

---

### AUTH-009 · Login con usuario ya logueado
**Severidad**: BAJA  
**Pasos**:
1. Usuario ya autenticado
2. Navegar a `/login`

**Resultado esperado**:
- Redirección automática a `/dashboard`
- No se muestra el form de login

---

### AUTH-010 · Validación de campos Login
**Severidad**: BAJA  
**Pasos**:
1. Dejar email vacío → click submit
2. Email inválido (sin @) → click submit
3. Password vacío → click submit

**Resultado esperado**:
- Botón deshabilitado si campos vacíos/inválidos
- Indicadores visuales de error por campo

---

## SIGNUP (AUTH-011 → AUTH-020)

### AUTH-011 · Registro nuevo usuario (happy path)
**Severidad**: CRÍTICA  
**Pasos**:
1. Navegar a `/signup`
2. Completar: nombre, apellido, nombre clínica, email nuevo, password >= 6 chars
3. Click "Crear cuenta"

**Resultado esperado**:
- Redirección a `/verify-email?email=...`
- Email de confirmación enviado
- NO acceso al dashboard hasta confirmar

---

### AUTH-012 · Registro con email ya registrado
**Severidad**: ALTA  
**Pasos**:
1. Intentar registro con email que ya tiene cuenta

**Resultado esperado**:
- Error genérico: "No se pudo crear la cuenta. Verificá los datos e intentá de nuevo."
- NO revelar que el email ya existe (prevención enumeración)

---

### AUTH-013 · Registro en modo invitación
**Severidad**: ALTA  
**Precondición**: URL `/signup?invite={valid_token}`  
**Pasos**:
1. Navegar con token válido
2. Verificar que email está pre-llenado y deshabilitado
3. No se muestra campo "Nombre de clínica"
4. Completar nombre + apellido + password
5. Crear cuenta

**Resultado esperado**:
- Cuenta creada vinculada a la invitación
- Verificación de email necesaria
- Tras confirmación: acceso al dashboard de la clínica invitante

---

### AUTH-014 · Validación de campos Signup
**Severidad**: MEDIA  
**Casos**:
- `firstName.length < 2` → error
- `lastName.length < 2` → error
- `clinicName.length < 2` → error (solo en modo normal)
- Email inválido → error
- Password < 6 chars → error
- Todos vacíos → botón deshabilitado

---

### AUTH-015 · Password visibility toggle
**Severidad**: BAJA  
**Pasos**:
1. Click ojo en campo password
2. Verificar que password se muestra en texto claro
3. Click nuevamente
4. Verificar que vuelve a `type="password"`

---

### AUTH-016 · Reenvío de email de confirmación
**Severidad**: MEDIA  
**Pasos**:
1. Llegar a `/verify-email`
2. Click "Reenviar correo"

**Resultado esperado**:
- Toast de confirmación
- Botón se deshabilita temporalmente (prevenir spam)
- Email reenviado a la dirección correcta

---

### AUTH-017 · Signup con signups deshabilitados
**Severidad**: MEDIA  
**Pasos**:
1. Config de Supabase: email signups deshabilitados
2. Intentar crear cuenta

**Resultado esperado**:
- Error: "El registro por correo está desactivado. Contactá al administrador."

---

### AUTH-018 · Error en envío de email de confirmación
**Severidad**: MEDIA  
**Pasos**:
1. Simular fallo en Resend/SMTP

**Resultado esperado**:
- Error: "No se pudo enviar el correo de confirmación. Verificá tu conexión o intentá de nuevo."

---

### AUTH-019 · Usuario ya logueado intenta acceder a /signup
**Severidad**: BAJA

**Resultado esperado**:
- `<Navigate to="/dashboard" replace />` automático

---

### AUTH-020 · Signup - campo clínica en modo invitación no se envía
**Severidad**: ALTA  
**Pasos**:
1. Signup con invite token
2. Verificar que la llamada `signup()` recibe `clinicName: null`
3. No se crea nueva clínica

---

## PASSWORD RECOVERY (AUTH-021 → AUTH-028)

### AUTH-021 · Solicitar reset de password (happy path)
**Severidad**: ALTA  
**Pasos**:
1. Navegar a `/forgot-password`
2. Ingresar email registrado
3. Click "Enviar instrucciones"

**Resultado esperado**:
- Toast/mensaje: email enviado
- Email de recuperación llega con link
- Link redirige a `/auth/callback?type=recovery`

---

### AUTH-022 · Solicitar reset con email no registrado
**Severidad**: MEDIA  
**Pasos**:
1. Email que no existe en el sistema

**Resultado esperado**:
- Mismo mensaje de éxito (no revelar si email existe)
- No se envía email real

---

### AUTH-023 · Reset password (happy path)
**Severidad**: CRÍTICA  
**Precondición**: Usuario llegó a `/auth/reset-password` con sesión de recovery activa  
**Pasos**:
1. Ingresar nueva password (>= 6 chars)
2. Repetir password correctamente
3. Click "Guardar contraseña"

**Resultado esperado**:
- `success = true` antes de llamar `updatePassword()`
- Redirección a `/dashboard`
- NO flash intermedio a `/login`
- Password actualizada, funciona en login futuro

---

### AUTH-024 · Reset password sin sesión de recovery
**Severidad**: ALTA  
**Pasos**:
1. Navegar directamente a `/auth/reset-password` sin token

**Resultado esperado**:
- `passwordRecoveryMode = false`
- Redirección inmediata a `/login`

---

### AUTH-025 · Reset password — passwords no coinciden
**Severidad**: BAJA  
**Pasos**:
1. Password y confirmación diferentes

**Resultado esperado**:
- Indicador de error "No coinciden" bajo campo
- Botón submit deshabilitado

---

### AUTH-026 · Reset password — token expirado
**Severidad**: ALTA  
**Pasos**:
1. Link de recovery expirado (> 1h por defecto)
2. Intentar cambiar password

**Resultado esperado**:
- Error: "El link expiró. Pedí uno nuevo desde el login."
- Link inline: "Pedir nuevo link" → `/forgot-password`

---

### AUTH-027 · ResetPassword flash prevention
**Severidad**: ALTA  
**Pasos**:
1. Completar reset exitoso
2. Verificar que NO hay flash a /login antes de llegar a /dashboard

**Resultado esperado**:
- `success = true` se setea ANTES de `updatePassword()`
- El useEffect guard ve `success=true` → no navega a /login

---

### AUTH-028 · Password toggle en ResetPassword
**Severidad**: BAJA  
**Pasos**:
1. Toggle visibility en ambos campos password/confirmación

---

## AUTH CALLBACK (AUTH-029 → AUTH-033)

### AUTH-029 · AuthCallback — usuario existe, redirección a dashboard
**Severidad**: CRÍTICA  
**Pasos**:
1. Completar OAuth Google con cuenta ya registrada

**Resultado esperado**:
- AuthCallback detecta `user` → navega a `/dashboard`
- Spinner visible durante espera

---

### AUTH-030 · AuthCallback — nuevo usuario, redirección a onboarding
**Severidad**: ALTA  
**Pasos**:
1. OAuth Google con email nuevo

**Resultado esperado**:
- `needsOnboarding = true`
- Redirección a `/onboarding`

---

### AUTH-031 · AuthCallback — recovery mode, redirección a reset-password
**Severidad**: ALTA  
**Pasos**:
1. Click link de email de recovery
2. Llega a `/auth/callback`

**Resultado esperado**:
- `passwordRecoveryMode = true`
- Redirección a `/auth/reset-password`

---

### AUTH-032 · AuthCallback — timeout 10s (H2 fix)
**Severidad**: ALTA  
**Pasos**:
1. Navegar a `/auth/callback`
2. Simular que user nunca se hidrata (bloquear Supabase)
3. Esperar 10 segundos

**Resultado esperado**:
- A los 10s exactos: navigate('/login', { replace: true })
- NO queda en pantalla de spinner indefinidamente
- **VERIFICAR**: La navegación ocurre directamente desde el setTimeout, no via ref

---

### AUTH-033 · AuthCallback — error OAuth en URL params
**Severidad**: ALTA  
**Pasos**:
1. Simular `?error=server_error&error_description=invalid+secret`
2. NO pasa por el timeout — muestra error inmediato

**Resultado esperado**:
- Pantalla de error: "Error al conectar con Google"
- Descripción del error visible
- Link "Volver al login"

---

## INVITACIONES (AUTH-034 → AUTH-038)

### AUTH-034 · Aceptar invitación — usuario no logueado
**Severidad**: ALTA  
**Pasos**:
1. Navegar a `/accept-invite?token={valid}`
2. Ver datos de invitación (clínica, email, rol)
3. Click "Crear mi cuenta"

**Resultado esperado**:
- Redirección a `/signup?invite={token}`
- Email pre-rellenado desde invitación

---

### AUTH-035 · Aceptar invitación — usuario ya logueado
**Severidad**: ALTA  
**Pasos**:
1. Usuario logueado navega a `/accept-invite?token={valid}`

**Resultado esperado**:
- Auto-aceptación (status: 'accepting')
- `acceptInvite(token)` llamado
- `refreshMembership()` llamado
- Redirección a `/dashboard` tras 1.2s

---

### AUTH-036 · Token de invitación inválido / expirado
**Severidad**: ALTA  
**Pasos**:
1. `/accept-invite?token=garbage`

**Resultado esperado**:
- Status: 'invalid'
- Mensaje: "Link inválido - Este link de invitación no existe o ya fue utilizado."

---

### AUTH-037 · Invitación ya aceptada (status: active)
**Severidad**: MEDIA  
**Pasos**:
1. Token de invitación con status 'active' (ya usada)

**Resultado esperado**:
- `data.status === 'active'` → status 'invalid'
- Mensaje: "Esta invitación ya fue aceptada."

---

### AUTH-038 · Invitación con email incorrecto
**Severidad**: ALTA  
**Pasos**:
1. Usuario logueado con email A intenta aceptar invitación para email B

**Resultado esperado**:
- Error: "Esta invitación es para {email}. Iniciá sesión con ese correo."

---

## AUTORIZACIÓN & ROLES (AUTH-039 → AUTH-042)

### AUTH-039 · ProtectedRoute — usuario no logueado
**Severidad**: CRÍTICA  
**Pasos**:
1. Navegar directamente a `/dashboard/agenda` sin sesión

**Resultado esperado**:
- Redirección a `/login`
- Query param `?redirect=/dashboard/agenda` preservado para post-login

---

### AUTH-040 · ProtectedRoute — loading state
**Severidad**: ALTA  
**Pasos**:
1. AuthContext aún cargando (`loading: true`)

**Resultado esperado**:
- ProtectedRoute no renderiza hijos NI redirige
- Spinner/skeleton visible
- Sin race condition

---

### AUTH-041 · Rol viewer — acciones de escritura deshabilitadas
**Severidad**: ALTA  
**Precondición**: Usuario con `role: 'viewer'`  
**Pasos**:
1. Intentar editar appointment, paciente, configuración

**Resultado esperado**:
- Botones de edición ocultos o deshabilitados
- RLS en Supabase rechaza mutaciones

---

### AUTH-042 · Sesión expirada mid-session
**Severidad**: ALTA  
**Pasos**:
1. Usuario logueado
2. Token de sesión expira (simulado)
3. Intentar acción que requiere auth

**Resultado esperado**:
- Supabase auto-refresh del token (si refresh_token válido)
- Si refresh falla: redirección a /login con mensaje
