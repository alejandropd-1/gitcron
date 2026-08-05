## 1. La rama donde se decide

- [x] 1.1 Declarar la rama actual en el encabezado del panel de preparación, junto al mensaje
- [x] 1.2 Verificar que no queda ningún control que cambie de rama ni ninguna escritura de Git en esa superficie

## 2. La columna lateral durante la preparación

- [x] 2.1 Mostrar en la columna los archivos ya preparados con su estado mientras el panel está abierto
- [x] 2.2 Declarar en el encabezado de la columna qué está mostrando en cada caso
- [x] 2.3 Declarar el caso sin nada preparado, en vez de dejar la columna vacía
- [x] 2.4 Volver a ACTIVIDAD al cerrar el panel
- [x] 2.5 No sumar controles a esa lista: es una vista, y quitar del stage ya vive en el flujo de commit

## 3. Textos

- [x] 3.1 Escribir en ES las claves de la rama de destino y de la columna de preparados
- [x] 3.2 Completarlas en EN y ZH, y sumarlas a `PIPELINE_KEYS` en `pipeline-i18n.test.ts`

## 4. Cobertura

- [x] 4.1 Test de que el panel declara la rama actual
- [x] 4.2 Test de que con el panel abierto la columna lista los preparados y no la actividad
- [x] 4.3 Test de que al cerrar el panel la columna vuelve a ACTIVIDAD

## 5. Cierre

- [x] 5.1 Dejar `pnpm exec tsc --noEmit` en cero
- [x] 5.2 Correr `pnpm test` más de una vez y reportar el resultado real, distinguiendo el flake conocido de los repositorios Git reales de una regresión
- [x] 5.3 Correr el lint sobre los archivos tocados y dejarlo limpio
- [x] 5.4 Dejar `openspec validate commit-surface-context --strict` válido
- [x] 5.5 Ale valida visualmente y marca esta casilla: que la rama se lea donde decide, y si la columna debe volver a ACTIVIDAD al cerrar o quedarse en preparados
