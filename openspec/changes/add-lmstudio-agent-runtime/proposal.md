## Why

GitCron hoy no puede usar modelos locales para ejecutar tareas OpenSpec. El adaptador de LM Studio **ya existe** y resuelve discovery, health, catálogo de modelos, y reporta `max_context_length`, `loaded_instances` y `trained_for_tool_use` — todo con `node:http`, sin dependencias nuevas. Pero está registrado como **proveedor** (`runtime: 'unknown'`), no como runtime que ejecuta: no implementa el loop agente.

Lo que falta es el loop: mandar la tarea a un modelo local con ventana de contexto amplia (>65k) vía la API OpenAI-compatible de LM Studio (`/v1/chat/completions` con tool calling), y que GitCron ejecute los tool calls del modelo (leer/editar archivos, grep, correr tests) en el repo, repitiendo hasta que el modelo declare la tarea lista y marque `tasks.md`. Es el mismo modelo de ejecución que Claude/Codex, pero con el motor de inferencia local.

## What Changes

- Nuevo adaptador `lmstudio-agent-adapter` que implementa el loop agente sobre `/v1/chat/completions` con function calling.
- GitCron define un set de tools (read_file, edit_file, glob, grep, run_command acotado) que el modelo puede invocar; GitCron los ejecuta en el repo y devuelve el resultado al modelo.
- El adaptador se registra en el hub como `runtime: 'lmstudio'`, `launchable: true`, `modifiesRepo: true`.
- La UI permite elegir el modelo local concreto (del catálogo que ya se lee) y muestra su ventana de contexto.

## Capabilities

### New Capabilities

- `pipeline-local-agent-loop`: define el contrato del loop agente que orquesta inferencia local + ejecución de tools sobre el working tree, aplicable a cualquier proveedor OpenAI-compatible local.

### Modified Capabilities

- `pipeline-runtime-adapters`: LM Studio pasa de proveedor observado a runtime lanzable que ejecuta tareas vía loop agente con tools.

## Impact

**Producción:** nuevo `electron/pipeline/runtime-adapters/lmstudio-agent-adapter.ts`, `electron/pipeline/runtime/runtime-session-hub.ts` (registro), `types/pipeline/runtime.ts` (`'lmstudio'` en `PipelineRuntime`), selector de modelo en `components/pipeline/PipelineRuntimeLauncher.tsx`.

**Sin tocar:** el adaptador proveedor existente (se reutiliza su discovery/catálogo/health), contratos IPC, lógica de Git.

**Dependencias:** ninguna. HTTP vía `node:http` (ya usado por el adaptador existente).

**Riesgo:** alto. Es el cambio más grande de los tres: define un loop agente con ejecución de tools sobre el working tree. Mitigación: los tools se acotan (edit_file exige paths validados; run_command queda fuera inicialmente o muy restringido); el loop tiene límite de iteraciones y de tokens; se reutiliza toda la infra de path-validation y sanitización existente.
