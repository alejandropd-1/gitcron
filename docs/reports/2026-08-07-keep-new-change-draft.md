# Lo escrito en el flujo de cambio nuevo sobrevive a salir del panel

**Change:** `keep-new-change-draft` · **Fecha:** 2026-08-07 · **Tareas:** 22/23 (falta la validación
visual de Ale) · **Rama:** `change/keep-new-change-draft`

## Qué se hizo

El borrador de un cambio nuevo —que el formulario esté abierto, el modo, el objetivo, el slug, las
restricciones y las dos casillas— sobrevive a irse a otra solapa y volver. Tiene alcance por repositorio y
se descarta en dos momentos: al cerrar sin empezar y al arrancar la sesión.

## El defecto, con su causa medida

Ale estaba a mitad de empezar un cambio, fue a Graph a mirar algo y al volver el formulario no estaba:
tuvo que rehacerlo desde cero.

La causa está en el código y no se dedujo: en `components/RepoMainView.tsx:270` cada solapa es un `return`
distinto —`History`, `Commit`, `Pipeline`, el grafo—, así que sólo una está montada a la vez. Cambiar de
solapa no oculta Pipeline: lo **desmonta**, y React se lleva con él todo `useState` del árbol.

Lo primero que se pierde es `flowMode`, que es lo que hace visible el formulario. Por eso al volver no
queda ni rastro de que había algo empezado, que es lo que más desconcierta.

La sesión de runtime **no** se pierde —vive en el proceso principal y vuelve por el snapshot—. Lo que se
pierde es todo lo anterior a arrancarla, que es justamente donde está el trabajo humano.

Es el mismo principio que este panel ya sostuvo dos veces esta semana: atender otra cosa no puede costar
el objetivo y el slug. Acá era peor, porque ni siquiera había un aviso.

## La decisión, y la que se descartó

El borrador sale del componente y va a un store de Zustand, del mismo tipo que el que la aplicación ya usa
para el estado de Git.

**Se descartó mantener Pipeline montado y ocultarlo con CSS.** Es menos código y salva más —selección,
scroll y solapa del rail, además del borrador—. Se descarta por lo que deja corriendo: el panel quedaría
suscrito a los refrescos mientras se mira otra solapa, y cada refresco hace trabajo de Git real. Está
medido en este proyecto: 97 ms la pasada de `git log`, 63–105 ms `rev-list`, 71–133 ms `git status`, y el
watcher refresca en cada guardado de archivo. Pagar eso mientras nadie mira el panel es costo sin
contrapartida, y encima se le sumaría al grafo, que es la vista que más trabajo hace.

**Se descartó persistir a disco.** El problema medido es cambiar de solapa, no reiniciar, y guardar texto a
medio escribir abre preguntas —cuándo caduca, qué pasa si el repositorio cambió— que nadie pidió responder.

Ale acotó el alcance a lo escrito. La selección, el scroll y la solapa del rail se siguen perdiendo: son un
clic, no un párrafo. Si alguna vez se decide que también tienen que sobrevivir, la decisión de fondo cambia
y hay que volver a la alternativa descartada, midiendo antes.

## Por repositorio, y no global

La clave del store es la ruta del repositorio. `PipelineWorkspace` ya se remonta a propósito al cambiar de
repositorio —tiene `key={repoPath}` para no mostrar el snapshot del anterior—, y un borrador global
reintroduciría ese mismo defecto, con el agravante de que el texto aparecería como si fuera del
repositorio nuevo.

## Qué se conserva y qué no

Se conserva lo que la persona escribió o decidió. **No** se conserva lo transitorio: los errores de
validación, el motivo real de un fallo de Git y la instrucción ya compuesta. Esa última en particular se
recompone de los campos, y guardarla sería un segundo lugar donde vive el mismo dato —exactamente lo que
este panel evita en todos lados—.

## Un efecto de segundo orden que apareció en las pruebas

Mover el estado a un store global lo hace sobrevivir también **entre pruebas**: lo escrito en un caso
aparecía en el siguiente, y cinco casos de dos archivos empezaron a fallar. No es un defecto del cambio,
es su contrapartida directa, y se resuelve reseteando el store en cada caso. Quedó anotado en los cuatro
archivos que montan el flujo, con el motivo, para que nadie lo lea como ruido.

También se retiró la prop `initialMode`: el modo ahora vive en el borrador, y sostener las dos fuentes las
haría divergir.

## Una tilde que se corrigió

La tarea 4.4 —«cerrar sin empezar descarta, y al volver el formulario está vacío»— se marcó antes de tener
la prueba. Se detectó al revisar y se escribió la prueba, que vive junto a las otras dos de cerrar el
flujo. Se anota porque una casilla marcada sin su verificación es peor que una sin marcar.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. `pnpm exec eslint` limpio sobre lo tocado.
`openspec validate keep-new-change-draft --strict` válido.

`pnpm test` en **116 archivos / 850 tests**, corrida completa en verde. La base antes de esta tanda era
115 archivos / 843 tests: entra un archivo y siete casos.

## Lo que falta

La tarea 5.6: Ale escribe un cambio, se va a Graph, vuelve y lo encuentra como estaba. Se tilda antes de
archivar.
