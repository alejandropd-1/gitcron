## 1. Tipos compartidos

- [x] 1.1 En `types/pipeline/index.ts`, definir `OpenSpecArtifactState`, `OpenSpecArtifactStatus`, `OpenSpecChangeStatus` y agregar `status?: OpenSpecChangeStatus | null` a `OpenSpecChangeEvidence`

## 2. Wrapper del CLI

- [x] 2.1 En `electron/pipeline/openspec-cli.ts`, agregar `statusOpenSpecChangeWithCli(repoPath, changeId)` que invoque `openspec status --json`, mapee la salida y devuelva `{ available: false, ... }` en fallo de ejecución sin lanzar

## 3. Reader de evidencia

- [x] 3.1 Agregar `statusOpenSpecChange?` a `RepoEvidenceReaderDependencies`
- [x] 3.2 Invocar la dep en el loop por change sólo para el seleccionado (`isSelected`), dejando `status` en `null` para los demás
- [x] 3.3 Cablear el default del constructor a `statusOpenSpecChangeWithCli`

## 4. Renderer

- [x] 4.1 Agregar `status?: OpenSpecChangeStatus | null` a `OpenSpecChangeSummary` en `components/pipeline/pipeline-view-state.ts`

## 5. Cobertura

- [x] 5.1 Test del wrapper: mapea un stdout JSON fixture al grafo y devuelve `{ available: false }` sin lanzar cuando el CLI no pudo ejecutarse
- [x] 5.2 Test del reader: con la dep inyectada, el cambio seleccionado transporta `status` y los demás lo traen en `null`
- [x] 5.3 Test de costo: `statusOpenSpecChange` se invoca una sola vez y sólo para el seleccionado

## 6. Cierre

- [x] 6.1 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 6.2 `pnpm exec tsc --noEmit` en cero
- [x] 6.3 `pnpm test` verde, corrido más de una vez por el flake conocido de la suite
- [x] 6.4 `openspec validate consume-openspec-status --strict` válido
