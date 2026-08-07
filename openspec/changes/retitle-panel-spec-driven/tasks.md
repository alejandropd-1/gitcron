## 1. Base verificada

- [x] 1.1 Confirmar que el change sigue activo y `pnpm exec tsc --noEmit` en cero
- [x] 1.2 Comprobar que ningún test buscaba la cadena anterior, para saber si algo estaba atado a ella:
      ninguno

## 2. Rótulo

- [x] 2.1 Partir el rótulo en dos elementos, para que el salto no dependa del ancho de la ventana
- [x] 2.2 Bajar el tamaño: el rótulo pasó de nueve caracteres a veintitrés
- [x] 2.3 Apilar las dos líneas ocupando el alto de la barra, para encuadrar con la fila de contadores
- [x] 2.4 Ajustar el interlineado para que se lean como una unidad y no como dos renglones sueltos
- [x] 2.5 Igualar el ancho de las dos líneas. Tienen once caracteres cada una pero no miden lo mismo: la
      primera lleva un guion y una `i`, angostos, y la segunda una `m`, ancha. Se agranda la de arriba
      con un factor en `em`, para que siga al `clamp` del bloque en vez de quedar clavado

## 3. Tests

- [x] 3.1 Prueba: el rótulo son dos elementos con «Spec-Driven» y «Development», no una cadena con un salto

## 4. Cierre

- [x] 4.1 `pnpm exec tsc --noEmit` en cero
- [x] 4.2 `pnpm test` en verde: 108 archivos / 780 tests, un archivo y un test más que la base
- [x] 4.3 `pnpm exec eslint` limpio sobre lo tocado
- [x] 4.4 `openspec validate retitle-panel-spec-driven --strict` válido
- [x] 4.5 Reporte en `docs/reports/2026-08-07-retitle-panel-spec-driven.md`
- [x] 4.6 **Ale valida visualmente** que el encabezado queda encuadrado y que las dos líneas terminan a
      la misma altura. Ninguna prueba mide eso: jsdom no calcula layout, y el factor de la línea de
      arriba se estimó midiendo sobre el rótulo renderizado
