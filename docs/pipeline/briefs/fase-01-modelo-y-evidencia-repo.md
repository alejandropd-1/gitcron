# Pipeline Fase 01 — Modelo de dominio y evidencia del repo

> Construye el núcleo determinístico per-repo: contratos, parsers, state reducer y persistencia
> local. No conecta todavía con Hermes ni otros runtimes. Requiere F00 aprobada y mergeada.
> Branch `pipeline/fase-01-modelo-evidencia`.

## Agentes recomendados

- **Builder:** Claude Code u OpenCode.
- **Fixtures mecánicos:** LM Studio opcional, solo sobre muestras sanitizadas.
- **Auditor:** Codex read-only.

## Objetivo

Representar sin UI y sin red:

- repos con y sin scaffold/OpenSpec;
- changes activos/archivados;
- tasks y progreso;
- proposal/design/specs/decisiones;
- gates JSONL;
- reportes de auditor;
- branches, commits y merge;
- archivos y diffs observables;
- estados confirmados vs inferidos;
- timeline y diagnósticos tolerantes a archivos ausentes/malformados.

## Arquitectura esperada

- Tipos compartidos del dominio Pipeline.
- Parsers puros y testeables; I/O separado.
- `RepoEvidenceReader` solo lectura en Electron main.
- Reducer determinístico `evidence + previousState → PipelineState + semanticEvents`.
- Modelo normalizado `DecisionRequest` independiente de la UI y del command bus.
- Persistencia SQLite global particionada por `repo_id`, sin datos secretos ni reasoning crudo
  indiscriminado.
- IPC de snapshot read-only únicamente después de aprobar tipos y tests.

## Tandas

### TANDA 0 — Reconocimiento

- Verificar contratos actuales de `types/electron.d.ts`, preload, SQLite y watcher.
- Verificar OpenSpec CLI instalada: `list --json` y `status --change <id> --json`.
- Leer formatos reales del scaffold actual: `tasks.md`, reports, decisions y gates JSONL.
- Proponer archivos exactos y schema SQLite mínimo.
- **CHECKPOINT 0:** firmas y fixtures; no código todavía.

### TANDA 1 — Tipos, parsers y reducer

Implementar y testear:

- parsing de `[x]`/`[ ]` sin romper texto Markdown;
- auditoría `APROBADO/RECHAZADO` con hallazgos y diagnósticos;
- parsing de `gates.jsonl`, `delegations.jsonl` y `visual-diff-heights.jsonl` según el contrato
  cerrado en F00: tail incremental, última línea parcial, línea inválida aislada,
  truncado/reemplazo y campos opcionales; preservar rol/modelo/tarea en delegaciones;
- OpenSpec JSON por change;
- selección de change: branch `feature/<change>` → único abierto → requiere selección;
- estado `confirmado | inferido | desconocido`;
- transición semántica: task completada, reporte nuevo, gates cambió, merge/archive.

Normalizar decisiones pendientes desde fuentes verificables (OpenSpec, requests de Hermes,
auditorías, escaladas y evidencia repo). Un `gates.completed` global no identifica qué cláusula
falló: una decisión de dependencia requiere constitución + diff de `package.json` o una señal
estructurada equivalente. Riesgo y consecuencias conservan procedencia y pueden ser `unknown`.

No parsear Markdown con regex para render HTML; esta tanda extrae metadata, no renderiza.

### TANDA 2 — Lectura y seguridad de paths

- Lecturas dentro del repo validado con `path.relative`/realpath y rechazo de escapes/symlinks.
- OpenSpec mediante argumentos fijos y telemetría deshabilitada.
- Git mediante `simple-git`/wrappers existentes; no usar el handler genérico desde renderer.
- Tolerancia a CLI ausente, repo sin kit y archivo que desaparece entre stat/read.
- Snapshot consistente frente a escrituras atómicas.

### TANDA 3 — Persistencia e IPC read-only

- Guardar eventos/snapshots normalizados necesarios para replay futuro.
- Idempotencia por `eventId`; sequence per repo; migración versionada.
- Exponer snapshot y suscripción tipada de solo lectura.
- No duplicar el watcher: reutilizarlo como trigger y refrescar también al focus/entrada.

## Prompt copiable — builder Claude/OpenCode

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol; anunciá
fase, rama, tandas y checkpoints. No escribas ni crees la rama hasta recibir autorización.
Implementá SOLO Pipeline Fase 01 en C:\www\gitCronos. Leé primero
docs/00_FUENTE_DE_VERDAD.md, docs/01_INVARIANTES.md, docs/pipeline/00-indice.md y
docs/pipeline/briefs/fase-01-modelo-y-evidencia-repo.md. Confirmá que F00 está mergeada.

Branch pipeline/fase-01-modelo-evidencia desde main. TANDA 0 es reconocimiento sin editar:
trazá tipos, preload, SQLite, watcher, OpenSpec y formatos del scaffold. Presentá firmas,
fixtures y schema mínimo. Esperá OK.

Después trabajá una tanda por vez. Parsers/reducer puros primero; I/O seguro después;
persistencia e IPC read-only al final. No conectes Hermes, no hagas UI, no agregues controles,
no agregues dependencias, no modifiques CSS/README/CHANGELOG. Todo estado debe conservar
provenance confirmado/inferido/desconocido.

Cada tanda: tsc + tests focalizados + resumen + checkpoint. Cierre: tsc, pnpm test, fallow con
delta, reporte docs/reports/pipeline-fase-01-modelo-evidencia.md, mensaje y comandos sugeridos de
commit/push sin ejecutarlos, y STOP.
```

## Prompt copiable — auditor Codex

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol y anunciá
el alcance. Esta auditoría es read-only: no crees rama ni edites.
Auditá read-only Pipeline Fase 01 contra su brief y docs/01_INVARIANTES.md.
Verificá parsers con archivos ausentes/malformados, path traversal/symlinks, OpenSpec ausente,
varios changes, idempotencia, scoping por repo, migraciones SQLite, cleanup de listeners y que
no exista ninguna escritura al repo observado. Confirmá que no se duplicó el watcher y que
confirmado/inferido/desconocido no se mezclan. Veredicto explícito + hallazgos accionables.
```

## Qué NO hacer

- No conectar Hermes/Claude/Codex/agy/OpenCode/LM Studio.
- No UI ni CSS.
- No acciones sobre Git/OpenSpec.
- No costo, contexto o reasoning inventados.
- No persistir secretos, prompts completos ni diffs enormes.
- No expandir scope para refactorizar SQLite/watcher existentes.

## Criterios de aceptación

- [ ] Repo sin kit produce un set degradado de fuentes, no error: Git/Hermes/runtime siguen
      disponibles aunque falten gates y logs del método.
- [ ] Tasks/reportes/gates/merge/archive se derivan con fixtures.
- [ ] Los tres JSONL locales degradan honestamente cuando faltan, se truncan o cambian de schema.
- [ ] `DecisionRequest` preserva fuente, evidencia, opciones, consecuencias y riesgo sin inventar.
- [ ] Múltiples changes no eligen uno arbitrariamente.
- [ ] Eventos idempotentes y particionados por repo.
- [ ] Cero escrituras al repo observado.
- [ ] tsc/test verdes y reporte escrito.
