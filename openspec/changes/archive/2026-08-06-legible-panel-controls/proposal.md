## Why

El panel acumuló controles sin jerarquía y con textos al límite de lo legible. Cuatro problemas
concretos, los cuatro observados por Ale sobre el panel funcionando.

**Los controles no se distinguen entre sí.** `.groupToggle`, `.startPendingToggle` y `.repoHealthCta`
usan todos el mismo cian sobre marco tenue, y `.primaryAction`/`.secondaryAction` comparten tamaño y
familia. «Sumar todos» de un grupo, «Preparar» del panel entero y «Ver las que faltan» de un cambio
pesan distinto y se ven igual, así que hay que leer el texto para saber cuál es cuál.

**Los textos están chicos.** Los controles del panel rondan `0.6rem`–`0.68rem` en monoespaciada; la
pastilla de rama, `0.62rem`. Es denso por diseño, pero cruzó el punto donde la densidad deja de ayudar.

**Falta aire debajo de los títulos de grupo.** `.fileGroup > p` cierra con `padding-bottom: 0.3rem` y
la descripción que se sumó en `explain-commit-groups` queda pegada al rótulo, de modo que título,
descripción y primera fila se leen como un bloque.

**Los conteos están siempre en plural.** `pipeline.openspec.start.pending` dice «Ver las {{count}} que
faltan» y con una tarea pendiente muestra «Ver las 1 que faltan». Lo mismo pasa con los archivados, los
archivos preparados y el resumen posterior. No es un detalle de estilo: un texto que no concuerda
delata que nadie miró el caso de uno, y el caso de uno es el más frecuente al final de cualquier
trabajo.

## What Changes

Los controles pasan a tener tres pesos visuales distinguibles sin leer el texto: la acción principal
del panel, las acciones de apoyo, y los controles que despliegan o suman dentro de una lista. Cada
nivel tiene su propio tratamiento de color, y el cian deja de usarse para todo.

Los textos y las áreas de los controles crecen: los botones de acción, los que suman un grupo, los que
despliegan y la pastilla de rama. El objetivo es que dejen de estar en el límite, no que el panel deje
de ser denso.

Los títulos de grupo se separan de su descripción y de la primera fila, para que las tres cosas se
lean como tres y no como una.

Los conteos concuerdan en singular y plural. Se agregan las variantes de una unidad para «lo que
falta», «archivados», «archivos preparados» y el resumen tras preparar, en las tres lenguas.

Queda **fuera de alcance**: la paleta general de la aplicación, que no se toca; el ancho de los paneles
de artefactos, que sigue sin poder reproducirse; y la atribución de archivos de código a un cambio.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pipeline-guided-workflow`: se agrega el requisito de que los controles del panel se distingan por
  peso y de que los conteos concuerden en número.

## Impact

En `components/pipeline/OpenSpecDashboard.module.css` se reescriben los tres niveles de control y los
espaciados de grupo. En `lib/i18n.ts` se agregan las variantes de singular en ES, EN y ZH. En
`components/pipeline/OpenSpecDashboard.tsx` se elige la clave según el conteo, en una función que
resuelve la concordancia en un solo lugar.

En pruebas se cubre que con una unidad se usa la variante singular y con varias la plural. Las claves
nuevas se suman a `PIPELINE_KEYS`.

No se agregan dependencias. No se toca el proceso principal.
