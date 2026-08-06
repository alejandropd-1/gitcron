## Context

Los cinco defectos vienen de la misma causa: cada pieza se maquetó resolviendo su caso y ninguna se
midió contra el movimiento del conjunto. El conteo y el control de sumar se escribieron pensando en su
contenido, no en que su contenido cambia; el ritmo tipográfico de los artefactos se heredó de cuando
el panel mostraba fragmentos cortos y no documentos largos; y el control del encabezado creció por
capas —primero rótulo, después botón, después pastilla— sin que nadie lo mirara entero.

La invariante 11 pide denso, oscuro, productivo. Nada acá la contradice: un texto que salta no es
denso, es inestable, y un documento de prosa larga sin ritmo no es productivo de leer.

## Goals / Non-Goals

**Goals:**

Que tildar una casilla no mueva nada más que la casilla. Que un documento largo se pueda leer. Que el
control del encabezado se lea como una sola cosa y que la rama sea visible como el dato que decide.

**Non-Goals:**

Leer el contenido de las especificaciones —exige que el snapshot lo transporte—. El ancho de los
paneles de artefactos. La atribución de código.

## Decisions

**El ancho se reserva, no se recalcula.** Los controles que alternan texto —«Sumar todos» / «Quitar
todos»— y el conteo reciben un ancho mínimo suficiente para su variante más larga, y los números usan
cifras de ancho fijo. Se descartó igualar los textos para que midan lo mismo: escribir peor para que
no se mueva es resolver el síntoma rompiendo lo que ya funciona. Se descartó también fijar un ancho
exacto en píxeles: con tres lenguas, el que entra en una no entra en otra.

**El ritmo tipográfico distingue bloques, no sólo los separa.** El interlineado sube y la separación
entre bloques deja de ser uniforme: un encabezado se despega más de lo que lo precede que de lo que
introduce, que es lo que hace legible un documento largo. Se descartó aplicar una hoja de estilo de
prosa completa: los artefactos se leen dentro de un panel denso y llevarlos a ritmo de artículo los
haría ocupar el doble.

**El control del encabezado pierde el marco y gana una línea.** Va sobre la barra de resumen, que ya
tiene fondo y borde inferior propios: un marco adentro de otro marco es la caja que sobra. Todo pasa a
una fila —punto de estado, frase, rama, acción— y la rama recibe el mismo tratamiento de pastilla que
ya tiene dentro del panel de preparación, para que el mismo dato se vea igual en los dos lugares. Se
descartó dejarla como texto secundario debajo: es el destino del commit, no un detalle del estado.

**La acción conserva su forma de botón.** Se descartó volverla un texto: es la única acción del
encabezado y perder su marco la haría indistinguible de la frase que tiene al lado, que es el defecto
opuesto al que se corrige.

## Risks / Trade-offs

**Reservar ancho puede dejar hueco cuando el texto es corto.** → Es el intercambio buscado: un hueco
estable se lee mejor que un texto que se mueve. El ancho se toma de la variante más larga en español,
que es la lengua fuente; si en otra lengua queda corto, el control envuelve en vez de empujar.

**Subir el interlineado hace que los artefactos ocupen más.** → Sí, y por eso el escalón es uno solo.
El panel tiene su propio scroll y el problema que se resuelve —no poder leer un documento largo— pesa
más que ver dos líneas menos por pantalla.

**Rediseñar el control del encabezado toca lo que Ale acaba de validar.** → Lo validado fue que se
leyera como algo apretable y que la acción se anunciara; las dos cosas se conservan. Lo que cambia es
la caja que lo envolvía y el lugar de la rama, que es exactamente lo que pidió.

## Open Questions

Ninguna que bloquee. Queda para la validación visual si el tono elegido para la rama la distingue lo
suficiente sin competir con la acción.
