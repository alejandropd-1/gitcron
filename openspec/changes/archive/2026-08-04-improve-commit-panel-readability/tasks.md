## 1. Procedencia en la derivación

- [x] 1.1 Hacer que `deriveChangeCommitScope` devuelva grupos con su procedencia: del cambio, de otro cambio (con su identificador), restos de archivado, y sin atribuir
- [x] 1.2 Calcular `own` y `foreign` a partir de esos grupos, conservando su significado actual
- [x] 1.3 Verificar que los dos consumidores —el dashboard y sus tests— siguen funcionando sin cambios de significado

## 2. Mensaje derivado del alcance real

- [x] 2.1 Componer el mensaje al preparar, sobre los archivos propios más los elegidos a mano
- [x] 2.2 Conservar la sugerencia inicial de la derivación para mostrarla antes de que se elija nada
- [x] 2.3 Verificar que sigue sin pisarse un mensaje ya escrito

## 3. Lista legible

- [x] 3.1 Renderizar un grupo por procedencia, mostrando sólo los que tienen archivos, con su rótulo
- [x] 3.2 Mostrar el identificador del cambio en los artefactos que pertenecen a otro
- [x] 3.3 Agregar el distintivo de estado por archivo, con la misma representación y colores que el panel de staging
- [x] 3.4 Convertir "Sumar todos" en un control propio y airear la lista
- [x] 3.5 Habilitar la selección de texto en el contenedor del panel

## 4. Idiomas

- [x] 4.1 Rótulos de los cuatro grupos en ES/EN/ZH

## 5. Cobertura

- [x] 5.1 Test: la derivación agrupa por procedencia y nombra el cambio de los artefactos ajenos
- [x] 5.2 Test: `own` y `foreign` siguen siendo lo que eran, calculados desde los grupos
- [x] 5.3 Test: el mensaje se deriva de propios más elegidos a mano
- [x] 5.4 Test: con el cambio sin archivos propios, el mensaje sale de los elegidos
- [x] 5.5 Test: la lista muestra un grupo por procedencia y el estado de cada archivo

## 6. Cierre

- [x] 6.1 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 6.2 `pnpm exec tsc --noEmit` en cero
- [x] 6.3 `pnpm test` verde, corrido más de una vez por el flake conocido de la suite
- [x] 6.4 `openspec validate improve-commit-panel-readability --strict` válido
- [ ] 6.5 Ale valida visualmente el panel: agrupación, distintivos de estado y selección de texto
