# Pipeline Fase 00 — Reporte de contrato, seguridad y runtimes

Fecha: `2026-07-23`
Agente: `Codex Desktop / GPT-5 family, id exacto no expuesto / MASTER-orchestrator`
Rama: `pipeline/fase-00-contrato`
Estado: `Lista para QA`
Brief: `docs/pipeline/briefs/fase-00-contrato-y-spikes.md`

## Objetivo

Iniciar formalmente Pipeline con un contrato verificable y agnóstico del modelo/runtime, relevar las
interfaces instaladas y fijar límites de seguridad antes de implementar F01. Una sesión directa —como
esta corrida Codex— es first-class; Hermes es un orquestador opcional, no un gateway obligatorio.

## Alcance implementado

- Change OpenSpec completo con proposal, design, seis specs y tasks.
- Pipeline Contract v1 para repositorio, change/task/run/attempt/session/agente, eventos, decisiones,
  métricas, capabilities, comandos, procedencia y estados de evidencia.
- Matriz de Hermes, Claude, Codex, `agy`, OpenCode, Z.ai vía OpenCode y LM Studio, diferenciando
  interfaz, efecto y fixture.
- Fixtures sanitizados reales o procedimiento exacto cuando la captura quedó pendiente.
- ADR híbrido: adaptadores directos por runtime y Hermes companion sólo para corridas Hermes.
- Seguridad main-only, scoping repo/session, version negotiation, reconnect/dedupe, backpressure,
  ownership de procesos, allowlist de comandos y redacción.
- Cero código de producto, cero manifests/versioned dependencies y ningún avance de F01.

## Decisiones aplicadas

- Ale confirmó que Z.ai se usa mediante OpenCode: se modela `runtime=opencode`, provider Z.AI.
- Ale confirmó que Pipeline debe mostrar sesiones directas y no hacer pasar todo por Hermes.
- LM Studio se modela como provider local detrás de un cliente agente, no como runtime agente.
- `unknown` no se convierte en cero/false; requested, effective y reported model se conservan por
  separado.
- Acknowledge de un comando no equivale a efecto; controles futuros exigen capability, repo/session,
  precondición, idempotency y proceso main-owned.

## Cambios técnicos

### Archivos creados

- `openspec/config.yaml`.
- `openspec/changes/pipeline-fase-00-contrato/{.openspec.yaml,README.md,proposal.md,design.md,tasks.md}`.
- `openspec/changes/pipeline-fase-00-contrato/specs/{pipeline-identity-contract,pipeline-event-contract,pipeline-decision-contract,pipeline-runtime-capabilities,pipeline-telemetry-fixtures,pipeline-connection-security}/spec.md`.
- `.agent/skills/openspec-{apply-change,archive-change,explore,propose,sync-specs}/SKILL.md`.
- `.agent/workflows/opsx-{apply,archive,explore,propose,sync}.md`.
- `.codex/skills/openspec-{apply-change,archive-change,explore,propose,sync-specs}/SKILL.md`.
- `.opencode/skills/openspec-{apply-change,archive-change,explore,propose,sync-specs}/SKILL.md`.
- `.opencode/commands/opsx-{apply,archive,explore,propose,sync}.md`.
- `.claude/skills/openspec-{apply-change,archive-change,explore,propose,sync-specs}/SKILL.md`.
- `.claude/commands/opsx/{apply,archive,explore,propose,sync}.md`.
- `docs/pipeline/f00/{PIPELINE-CONTRACT-V1.md,RUNTIME-CAPABILITY-MATRIX.md,ADR-001-CONEXION-PIPELINE.md,FIXTURES.md,EXECUTION-TRACE.md}`.
- `docs/pipeline/f00/fixtures/{runtime-versions.json,claude-planner-result.sanitized.json,lmstudio-classification.sanitized.json,opencode-zai-review.sanitized.json,delegation-template-output.jsonl}`.
- `docs/reports/2026-07-23-pipeline-fase-00-contrato.md`.

### Archivos modificados

- `docs/00_FUENTE_DE_VERDAD.md`: snapshot actual y deuda de seguridad existente.
- `docs/pipeline/00-indice.md`: direct mode, identidad F00 y matriz actual enlazada.
- `docs/pipeline/CONTEXTO-INTEGRAL.md`: contrato propuesto y providers separados de runtimes.
- `docs/pipeline/EMPEZAR-AQUI.md`: path real.
- `docs/pipeline/00-estado-track.md`: F00 a Lista para QA y enlace a este reporte.
- `docs/pipeline/briefs/fase-00-contrato-y-spikes.md`: path, direct mode y Z.ai/OpenCode.
- `docs/pipeline/briefs/fase-01-modelo-y-evidencia-repo.md`: path real.
- `docs/pipeline/briefs/fase-03-adaptadores-y-telemetria.md`: path real y versión de `agy` no hardcodeada.
- `docs/pipeline/prompt-maestro-hermes.md`: Hermes opcional y path real.
- `docs/pipeline/prompts/fase-00-contrato.md`: decisiones confirmadas, path y Z.ai/OpenCode.

### Archivos eliminados

- Ningún archivo de usuario. Una línea sintética creada por un probe con cwd incorrecto fue retirada
  exactamente; el archivo nuevo y vacío quedó eliminado. No se leyeron logs históricos.

### Artefactos locales excluidos

- `.codex/config.toml`: preservado sin leer/modificar y excluido sólo en `.git/info/exclude`.
- `.claude/settings.local.json`: local/ignorado, no se incluye.
- `.opencode/{package.json,package-lock.json,node_modules,.gitignore}`: runtime local ignorado; no es
  dependencia versionada ni forma parte del staging.

## Contratos, datos y seguridad

- `repoId` opaco y resolución main-only de realpath/Git common-dir; el path crudo no es identidad.
- `attemptId` distingue retry; resume/fork y parentage tienen semántica explícita.
- Eventos llevan version, orden, timestamps emitido/observado, procedencia, estado y referencias de
  evidencia; los kinds de repo verificados se separan de target shapes pendientes de fixture.
- Renderer nunca recibe credenciales ni conecta runtimes. Binds públicos requieren auth; backends
  loopback sin auth nativa comprobada requieren wrapper/proxy main-owned o degradación.
- Se documentó deuda existente sin tocar producto: sandbox Electron deshabilitado, storage que puede
  devolver valores al renderer, token GitHub en estado renderer, sanitización parcial, `git:command`
  genérico, abort global y procesos terminales sin ownership per-repo.

## Validaciones ejecutadas

| Comando o prueba | Exit code | Resultado | Observaciones |
|---|---:|---|---|
| `openspec status --change pipeline-fase-00-contrato --json` | 0 | 4/4 artifacts done | change completo. |
| `openspec validate pipeline-fase-00-contrato --strict --no-interactive` | 0 | válido | ejecutado nuevamente tras fixes. |
| `npx.cmd tsc --noEmit` | 0 | pasa | sin cambios de producto. |
| `pnpm test` | 0 | 44 archivos / 289 tests | suite completa. |
| `pnpm exec fallow` | 1 | deuda heredada | 17 issues dead-code reportados; 11 clone groups / 5,6%; cero código o manifests F00. |
| `git diff --check` | 0 | pasa | sólo warnings informativos LF→CRLF. |
| `git diff --exit-code -- package.json pnpm-lock.yaml` | 0 | sin cambios | cero dependencias versionadas. |
| scan de secretos sobre F00/OpenSpec | 1 | sin coincidencias | exit 1 de `rg` = ningún match. |

## Evidencia visual

No aplica: F00 no modifica UI, CSS, IPC ni código de producto.

## Checklist manual para Ale

- [ ] Leer Contract v1, en especial identidad, `DecisionRequest`, métricas y command allowlist.
- [ ] Confirmar el ADR híbrido: direct adapters first-class; Hermes connector para corridas Hermes.
- [ ] Revisar la deuda de seguridad existente y aceptar que su corrección queda fuera de F00.
- [ ] Verificar el staging exacto y que no incluya `.codex/config.toml`, `.claude/settings.local.json`
  ni los archivos runtime ignorados de `.opencode`.
- [ ] Si el QA documental conforma, ejecutar los comandos de commit/push del final; no iniciar F01
  hasta marcar F00 Completada.

## Desvíos respecto del brief

- Hermes no coordinó: la ejecución fue Codex directa, según decisión posterior de Ale; se relevaron
  sus interfaces sin convertirlo en gateway.
- Z.ai no es CLI standalone: se verificó como provider `zai-coding-plan` de OpenCode.
- OpenCode local no tuvo contexto suficiente; el segundo y último intento usó Z.ai con éxito.
- LM Studio entregó usage real pero contenido útil vacío; se conservó como degraded y no tomó
  decisiones.
- Un probe de fixture apuntó inicialmente al cwd del repo; se retiró sólo la línea sintética exacta
  y se documentó el incidente.

## Economía de controles y ceremonia

Nivel aplicado: `crítica` — contrato de seguridad/control previo a implementación.

| Control/checkpoint | Disparó | Encontró problema | Hallazgo aceptado | Falso positivo | Espera humana | Toques humanos | Reintentos | Tiempo de ciclo | Política sugerida |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Git preflight | 1 | 0 | 0 | 0 | 0 ms | 0 | 0 | corto | mandatory |
| OpenCode/Z.ai adversarial | 1 | 4 | 4 | 0 | 0 ms | 0 | 1 | 190.610 ms útil | mandatory en contratos críticos |
| Codex documental independiente | 2 ciclos máx. | 7 | 7 | 0 | 0 ms | 0 | 1 recheck | runtime no expuesto | sampled |
| LM Studio mecánico | 1 | 1 degradación | 0 | 0 | 0 ms | 0 | 1 | 11.756 ms | retire-candidate para F00 similar |
| Checkpoints inter-tanda autorizados | 0 bloqueantes | 0 | 0 | 0 | 0 ms | 2 decisiones útiles | 0 | 0 ms | conditional |

La traza completa está en `docs/pipeline/f00/EXECUTION-TRACE.md`. Claude reportó USD 2,4472913,
clasificado como runtime-reported con semántica de billing desconocida; OpenCode/Z.ai reportó 0 bajo
el plan configurado; LM Studio es `local_unpriced`.

## Riesgos, limitaciones y pendientes

- Hermes companion real, eventos Codex/`agy`, controles de proceso y schemas estables siguen
  `pending_fixture`; no se ejecutaron controles destructivos.
- Modelo exacto de Codex Desktop no expuesto; el de Z.ai fue solicitado y efectivo inferido, pero el
  stream no lo reportó explícitamente.
- Auth detallada no se inspeccionó para evitar secretos. Loopback no se considera autenticado por
  existir solamente en localhost.
- Fallow permanece rojo por deuda anterior; debe tratarse separadamente de F00.
- F01 queda expresamente diferida.

## Estado Git de entrega

```text
 M docs/00_FUENTE_DE_VERDAD.md
 M docs/pipeline/00-estado-track.md
 M docs/pipeline/00-indice.md
 M docs/pipeline/CONTEXTO-INTEGRAL.md
 M docs/pipeline/EMPEZAR-AQUI.md
 M docs/pipeline/briefs/fase-00-contrato-y-spikes.md
 M docs/pipeline/briefs/fase-01-modelo-y-evidencia-repo.md
 M docs/pipeline/briefs/fase-03-adaptadores-y-telemetria.md
 M docs/pipeline/prompt-maestro-hermes.md
 M docs/pipeline/prompts/fase-00-contrato.md
?? .agent/
?? .codex/
?? .opencode/
?? docs/pipeline/f00/
?? docs/reports/2026-07-23-pipeline-fase-00-contrato.md
?? openspec/
```

El agente no ejecutó stage, commit, push, merge, tag ni release.

## Mensaje y comandos sugeridos para Ale

Commit sugerido:

```text
docs(pipeline): definir contrato y evidencia de Fase 00
```

Descripción:

```text
Propone Pipeline Contract v1 agnóstico de Hermes, releva runtimes y providers instalados,
versiona fixtures sanitizados y formaliza seguridad, conexión, decisiones, métricas y controles.
Inicializa OpenSpec para Antigravity, Claude, Codex y OpenCode sin tocar código de producto ni
agregar dependencias.
```

Trabajo realizado por Codex Desktop como MASTER, con planificación Claude, scouts Codex,
clasificación local LM Studio y revisión adversarial OpenCode/Z.ai.

Trailers sugeridos:

```text
Co-Authored-By: Codex <codex@openai.com>
Co-Authored-By: Claude <noreply@anthropic.com>
```

El staging explícito y los comandos exactos se entregan en el cierre de la tarea. No fueron
ejecutados por el agente.

## Cierre

`FASE 00 LISTA PARA TU QA`.
