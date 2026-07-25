## Why

Pipeline ya puede leer evidencia local por repositorio, pero todavía no puede observar de forma uniforme las sesiones directas de Claude Code, Codex, OpenCode, Antigravity ni el proveedor local LM Studio. F03 agrega esa capa sin convertir Hermes en gateway obligatorio ni inventar telemetría que el runtime no emite.

## What Changes

- Introducir una interfaz `RuntimeAdapter` main-only con discovery, health, sesión, stream, métricas, capacidades y cleanup normalizados.
- Implementar adaptadores directos para Claude Code, Codex y OpenCode sobre streams estructurados, y degradaciones explícitas para `agy` y LM Studio según la evidencia disponible.
- Ejecutar child processes con executable/args separados, `shell: false`, cwd confinado, entorno mínimo, límites de bytes/eventos, timeout, cancelación y cleanup.
- Normalizar identidad, eventos, usage, costo, contexto, reasoning y modelo con procedencia por campo; ausencia permanece `unknown`/`unavailable`.
- Versionar fixtures sanitizados y una conformance suite parametrizada por adaptador.
- Mantener controles fuera del IPC/UI hasta F05 y no agregar dependencias.

## Capabilities

### New Capabilities

- `pipeline-runtime-adapters`: Define el ciclo de vida, aislamiento, degradación y conformance común de los adaptadores directos.

### Modified Capabilities

- `pipeline-runtime-capabilities`: Agrega negociación por instancia/sesión y coherencia entre capabilities anunciadas, fixtures y métodos reales.
- `pipeline-event-contract`: Agrega normalización incremental de streams de runtime, métricas con procedencia y límites de payload.
- `pipeline-connection-security`: Agrega ejecución segura y ownership de procesos locales, backpressure, timeout y cleanup.
- `pipeline-identity-contract`: Agrega correlación obligatoria de cada sesión directa con repo/change/task/run/attempt y separación runtime/provider/model.
- `pipeline-telemetry-fixtures`: Agrega fixtures y conformance versionados por runtime y versión instalada.

## Impact

- Código nuevo bajo `electron/pipeline/runtime-adapters/` y tipos compartidos bajo `types/pipeline/`.
- Tests y fixtures sanitizados bajo `electron/**/__tests__/` y `docs/pipeline/f03/`.
- Integración main-only con la persistencia Pipeline de F01; no se expone control nuevo por preload/renderer.
- Documentación de estado/reporte de F03. Sin UI, CSS, dependencias nuevas, secretos ni cambios de configuración global.
