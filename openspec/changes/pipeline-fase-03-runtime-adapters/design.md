## Context

F01 persiste snapshots y eventos semánticos derivados del repositorio, pero no existe un contrato ejecutable para fuentes de runtime. F00 definió identidad, envelope, métricas y capabilities; sus fixtures muestran evidencia fuerte para Claude, OpenCode/Z.ai y LM Studio, evidencia de interfaz para Codex y sólo lifecycle grueso para `agy`. F03 debe traducir esas diferencias desde Electron main sin UI ni controles públicos.

Restricciones: cero dependencias nuevas, cero secretos o procesos en renderer, ningún parsing de prosa/ANSI, `unknown` nunca se convierte en cero, payloads acotados, identidad per-repo obligatoria y ningún control expuesto antes de F05.

## Goals / Non-Goals

**Goals:**

- Congelar una interfaz común y DTOs serializables para discovery, health, sesión, eventos, métricas y cleanup.
- Separar transporte/proceso de normalización para probar adapters con fixtures sin ejecutar inferencias.
- Implementar adaptadores progresivamente según evidencia real y degradar por capability.
- Reutilizar la sanitización/persistencia F01 y ofrecer conformance parametrizada.

**Non-Goals:**

- No agregar UI, preload/IPC de control ni CSS.
- No implementar Hermes, selección de modelos, presupuestos ni pricing.
- No auto-iniciar servidores, cargar modelos, instalar plugins o modificar configuración global.
- No garantizar pause/kill/steer; los métodos internos sólo existen si la sesión negocia capability y permanecen no públicos.

## Decisions

### 1. Contrato común orientado a observación

`RuntimeAdapter` expone metadata estática, `discover`, `health`, `start`/`attach`/`resume` opcionales, un stream asíncrono de envelopes y `shutdown`. Cada método opcional debe corresponder a una capability negociada; la ausencia del método obliga a `unavailable` o `unknown`.

Alternativa descartada: una clase base con stubs exitosos. Ocultaría diferencias y permitiría anunciar paridad falsa.

### 2. Identidad suministrada por el coordinador

La creación de sesión recibe `repoId`, path canónico ya validado, change/task/run/attempt y modo de orquestación. El adapter nunca infiere identidad desde cwd, texto del prompt o nombre de proceso. Provider y modelo se normalizan separados del runtime.

Alternativa descartada: correlación posterior por paths o mensajes, porque permite mezcla cross-repo.

### 3. Runner de procesos inyectable y main-only

Un runner compartido recibe un descriptor allowlisted (`executable`, `args`, cwd canónico, env mínimo, límites, timeout) y produce chunks/lifecycle. La implementación usa `spawn` con `shell: false`; tests usan runner falso. El runner registra sólo procesos creados por GitCron y siempre espera cleanup.

Alternativa descartada: llamar cada CLI con strings de shell o parsear una terminal existente.

### 4. Normalizadores puros por versión/transport

Claude, Codex y OpenCode procesan JSON/JSONL verificado o pendiente de fixture mediante parsers puros con límites de línea/stream y UTF-8 incremental. Un schema desconocido emite diagnóstico degradado y conserva únicamente raw sanitizado/acotado. `agy` sólo produce lifecycle y final opaco hasta hallar un hook estructurado. LM Studio se modela como provider `local_unpriced` detrás del cliente y no como agente autónomo.

Alternativa descartada: regex sobre prosa coloreada, porque no ofrece contrato estable ni procedencia.

### 5. Métricas como muestras, no acumuladores implícitos

Cada valor lleva classification, evidence status, refs y dedupe scope. Costo `0` reportado por runtime se conserva como dato reportado, no como facturación real. Ausencia genera muestra nullable `unknown`; agregación y pricing quedan para F06/F07.

### 6. Persistencia aditiva a través del envelope

F03 usa el almacenamiento por repo de F01 y no crea archivos en el repositorio observado. La persistencia durable del envelope normalizado se agrega sólo después de cerrar TANDA 0; no se cambia el schema en la primera tanda.

### 7. OpenCode queda observacional hasta congelar un transporte seguro

La versión instalada `1.18.3` ofrece tres superficies distintas: `run --format json`, ACP por
stdin/stdout NDJSON y servidor HTTP. El fixture real de F00 confirma una ejecución directa con Z.ai,
usage y costo runtime-reportado, pero conserva sólo un resumen sanitizado y no los eventos JSON
crudos. Además, `opencode run` recibe el mensaje como argumento posicional, por lo que F03 no lo
usa para lanzar instrucciones arbitrarias desde GitCron.

ACP es el transporte elegido porque evita exponer el prompt en argv. Su handshake v1 está
verificado para la versión instalada sin crear sesión ni pedir inferencia; `session/new`,
`session/prompt` y `session/update` permanecen `pending_fixture`. El servidor HTTP no se auto-inicia:
exigiría acordar autenticación, ownership y lifecycle. Hasta capturar uno de esos contratos con
autorización, OpenCode/Z.ai conserva discovery y telemetría confirmada desde el fixture resumido,
pero no anuncia parser de stream ni `start` implementado.

Alternativa descartada: deducir el schema desde documentación genérica o ejecutar `run` con el
prompt en argv. Ambas opciones romperían la regla de fixture por versión o la frontera de secretos.

## Risks / Trade-offs

- [Schemas CLI cambian por versión] → fixtures identifican runtime/version/transport y el adapter degrada ante campos desconocidos.
- [Proceso bloqueado o huérfano] → timeout, señal abort, límites y cleanup esperado; ownership sólo para procesos creados por el runner.
- [Backpressure o memoria] → límites por línea, bytes totales y eventos; terminales/errores no se descartan silenciosamente.
- [Secretos o reasoning sensible] → redacción antes de fixture, logs, SQLite o retorno; reasoning sólo cuando el evento lo etiqueta explícitamente.
- [Fixtures incompletos] → capability `pending_fixture`; no se implementa un parser supuesto.
- [Codex construye su propio adapter] → auditoría final de otra familia antes de aceptar F03.

## Migration Plan

1. TANDA 0 agrega tipos, interface, fixtures/table y conformance sin conectar procesos.
2. TANDAS 1-4 agregan runners/normalizadores por runtime detrás de la interfaz, una familia por vez.
3. TANDA 5 ejecuta conformance completa, integra persistencia main-only y documenta degradaciones.
4. Si una tanda falla, se retira sólo el adapter/registro nuevo; F01 y evidencia local continúan operativas.

## Open Questions

- OpenCode necesita fixtures ACP de `session/new`, `session/prompt` y `session/update` de `1.18.3`
  antes de congelar su parser de eventos y habilitar sesiones desde GitCron.
- `agy` permanece wrapper lifecycle-only salvo evidencia estructurada oficial.
- LM Studio requiere decidir en su tanda si la llamada queda sólo mediante cliente interno o detrás de un proxy main-owned autenticado; no se expone su socket.
