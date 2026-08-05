## 1. La guía deja de mentir

- [x] 1.1 Sumar al input de `derivePipelineNextAction` si el repositorio tiene cambios activos
- [x] 1.2 Agregar el estado `no-change-selected` con su entrada en `PipelineNextActionKind`, que declare que se puede entrar a uno de los que hay o empezar otro
- [x] 1.3 Conservar `no-active-change` para el repositorio realmente sin cambios activos
- [x] 1.4 Cubrir los dos estados en `pipeline-next-action.test.ts` y verificar que los casos existentes pasan sin editarse

## 2. Orden y despliegues de la pantalla de entrada

- [x] 2.1 Mover la guía al principio de la pantalla, antes de las listas
- [x] 2.2 Hacer desplegable cada cambio en curso, plegado por defecto, mostrando sólo sus tareas pendientes
- [x] 2.3 Convertir el bloque de cerrados en lista desplegable con todos los archivados, cada uno con su control para abrirlo
- [x] 2.4 Dejar la barra lateral como está, con sus ocho más recientes de acceso rápido

## 3. Textos

- [x] 3.1 Escribir en ES las claves del estado nuevo de la guía y de los desplegables
- [x] 3.2 Completarlas en EN y ZH, y sumarlas a `PIPELINE_KEYS` en `pipeline-i18n.test.ts`

## 4. Cobertura

- [x] 4.1 Test de que con cambios activos y ninguno elegido la guía no afirma que no hay cambios
- [x] 4.2 Test del desplegable de tareas pendientes: plegado por defecto y sin listar las hechas
- [x] 4.3 Test de que se puede abrir un archivado que no está entre los ocho recientes

## 5. Cierre

- [x] 5.1 Dejar `pnpm exec tsc --noEmit` en cero
- [x] 5.2 Correr `pnpm test` más de una vez y reportar el resultado real, distinguiendo el flake conocido de los repositorios Git reales de una regresión
- [x] 5.3 Correr el lint sobre los archivos tocados y dejarlo limpio
- [x] 5.4 Dejar `openspec validate improve-pipeline-start-screen --strict` válido
- [x] 5.5 Ale valida visualmente y marca esta casilla: que la guía diga la verdad, que no se haya vuelto una lista de tareas, y si los archivados convienen plegados por defecto
