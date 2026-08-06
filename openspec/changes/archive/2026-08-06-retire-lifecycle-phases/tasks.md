## 1. Retiro de la barra

- [x] 1.1 Retirar `lifecycle()` y la constante `stages` de `OpenSpecDashboard.tsx`
- [x] 1.2 Retirar la lista ordenada del encabezado y dejar el encabezado con la identidad y la intención del cambio
- [x] 1.3 Mudar el atributo de relectura en curso al encabezado del cambio, para que el test que lo busca por atributo siga pasando
- [x] 1.4 Retirar los estilos de la barra en `OpenSpecDashboard.module.css` y ajustar la grilla del encabezado a una sola columna

## 2. Retiro del contador

- [x] 2.1 Retirar `LIFECYCLE_TOTAL` y el campo `step` del tipo `PipelineNextAction`
- [x] 2.2 Retirar las once asignaciones de `step` en `derivePipelineNextAction`
- [x] 2.3 Retirar el render del contador en `PipelineNextStepGuide.tsx`
- [x] 2.4 Verificar que los casos de `pipeline-next-action.test.ts` pasan sin editarse

## 3. Textos

- [x] 3.1 Retirar `pipeline.next.step` y las seis claves de `pipeline.openspec.lifecycle.*` en ES, EN y ZH
- [x] 3.2 Retirar sus entradas de `PIPELINE_KEYS` en `pipeline-i18n.test.ts` y verificar que no queda ninguna clave sin consumidor

## 4. Cobertura

- [x] 4.1 Test de que un cambio abierto no muestra la secuencia de etapas ni una posición numerada
- [x] 4.2 Test de que la guía conserva su acción sin el contador
- [x] 4.3 Conservar sin cambios el caso de `pipeline-workspace-revalidate.test.tsx` que verifica el indicador de relectura

## 5. Cierre

- [x] 5.1 Dejar `pnpm exec tsc --noEmit` en cero
- [x] 5.2 Correr `pnpm test` más de una vez y reportar el resultado real, distinguiendo el flake conocido de los repositorios Git reales de una regresión
- [x] 5.3 Correr el lint sobre los archivos tocados y dejarlo limpio
- [x] 5.4 Dejar `openspec validate retire-lifecycle-phases --strict` válido
- [x] 5.5 Ale valida visualmente y marca esta casilla: que no se extrañe nada de lo que la barra mostraba, y si el encabezado sin ella queda bien o pide algo
