# CLINIQ — Checklist de Regresión Pre-Release
> Ejecutar antes de cada deploy a producción · 2026-05-16

**Versión**: ________ | **Fecha**: ________ | **Ejecutado por**: ________

Marca cada ítem como ✅ PASS / ❌ FAIL / ⏭ SKIP (con justificación)

---

## BLOQUE 1 — AUTH (15 checks, ~10 min)

| # | Test | Estado | Notas |
|---|------|--------|-------|
| R-AUTH-01 | Login email/password válido → redirige a /dashboard | | |
| R-AUTH-02 | Login con password incorrecta → muestra error genérico, no redirige | | |
| R-AUTH-03 | Google login — botón se resetea a los 15s si no hay redirect | | |
| R-AUTH-04 | Signup nuevo usuario → llega a /verify-email | | |
| R-AUTH-05 | Email ya registrado en signup → mensaje genérico (SIN revelar que existe) | | |
| R-AUTH-06 | ForgotPassword → email enviado (incluso con email inexistente) | | |
| R-AUTH-07 | ResetPassword exitoso → redirige a /dashboard SIN flash a /login | | |
| R-AUTH-08 | /auth/reset-password sin recovery session → redirige a /login | | |
| R-AUTH-09 | AuthCallback sin user tras 10s → redirige a /login (no spinner infinito) | | |
| R-AUTH-10 | AcceptInvite con token válido → auto-acepta si logueado | | |
| R-AUTH-11 | AcceptInvite con token inválido → muestra "Link inválido" | | |
| R-AUTH-12 | /dashboard sin sesión → redirige a /login | | |
| R-AUTH-13 | ProtectedRoute loading state → no renderiza ni redirige | | |
| R-AUTH-14 | Rol viewer → no puede editar en Configuración | | |
| R-AUTH-15 | Sesión activa en /login → redirige a /dashboard | | |

---

## BLOQUE 2 — AGENDA (12 checks, ~8 min)

| # | Test | Estado | Notas |
|---|------|--------|-------|
| R-AG-01 | Vista día carga appointments del día actual | | |
| R-AG-02 | Navegar a ayer/mañana → datos correctos | | |
| R-AG-03 | Vista semana → chips coloreados por status | | |
| R-AG-04 | Vista mes → appointments en celda correcta | | |
| R-AG-05 | Hover chip (semana/mes) → tooltip con datos completos | | |
| R-AG-06 | Crear appointment → aparece en agenda sin reload | | |
| R-AG-07 | Cambiar status a 'confirmed' → badge verde | | |
| R-AG-08 | Eliminar appointment → desaparece | | |
| R-AG-09 | Filtro "Confirmados" → solo muestra confirmed | | |
| R-AG-10 | Búsqueda por nombre → filtra correctamente | | |
| R-AG-11 | Exportar CSV → archivo descargado con datos | | |
| R-AG-12 | Realtime: appointment nuevo desde otra sesión aparece | | |

---

## BLOQUE 3 — PACIENTES (8 checks, ~5 min)

| # | Test | Estado | Notas |
|---|------|--------|-------|
| R-PAC-01 | Lista de pacientes carga correctamente | | |
| R-PAC-02 | Búsqueda por nombre filtra en tiempo real | | |
| R-PAC-03 | Crear paciente → aparece en lista | | |
| R-PAC-04 | Teléfono duplicado → error específico | | |
| R-PAC-05 | Status 'inactive' correcto para > 90 días | | |
| R-PAC-06 | No-show detectado a las 2h+ exactas | | |
| R-PAC-07 | Editar nombre → lista actualizada | | |
| R-PAC-08 | Eliminar paciente con appointments → requiere confirmación | | |

---

## BLOQUE 4 — INBOX (14 checks, ~10 min)

| # | Test | Estado | Notas |
|---|------|--------|-------|
| R-INB-01 | Lista de conversaciones carga con preview y timestamps | | |
| R-INB-02 | Ventana 24h abierta → input habilitado, badge verde | | |
| R-INB-03 | Ventana 24h cerrada → input deshabilitado, mensaje informativo | | |
| R-INB-04 | Enviar mensaje → aparece como outbound, silencia AI 2min | | |
| R-INB-05 | Mensaje inbound → aparece en tiempo real sin reload | | |
| R-INB-06 | Toggle AI ON → db: ai_enabled=true, agent_mode='bot' | | |
| R-INB-07 | Toggle AI OFF → db: ai_enabled=false, agent_mode='human' | | |
| R-INB-08 | Toggle AI falla DB → UI revierte (optimistic revert) | | |
| R-INB-09 | Nueva conversación con paciente con phone → se crea | | |
| R-INB-10 | Nueva conversación paciente sin phone → error específico | | |
| R-INB-11 | Eliminar conversación → desaparece de lista | | |
| R-INB-12 | Panel AI: intent + lead_score visible | | |
| R-INB-13 | Mensaje fallido → indicador "· fallido" en rojo | | |
| R-INB-14 | Supabase channel cleanup al cambiar conversación | | |

---

## BLOQUE 5 — AUTOMATIZACIONES (10 checks, ~7 min)

| # | Test | Estado | Notas |
|---|------|--------|-------|
| R-AUT-01 | 3 cards visibles con stats (o "Sin datos") | | |
| R-AUT-02 | success_rate nunca muestra > 100% | | |
| R-AUT-03 | Toggle enable/disable → DB actualizada + toast | | |
| R-AUT-04 | Toggle falla → UI revierte | | |
| R-AUT-05 | hours_before < 12 → muestra MessageEditor en modal | | |
| R-AUT-06 | hours_before >= 12 → oculta MessageEditor, muestra aviso | | |
| R-AUT-07 | Legacy template (con *1* o *2*) → reemplazado por default en UI | | |
| R-AUT-08 | Guardar template → DB actualizado, modal cierra | | |
| R-AUT-09 | Inserción de placeholder → aparece en textarea y preview | | |
| R-AUT-10 | hours_before fuera de rango → guardar deshabilitado | | |

---

## BLOQUE 6 — CONFIGURACIÓN (8 checks, ~5 min)

| # | Test | Estado | Notas |
|---|------|--------|-------|
| R-CFG-01 | Datos de clínica cargados en campos | | |
| R-CFG-02 | Editar nombre clínica → guardado + toast | | |
| R-CFG-03 | Timezone cambia → se guarda correctamente | | |
| R-CFG-04 | Invitar miembro → email enviado, fila en tabla | | |
| R-CFG-05 | Habilitar día en horario → schedule guardado | | |
| R-CFG-06 | Horario inválido (inicio > fin) → guardar bloqueado | | |
| R-CFG-07 | Agregar servicio → aparece en lista | | |
| R-CFG-08 | Owner no puede eliminarse a sí mismo | | |

---

## BLOQUE 7 — LISTA DE ESPERA (6 checks, ~4 min)

| # | Test | Estado | Notas |
|---|------|--------|-------|
| R-LSE-01 | Lista de espera carga con filtros de status | | |
| R-LSE-02 | Marcar como notificado → status actualizado | | |
| R-LSE-03 | Marcar como reservado → status actualizado | | |
| R-LSE-04 | AI agrega a waiting_list → aparece en tabla | | |
| R-LSE-05 | Cancelar appointment → notify-waitlist disparado | | |
| R-LSE-06 | Agregar manualmente → formulario guarda correctamente | | |

---

## BLOQUE 8 — WHATSAPP / AI (12 checks, ~15 min)
*Requiere número de WA sandbox configurado*

| # | Test | Estado | Notas |
|---|------|--------|-------|
| R-WH-01 | Mensaje inbound → aparece en inbox | | |
| R-WH-02 | "sí" en respuesta a recordatorio → appointment confirmado | | |
| R-WH-03 | "no" en respuesta a recordatorio → AI pregunta reagendar/cancelar | | |
| R-WH-04 | "cancelar" → appointment cancelado + notify-waitlist | | |
| R-WH-05 | Doble press botón confirm → dedup message, no doble confirmación | | |
| R-WH-06 | Paciente con ai_enabled=false → AI no responde | | |
| R-WH-07 | Paciente desconocido → AI pide nombre completo | | |
| R-WH-08 | AI agenda turno → appointment en DB + notif al doctor | | |
| R-WH-09 | "emergencia" → escalación inmediata, staff notificado | | |
| R-WH-10 | "quiero lista de espera" → registro en waiting_list | | |
| R-WH-11 | Recordatorio < 12h → free-text (no template) | | |
| R-WH-12 | Recordatorio >= 12h → template Meta con lang fallback | | |

---

## BLOQUE 9 — REPORTES Y DASHBOARD (5 checks, ~3 min)

| # | Test | Estado | Notas |
|---|------|--------|-------|
| R-REG-01 | Gráfico carga con datos del período seleccionado | | |
| R-REG-02 | Cambio de rango → datos actualizados | | |
| R-DASH-01 | KPIs del día correctos (confirmed, total, rate) | | |
| R-DASH-02 | Saludo con nombre del usuario | | |
| R-DASH-03 | AgendaBlock muestra appointments de hoy | | |

---

## BLOQUE 10 — ERROR BOUNDARIES & EDGE (5 checks, ~3 min)

| # | Test | Estado | Notas |
|---|------|--------|-------|
| R-ERR-01 | ErrorBoundary en producción: NO hace console.error | | |
| R-ERR-02 | DashboardErrorBoundary: botón "Reintentar" funciona | | |
| R-ERR-03 | 404 → página NotFound correcta | | |
| R-ERR-04 | Ruta desconocida → redirige a /404 | | |
| R-ERR-05 | Network offline al cargar → estado de error manejado | | |

---

## RESUMEN DE EJECUCIÓN

| Bloque | Total | PASS | FAIL | SKIP |
|--------|-------|------|------|------|
| AUTH | 15 | | | |
| AGENDA | 12 | | | |
| PACIENTES | 8 | | | |
| INBOX | 14 | | | |
| AUTOMATIZACIONES | 10 | | | |
| CONFIGURACIÓN | 8 | | | |
| LISTA ESPERA | 6 | | | |
| WHATSAPP/AI | 12 | | | |
| REPORTES/DASH | 5 | | | |
| ERROR/EDGE | 5 | | | |
| **TOTAL** | **95** | | | |

---

## CRITERIO DE GO / NO-GO

| Condición | Decisión |
|-----------|----------|
| 0 FAILs | ✅ GO — Deploy aprobado |
| 1-3 FAILs, ninguno CRÍTICO | ⚠️ GO con seguimiento — crear tickets |
| Cualquier FAIL en bloque AUTH o WH | ❌ NO-GO — No deployar |
| > 3 FAILs | ❌ NO-GO — Investigar y re-ejecutar |

---

## BUGS ENCONTRADOS EN ESTA EJECUCIÓN

| # | Descripción | Severidad | Módulo | Asignado a |
|---|-------------|-----------|--------|-----------|
| | | | | |

---

*Firma QA*: _______________________ | *Fecha aprobación*: _______________________
