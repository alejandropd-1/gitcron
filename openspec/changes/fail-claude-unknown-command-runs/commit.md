# Commit del cambio

## Mensaje

fix(pipeline): declarar el fracaso de un run que el runtime rechazó

Claude sale con código 0 e `is_error: false` para un slash command inexistente,
con el motivo sólo dentro de `result`. Eso se traducía a sesión completada y a
"Sesión finalizada correctamente" sobre una tarea que seguía sin tildar.

El desenlace de la sesión tampoco leía el fracaso declarado por el run: sólo
miraba si el proceso había fallado.

## Archivos

- electron/pipeline/runtime-adapters/claude-normalizer.ts
- electron/pipeline/runtime/runtime-session-hub.ts
- electron/pipeline/runtime/runtime-projection.ts
- electron/__tests__/runtime-normalizers.test.ts
- electron/__tests__/runtime-session-hub.test.ts
- docs/reports/2026-08-01-fail-claude-unknown-command-runs.md
- docs/reports/2026-08-01-handoff-pipeline.md
