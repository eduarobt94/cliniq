# CLINIQ — Plan Maestro de QA
> Senior QA Automation Engineer · Versión 1.0 · 2026-05-16

---

## Índice

1. [Alcance y objetivos](#1-alcance-y-objetivos)
2. [Arquitectura del sistema bajo prueba](#2-arquitectura-del-sistema-bajo-prueba)
3. [Estrategia de pruebas](#3-estrategia-de-pruebas)
4. [Módulos y cobertura](#4-módulos-y-cobertura)
5. [Criterios de entrada y salida](#5-criterios-de-entrada-y-salida)
6. [Entornos de prueba](#6-entornos-de-prueba)
7. [Severidades y prioridades](#7-severidades-y-prioridades)
8. [Convenciones de ID de test](#8-convenciones-de-id-de-test)
9. [Resumen de test cases por módulo](#9-resumen-de-test-cases-por-módulo)

---

## 1. Alcance y objetivos

### Objetivo principal
Garantizar que todos los flujos de Cliniq funcionen correctamente en condiciones nominales, en límites, y ante errores inesperados, con especial foco en:

- **Integridad de datos**: ninguna acción debe corromper appointments, conversaciones ni pacientes
- **Seguridad**: RLS, roles, tokens de invitación
- **UX**: feedback correcto al usuario en cada estado (loading, error, success, empty)
- **Resiliencia**: comportamiento ante APIs externas caídas (WhatsApp, Claude, OpenAI, Meta)

### Fuera de alcance
- Pruebas de carga / stress
- Pruebas de penetración (pen testing)
- Compatibilidad con browsers legacy (IE, Safari < 16)

---

## 2. Arquitectura del sistema bajo prueba

```
┌─────────────────────────────────────────────────────────┐
│                        FRONTEND                          │
│  React + Vite · React Router · Tailwind · Supabase JS   │
│                                                          │
│  Páginas públicas      Páginas protegidas (auth)         │
│  /login /signup        /dashboard /agenda /inbox etc.   │
└─────────────────────────┬───────────────────────────────┘
                          │ Supabase JS SDK
┌─────────────────────────▼───────────────────────────────┐
│                    SUPABASE BACKEND                       │
│  PostgreSQL + RLS · Auth · Realtime · Edge Functions     │
│                                                          │
│  Edge Functions (Deno/TypeScript):                        │
│  · whatsapp-webhook          · ai-agent-reply            │
│  · send-whatsapp-reminders   · send-patient-reactivation │
│  · send-review-requests      · notify-waitlist           │
│  · initiate-conversation     · send-whatsapp-message     │
│  · send-invite-email         · notify-closure-patients   │
└─────────────────────────┬───────────────────────────────┘
                          │
         ┌────────────────┼─────────────────┐
         ▼                ▼                 ▼
  WhatsApp API      Claude API        OpenAI Whisper
  (Meta Graph)   (Anthropic)          (Transcripción)
```

---

## 3. Estrategia de pruebas

| Nivel | Tipo | Herramienta sugerida |
|-------|------|----------------------|
| Unitario | Funciones puras (renderTemplate, formatForTimezone, etc.) | Vitest |
| Integración | Edge Functions con Supabase local | Deno test + supabase start |
| E2E frontend | Flujos de usuario completos | Playwright |
| API manual | Edge functions via Postman/curl | Postman |
| Regresión | Checklist manual antes de cada release | `QA_REGRESSION_CHECKLIST.md` |

---

## 4. Módulos y cobertura

| ID módulo | Módulo | Archivo de tests |
|-----------|--------|-----------------|
| AUTH | Autenticación & autorización | `QA_AUTH_FLOWS.md` |
| WH | WhatsApp Webhook | `QA_WHATSAPP_FLOWS.md` |
| AI | AI Agent Reply | `QA_AI_AGENT_FLOWS.md` |
| REM | Recordatorios automáticos | `QA_AUTOMATIONS_FLOWS.md` |
| AG | Agenda (UI) | `QA_FRONTEND_FLOWS.md` |
| PAC | Pacientes (UI) | `QA_FRONTEND_FLOWS.md` |
| INB | Inbox WhatsApp (UI) | `QA_FRONTEND_FLOWS.md` |
| AUT | Automatizaciones (UI) | `QA_FRONTEND_FLOWS.md` |
| CFG | Configuración (UI) | `QA_FRONTEND_FLOWS.md` |
| LSE | Lista de espera (UI) | `QA_FRONTEND_FLOWS.md` |
| DASH | Dashboard principal (UI) | `QA_FRONTEND_FLOWS.md` |
| REG | Reportes (UI) | `QA_FRONTEND_FLOWS.md` |

---

## 5. Criterios de entrada y salida

### Criterios de entrada (para iniciar ciclo QA)
- Build sin errores de TypeScript/ESLint
- Migraciones aplicadas en entorno de prueba
- Variables de entorno configuradas (WA token, Claude key, etc.)
- Edge functions desplegadas o corriendo en local

### Criterios de salida (para aprobar release)
- 0 bugs de severidad CRÍTICA o ALTA abiertos
- ≥ 90% test cases de regresión pasados
- Todos los flujos de autenticación verificados manualmente
- Checklist de regresión completado y firmado

---

## 6. Entornos de prueba

| Entorno | URL | DB | WA | Notas |
|---------|-----|----|----|-------|
| Local | localhost:5173 | Supabase local | Sandbox | `supabase start` |
| Staging | preview.cliniq.app | Supabase staging | Sandbox | Branch de preview |
| Producción | cliniq.app | Supabase prod | Real | Solo smoke test post-deploy |

---

## 7. Severidades y prioridades

| Severidad | Definición | Tiempo de resolución |
|-----------|------------|----------------------|
| **CRÍTICA** | Pérdida de datos, seguridad comprometida, crash total | Inmediato (hotfix) |
| **ALTA** | Flujo principal roto, no hay workaround | ≤ 24h |
| **MEDIA** | Funcionalidad degradada, hay workaround | ≤ sprint |
| **BAJA** | UX menor, cosmético, mejora | Backlog |

---

## 8. Convenciones de ID de test

```
{MÓDULO}-{NÚMERO}-{VARIANTE}

Ejemplos:
  AUTH-001       → caso base de login
  AUTH-001-NEG   → variante negativa del login
  WH-015-EDGE    → edge case del webhook
  AI-003-ERR     → caso de error del agente IA
```

---

## 9. Resumen de test cases por módulo

| Módulo | Total cases | Críticos | Altos | Medios | Bajos |
|--------|-------------|---------|-------|--------|-------|
| AUTH | 42 | 8 | 14 | 12 | 8 |
| WH (Webhook) | 48 | 10 | 16 | 14 | 8 |
| AI (Agent) | 36 | 8 | 12 | 10 | 6 |
| REM (Recordatorios) | 22 | 4 | 8 | 6 | 4 |
| AG (Agenda) | 34 | 6 | 12 | 10 | 6 |
| PAC (Pacientes) | 24 | 4 | 8 | 8 | 4 |
| INB (Inbox) | 38 | 8 | 14 | 10 | 6 |
| AUT (Automatizaciones) | 28 | 4 | 10 | 8 | 6 |
| CFG (Configuración) | 26 | 4 | 10 | 8 | 4 |
| LSE (Lista espera) | 18 | 2 | 6 | 6 | 4 |
| DASH (Dashboard) | 16 | 2 | 6 | 4 | 4 |
| REG (Reportes) | 12 | 0 | 4 | 6 | 2 |
| **TOTAL** | **344** | **60** | **120** | **102** | **62** |
