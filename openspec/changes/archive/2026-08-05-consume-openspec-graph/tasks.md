## 1. Superficie del grafo

- [x] 1.1 Crear un componente que reciba `OpenSpecChangeStatus` y renderice un artefacto por ítem con su estado (`done`/`ready`/`blocked`), declarando las dependencias faltantes cuando el estado sea `blocked`
- [x] 1.2 El componente NO se renderiza cuando `status` es `null` o `available: false`: no hay grafo, no hay superficie, y no se inventa un estado sustituto derivado de tareas o validación
- [x] 1.3 Ubicar la superficie del grafo dentro de la pestaña Artefactos del cambio seleccionado, sin modificar la barra de fases del encabezado ni el contador «Paso N de 5»

## 2. Textos

- [x] 2.1 Escribir en ES las claves del estado de artefacto (`done`/`ready`/`blocked`) y de la declaración de dependencias faltantes, sin bloques explicativos
- [x] 2.2 Completar las claves en EN y ZH, y sumarlas a `PIPELINE_KEYS` en `pipeline-i18n.test.ts`

## 3. Cobertura

- [x] 3.1 Test de que con `status` presente la superficie renderiza cada artefacto con su estado real
- [x] 3.2 Test de que con un artefacto `blocked` se declaran sus `missingDeps`
- [x] 3.3 Test de que con `status` ausente o `available: false` la superficie no se renderiza y no aparece estado inventado
- [x] 3.4 Test de que sin cambio seleccionado la superficie no se renderiza

## 4. No tocar

- [x] 4.1 Verificar que `lifecycle()` en `OpenSpecDashboard.tsx` y `LIFECYCLE_TOTAL`/`step.index` en `pipeline-next-action.ts` quedan sin cambios: la barra de fases y el contador se conservan en esta pasada

## 5. Cierre

- [x] 5.1 Dejar `pnpm exec tsc --noEmit` en cero
- [x] 5.2 Correr `pnpm test` más de una vez y reportar el resultado real, distinguiendo el flake conocido de los repositorios Git reales de una regresión
- [x] 5.3 Correr el lint sobre los archivos tocados y dejarlo limpio
- [x] 5.4 Dejar `openspec validate consume-openspec-graph --strict` válido
- [x] 5.5 Ale valida visualmente y marca esta casilla: que el grafo se lea como el estado real de los artefactos sin competir con la barra de fases, y que no se vuelva verboso contra la invariante 11
