# El flujo de cambio nuevo se puede cerrar

**Change:** `close-new-change-flow` · **Fecha:** 2026-08-07 · **Tareas:** 12/14 (falta la suite con el
entorno apagado y la validación de Ale)

## Qué se hizo

El flujo de cambio nuevo ofrece cerrarse sin empezar nada, en sus dos modos, con el control arriba y a
la derecha del formulario.

## El defecto

Abrirlo era un viaje de ida. `flowMode`, el estado que muestra el formulario, sólo vuelve a nulo en tres
casos: al elegir un cambio, al lanzar una tarea y al archivar. En la pantalla de inicio no hay ninguno
de los tres disponible, porque es justamente la pantalla donde todavía no se eligió nada.

Y abrir para mirar es un uso previsto: las dos entradas están una al lado de la otra y la propia guía
invita a ello —"Entrá a uno de los cambios en curso, o empezá otro"—. Ale lo encontró haciendo
exactamente eso.

## Dónde va la salida, y por qué se movió

La primera versión la puso dentro del formulario, arriba a la derecha. Ale la vio y marcó que iba en
otro lado: en la fila de la guía, junto a las dos acciones que abren el flujo.

Tenía razón, y el motivo es más fuerte que la ubicación. Las tres son opciones del mismo grupo —empezar
de un modo, del otro, o no empezar—, así que juntas se leen como lo que son. Dentro del formulario el
control quedaba al lado del selector de modo, que repite las mismas dos opciones, y competía con él sin
que se entendiera con qué se relacionaba.

Se implementó como una acción opcional de la guía, que recibe la etiqueta y el efecto ya resueltos: el
componente sigue sin decidir nada, que es su regla. Va al final de la fila y separada del resto, con
contorno pero sin relleno, para no competir con las dos acciones de empezar.

Se descartó que las entradas funcionaran como interruptor —volver a pulsar "Tengo clara la tarea" para
cerrar—: duplicaría el control y dejaría dos formas de hacer lo mismo, que es lo que la guía de este
panel evita.

## Un detalle del cableado

Los dos montajes del flujo comparten el nombre de la prop de arranque con el lanzador de runtime, que
está cerca en el mismo archivo. Al conectar el cierre había que no tocar el lanzador, que tiene su
propio ciclo: se verificó y quedó fuera.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. Lint limpio sobre los archivos tocados.
`openspec validate close-new-change-flow --strict` válido. Las dos pruebas nuevas pasan.

**La suite completa queda pendiente, ni verde ni roja.** La corrida cayó con seis archivos, todos por
`Test timed out in 5000ms` y **ninguno por aserción**, con cuarenta procesos de `node`/`electron`
activos: es el entorno de desarrollo levantado, que es un caso conocido y documentado del proyecto. Los
archivos afectados pasan aislados —15 tests verdes en una corrida acotada— y los dos de este cambio
también.

Se declara así en vez de redondearlo: declarar verde sin haber corrido la suite entera en condiciones
invalidaría la tanda, y afirmar rojo con esa evidencia sería igual de falso. Queda por correr con
`electron:dev` apagado.
