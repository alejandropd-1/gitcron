# Tasks — read-archived-change-artifacts

## 1. Lectura

- [x] 1.1 El archivado seleccionado transporta proposal, design, tasks y specs delta
- [x] 1.2 Los no seleccionados no transportan contenido
- [x] 1.3 Tests de ambos casos

## 2. Vista

- [x] 2.1 La ficha del completado muestra los artefactos con el visor existente
- [x] 2.2 No se muestra nada cuando el archivado no trae contenido

## 3. Cierre

- [x] 3.1 `pnpm exec tsc --noEmit` en cero
- [x] 3.2 `pnpm test` en verde
- [x] 3.3 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 3.4 `openspec validate read-archived-change-artifacts --strict` válido
- [x] 3.5 Reporte en `docs/reports/`
- [x] 3.6 Archivado confirmado por Ale desde la aplicación
