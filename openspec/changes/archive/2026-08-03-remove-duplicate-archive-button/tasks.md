## 1. Render

- [x] 1.1 En `OpenSpecDashboard.tsx`, no renderizar el botón de archivar siempre visible cuando la acción primaria derivada ya sea `start-archive`

## 2. Cobertura

- [x] 2.1 Test: con validación aprobada y sin tareas pendientes (`ready-to-archive`), aparece un solo botón "Archivar cambio" y no dos
- [x] 2.2 Test: con tareas pendientes y validación aprobada, el botón siempre visible sigue presente y declara cuántas quedan (la primaria es "Continuar tarea")

## 3. Cierre

- [x] 3.1 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 3.2 `pnpm exec tsc --noEmit` en cero
- [x] 3.3 `pnpm test` verde, corrido más de una vez por el flake conocido de la suite
- [x] 3.4 `openspec validate remove-duplicate-archive-button --strict` válido
