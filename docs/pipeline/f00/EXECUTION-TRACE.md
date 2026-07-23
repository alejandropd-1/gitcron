# F00 — Trazabilidad de agentes, runtimes y economía

Fecha: `2026-07-23`
Orchestration mode: `direct`
MASTER: Codex Desktop. Hermes no fue gateway ni coordinador obligatorio.

`unknown` significa que la interfaz de esta ejecución no expuso el dato; no se estimó.

## Intervenciones

| Runtime | Provider/familia | Modelo pedido → efectivo/reportado | Rol | Tarea/resultado | Duración | Tokens/costo | Retry / espera humana | Limitación/fallback |
|---|---|---|---|---|---:|---|---|---|
| Codex Desktop | OpenAI / Codex | no solicitado → GPT-5 family; id exacto unknown | orchestrator/master + consolidación | preflight, OpenSpec, evidencia, contratos, fixes, validación | unknown | unknown / incluido en sesión | 0 / 0 ms | la UI no expuso ID/tokens/costo exactos. |
| Codex subagent `docs_contract` | OpenAI / Codex | inherited → id unknown | scout + auditor documental | ciclo 1: 3 P1 + 2 P2; ciclo 2: 2 P1 residuales; 7 fixes concretos aplicados, sin tercer ciclo | unknown | unknown | 1 recheck / 0 ms | read-only; cierre verificado contra disco por MASTER. |
| Codex subagent `runtime_scout` | OpenAI / Codex | inherited → id unknown | scout mecánico | versiones/interfaces; OK con degradaciones | unknown | unknown | probes con máx. 2 / 0 ms | no hizo inferencias. |
| Codex subagent `architecture_scout` | OpenAI / Codex | inherited → id unknown | scout arquitectura | CodeGraph + límites de seguridad; OK | unknown | unknown | 0 / 0 ms | read-only. |
| Claude Code 2.1.206 | Anthropic / Claude | `sonnet` → `claude-sonnet-5`; auxiliar `claude-haiku-4-5-20251001` | planner | outline OpenSpec read-only; incorporado tras verificar | 296.857 ms | input 5.547; output 26.251; cache create 258.270; cache read 1.621.061; USD 2,4472913 reportado | 1 fallo de invocación + 1 éxito / 0 ms | billing real vs precio equivalente unknown; no más cloud ambiguo. |
| Antigravity `agy` 1.1.5 | catálogo Gemini/Claude/gpt-oss | ninguno | runtime scout (interfaz) | help/version/models; no inferencia | < medición consolidada | 0 inferencia / costo 0 | harness tuvo retry / 0 ms | no stream JSON anunciado; queda degraded. |
| OpenCode 1.18.3 | plugin LM Studio | default local → modelo local no reportado | adversarial attempt | falló antes de revisión por 12.116 > 8.192 contexto | 18.693 ms | sin completion útil / costo local | intento 1 / 0 ms | fallback explícito a Z.AI model. |
| OpenCode 1.18.3 | Z.AI Coding Plan / Z.ai | `zai-coding-plan/glm-5.2` → efectivo inferido por selección exitosa; reported null | auditor adversarial | APROBADO con 1 P1 + 3 P2; fixes aplicados | 190.610 ms | último step: total 37.690, input 6.113, output 1.078, reasoning 4.131, cache read 26.368; costo 0 reportado | intento 2 / 0 ms | modelo no vino en campo del stream; se separa requested/effective/reported. |
| LM Studio | local / Google | `google/gemma-4-12b-qat` → mismo reportado | clasificador mecánico | endpoint/usage OK; salida útil vacía | 11.756 ms | prompt 152, completion 500, reasoning 497, total 652; local_unpriced | 1 error PowerShell + 1 inferencia / 0 ms | no decidió contrato; resultado degraded. |
| Hermes 0.19.0 | Hermes | ninguno | interfaz de orquestador opcional | version/help/serve/ACP check; operativo | < medición consolidada | 0 inferencia / costo 0 | 0 / 0 ms | no coordinó esta corrida directa; eventos reales PF. |
| OpenSpec 1.5.0 | Fission-AI CLI | NA | infraestructura | init/change/status/validate strict | comandos locales | costo 0 | init falló 1 por CSV PowerShell, retry OK / 0 ms | no es runtime de inferencia. |

## Intervenciones humanas durante la ejecución

- Espera humana bloqueante: `0 ms`.
- Toques humanos: `2`, ambos decisiones de producto útiles:
  1. Z.ai se usa mediante OpenCode.
  2. Pipeline no debe pasar todo por Hermes; esta sesión Codex directa es caso first-class.
- Los checkpoints de TANDA 0/1/2 fueron informativos según autorización inicial.

## Economía del proceso

| Categoría | Trabajo observado | Valor/hallazgo |
|---|---|---|
| Producto útil | Contract v1, 6 specs, matriz, ADR, fixtures, direct-mode y Z.ai/OpenCode | Núcleo de F00. |
| Infraestructura | Git/branch, OpenSpec init, runtime discovery, CodeGraph, tsc/tests/Fallow | Necesario para evidencia y cierre. |
| Protocolo/ceremonia | trazabilidad, dos auditorías, reporte, status/diff | La auditoría Z.ai encontró 4 correcciones reales; mantener en fases críticas. |
| Desperdicio | outline Claude demasiado largo/caro, primer OpenCode local sin contexto, LM Studio vacío, errores de quoting/sintaxis, fixture con cwd incorrecto | Evitable con prompts/contexto menores y harness probado. |

## Herramientas que fallaron o degradaron

- `openspec init` intento 1: PowerShell separó CSV; retry entre comillas exit 0.
- Claude intento 1: prompt absorbido por `--tools`; retry stdin exit 0.
- `opencode models zai`: provider ID incorrecto; `zai-coding-plan` exit 0.
- OpenCode review local: contexto 8.192 insuficiente; retry Z.ai exit 0.
- LM Studio body PowerShell: parser error; retry local exit 0 pero content vacío.
- Fixture delegation: cwd incorrecto; línea sintética exacta retirada y archivo creado eliminado.
- Fallow exit 1: deuda heredada, no regresión F00 (cero código/package changes).

## Costos y falsos positivos

- Claude informó USD 2,4472913. Se conserva como `runtime_reported_billing_semantics_unknown`, no
  como cargo confirmado.
- OpenCode/Z.ai informó costo 0 en los steps observados; se registra runtime-reported, sin inferir
  pricing global del plan.
- LM Studio es `local_unpriced`.
- “Z.ai CLI ausente” no significa provider ausente: OpenCode confirmó `Z.AI Coding Plan`.
- “Hermes ausente de la corrida” no significa Pipeline incompleto: direct mode es first-class.
- Fallow rojo no implica falla introducida por F00: no cambió código ni manifests.

## Política sugerida por control

| Control | Política | Motivo |
|---|---|---|
| Git preflight/divergencia | mandatory | evitó modificar main y confirmó base exacta. |
| OpenSpec strict | mandatory | detecta formatos/specs inválidos con bajo costo. |
| Auditoría cross-family | mandatory en seguridad/contrato | produjo 1 P1 y 3 P2 aceptados. |
| Segundo auditor same-family | sampled | útil para consistencia, no reemplaza decorrelación. |
| LM Studio clasificación mecánica | retire-candidate para F00 similar | 652 tokens locales sin contenido útil. |
| Checkpoints humanos inter-tanda ya autorizados | conditional | espera 0; reabrir sólo ante costo/riesgo/scope. |

## Cierre de auditorías

- OpenCode/Z.ai, familia distinta de la constructora principal, aprobó con 1 P1 + 3 P2; los cuatro
  hallazgos fueron aplicados.
- El auditor Codex read-only hizo el máximo de dos ciclos: primero detectó 3 P1 + 2 P2 y luego 2 P1
  residuales. Todos fueron corregidos; no se abrió un tercer ciclo. El MASTER verificó las formas
  finales en disco, OpenSpec strict, JSON/JSONL, diff-check y ausencia de código/manifests.
