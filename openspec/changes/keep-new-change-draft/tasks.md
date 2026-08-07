## 1. Base

- [x] 1.1 Confirmar que el change sigue activo, `tsc --noEmit` en cero y `pnpm test` en verde
- [x] 1.2 Causa medida en el código: `components/RepoMainView.tsx:270` resuelve cada solapa con un
      `return` distinto, así que cambiar de solapa desmonta `PipelineWorkspace` y su estado local
- [x] 1.3 Ale acotó el alcance: sobrevive lo escrito. La selección, el scroll y la solapa del rail no
- [x] 1.4 Verificar qué se pierde hoy exactamente, campo por campo, para no dejar ninguno afuera al
      moverlos: `flowMode`, modo, objetivo, slug, restricciones, rama, base e instrucción compuesta

## 2. Store

- [x] 2.1 Store de Zustand para el borrador, con la ruta del repositorio como clave
- [x] 2.2 Leer y escribir el borrador, y descartarlo, con una superficie chica: nada de exponer el mapa
      entero a los componentes
- [x] 2.3 Que un repositorio sin borrador devuelva el estado inicial, no `undefined`

## 3. Flujo

- [x] 3.1 `PipelineNewChangeFlow` toma sus campos del borrador en vez de su `useState`
- [x] 3.2 Que el flujo esté abierto también sobrevive: hoy vive en `flowMode`, arriba del formulario
- [x] 3.3 Descartar el borrador al cerrar sin empezar
- [x] 3.4 Descartar el borrador al arrancar la sesión
- [x] 3.5 No descartarlo al cambiar de solapa, elegir un cambio ni cerrar el panel
- [x] 3.6 La instrucción compuesta no se conserva: se recompone de los campos, y guardarla sería un
      segundo lugar donde vive el mismo dato

## 4. Tests

- [x] 4.1 Prueba del store: borradores de dos repositorios no se pisan
- [x] 4.2 Prueba del store: descartar deja el estado inicial
- [x] 4.3 Prueba del flujo: desmontar y volver a montar conserva cada campo, uno por uno
- [x] 4.4 Prueba del flujo: cerrar sin empezar descarta, y al volver el formulario está vacío
- [x] 4.5 Prueba del flujo: arrancar la sesión descarta
- [x] 4.6 Prueba: montar en otro repositorio no muestra el borrador del primero

## 5. Cierre

- [x] 5.1 `pnpm exec tsc --noEmit` en cero
- [x] 5.2 `pnpm test` en verde, con el conteo de archivos comparado contra la base
- [x] 5.3 `pnpm exec eslint` limpio sobre lo tocado
- [x] 5.4 `openspec validate keep-new-change-draft --strict` válido
- [x] 5.5 Reporte en `docs/reports/`
- [x] 5.6 Ale valida: escribir un cambio, ir a Graph, volver y encontrarlo como estaba
