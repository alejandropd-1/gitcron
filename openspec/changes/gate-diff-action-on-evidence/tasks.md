## 1. Base verificada

- [x] 1.1 Confirmar que el change sigue activo, `tsc --noEmit` en cero y `pnpm test` en verde
      (101 archivos / 738 tests antes de tocar nada)
- [x] 1.2 Confirmar en el código las dos condiciones divergentes: `pipeline-next-action.ts` armaba la
      acción secundaria de `ready-to-archive` sin condición, y `OpenSpecDashboard.tsx` condicionaba el
      botón con `disabled={(snapshot.diffs?.length ?? 0) === 0}`

## 2. Criterio compartido

- [x] 2.1 Extraer el criterio "hay al menos un diff" a `hasDiffEvidence`, función pura exportada desde
      `pipeline-next-action.ts` y consumida por la guía y por el botón del panel
- [x] 2.2 Condicionar la acción secundaria de `ready-to-archive` a ese criterio, recibido como el
      booleano `hasDiffs` del input —no la lista, siguiendo el mismo criterio que `hasActiveChanges`—

## 3. Tests

- [x] 3.1 Prueba: cambio listo para archivar sin diffs → la guía no ofrece "Ver diff" (`secondary` nulo)
- [x] 3.2 Prueba: cambio listo para archivar con diffs → la guía ofrece "Ver diff"
- [x] 3.3 Prueba del criterio compartido: `hasDiffEvidence` sobre lista vacía, nula, ausente y con un
      elemento. El botón del panel y la guía ya no pueden divergir porque llaman a la misma función; no
      se agregó un test de render del botón, que seguiría probando lo mismo por otro camino

## 4. Cierre

- [x] 4.1 `pnpm exec tsc --noEmit` en cero
- [x] 4.2 `pnpm test` en verde: 101 archivos / 741 tests, dos corridas. Los tres tests de más son 3.1,
      3.2 y 3.3
- [x] 4.3 `pnpm exec eslint` limpio sobre los tres archivos tocados
- [x] 4.4 `openspec validate gate-diff-action-on-evidence --strict` válido
- [x] 4.5 Reporte en `docs/reports/2026-08-06-gate-diff-action-on-evidence.md`
- [x] 4.6 Ale valida en la aplicación que la acción desaparece en un cambio sin sesiones corridas
