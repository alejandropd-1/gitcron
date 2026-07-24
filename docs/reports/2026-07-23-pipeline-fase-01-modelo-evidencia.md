# Pipeline Fase 01 — Reporte de modelo y evidencia per-repo

Fecha: `2026-07-23`
Agente: `Codex Desktop / Codex / orchestrator-builder`; auditor independiente: `OpenCode 1.18.3 / zai-coding-plan/glm-5.2`
Rama: `pipeline/fase-01-modelo-evidencia`
Estado: `Lista para QA`
Brief: `docs/pipeline/briefs/fase-01-modelo-y-evidencia-repo.md`

## Objetivo

Construir el núcleo determinístico y read-only que convierte evidencia Git, OpenSpec, Markdown y JSONL en snapshots/eventos per-repo persistibles, antes de conectar runtimes o crear UI.

## Alcance implementado

- Tipos compartidos para evidencia, decisiones, diagnósticos, estado y eventos semánticos.
- Parsers de tasks/auditorías y de gates, delegaciones y visual-diff JSONL.
- Cursor incremental persistido fuera del repo, tolerante a línea parcial, corrupción y truncado.
- Selección no ambigua de change, detección de archive y evidencia de merge.
- `RepoEvidenceReader` main-only con realpath, contención y tolerancia a fuentes ausentes.
- Reducer determinístico e idempotente.
- SQLite v4 con bindings, snapshots, eventos y cursores particionados por `repo_id`.
- IPC/preload read-only y refresh por el watcher existente, sin segundo watcher.

## Decisiones aplicadas

- Hermes y runtimes permanecen fuera de F01; Git/OpenSpec/filesystem son evidencia local.
- Ausencia significa `unknown`/`null`, nunca cero o verde inventado.
- No se agregó ninguna dependencia ni se escribió dentro de repos observados.
- La primera auditoría Z.ai rechazó cinco huecos P1; se integraron los tres JSONL, cursores SQLite, `DecisionRequest`, merge y este cierre. La segunda auditoría aprobó sin P0/P1; sus dos P2 (generation JSONL y multi-renderer) también se corrigieron antes del cierre.

## Cambios técnicos

### Archivos creados

- `types/pipeline/index.ts`: DTOs serializables.
- `electron/pipeline/`: parsers, reducer, reader, seguridad de paths, servicio, persistencia y sanitización.
- `electron/ipc/pipeline.ts`: allowlist IPC read-only.
- `electron/**/__tests__/pipeline-*.test.ts`: cobertura focalizada y fixtures sanitizados.
- `openspec/changes/pipeline-fase-01-modelo-evidencia/`: proposal, design, specs y tasks.

### Archivos modificados

- `electron/db/schema.ts`: migración v4 aditiva.
- `electron/main.ts`, `electron/preload.ts`, `types/electron.d.ts`: registro y contrato read-only.
- `electron/ipc/watchers.ts`: callback reutilizado tras el debounce existente.
- `electron/db/__tests__/schema.test.ts`: verificación de tablas Pipeline.
- `docs/pipeline/00-estado-track.md`: F01 lista para QA.

### Archivos eliminados

Ninguno.

## Contratos, datos y seguridad

- Los secrets, prompts y reasoning se redactan antes de SQLite/IPC; payloads se acotan.
- `repo_id` particiona snapshots, eventos y cursores; `(repo_id,event_id)` evita colisiones cross-repo.
- Paths se verifican lexicalmente y por `realpath`; symlinks externos y traversal se rechazan.
- OpenSpec usa `execFile` con argumentos fijos y telemetría deshabilitada; Git usa `simple-git` read-only.
- Renderer no recibe SQL, shell, argv, PID ni métodos mutantes de Pipeline.

## Validaciones ejecutadas

| Comando o prueba | Exit code | Resultado | Observaciones |
|---|---:|---|---|
| `pnpm exec tsc --noEmit` | 0 | Verde | Sin errores TypeScript. |
| tests focalizados Pipeline | 0 | Verde | 39 tests de paths, parsers, reducer, reader, SQLite e IPC. |
| `pnpm test` | 0 | Verde | 51 archivos, 318 tests. |
| `pwsh -NoProfile -File scripts/gates.ps1 full` | 0 | PENDIENTE | C1/C2/C3/C4/C6/C7 OK; C5/C8 conservan baseline heredado. |
| `pnpm exec fallow` | 1 | PENDIENTE | 48.337 LOC, MI 90.3 good; deuda heredada y falsos positivos de entradas IPC. |

## Evidencia visual

No aplica: F01 no agrega UI ni CSS.

## Checklist manual para Ale

- [ ] Confirmar que F01 permanece sin UI, runtimes ni acciones Git/OpenSpec.
- [ ] Revisar que el dashboard futuro muestre `unknown` para métricas ausentes.
- [ ] El smoke empaquetado del IPC queda para la fase con UI; el build Electron ya pasó.

## Desvíos respecto del brief

Ninguno funcional. La implementación fue construida por Codex directo, no Claude/OpenCode; la auditoría independiente se ejecutó mediante OpenCode/Z.ai para evitar autoauditoría.

## Economía de controles y ceremonia

Nivel aplicado: `crítica`, por tocar Electron main, paths y SQLite.

| Control/checkpoint | Disparó | Encontró problema | Hallazgo aceptado | Falso positivo | Espera humana | Toques humanos | Reintentos | Tiempo de ciclo | Política sugerida |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Gate fast/full | Sí | No nuevo | No | C5/C8 heredados | 0 | 0 | 0 | unknown | `mandatory` |
| Auditoría Z.ai ciclo 1 | Sí | Sí, 5 P1 | Sí | 0 | 0 | 0 | 1 | unknown | `mandatory` |
| Auditoría Z.ai ciclo 2 | Sí | No P0/P1; 2 P2 aceptados y corregidos | Sí | 0 | 0 | 0 | 0 | unknown | `mandatory` |
| Tests focalizados | Sí | Sí, wildcard PowerShell no expandido | Sí | 0 | 0 | 0 | 1 | unknown | `mandatory` |

## Riesgos, limitaciones y pendientes

- La detección de merge se basa en mensajes de merge estructurados disponibles en Git; ausencia queda sin afirmar.
- Retención/poda histórica se difiere a F07.
- C5 ESLint y C8 Fallow continúan como deuda heredada nominada, nunca verde.
- No hubo QA visual porque no existe superficie F01 en renderer.

## Estado Git de entrega

```text
Rama pipeline/fase-01-modelo-evidencia con cambios F01 sin stage ni commit.
```

## Mensaje y comandos sugeridos para Ale

Commit sugerido:

```text
feat(pipeline): implementar modelo y evidencia per-repo F01
```

El staging, commit y push se entregan después de la QA humana, con paths explícitos.

## Cierre

`FASE 01 LISTA PARA TU QA`.
