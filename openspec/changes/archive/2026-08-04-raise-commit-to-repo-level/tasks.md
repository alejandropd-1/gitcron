## 1. Derivación por procedencia

- [x] 1.1 Reescribir `deriveChangeCommitScope` en `lib/change-commit-scope.ts` para que no reciba un `changeId` de referencia y devuelva los archivos agrupados por procedencia, sin `own` ni `foreign`
- [x] 1.2 Extender `artifactOwner` para que el grupo de un artefacto lleve el identificador del cambio al que pertenece, distinguiéndolo de restos de archivado y de código sin atribuir
- [x] 1.3 Cambiar `suggestCommitMessage` para que reciba el conjunto elegido y use el identificador del cambio sólo cuando todos los archivos pertenecen a uno solo, cayendo a `deriveScope` en los demás casos
- [x] 1.4 Reescribir `lib/__tests__/change-commit-scope.test.ts` contra la firma nueva, cubriendo los cuatro escenarios del requisito de alcance y los tres del mensaje
- [x] 1.5 Verificar que `deriveScope` no cambió de comportamiento: sus casos existentes pasan sin editarse

## 2. Panel de repositorio

- [x] 2.1 Hacer accionable el bloque de estado del árbol del encabezado (`styles.repoHealth` en `OpenSpecDashboard.tsx`) para que abra el panel de preparación
- [x] 2.2 Renderizar el panel de preparación en el centro, fuera de la rama `selectedChange ? (…)`, de modo que sea alcanzable sin cambio seleccionado y con cero cambios activos
- [x] 2.3 Mostrar cada grupo con su etiqueta de procedencia y sus archivos con el estado de Git de cada uno, sin que ningún grupo entre preseleccionado
- [x] 2.4 Implementar el control de sumar y quitar todos, operando sobre el total y sobre cada grupo por separado
- [x] 2.5 Conservar en el panel nuevo los dos ajustes de UX de `40c2382`: acciones arriba a la derecha compartiendo fila con el título, y área clickeable en cada control de selección
- [x] 2.6 Mostrar el resumen con la cantidad de archivos enviados cuando la preparación tiene éxito y no queda nada por preparar

## 3. Retiro de la pestaña Commit

- [x] 3.1 Quitar el valor `'commit'` de `CenterTab` y el botón de la pestaña en la fila de pestañas
- [x] 3.2 Borrar el bloque de render de la pestaña Commit y el estado que sólo lo servía, verificando con CodeGraph que nada más lo consume antes de eliminarlo
- [x] 3.3 Reemplazar `components/pipeline/__tests__/pipeline-commit-tab.test.tsx` por su equivalente sobre el panel de repositorio, incluyendo el caso de cero cambios activos
- [x] 3.4 Conservar sin cambios el caso de `pipeline-prepare-commit.test.tsx` que verifica que preparar no llama a ninguna API que confirme

## 4. Textos

- [x] 4.1 Revisar una por una las claves `pipeline.openspec.prepare.*` en `lib/i18n.ts` y reescribir en ES las que afirman que el alcance es de un cambio
- [x] 4.2 Completar en EN y ZH toda clave nueva o reescrita, sin dejar ninguna sin las tres traducciones
- [x] 4.3 Verificar que `pipeline-i18n.test.ts` pasa y que ninguna cadena de la superficie nueva quedó hardcodeada

## 5. Cierre

- [x] 5.1 Dejar `pnpm exec tsc --noEmit` en cero
- [x] 5.2 Correr `pnpm test` más de una vez y reportar el resultado real, distinguiendo el flake conocido de los repositorios Git reales de una regresión
- [x] 5.3 Correr el lint sobre los archivos tocados y dejarlo limpio
- [x] 5.4 Dejar `openspec validate raise-commit-to-repo-level --strict` válido
- [x] 5.5 Ale valida visualmente el panel nuevo y marca esta casilla: que la preparación se alcance sin cambio seleccionado, que los grupos se distingan, y si el panel debe abrirse solo al detectar el árbol sucio tras archivar o seguir siendo a pedido
