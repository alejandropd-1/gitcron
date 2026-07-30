## Context

`AgyWrapperRuntimeAdapter` hoy: `discover()` corre `agy --version`; `events()` es `return;` (no-op); `shutdown()` es no-op ("sin child handle"). No implementa `start()`. Por eso el hub lo declara `launchable: false`.

`RuntimeProcessRunner` (ya existente) soporta spawn de proceso con stdin, timeout, kill con grace, y drenado de stdout/stderr con límites de bytes. Es lo que usan `StructuredCliRuntimeAdapter` (claude/codex) y `OpenCodeAcpRuntimeAdapter`. Reutilizarlo evita reimplementar gestión de proceso.

Limitación de `agy`: no expone `--json`/`--output-format`/`--stream` (auditado en el baseline 1.1.5/1.1.6). Su salida es texto humano. No se parsea como stream estructurado; se emite como lifecycle + texto crudo.

## Goals / Non-Goals

**Goals**
- Implementar `start()` que ejecute `agy <instrucción>` sobre el repo.
- `events()` que emita lifecycle (inicio, texto de salida, fin) sin inventar estructura.
- `shutdown()` que mate el proceso limpiamente.
- Declarar la observación gruesa en el descriptor y mostrarla en la UI.

**Non-Goals**
- Parsear la salida de texto de agy como si fuera JSON estructurado (no lo es; inventarlo violaría la honestidad).
- Reportar telemetría de uso/costo (agy no la expone; queda `unknown`).
- Cambiar el binario o sus argumentos más allá de pasarle la instrucción.

## Decisions

### D1: `start()` con `RuntimeProcessRunner.start` (no `run`)
Se usa `runner.start(...)` (manejo de proceso vivo con stdin y `onStdout`/`onStderr`) en vez de `runner.run(...)` (que espera a que termine). La instrucción viaja por stdin o como argumento según cómo agy acepte input; si agy no acepta instrucción no interactiva, se documenta y se pasa como argumento posicional.

### D2: `events()` emite lifecycle + texto crudo, no estructura
Cada chunk de stdout/stderr se envuelve en un evento de narrativa de canal `system`/`agent` con el texto tal cual. Se emiten `runtime.process.started` al arranque y `runtime.process.completed`/`failed` al cerrar. No se afirman deltas de razonamiento ni tool calls: agy no los provee.

### D3: Observación gruesa declarada y mostrada
El descriptor declara `events.stream` como `degraded` con constraint "lifecycle and raw text only; no structured deltas". La UI ya muestra `startAvailability`/constraints; la persona ve que Antigravity ejecuta pero no se observa token a token.

### D4: `launchable: true` en el hub
Cambia de `false` a `true` porque ahora hay `start()`. `modifiesRepo` se decide según si agy edita archivos (Antigravity sí edita): `true`, con confirmación.

## Risks & Mitigations

- **agy podría no aceptar una instrucción no interactiva y quedar colgado esperando input.** Mitigación: si `--help` no muestra modo no interactivo, se cierra stdin tras mandar la instrucción y se deja timeout; el error llega crudo.
- **Salida de texto enorme sin estructura es poco útil en la UI.** Mitigación: se emite como narrativa, truncada por los límites de bytes del runner. La honestidad vale más que un parseo inventado.
- **Matar el proceso en shutdown puede dejar hijos.** Mitigación: `RuntimeProcessRunner` ya mata el árbol con grace.
