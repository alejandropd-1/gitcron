# Pipeline Fase 03 — Adaptadores de runtimes y telemetría normalizada

> Integra Claude Code, Codex, Antigravity (`agy`), OpenCode y LM Studio bajo el contrato F00.
> Cada adaptador demuestra sus capacidades con fixtures antes de anunciarse. Requiere F01
> mergeada y es independiente de F02/Hermes. Branch `pipeline/fase-03-runtime-adapters`.

## Agentes recomendados

- **MASTER/orquestador:** Codex, Hermes u otro runtime capaz de aplicar el protocolo; declarar
  `orchestrationMode` y no enrutar adaptadores directos por Hermes obligatoriamente.
- **Claude adapter:** builder OpenCode o Claude; auditor Codex.
- **Codex adapter:** builder Claude/OpenCode; auditor Antigravity read-only + auditoría final
  Claude de otra familia. Codex no audita su propio adaptador si lo construyó.
- **agy adapter:** spike con `agy`; implementación Claude/OpenCode; auditor Codex.
- **OpenCode adapter:** builder OpenCode; auditor Codex.
- **LM Studio adapter:** builder Claude/OpenCode; fixtures/clasificación con modelo local;
  auditor Codex.

## Objetivo

Crear una interfaz `RuntimeAdapter` que traduzca capacidades heterogéneas sin mentir:

- discover/health;
- start/attach/resume cuando esté soportado;
- event stream;
- usage/cost/context;
- model/provider;
- reasoning visible;
- tools/processes/subagents;
- control capability flags;
- shutdown/cleanup.

F03 **no habilita controles al usuario**. Puede implementar internamente métodos que el runtime
ofrece, pero no exponerlos por IPC/UI hasta F05.

## Reglas de normalización

- Conservar payload crudo sanitizado solo para diagnóstico acotado; UI consume forma normalizada.
- `capabilities` se negocia por sesión/runtime, no por nombre hardcodeado.
- Campo ausente → `unknown`; nunca cero falso.
- Costo con `basis`: provider-reported, price-table-estimate, subscription, local o unknown.
- Contexto con `basis`: runtime-reported, tokenizer-estimate o unknown.
- Reasoning con `visibility`: emitted, summary, unavailable. No fabricar reasoning desde tool calls.
- Toda corrida externa debe recibir `repoId/changeId/taskId/runId` o registrar por qué no pudo.
- No parsear prosa coloreada/ANSI como contrato estable.

## Tandas

### TANDA 0 — Interface y fixtures

- Revalidar versiones y capturar un fixture real mínimo por runtime con permiso de Ale.
- Cerrar `RuntimeAdapter`, `RuntimeCapabilities`, `UsageSnapshot`, `ContextSnapshot`,
  `CostSnapshot` y errores normalizados.
- Definir qué adaptadores son `native-stream`, `structured-cli`, `wrapper` o `openai-compatible`.
- **CHECKPOINT 0:** fixtures + tabla de degradación; no integrar todavía.

### TANDA 1 — Claude Code y Codex

- Claude: `--output-format=stream-json`, partial/hook events solo si son necesarios, session id,
  modelo, effort y presupuesto. Capturar usage/cost únicamente si el stream lo informa.
- Codex: `codex exec --json`, `--model`, `--sandbox`, resume y eventos JSONL.
- Child processes siempre con executable + args array, `shell:false`, cwd validado, env mínimo.
- stdout/stderr incremental con límites; cancelación/exit/timeout; redacción antes de persistir.

### TANDA 2 — OpenCode

- Comparar `opencode serve`, ACP y `opencode run --format json`.
- Preferir servidor/ACP si ofrece contrato estable de sesión/eventos/control; documentar elección.
- Capturar thinking solo con `--thinking` y marcarlo emitted.
- Integrar stats de tokens/costo con procedencia y filtro por proyecto.
- No abrir servidor en `0.0.0.0`; loopback y auth cuando aplique.

### TANDA 3 — Antigravity (`agy`)

- Verificar `--print`, `--model`, `--conversation`, `--log-file`, timeout y sandbox.
- Si la versión instalada de `agy` no anuncia JSON stream, evaluar en orden:
  1. plugin/hook oficial estructurado;
  2. log file con schema estable documentado;
  3. wrapper que agrega lifecycle/tiempo/PID/exit code y deja output como texto opaco;
  4. fallback filesystem-only.
- Prohibido regex sobre frases humanas para inferir tools/tokens/costo.
- Si no hay usage fiable, devolver unknown y registrar capability false.

### TANDA 4 — LM Studio

- Health/server status; modelos cargados con `lms ps --json`; logs stream solo para diagnóstico.
- Inferencias a API OpenAI-compatible mediante cliente existente o adaptador compartido.
- Usage desde respuesta del servidor cuando exista; costo API `local`, no USD 0 “real”.
- Modelo local no actúa como auditor/veredicto. Puede ejecutar subtareas mecánicas declaradas.
- No auto-load/unload modelos todavía: eso es control/model orchestration de F06.

### TANDA 5 — Conformance suite

Suite parametrizada por adaptador:

- fixtures versionados y sanitizados;
- orden, dedupe, partial lines y UTF-8;
- crash/timeout/exit non-zero;
- cancelación y cleanup;
- usage/cost/context desconocidos;
- repo scoping;
- redacción de secretos;
- capability flags coherentes con métodos reales.

## Prompt copiable — Claude Code (adaptadores Claude + Codex)

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol; anunciá
la tanda, rama y checkpoint. No escribas ni crees la rama hasta recibir autorización.
Implementá únicamente TANDA 1 de Pipeline F03 en C:\www\gitcron. Leé invariantes, índice,
contrato F00 y brief F03. No avances a otros runtimes.

Primero capturá/confirmá fixtures sanitizados de Claude stream-json y Codex --json con permiso
de Ale. Si no hay permiso para una llamada, construí el harness y dejá el fixture pendiente;
no inventes payloads. Ejecutables con args array, shell:false, cwd validado, env mínimo,
stream incremental acotado, cancelación y cleanup. No expongas controles por IPC/UI. Costo,
contexto o reasoning ausente = unknown/unavailable. Tests de conformance + checkpoint + STOP.
```

## Prompt copiable — OpenCode

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol; anunciá
la tanda, rama y checkpoint. No escribas ni crees la rama hasta recibir autorización.
Sos el builder OpenCode de Pipeline F03 TANDA 2. Trabajá solo en el adaptador OpenCode.
Compará con evidencia `opencode serve`, ACP y `opencode run --format json`; proponé la interfaz
antes de editar y esperá OK. Integrá eventos, sesiones, thinking opt-in y stats sin asumir que
la forma del CLI es igual a Hermes. Loopback/auth, cleanup, fixtures y conformance obligatorios.
No UI, no controles públicos, no otros adaptadores, no CSS. Resumen de tanda, checkpoint y STOP;
sin stage/commit/push.
```

## Prompt copiable — Antigravity (`agy`) spike

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol y anunciá
el alcance. Al ser un spike audit-only, no crees rama ni edites antes del checkpoint.
Sos el scout Antigravity de Pipeline F03 TANDA 3. Audit-only al inicio. Relevá la versión instalada de `agy`:
print, model, conversation, continue, log-file, timeout, sandbox y plugins. Buscá una salida
estructurada oficial o hook estable. No parsees frases humanas ni ANSI como API. Entregá:
VERIFICADO / NO DISPONIBLE / PENDIENTE, fixture sanitizado si existe, y diseño de wrapper mínimo
si no existe. No edites el resto de GitCron. STOP para checkpoint antes de implementar.
```

## Prompt copiable — LM Studio

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol; anunciá
la tanda, rama y checkpoint. No escribas ni crees la rama hasta recibir autorización.
Implementá solo Pipeline F03 TANDA 4. Reusá la infraestructura OpenAI-compatible existente.
Integrá health, modelos cargados (`lms ps --json`) y usage cuando la respuesta lo traiga.
Clasificá costo como local; no inventes USD ni consumo eléctrico. No cargues/descargues modelos,
no hagas auto-start del server y no uses un modelo local para auditoría. Fixtures sin costo,
tests de server caído/modelo ausente/usage ausente y STOP.
```

## Prompt copiable — auditor Codex

```text
Aplicá docs/pipeline/protocolo-ejecucion-agentes.md. Identificá IA/runtime/modelo y rol y anunciá
el alcance. Esta auditoría es read-only: no crees rama ni edites.
Auditá read-only Pipeline F03 completo. Compará capability flags con fixtures reales. Buscá
shell injection, env/secrets filtrados, procesos huérfanos, stdout sin límite, schemas inventados,
regex sobre prosa, costos/contexto falsos, mezcla cross-repo, reasoning inferido como literal y
adaptadores que anuncian control no implementado. Veredicto y hallazgos por runtime.
```

## Qué NO hacer

- No UI ni CSS.
- No controles públicos.
- No cambiar configuraciones globales/modelos del usuario.
- No loguear prompts/responses completos por defecto.
- No instalar plugins o MCPs sin aprobación.
- No convertir LM Studio en auditor.
- No declarar paridad falsa entre runtimes.

## Criterios de aceptación

- [ ] Los adaptadores directos y providers cubiertos pasan la conformance suite o degradan
      explícitamente; Hermes se valida separadamente en F02 si se incluye.
- [ ] Claude/Codex/OpenCode consumen streams estructurados verificados.
- [ ] agy no depende de parsing de prosa.
- [ ] LM Studio reporta modelo/health/usage sin costo ficticio.
- [ ] Métricas preservan procedencia.
- [ ] Ningún control está expuesto todavía.
- [ ] Reporte por runtime + tsc/test/fallow + mensaje/comandos sugeridos, sin commit/push + STOP.
