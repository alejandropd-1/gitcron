## 1. Cambio de estado sobre el markdown

- [x] 1.1 Crear el módulo puro que, dado el contenido de `tasks.md`, una línea, el texto esperado y el estado deseado, devuelve el contenido nuevo
- [x] 1.2 Rechazar la escritura cuando el texto de esa línea no coincide con el esperado, sin modificar nada
- [x] 1.3 Componer la línea del registro con fecha, tarea y dirección del cambio

## 2. Canal de escritura

- [x] 2.1 Crear el módulo de IPC con el canal que cambia el estado de una tarea, separado del que archiva
- [x] 2.2 Rechazar el pedido si el cambio está archivado o si el identificador no es válido
- [x] 2.3 Escribir el archivo de tareas y agregar la línea al registro del cambio
- [x] 2.4 Exponer el canal en el preload y en los tipos

## 3. Interfaz

- [x] 3.1 Convertir el estado de cada tarea en un control que se pueda accionar, para cambios activos
- [x] 3.2 Pedir confirmación al desmarcar, con el aviso de acciones que ya usa la aplicación
- [x] 3.3 Marcar sin confirmación, y declarar el motivo cuando el cambio está archivado
- [x] 3.4 Informar el fallo cuando la escritura se rechaza porque el archivo cambió

## 4. Idiomas

- [x] 4.1 Textos de la confirmación, del fallo y del estado archivado, en ES/EN/ZH

## 5. Cobertura

- [x] 5.1 Test: marcar y desmarcar cambian sólo esa línea, y el resto del archivo queda igual
- [x] 5.2 Test: con el texto cambiado, no se escribe nada y se informa el desajuste
- [x] 5.3 Test: la línea del registro nombra la tarea y la dirección del cambio
- [x] 5.4 Test: el canal rechaza un cambio archivado
- [x] 5.5 Test: desmarcar pide confirmación y no escribe hasta obtenerla
- [x] 5.6 Test: marcar no pide confirmación

## 6. Cierre

- [x] 6.1 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 6.2 `pnpm exec tsc --noEmit` en cero
- [x] 6.3 `pnpm test` verde, corrido más de una vez por el flake conocido de la suite
- [x] 6.4 `openspec validate check-tasks-from-app --strict` válido
- [x] 6.5 Ale marca esta misma tarea desde la aplicación, que es la prueba de que funciona
