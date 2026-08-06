## Context

El panel de preparación se construyó y se validó en ocho tandas, todas con el mismo método: Ale lo
mira y reporta. Ese método encontró mucho —controles que no parecían apretables, textos que saltaban,
grupos sin explicar— y no puede encontrar nada de lo que sólo aparece al recorrer con teclado o con un
lector de pantalla, porque eso no se ve mirando.

La guía de accesibilidad del proyecto estuvo disponible todo el tiempo y no se consultó hasta ahora.
Los tres huecos que siguen son lo que la auditoría encontró, verificados contra el archivo y no
supuestos.

## Goals / Non-Goals

**Goals:**

Que se pueda recorrer el panel con teclado sabiendo siempre dónde está el foco. Que una acción no
disponible se pueda alcanzar y se anuncie como tal. Que no quede ningún contorno apagado sin
reemplazo.

**Non-Goals:**

Una auditoría completa del resto de la aplicación. Cambiar la estructura de landmarks del panel.
Marcar íconos decorativos uno por uno.

## Decisions

**El foco se declara con un token, no regla por regla.** Un solo par de valores —color y grosor— usado
por los siete controles. Se descartó escribir el contorno en cada regla: es exactamente el patrón de
valores sueltos que ya obligó a rehacer el espaciado en `polish-panel-layout`, y repetirlo con el foco
tendría el mismo final.

**`:focus-visible` y no `:focus`.** El foco visible interesa cuando se llegó con teclado; al hacer clic
el contorno es ruido. Es también lo que ya usan los campos del formulario de cambio nuevo, así que el
panel pasa a comportarse igual que el resto.

**«Preparar» pasa a `aria-disabled` y conserva su apariencia.** El manejador ya cortaba solo
—`if (prepareBusy || fixtureActive || chosen.length === 0) return`— así que apretarlo no hace nada, con
`disabled` o sin él. Lo que cambia es que se puede llegar. Se descartó dejar el `disabled` nativo: con
el panel recién abierto no hay nada elegido, que es el estado más frecuente, y en ese estado la acción
principal del panel simplemente no existía para quien recorre con teclado.

Se descartó extender `aria-disabled` a todos los controles deshabilitados. En las casillas durante una
preparación en curso, saltarlas es lo correcto: son muchas, el estado dura poco y no hay nada que
aprender de cada una. La distinción es la que pide la guía —ser deliberado— no una regla uniforme.

**No se agrega `role="list"`.** La pérdida de semántica de lista con `display: flex` es un
comportamiento de Safari; esta aplicación corre sobre Chromium dentro de Electron, donde `<ul>`
conserva su rol. Agregarlo sería ARIA redundante, que la guía desaconseja explícitamente. Queda
anotado por si algún día hay una versión web.

**No se retira el rol de región de las dos secciones del centro.** La guía pide que `region` sea el
último recurso, y acá encaja: la pantalla de entrada y el panel de preparación son las dos áreas
mayores del centro, se alternan entre sí, y poder saltar entre ellas es útil. Retirar sus etiquetas
las volvería anónimas sin ganar nada.

## Risks / Trade-offs

**Un contorno de foco puede chocar con el diseño denso.** → Va en `:focus-visible`, así que sólo
aparece al recorrer con teclado y nunca al hacer clic. El desplazamiento del contorno se elige para que
no empuje nada.

**`aria-disabled` deja un control que se puede apretar y no hace nada.** → Es el intercambio que la
guía describe y por eso se limita a una acción, no a todas. La alternativa —que la acción principal no
exista para el teclado— es peor: no se puede aprender lo que no se puede alcanzar.

**Cambiar `disabled` por `aria-disabled` rompe el test que lo verifica.** → Es un test correcto sobre un
comportamiento que cambia a propósito; se actualiza a `aria-disabled` y se le suma que preparar sin
nada elegido no llama a `stageFiles`, que es la garantía real detrás de aquella aserción.

**Esto no vuelve accesible la aplicación.** → Es una pasada sobre un panel, contra una guía, sin haber
probado con lector de pantalla ni con personas. La propia guía lo dice: ninguna lista de control
reemplaza probar de verdad. Lo que se afirma es que estos tres huecos concretos se cerraron.

## Open Questions

Ninguna que bloquee. Queda pendiente, si alguna vez se quiere, una pasada equivalente sobre el resto de
la aplicación.
