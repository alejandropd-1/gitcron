## Decisión: un orden, sin selector

La lista se ordena por avance y no se agrega ningún control para cambiar el criterio.

**Alternativa descartada: un selector de orden**, con opciones por avance, por fecha y alfabético. Se
consideró porque es lo que se pidió evaluar, y tiene a favor cubrir gustos distintos. Se descarta porque
el orden elegido ya responde a los tres casos que motivaban el selector: los casi completados quedan
arriba solos, los no empezados se agrupan al fondo solos, y la fecha entra como desempate. Un selector
que no resuelve nada nuevo agrega un control a una barra ya densa y un estado más que hay que recordar o
reiniciar, multiplicando los estados en que puede estar la pantalla.

Queda anotado el criterio para revisarlo: si algún día la lista pasa de unas pocas decenas de cambios
activos, la pregunta cambia y conviene rehacerla con ese dato.

## Decisión: proporción, no cantidad

Se compara la fracción de tareas completadas, no cuántas casillas hay tildadas.

**Alternativa descartada: ordenar por casillas tildadas.** Es más simple. Se descarta porque premia a
los cambios grandes: cinco de veinte quedaría por encima de tres de cuatro, cuando el segundo está a una
casilla de cerrarse y el primero recién arranca. Lo que se busca destacar es lo que está por terminar,
no lo que tuvo más trabajo.

## Decisión: la fecha desempata, no ordena

Entre cambios con el mismo avance, primero el creado más recientemente.

**Alternativa descartada: no desempatar y dejar el orden que venga.** Se descarta porque el empate no es
un caso raro: es el más común. Los cambios recién creados y los parqueados hace semanas comparten el 0%,
y sin desempate un cambio que se acaba de abrir cae al fondo, mezclado con los que nadie va a tocar. La
marca de creación ya existe desde `show-change-timestamps`, así que el desempate no cuesta nada.

**Sin marca de creación se cae al identificador.** No se inventa una posición ni se manda al fondo: el
identificador al menos es estable entre relecturas, y un orden que cambia solo entre dos refrescos es
peor que uno arbitrario pero fijo.

## Decisión: la función es pura y no muta

Devuelve una lista nueva y no toca la recibida.

**Alternativa descartada: ordenar en el lugar.** Ahorra una copia. Se descarta porque la lista viene del
snapshot y ordenarla en el lugar haría que el resultado dependiera de cuántas veces la vista la haya
recorrido. Es el mismo criterio por el que la derivación del alcance se mantiene pura: lo que se puede
probar con tablas no se ata al momento en que se lo llama.

## Riesgo

**La lista se reordena al tildar una casilla.** Es la consecuencia buscada, pero significa que un ítem
puede moverse mientras se lo mira. Mitigación: no hay una técnica que lo evite sin perder el orden; lo
que sí lo hace tolerable es que el reordenamiento sólo ocurre al completar tareas, que es una acción
deliberada de quien está mirando, y que ahora exige confirmación.

## Sin medir

No se midió si el reordenamiento en vivo molesta: hace falta usarlo con varios cambios avanzando a la
vez. Es la validación de Ale.
