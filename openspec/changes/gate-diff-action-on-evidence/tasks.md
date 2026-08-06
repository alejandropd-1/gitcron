## 1. Base verificada

- [ ] 1.1 Confirmar que el change sigue activo, `tsc --noEmit` en cero y `pnpm test` en verde
- [ ] 1.2 Confirmar en el código las dos condiciones divergentes (`pipeline-next-action.ts:471` sin
      condición, `OpenSpecDashboard.tsx:1059` con `disabled`)

## 2. Criterio compartido

- [ ] 2.1 Extraer el criterio "hay al menos un diff" a una función pura consumida por la guía y por el panel
- [ ] 2.2 Condicionar la acción secundaria de `ready-to-archive` a ese criterio

## 3. Tests

- [ ] 3.1 Prueba: cambio listo para archivar sin diffs → la guía no ofrece "Ver diff"
- [ ] 3.2 Prueba: cambio listo para archivar con diffs → la guía ofrece "Ver diff"
- [ ] 3.3 Prueba: el botón del panel y la guía coinciden frente al mismo snapshot

## 4. Cierre

- [ ] 4.1 `pnpm exec tsc --noEmit` en cero
- [ ] 4.2 `pnpm test` en verde, con el conteo de archivos comparado contra la base
- [ ] 4.3 `pnpm exec eslint` limpio sobre lo tocado
- [ ] 4.4 `openspec validate gate-diff-action-on-evidence --strict` válido
- [ ] 4.5 Reporte en `docs/reports/`
- [ ] 4.6 Ale valida en la aplicación que la acción desaparece en un cambio sin sesiones corridas
