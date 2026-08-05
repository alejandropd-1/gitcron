## Context

El formulario de propuesta se construyó para reemplazar un textarea con `/opsx:propose` pelado por
campos con nombre. Esa mejora resolvió qué escribir y no resolvió qué pasa después: la instrucción
compuesta es visible sólo en el paso siguiente, así que entre completar el formulario y verla hay un
salto donde no se sabe qué se está armando.

La columna de actividad muestra siempre una sesión —la elegida o la más reciente del conjunto— y
declara su runtime y su estado. `formatSessionOption` (`OpenSpecDashboard.tsx:142`) sí compone la fecha,
pero sólo alimenta las opciones del selector, y el selector se renderiza únicamente con más de una
sesión.

La restricción de producto es la invariante 11: nada de textos explicativos dentro de la app. La
lectura que se aplica acá: decir dónde termina un campo es declarar el efecto de un control, no
explicar qué es OpenSpec. Es lo mismo que ya hace la ayuda del slug al declarar su formato.

## Goals / Non-Goals

**Goals:**

Que quien completa el formulario sepa que está escribiendo el encargo y no el artefacto, y dónde
termina cada campo. Que la columna de actividad declare cuándo corrió lo que muestra, y de qué alcance
es.

**Non-Goals:**

Cambiar qué sesión se elige mostrar. Mover la instrucción del lanzador al formulario. El ancho de los
paneles de artefactos.

## Decisions

**La declaración va por campo y una vez arriba, no en un bloque aparte.** Cada campo dice dónde
termina, junto al campo, donde la ayuda del slug ya lo hace. Arriba va una sola frase que declara la
naturaleza de todo el formulario. Se descartó un bloque explicativo al principio: sería el texto
explicativo que la invariante 11 prohíbe, y además se lee una vez y se ignora después.

**No se adelanta la instrucción al formulario.** Verla completa mientras se escriben los campos
duplicaría la superficie del lanzador y obligaría a mantener dos vistas del mismo texto. Se declara qué
va a pasar y la instrucción sigue apareciendo entera, y editable, en el paso siguiente.

**El cuerpo se ensancha en lugar de recortar los textos.** El formulario ocupa hoy una fracción del
centro y las ayudas nuevas lo apretarían. Se descartó acortar los textos hasta que entren: el problema
es el ancho disponible, no la longitud de lo que hay que decir.

**La fecha se muestra siempre, no sólo con selector.** Se descartó dejarla únicamente en las opciones
del selector: eso hace que el dato aparezca o desaparezca según cuántas sesiones haya, y el caso en que
falta —una sola sesión, posiblemente vieja— es justamente donde más se necesita.

**El alcance se declara sólo cuando no hay cambio abierto.** Con un cambio abierto la columna ya está
acotada a él y decirlo sería repetir lo que el panel entero declara. Sin cambio abierto, lo que se ve
es lo último del repositorio y eso no se deduce de nada en pantalla.

## Risks / Trade-offs

**Sumar texto choca con la invariante estética.** → Una frase arriba y una línea por campo, con el
mismo tratamiento que la ayuda del slug que ya existe. La comprobación es la validación visual de Ale,
que es condición de aceptación.

**Declarar la fecha puede agrandar un encabezado ya cargado.** → Va en la misma fila que el estado, que
es corto, y no agrega altura. Si la validación visual dice otra cosa, se mueve.

**Ensanchar el formulario puede desalinearlo del resto del centro.** → Se ensancha hasta el ancho que
ya usan los demás paneles del centro, no más allá; el objetivo es que deje de ser más angosto que su
contenedor, no que sea el más ancho.

## Open Questions

Ninguna que bloquee.
