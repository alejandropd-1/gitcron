## 1. Base verificada

- [x] 1.1 Confirmar que el change sigue activo, `pnpm exec tsc --noEmit` en cero y `pnpm test` en verde
      (106 archivos / 777 tests antes de tocar nada)
- [x] 1.2 Confirmar en el código que `flowMode` sólo vuelve a nulo al elegir un cambio, lanzar una tarea
      o archivar, y que ninguno de los tres está disponible en la pantalla de inicio

## 2. Implementación

- [x] 2.1 Agregar la salida como acción opcional de la guía, recibiendo etiqueta y efecto ya resueltos,
      para que la guía siga sin decidir nada
- [x] 2.2 Conectarla en los dos montajes de la guía, sin tocar el lanzador de runtime, que comparte el
      nombre de la prop de arranque pero tiene otro ciclo
- [x] 2.3 Ubicarla junto a las acciones que abren el flujo, al final de esa fila y separada del resto.
      La primera versión la puso dentro del formulario y Ale marcó que ahí competía con el selector de
      modo en vez de leerse como su contraria
- [x] 2.4 Darle la misma familia visual que el control de volver —contorno y respiro—, sin relleno para
      que no compita con las dos acciones de empezar
- [x] 2.5 Agregar el texto en los tres idiomas

## 3. Tests

- [x] 3.1 Prueba: abrir el flujo de proponer y cerrarlo devuelve la pantalla de inicio
- [x] 3.2 Prueba: el modo de explorar ofrece la misma salida

## 4. Cierre

- [x] 4.1 `pnpm exec tsc --noEmit` en cero
- [x] 4.2 `pnpm test`: **107 archivos / 779 tests, una corrida completa en verde**. Se corrió tres veces
      en total y el resultado se declara entero. La primera cayó con seis archivos, todos por
      `Test timed out in 5000ms` y ninguno por aserción, con el entorno de desarrollo levantado: carga,
      no defecto. La segunda pasó completa. La tercera falló un solo caso —el estado de carga del
      lanzador en `pipeline-guided-wiring.test.tsx`—, que es el flake conocido y sensible al tiempo de
      ese archivo: pasa tres de tres aislado y no se tocó en esta tanda, según `git diff`
- [x] 4.3 `pnpm exec eslint` limpio sobre lo tocado
- [x] 4.4 `openspec validate close-new-change-flow --strict` válido
- [x] 4.5 Reporte en `docs/reports/2026-08-07-close-new-change-flow.md`
- [x] 4.6 Ale valida en la aplicación: abrir las dos entradas y cerrarlas sin empezar nada
