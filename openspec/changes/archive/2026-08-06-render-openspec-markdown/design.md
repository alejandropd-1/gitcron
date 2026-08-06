## Context

`SafeMarkdown` se escribió para mostrar fragmentos y creció hasta ser el visor de todos los artefactos.
Su parser cubre lo que hacía falta cuando se escribió —encabezados de tres niveles, listas, citas,
código y énfasis en negrita— y nadie lo revisó contra un archivo de spec real, que es donde el cuarto
nivel aparece en cada escenario.

El visor es deliberadamente parcial: no usa `dangerouslySetInnerHTML` y sólo interpreta lo que
reconoce. Esa decisión no se toca. Lo que cambia es qué reconoce.

## Goals / Non-Goals

**Goals:**

Que un archivo de spec se lea como está escrito. Que la jerarquía de encabezados del artefacto encaje
bajo la de la página sin saltos. Que las listas se vean como listas.

**Non-Goals:**

Tablas, enlaces, imágenes, cursiva. Interpretar HTML embebido. Reemplazar el parser por una
dependencia.

## Decisions

**Se cuentan las almohadillas en vez de comparar prefijos.** Tres comparaciones escritas a mano son lo
que dejó afuera el cuarto nivel, y agregar una cuarta comparación dejaría afuera el quinto. Una
expresión que captura de una a seis almohadillas cubre el markdown entero de una vez y no vuelve a
quedar corta.

**Los niveles se corren dos posiciones.** El `#` de un artefacto pasa a `h3` porque el panel ya usa
`h2` para su marca y `h3` para los títulos de sección: encajar el documento ahí mantiene el esquema
navegable en orden, que es lo que la guía de accesibilidad pide. `####` pasa a `h6`, y los dos niveles
que sobran se mapean también a `h6` en lugar de inventar elementos que no existen. Se descartó empezar
en `h1`: habría dos `h1` en la página y un salto hacia atrás en el esquema.

**Las viñetas se declaran, no se heredan.** El reajuste global de Tailwind las borra para toda la
aplicación, y esa decisión es de la aplicación entera. El visor las restituye sólo para sí mismo. Se
descartó tocar el reajuste global: rompería el resto de las listas del producto, que están estilizadas
contando con que no hay marcador.

## Risks / Trade-offs

**Cambiar el tipo de bloque toca el parser, que es puro y tiene consumidores.** → El cambio es de
forma, no de comportamiento: los tres niveles que ya funcionaban siguen produciendo los mismos
elementos. Los casos existentes deben pasar sin editarse; si alguno se rompe, es señal de que se
cambió de más.

**Un `h6` es chico para un escenario.** → Es el precio de mantener el esquema en orden, y se compensa
con el tamaño y el peso en CSS: la jerarquía semántica y la visual no tienen por qué coincidir
exactamente, pero la semántica no puede saltarse niveles.

**Restituir viñetas puede chocar con listas anidadas.** → El parser no arma listas anidadas: aplana
todo a un nivel. La viñeta única es coherente con lo que produce; si algún día anida, ahí se decide el
segundo marcador.

## Open Questions

Ninguna que bloquee.
