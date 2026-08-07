# El control de volver del panel se lee como botón

**Change:** `align-back-control-style` · **Fecha:** 2026-08-07 · **Tareas:** 8/10 (falta el reporte
firmado y la validación visual de Ale)

## Qué se hizo

`.backToStart` gana contorno, respiro y un hover que responde. Los dos botones que la usan —el
encabezado de un cambio y la vista de una especificación— lo heredan sin tocarse.

## El problema

La regla declaraba `border: 0` y `background: none`, con tipografía de `0.62rem`. Era una etiqueta con
una flecha al lado. Ya había antecedente de que eso no alcanza en este panel: `legible-panel-controls`
se abrió porque Ale observó que los controles no parecían botones, y éste quedó afuera de aquella
pasada.

El contraste lo dio la propia aplicación. El "Volver al Repositorio" de Configuración
—`components/SettingsPanel.tsx:344`— lleva borde, padding y etiqueta en caja normal, y se lee a primera
vista.

## Se tomó el criterio, no las clases

La tentación era copiar las clases de aquel botón: es literal a lo pedido y garantiza que se vean
idénticos. Se descartó porque está escrito con utilidades de Tailwind sobre los tokens generales de la
aplicación, mientras que el panel Pipeline tiene su propio lenguaje en un módulo CSS —monoespaciada,
paleta `--os-*`, versalitas—. Un control con la tipografía del resto de la aplicación metido en medio
del panel se vería pegado, no integrado.

Lo que había que igualar es que se lea como un control accionable. Eso se logró con contorno y respiro,
usando `--os-border`, `--os-border-strong` en el hover y la escala `--sp-*`.

**El tamaño chico y la versalita se conservan a propósito.** Volver es una acción secundaria respecto de
lo que se está mirando; lo que faltaba era el contorno, no el tamaño.

## Un solo lugar

El estilo vive en la regla y no en cada botón. Son el mismo control con el mismo significado en dos
pantallas, y darles estilos separados es la forma más segura de que dentro de dos cambios ya no se
parezcan.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm test` en **105 archivos / 770 tests**, sin variación respecto de
la base: no se tocó código, sólo una regla de estilo. `openspec validate align-back-control-style
--strict` válido.

**La suite no cubre esto y no se declara que lo cubra.** Ninguna prueba distingue "parece un botón" de
"parece un texto": jsdom no calcula estilos. La única comprobación posible es visual, y es la que queda
pendiente.
