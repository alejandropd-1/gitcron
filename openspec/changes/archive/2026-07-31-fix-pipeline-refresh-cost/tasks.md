# Tasks — fix-pipeline-refresh-cost

## 1. Acotar la validación al cambio seleccionado

- [x] 1.1 Mover la invocación de `validateOpenSpecChange` en `repo-evidence-reader.ts` para que corra sólo cuando `changeId === selection.changeId`
- [x] 1.2 Dejar `validation: 'unknown'` en los changes activos no seleccionados, sin subproceso
- [x] 1.3 Test: con varios changes activos y uno seleccionado, la dependencia de validación se invoca exactamente una vez y con ese changeId
- [x] 1.4 Test: sin cambio seleccionado no se invoca la validación para ninguno

## 2. Coalescing de refrescos concurrentes

- [x] 2.1 Agregar en `electron/ipc/pipeline.ts` un registro de lecturas en vuelo indexado por `repoPath` + selección
- [x] 2.2 Resolver un pedido con clave ya en vuelo reutilizando esa promesa, sin iniciar otra lectura
- [x] 2.3 Liberar la entrada del registro al resolverse, tanto en éxito como en error
- [x] 2.4 Test: dos pedidos concurrentes con la misma clave producen una sola lectura y ambos reciben el snapshot
- [x] 2.5 Test: dos pedidos concurrentes con selecciones distintas producen dos lecturas

## 3. Selección recordada y relectura de cola

- [x] 3.1 Guardar en la suscripción la última selección informada por repo, actualizándola en cada `pipeline:subscribe`
- [x] 3.2 Hacer que el notificador del watcher refresque con esa selección en lugar de `undefined`
- [x] 3.3 Marcar el repo como sucio si llega una notificación con una lectura en vuelo, y correr exactamente una relectura al resolverse
- [x] 3.4 Test: el snapshot emitido por el watcher conserva la selección manual informada al suscribirse
- [x] 3.5 Test: N notificaciones durante una lectura en vuelo producen una sola relectura
- [x] 3.6 Test: `pipeline:unsubscribe` limpia también la selección recordada, sin dejar estado por repo

## 4. Verificación de no regresión

- [x] 4.1 Confirmar que los tests existentes de `pipeline-ipc` siguen pasando sin relajarse
- [x] 4.2 Medir el costo de `read()` después del cambio y dejar el número en el reporte

## 5. Cierre

- [x] 5.1 `pnpm exec tsc --noEmit` en cero
- [x] 5.2 `pnpm test` en verde
- [x] 5.3 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 5.4 `openspec validate fix-pipeline-refresh-cost --strict` válido
- [x] 5.5 Reporte en `docs/reports/` con qué se tocó, qué no y los resultados reales
- [ ] 5.6 Frenar antes de staging y entregar a Ale
