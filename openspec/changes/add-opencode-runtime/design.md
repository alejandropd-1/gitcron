## Context

`createOpenCodeAcpRuntimeAdapter(canonicalRepoPath, executable, runner?, now?)` pide el ejecutable explícito. Los demás factories (`claude`, `codex`) lo tienen hardcodeado dentro; el de OpenCode lo recibe porque su ejecutable puede variar (path del `.exe` en Windows). El hub construye cada adaptador con `entry.create(canonicalRepoPath)`, sin pasar ejecutable.

`PipelineRuntime` ya incluye `'opencode'` (`types/pipeline/runtime.ts:9`). El adaptador implementa `start()`, `events()`, `telemetry()`, `health()`, `shutdown()` y negocia ACP real: es lanzable de verdad, no un wrapper de lifecycle como agy.

## Goals / Non-Goals

**Goals**
- Registrar OpenCode en el hub como lanzable.
- Resolver el ejecutable sin agregar config nueva: `'opencode'` vía PATH, como los demás.

**Non-Goals**
- Cambiar el protocolo ACP del adaptador (ya funciona).
- Detectar credenciales Z.AI Coding Plan (eso lo hace OpenCode solo; GitCron no maneja sus auth).
- Cambiar la UI del selector (ya renderiza cualquier runtime del hub).

## Decisions

### D1: `AdapterEntry` con factory que recibe ejecutable
Cambio la firma de `create` para que opcionalmente reciba el ejecutable. Los entries que no lo necesiten (claude/codex/agy) lo ignoran. OpenCode lo usa. Alternativa rechazada: hardcodear `'opencode'` dentro del factory — pierde la capacidad de Windows donde el path puede ser distinto, y rompe el patrón de testabilidad del adapter (que recibe `executable` para mockear).

### D2: `executable: 'opencode'` vía PATH
El `RuntimeProcessRunner` ya resuelve nombres de binario en PATH. En Windows puede requerir `.cmd`/`.exe` (el runner ya maneja eso). No se agrega configuración de usuario: si `opencode` no está en PATH, `discover()` reporta `installed: false` y se lista con su motivo, igual que cualquier runtime ausente.

### D3: `modifiesRepo: true` para OpenCode
Una sesión de OpenCode/Z.ai edita archivos del working tree (igual que Claude). Se declara así para que el launcher exija confirmación explícita antes de arrancar, coherente con la invariante de seguridad.

## Risks & Mitigations

- **`opencode` no en PATH en alguna máquina.** Mitigación: `discover()` lo reporta como no instalado con diagnóstico; no rompe nada.
- **La credencial Z.AI no está configurada en OpenCode.** Mitigación: OpenCode la pide al arrancar; el error llega crudo al renderer (comportamiento existente). GitCron no la gestiona.
- **Windows: `.cmd`/`.exe`.** Mitigación: el `RuntimeProcessRunner` ya resuelve sufijos de Windows (matriz de runtimes de F08).
