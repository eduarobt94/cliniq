# Migraciones — fuente de verdad

> CRÍTICO-3 (audit 2026-07-06): el estado del schema **no** se lleva a mano.
> La tabla ✅/🔴 que estaba en `CLAUDE.md` quedó obsoleta y generaba deriva entre
> entornos. La única fuente de verdad es el historial de migraciones de Supabase.

## Verificar qué está aplicado

```bash
npx supabase migration list --linked
```

La columna `REMOTE` muestra lo aplicado en la nube; `LOCAL` lo que hay en este
repo. Si difieren, hay drift.

## Aplicar pendientes

```bash
npx supabase db push --linked      # aplica las migraciones que falten, en orden
```

> Regla: **nunca** editar una migración ya aplicada (rompe el checksum de
> `supabase_migrations.schema_migrations`). Para corregir algo, crear una migración
> nueva con timestamp posterior.

## Detección de drift en CI (recomendado)

Agregar a `.github/workflows/security.yml` un job que falle si el schema del repo
no coincide con el remoto:

```yaml
  migration-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase db diff --linked --schema public
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD:  ${{ secrets.SUPABASE_DB_PASSWORD }}
        # `db diff` sin salida = sin drift. Con salida → falla el job.
```

## Migraciones del audit 2026-07-06

| Archivo | Qué hace |
|---|---|
| `20260706000000_appointment_no_overlap.sql` | CRÍTICO-1: `duration_minutes` + `ends_at` (trigger) + constraint `EXCLUDE` anti-solapamiento |
| `20260706000001_conversation_last_message.sql` | ALTO-5: denormaliza último mensaje en `conversations` + reescribe `ai_followup_tick` (sin full-scan) |
| `20260706000002_ai_rate_limit.sql` | ALTO-6: tabla `ai_rate_limit` + RPC `check_rate_limit` (12 msg/60s por número) |

> Nota histórica: `20260507000000_waiting_list.sql` es el esquema **canónico** de
> `waiting_list`. `20260507000004_waiting_list.sql` fue reducido a solo sus políticas
> RLS `members_*` (CRÍTICO-2) — su `CREATE TABLE` conflictivo se eliminó.
