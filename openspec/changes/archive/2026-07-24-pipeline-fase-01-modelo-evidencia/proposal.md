## Why

Pipeline ya tiene un contrato agnóstico, pero GitCron todavía no puede reconstruir de forma determinística qué ocurre en un repositorio a partir de Git, OpenSpec y los productores JSONL locales. F01 crea ese núcleo observable y persistente antes de conectar runtimes o diseñar la UI.

## What Changes

- Introducir tipos compartidos para evidencia, snapshots, diagnósticos, decisiones y eventos semánticos.
- Incorporar parsers puros para tasks, auditorías, OpenSpec JSON y los tres streams JSONL versionados por F00.
- Leer evidencia del repositorio exclusivamente desde Electron main con contención de paths, tolerancia a archivos ausentes o mutables y selección explícita de change.
- Reducir evidencia más estado previo a snapshots y eventos determinísticos, preservando `confirmed`, `inferred` y `unknown`.
- Persistir snapshots/eventos idempotentes en SQLite global, particionados por `repo_id`, y exponer IPC read-only tipado.
- Reutilizar los watchers existentes como trigger de refresh; no crear otro watcher ni escribir en el repositorio observado.

## Capabilities

### New Capabilities

- `pipeline-repo-evidence`: lectura, parsing, selección y diagnósticos de evidencia Git/OpenSpec/filesystem por repositorio.
- `pipeline-state-replay`: reducción determinística, persistencia idempotente y snapshot/suscripción read-only para replay futuro.

### Modified Capabilities

- `pipeline-event-contract`: agrega requisitos de ingesta incremental y eventos semánticos derivados de productores locales.
- `pipeline-decision-contract`: agrega normalización de decisiones únicamente desde señales verificables y con procedencia explícita.

## Impact

- Nuevos módulos bajo `types/pipeline/` y `electron/pipeline/`, con tests focalizados.
- Nueva migración `node:sqlite` en la base global existente, sin dependencia nueva.
- Nuevos canales IPC y métodos preload de solo lectura; sin UI en esta fase.
- Registro acotado en `electron/main.ts` y trigger reutilizado desde `electron/ipc/watchers.ts`.
- No modifica Git, OpenSpec, CSS, README, CHANGELOG, providers ni configuración de runtimes.
