## Context

F00 cerró contratos agnósticos para identidad, eventos, decisiones y evidencia. GitCron ya posee una base global `node:sqlite`, migraciones transaccionales, handlers IPC por dominio y un watcher per-repo; F01 debe extender esas piezas sin tocar Temporal Agent, Cartografía ni crear un segundo sistema de observación.

El repositorio observado puede no tener OpenSpec ni el kit de gobernanza, puede contener archivos JSONL parciales y puede cambiar durante una lectura. La salida debe ser útil pero honesta: ausencia o parseo incompleto produce diagnósticos y estados `unknown`, nunca valores exitosos inventados.

## Goals / Non-Goals

**Goals:**

- Construir un modelo per-repo determinístico, serializable y compartido entre main/preload/renderer.
- Separar parsers puros, I/O seguro, reducción de estado y persistencia.
- Derivar progreso, cambios semánticos y decisiones con evidencia verificable.
- Persistir snapshots y eventos idempotentes para replay futuro.
- Exponer snapshot y suscripción tipados de solo lectura reutilizando el watcher actual.

**Non-Goals:**

- UI, CSS, i18n o navegación de Pipeline.
- Conexiones con Hermes, Claude, Codex, OpenCode u otros runtimes.
- Comandos, aprobaciones ejecutables o escrituras en el repositorio observado.
- Pricing, reasoning crudo, prompts completos o diffs sin límite.
- Refactors generales de SQLite, watchers, Electron security o features existentes.

## Decisions

### 1. Dominio compartido sin APIs ejecutables

Los DTOs viven bajo `types/pipeline/` y sólo contienen datos serializables. `EvidenceState` usa `confirmed | inferred | unknown`; los campos opcionales permanecen `null`, no reciben defaults numéricos. `DecisionRequest` se alinea con F00 pero no incluye un command bus.

Alternativa descartada: reutilizar tipos de UI o del Temporal Agent. Mezclaría semántica especulativa con evidencia observada y haría que F01 dependiera de una vista inexistente.

### 2. Parsers puros y lector main-only

Los parsers reciben strings/objetos y devuelven registros más diagnósticos. Un lector separado resuelve `realpath`, valida contención con `path.relative`, rechaza symlinks que escapen, usa lecturas acotadas y tolera `ENOENT` entre `stat` y `readFile`.

JSONL se procesa incrementalmente por offset e identidad de archivo. La última línea sin newline queda pendiente; una línea intermedia inválida genera diagnóstico y no descarta las posteriores. Truncado o reemplazo reinicia el cursor y produce un evento degradado.

OpenSpec se invoca con `execFile`, argumentos fijos y telemetría deshabilitada. Git se consulta mediante `simple-git`; nunca mediante el IPC genérico del renderer.

### 3. Selección de change explícita

La rama `feature/<change>` o `pipeline/<fase-slug>` puede sugerir un change sólo si el identificador coincide de forma inequívoca. Si existe exactamente un change activo, se selecciona como inferido. Con varios changes sin match, el snapshot declara `selectionRequired`; no elige arbitrariamente.

### 4. Reducer determinístico y eventos semánticos

`reducePipelineEvidence(evidence, previousState)` no realiza I/O ni usa el reloj global: recibe `observedAt`. Ordena entradas con claves estables y deriva eventos sólo para transiciones como task completada, reporte agregado, gate cambiado, merge detectado o archive. IDs se calculan desde repo, kind y evidencia estable para que repetir la misma entrada no duplique eventos.

### 5. Extensión mínima de la base existente

La migración siguiente agrega tablas STRICT:

- `pipeline_repo`: binding estable entre `repo_id`, path canónico main-only y digest del Git common-dir.
- `pipeline_snapshot`: último snapshot por repo, sequence y JSON sanitizado.
- `pipeline_event`: eventos normalizados con clave `(repo_id, event_id)` y sequence per-repo.

Se usa la conexión global actual y transacciones. No se guardan secretos, prompts completos, reasoning crudo ni diffs enormes. La migración es aditiva; rollback de código conserva tablas desconocidas sin dañar datos previos.

### 6. IPC read-only y watcher reutilizado

`pipeline:get-snapshot(repoPath)` valida/bindea el repo y devuelve un snapshot. `pipeline:subscribe(repoPath)` sólo registra interés; los cambios del watcher existente disparan refresh en main y `pipeline:snapshot-updated`. `pipeline:unsubscribe` limpia la suscripción. El preload no expone shell, SQL, paths relativos ni mutaciones.

El focus/entrada solicita un refresh mediante el mismo servicio; no crea otro watcher. Todos los listeners se limpian al cerrar ventana o dejar de observar el repo.

## Risks / Trade-offs

- **Lecturas concurrentes producen combinaciones no atómicas** → capturar metadatos antes/después, reintentar una vez y marcar snapshot degradado si sigue cambiando.
- **JSONL muy grande bloquea main** → lectura incremental acotada por bytes/registros y persistencia de cursor fuera del repositorio.
- **Path equivalence en Windows es compleja** → `realpath`, normalización de casing disponible y digest del Git common-dir; casos ambiguos quedan `unknown`.
- **Cambios en formatos OpenSpec** → preferir JSON del CLI y conservar diagnostics/campos desconocidos; Markdown sólo aporta metadata definida por fixtures.
- **Migración compartida amplía blast radius** → migración aditiva, tests de schema existentes y nuevos, sin cambiar tablas actuales.
- **El watcher puede emitir ráfagas** → conservar debounce existente y serializar refresh por repo.

## Migration Plan

1. Agregar tipos, fixtures, parsers y reducer con tests puros.
2. Agregar lectura segura y snapshot del repo con tests en directorios temporales.
3. Agregar migración/tablas y repositorio Pipeline con pruebas en `:memory:`.
4. Registrar IPC/preload y conectar el callback del watcher existente.
5. Ejecutar gate fast por tanda y suite/typecheck/fallow/full al cierre.

## Open Questions

- El tamaño máximo definitivo de payload/diff se calibra con fixtures reales; F01 usa límites conservadores y los expone como diagnóstico.
- La retención histórica más allá del último snapshot y eventos idempotentes se define en F07; F01 no implementa poda automática.
