## Why

El botón "Continuar con {{task}}" nunca arranca una sesión porque ningún runtime es lanzable: Claude instalado es 2.1.132 y el gate exige 2.1.206 exacto; Codex instalado es 0.144.4 y exige 0.143.0 exacto. El gate de versión compara la salida de `--version` contra un fixture auditado del encuadre F03.

Ese encuadre (F00–F08, fases, constitution, Hermes) se retiró en el cleanup de scaffold, pero sobrevivieron dos cosas: los fixtures físicos bajo `docs/pipeline/f03/` y `docs/pipeline/f00/`, y el gate de versión que los cita. El resultado es contradictorio: el método declarado es OpenSpec, pero el arranque de runtimes sigue gobernado por un sistema de fases deprecado que bloquea el flujo en cada actualización de CLI. La sección de AGENTS.md que protegía esos fixtures ya se retiró.

## What Changes

- Se quita el gate de versión del hub: un runtime es lanzable si el adaptador lo declara y el binario está instalado. Ya no se exige coincidencia exacta con una versión de fixture.
- Se borra el encuadre F03/F00 deprecado: `docs/pipeline/f03/` y `docs/pipeline/f00/` completos (fixtures, meta, matriz de adaptadores).
- Los adaptadores dejan de citar `FIXTURE_REF` a esos archivos. Las capabilities cuyos `evidenceRefs` apuntaban a fixtures borrados pasan a `pending_fixture`: no se afirma "verified" sin evidencia que lo respalde. `evidenceStatus` queda como metadato informativo, no bloqueante.
- El launcher muestra un aviso de "no verificado" cuando el runtime arranca sin verificación, sin dejar de ofrecerlo.
- Las specs `pipeline-runtime-capabilities` y `pipeline-runtime-adapters` se reescriben para describir el comportamiento post-F03, sin referencias a fases, Hermes ni fixtures de F03.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-runtime-capabilities`: deja de exigir que el lanzamiento dependa de un fixture verificado; `evidenceStatus` es informativo, no bloqueante; se retiran las referencias a F03, fases y Hermes.
- `pipeline-runtime-adapters`: los adaptadores dejan de citar fixtures F03; las capabilities sin evidencia respaldadora se declaran `pending_fixture` sin dejar de ser lanzables.

## Impact

**Producción:** `electron/pipeline/runtime/runtime-session-hub.ts`, `electron/pipeline/runtime-adapters/{claude,codex,agy,lmstudio,opencode-acp,structured-cli}-adapter.ts`, `components/pipeline/PipelineRuntimeLauncher.tsx`, `lib/i18n.ts` (ES/EN/ZH).

**Borrado:** `docs/pipeline/f03/` completo, `docs/pipeline/f00/` completo.

**Specs:** `openspec/specs/pipeline-runtime-capabilities/spec.md`, `openspec/specs/pipeline-runtime-adapters/spec.md` (vía delta).

**Sin tocar:** lógica de Git, contratos IPC, `evidenceStatus` como tipo, DecisionCard, ProvenanceBadge, sesiones persistidas, specs de pipeline-repo-evidence.

**Dependencias:** ninguna agregada ni removida.

**Riesgo:** medio. Toca el contrato de lanzamiento de runtimes y 6 adaptadores. Mitigación: el gate se quita en una sola línea del hub; los tests del hub y de adaptadores se actualizan para reflejar que instalado ⇒ lanzable.
