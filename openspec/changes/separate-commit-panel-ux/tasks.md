## 1. Pestaña Commit

- [x] 1.1 Agregar `'commit'` a `CenterTab` y un cuarto botón de tab con `tabs.commit`
- [x] 1.2 Mover el bloque de preparación adentro de la rama `centerTab === 'commit'` del switch, dejando de renderizarlo siempre arriba

## 2. Seleccionar todos

- [x] 2.1 Agregar un control que sume todos los `foreign` a `extraFiles` o los vacíe, junto al título de la lista

## 3. Vista tras preparar

- [x] 3.1 Filtrar los archivos staged del input de `deriveChangeCommitScope` en el dashboard
- [x] 3.2 Agregar estado `lastPreparedCount` y setearlo en `prepareCommit` tras éxito
- [x] 3.3 Renderizar el resumen "N archivos enviados a commit" cuando no quedan archivos por preparar y hay conteo reciente, reseteándolo al cambiar de change o al volver archivos no-staged

## 4. Idiomas

- [x] 4.1 Claves nuevas en ES/EN/ZH: `tabs.commit`, `prepare.selectAll`, `prepare.deselectAll`, `prepare.preparedSummary`, `prepare.empty`

## 5. Cobertura

- [x] 5.1 Test: existe el tab Commit y el panel de preparar aparece ahí, no en Trabajo
- [x] 5.2 Test: con `foreign`, el control select-all los selecciona y deselecciona todos
- [x] 5.3 Test: tras preparar, la lista se reemplaza por el resumen con el conteo

## 6. Cierre

- [x] 6.1 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 6.2 `pnpm exec tsc --noEmit` en cero
- [x] 6.3 `pnpm test` verde, corrido más de una vez por el flake conocido de la suite
- [x] 6.4 `openspec validate separate-commit-panel-ux --strict` válido
