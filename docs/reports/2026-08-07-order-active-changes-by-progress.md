# La lista de cambios activos declara un orden

**Change:** `order-active-changes-by-progress` · **Fecha:** 2026-08-07 · **Tareas:** 15/16 (falta la
validación de Ale)

## Qué se hizo

Los cambios activos se ordenan por proporción de tareas completadas, de mayor a menor, y desempatan por
fecha de creación, primero el más reciente.

## El estado del que se partía

La lista no se ordenaba por **ningún** criterio: se recorría `activeChanges` tal como llegaba, en el
orden en que el sistema de archivos lista `openspec/changes`. Alfabético por accidente, no por decisión.
La de archivados sí se ordena, por fecha y en el lector, así que la de activos era el único listado del
panel sin criterio.

Con unos pocos cambios abiertos ya se notaba: uno al 96%, a una casilla de archivarse, quedaba debajo de
tres parqueados en 0%.

## Por qué no hay selector

Ale planteó si convenía un selector o un filtro —por fecha, por no empezados, por casi completados—. La
respuesta es que el orden elegido **ya responde a los tres casos**: los casi completados quedan arriba
solos, los no empezados se agrupan al fondo solos, y la fecha entra como desempate.

Un selector que no resuelve nada nuevo agrega un control a una barra ya densa y un estado más que
recordar o reiniciar. Queda anotado el criterio para revisarlo: si la lista pasara de unas pocas decenas
de cambios activos, la pregunta cambia.

## Dos decisiones que importan más de lo que parecen

**Proporción, no cantidad.** Ordenar por casillas tildadas premia a los cambios grandes: cinco de veinte
quedaría por encima de tres de cuatro, cuando el segundo está a una casilla de cerrarse. Hay una prueba
que fija exactamente ese par.

**El desempate no es un adorno.** El empate es el caso más común, porque los recién creados y los
parqueados hace semanas comparten el 0%. Sin desempate, un cambio que se acaba de abrir cae al fondo
mezclado con los que nadie va a tocar. La marca de creación ya existía desde `show-change-timestamps`,
así que no costó nada.

Sin marca de creación se cae al identificador en vez de inventar una posición: un orden que cambia solo
entre dos refrescos es peor que uno arbitrario pero fijo.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm test` en **106 archivos / 777 tests**: un archivo y siete tests
más que la base de 105/770, que son exactamente los agregados. Lint limpio sobre los tres archivos
tocados. `openspec validate order-active-changes-by-progress --strict` válido.

## Lo que no se midió

**Si molesta que la lista se reordene al tildar una casilla.** Es la consecuencia buscada del orden, pero
significa que un ítem puede moverse mientras se lo mira. No hay forma de saber si estorba sin usarlo con
varios cambios avanzando a la vez. Lo que lo hace tolerable es que sólo ocurre al completar tareas, que
es una acción deliberada y que ahora además pide confirmación.
