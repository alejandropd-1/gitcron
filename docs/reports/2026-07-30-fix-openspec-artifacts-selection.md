# Fix — selección manual de change + pestaña de artefactos

**Change:** `fix-openspec-artifacts-selection`
**Rama:** `fix/openspec-artifacts-selection`
**Fecha:** 2026-07-30

## Contexto

Dos issues de UX en la solapa Pipeline:

1. **Los artefactos no se podían leer en repos con varios changes en `main`.** El reader selecciona automáticamente el change comparando la rama con los activos (`change-selection.ts`). Con varios changes y una rama genérica (`main`), la selección era `null` → ningún change transportaba contenido → los archivos no eran clickeables. Por eso GitCron no los mostraba, mientras que odontoPro (un solo change) sí.

2. **El markdown aparecía al final del panel de Trabajo**, no en una pestaña propia. UX defectuoso para la lectura.

## Qué se tocó

**Selección manual (backend → renderer):**
- `repo-evidence-reader.ts`: `read(repoPath, repoId, selectedChangeId?)` — la selección manual (del renderer) tiene precedencia sobre la automática por rama. Un `selectedChangeId` que no esté entre los activos se ignora (fallback).
- `pipeline-service.refresh(repoPath, selectedChangeId?)`, IPC `pipeline:get-snapshot`/`subscribe` y preload `pipelineGetSnapshot`/`pipelineSubscribe` pasan el parámetro.
- `PipelineWorkspace`: estado `manualSelection` que se resetea al cambiar de repo (patrón render, sin effect) y se reenvía en load y subscribe.
- `OpenSpecDashboard`: prop `onSelectChange`; `selectChange` y `openArtifact` lo disparan.

**Pestaña dedicada de artefactos:**
- `CenterTab` añade `'artifacts'`. `PipelineDetails` (el markdown) se monta en esa pestaña, al lado de Trabajo y Actividad — no colgando al final.
- Los intents `view-evidence`/`view-diff` llevan a la pestaña `artifacts`.
- `showEvidence` (estado que colgaba el markdown al final) retirado.
- i18n `pipeline.openspec.tabs.artifacts` en ES/EN/ZH.

## Qué NO se tocó

- La selección automática por rama (sigue como fallback cuando no hay manual).
- Qué artefactos se transportan (los mismos: proposal/design/tasks/specs).
- Lógica de Git, runtimes, specs consolidadas.

## Comprobaciones de cierre (resultado real)

| Comprobación | Resultado |
|---|---|
| `pnpm exec tsc --noEmit` | **0 errores** |
| `pnpm test` | **549 passed** (baseline 548 + 1 test nuevo de selección manual) |
| `pnpm exec eslint` sobre lo tocado | **0 errores, 0 warnings** |
| `openspec validate fix-openspec-artifacts-selection --strict` | **Válido** |

## QA visual pendiente

`pnpm run electron:dev` → solapa Pipeline:
1. En GitCron (varios changes en main): clickear el encabezado de un change → ahora transporta contenido → los artefactos (proposal/design/tasks/specs) deben ser clickeables y abrir su markdown.
2. El markdown aparece en la pestaña **Artefactos** (al lado de Trabajo/Actividad), no al final del panel.
3. Al cambiar de repo, la selección manual se reinicia.
