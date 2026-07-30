## Context

`RuntimeSessionHub.discover` (`runtime-session-hub.ts:141-170`) decide `launchable` así:

```ts
const versionVerified = discovery.installed && discovery.evidenceStatus === 'verified';
launchable: entry.launchable && versionVerified,
```

`evidenceStatus === 'verified'` sólo se alcanza cuando `StructuredCliRuntimeAdapter.discover` (`structured-cli-adapter.ts:60`) compara la salida de `--version` con `matchesFixtureVersion`, que en Claude exige `'2.1.206 (Claude Code)'` exacto y en Codex `'codex-cli 0.143.0'` exacto. Versiones instaladas distintas ⇒ `pending_fixture` ⇒ `launchable: false`. Resultado: cero runtimes lanzables en cualquier máquina que no tenga esas versiones puntuales.

El fixture auditado vive en `docs/pipeline/f03/fixtures/`, remanente de un encuadre de fases (F00–F08) ya retirado. La sección de AGENTS.md que los protegía ("evidencia viva, no se borran") ya se borró.

Constraints:
- "Solo OpenSpec" es el método. No se monta otro sistema de verificación de runtime.
- Invariante de honestidad: dato sin evidencia = `pending_fixture`, nunca `verified`.
- `evidenceStatus` como tipo se conserva (DecisionCard, ProvenanceBadge lo usan).

## Goals / Non-Goals

**Goals**
- Destruabar el arranque: instalado + adaptador con `start()` ⇒ lanzable.
- Retirar el encuadre F03/F00 físico y todas sus citas.
- Mantener `evidenceStatus` como metadato informativo honesto.

**Non-Goals**
- Recapturar fixtures de las versiones actuales (consume corridas reales, envejece igual).
- Eliminar el tipo `PipelineEvidenceStatus` ni `evidenceStatus` de los descriptores.
- Cambiar el contrato IPC.

## Decisions

### D1: El gate se quita en el hub, no en los adaptadores
`runtime-session-hub.ts:145` pasa a `const launchable = entry.launchable && discovery.installed;`. Sin `versionVerified`. Los adaptadores siguen detectando y reportando versión; dejan de decidir lanzabilidad.

Rationale: el gate es una sola línea y es el único lugar donde la verificación bloquea. Tocarlo en el hub es mínimo y localizado; tocar cada `matchesFixtureVersion` sería disperso.

### D2: `evidenceStatus` informativo, no bloqueante
Las capabilities cuyos `evidenceRefs` apuntaban a fixtures borrados pasan a `pending_fixture`. El arranque ya no depende de eso. La UI muestra "no verificado" cuando aplica, sin bloquear.

Rationale: la invariante de honestidad prohíbe afirmar `verified` sin evidencia. Como los fixtures se borran, las capabilities que los citaban ya no tienen respaldo ⇒ `pending_fixture`. Pero como el gate se quitó, eso no impide arrancar.

### D3: `FIXTURE_REF` se reemplaza por referencia vacía o estructural
Los adaptadores (`claude`, `codex`, `agy`, `lmstudio`, `opencode`) reemplazan `FIXTURE_REF = 'docs/pipeline/f03/...'` por `''` o por la referencia al conformance test que sí corre. No se cita un archivo inexistente.

### D4: `matchesFixtureVersion` sobrevive como detector informativo
`StructuredCliRuntimeAdapter.discover` sigue corriendo `--version` y reportando la versión instalada en `runtimeVersion`. `matchesFixtureVersion` deja de decidir `evidenceStatus`; ésta pasa a `pending_fixture` cuando los refs se borran. La función se renombra conceptualmente a "detector de versión", no a "gate".

### D5: UI muestra el runtime lanzable con aviso
`PipelineRuntimeLauncher` ofrece el runtime instalado como lanzable. Si `evidenceStatus !== 'verified'`, muestra un aviso "versión no verificada". No promete más de lo que el adaptador declara. Nueva clave i18n `pipeline.launcher.unverified`.

## Risks & Mitigations

- **Arrancar un runtime no verificado puede romperse si el protocolo cambió.** Mitigación: el aviso informativo lo dice. El adaptador ya declara sus constraints; si la versión cambia el protocolo, el stream falla y el error llega crudo (comportamiento existente).
- **Borrar fixtures puede romper tests que los lean desde disco.** Mitigación: se verificó que ningún test lee los archivos físicos; sólo citan los paths como strings. Se actualizan esas citas.
- **Afirmar `pending_fixture` masivamente puede parecer regresión.** Mitigación: es honesto. Antes afirmaba `verified` apoyado en fixtures de un encuadre deprecado; ahora dice lo que es.
