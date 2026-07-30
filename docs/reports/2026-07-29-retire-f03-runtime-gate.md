# Fix — destrabar runtimes retirando el gate de versión F03

**Change:** `retire-f03-runtime-gate`
**Rama:** `fix/retire-f03-runtime-gate` (basada en `fix/pipeline-launcher-empty-box`)
**Fecha:** 2026-07-29

## Contexto

El botón "Continuar con {{task}}" nunca arrancaba una sesión porque ningún runtime era lanzable: Claude instalado es 2.1.132 y el gate exigía 2.1.206 exacto; Codex instalado es 0.144.4 y exigía 0.143.0 exacto. El gate comparaba la salida de `--version` contra un fixture auditado del encuadre F03, que está deprecado desde el cleanup de scaffold pero sobrevivió en el código.

## Qué se tocó

**Gate de versión quitado (la raíz del destrabe):**
- `runtime-session-hub.ts`: `launchable = entry.launchable && discovery.installed`. Ya no exige `evidenceStatus === 'verified'`. Un runtime instalado con adaptador `start()` es lanzable.
- `structured-cli-adapter.ts`: gate en `start()` que abortaba con "Runtime version has no compatible verified fixture" **quitado**. Era el error que se veía al confirmar el arranque de Claude/Codex — un gate que olvidé en la primera pasada y cuya omisión dejaba el fix a medias: el runtime aparecía como lanzable pero abortaba al arrancar.
- `opencode-acp-adapter.ts`: dos gates internos adicionales (en `health()` y `start()`) que cortaban por `evidenceStatus`/`agentVersion` se cambiaron a chequeo de instalación + protocolo. La negociación ACP real sigue siendo la evidencia viva.

**`evidenceStatus` como metadato informativo (no bloqueante):**
- Los 6 adaptadores (claude, codex, agy, lmstudio, opencode, structured-cli) pasan sus capabilities a `pending_fixture` cuando su única evidencia era un fixture retirado. No se afirma `verified` sin respaldo (invariante de honestidad).
- `structured-cli-adapter.ts` ahora reporta la versión instalada siempre (antes la descartaba si no coincidía con el fixture).
- `conformance.ts`: la regla `available ⟹ verified` pasa a aceptar `pending_fixture`.
- Se propaga `evidenceStatus` al `RuntimeDiscoveryEntry` para que la UI lo muestre.

**UI:**
- `PipelineRuntimeLauncher.tsx`: aviso "Versión no verificada" cuando `evidenceStatus !== 'verified'`, sin bloquear el arranque. Clave i18n `pipeline.launcher.unverified` en ES/EN/ZH.

## Qué NO se tocó

- `evidenceStatus` como tipo se conserva (lo usan DecisionCard, ProvenanceBadge, fixtures).
- Contrato IPC, lógica de Git, specs de pipeline-repo-evidence.
- Los métodos `matchesFixtureVersion` siguen detectando versión para reportar, no para gatear.

## Decisión revisada sobre los fixtures físicos

**El plan original era borrar `docs/pipeline/f03/` y `f00/`. Se ejecutó y se revirtió.**

Motivo: mi investigación inicial concluyó erróneamente que "ningún test lee los fixtures desde disco". Al correr los tests tras el borrado, **5 tests fallaron** porque cargan los fixtures con `fs.readFileSync` como stream de entrada real para probar los normalizadores (`runtime-normalizers`, `runtime-cli-adapters`, `runtime-lmstudio`, `runtime-opencode-acp`, `runtime-adapter-conformance`). Los fixtures son, simultáneamente, evidencia del encuadre F03 deprecado **y** datos de entrada para cobertura viva de normalización.

Decisión: los fixtures físicos se conservan como insumo de prueba, pero dejan de ser política — ya no se citan como `evidenceRefs`, ya no gatean la versión. El cleanup de F03 como *marco* está completo; los archivos sobreviven sólo como datos de test. **Lección registrada:** ante un borrado, correr los tests antes, no confiar en un grep de exploración.

## Comprobaciones de cierre (resultado real)

| Comprobación | Resultado |
|---|---|
| `pnpm exec tsc --noEmit` | **0 errores** |
| `pnpm test` | **548 passed** (76 archivos). Mismo conteo que baseline: assertions actualizados a la nueva semántica, no tests nuevos |
| `pnpm exec eslint` sobre lo tocado | **0 errores** |
| `openspec validate retire-f03-runtime-gate --strict` | **Válido** |

## QA visual pendiente

`pnpm run electron:dev` → Pipeline → "Continuar con {{task}}":
1. Claude/Codex deben aparecer como lanzables (con aviso "Versión no verificada" si applies) y arrancar la sesión al confirmar.
2. Sin el recuadro vacío (fix anterior) y sin el bloqueo por versión.
3. Si la versión del runtime cambia en el futuro, sigue siendo lanzable — el gate ya no depende de la versión exacta.
