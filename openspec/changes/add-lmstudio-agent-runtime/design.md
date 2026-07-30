## Context

El adaptador `LmStudioProviderAdapter` existe y hace: discovery (probe del CLI), health (HTTP `/api/v1/models` nativo con fallback `/v1/models`), catálogo con `max_context_length`/`loaded_instances`/`trained_for_tool_use`, y validación loopback-only. Todo con `node:http`, cero deps.

LM Studio expone API OpenAI-compatible en `http://127.0.0.1:1234/v1`. Soporta tool calling (`finish_reason: "tool_calls"`, `message.tool_calls[].function`) y streaming. Es headless (corre como servicio sin GUI).

El loop agente: GitCron manda la tarea + declaración de tools → el modelo devuelve texto o tool_calls → GitCron ejecuta los tools en el repo → devuelve resultados como mensajes `tool` → repite → el modelo indica fin → GitCron marca `tasks.md`.

## Goals / Non-Goals

**Goals**
- Loop agente que ejecuta tareas con modelos locales vía tool calling.
- Tools acotados y seguros (read/edit/glob/grep) sobre el working tree.
- Selector de modelo con su contexto reportado.
- Reutilizar el discovery/catálogo/health del adaptador existente.

**Non-Goals**
- `run_command`/shell libre en v1 (demasiada superficie; se deja fuera o muy acotado a un whitelist).
- Soporte de modelos que no soporten tool calling (se filtran: sólo `trained_for_tool_use: true`).
- MCP servers externos como tools en v1 (los tools los define GitCron).
- Cambiar el adaptador proveedor existente (se reutiliza, no se reescribe).

## Decisions

### D1: Adaptador nuevo, no extensión del proveedor
`LmStudioProviderAdapter` es un proveedor (observa inferencia). El loop agente es otra responsabilidad. Se crea `LmStudioAgentAdapter` que **compone** al proveedor para discovery/catálogo/health y añade `start()`/`events()` con el loop. Así no se mezclan dos modelos de uso.

### D2: Tools definidos por GitCron, ejecutados en Main
Tools: `read_file(path)`, `edit_file(path, old, new)`, `glob(pattern)`, `grep(pattern, glob)`. Todos validan path contra el repo (reutilizando `safeReadRepoFile`/guards de path existentes). `run_command` queda **fuera de v1** por seguridad; si se necesita, se añade con whitelist explícito en otro change.

### D3: Loop con límites
Iteración máxima (ej. 25), timeout total, y corte si el modelo deja de devolver tool_calls y afirma fin. Telemetría: tokens acumulados de los `usage` de cada completion (LM Studio los reporta).

### D4: `'lmstudio'` en `PipelineRuntime`
Hoy LM Studio es `'unknown'` (proveedor). El agente es un runtime de ejecución: se añade `'lmstudio'` a la unión. El proveedor existente sigue siendo `'unknown'` internamente; el agente expone `'lmstudio'`.

### D5: Selector de modelo en la UI
El launcher ya recibe `RuntimeDiscoveryEntry`. Se extiende con el catálogo de modelos (id, contexto, tool-use) para LM Studio, y el renderer muestra un selector de modelo cuando el runtime es LM Studio.

## Risks & Mitigations

- **Ejecución de tools edita el working tree.** Mitigación: `edit_file` exige `modifiesRepo` confirmado; paths validados; no shell.
- **Loop infinito / alucinación de tools.** Mitigación: límite de iteraciones, timeout, y detección de tool_calls con paths inválidos (se rechazan, no se ejecutan).
- **Modelo sin tool calling.** Mitigación: el catálogo filtra `trained_for_tool_use: true`; los demás se listan pero no se ofrecen para ejecución.
- **Contexto >65k puede ser lento/caro localmente.** Mitigación: el contexto se reporta, no se fuerza; la persona elige el modelo con su ventana.
