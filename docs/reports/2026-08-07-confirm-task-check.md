# Marcar una tarea pasa a preguntar

**Change:** `confirm-task-check` · **Fecha:** 2026-08-07 · **Tareas:** 21/22 (falta la validación de Ale
en la aplicación)

## Qué se hizo

Marcar una tarea abre la misma confirmación que ya usaba el desmarcado. El texto cambia según la
dirección, porque lo que hace cada una no es lo mismo.

## Lo que se revisó antes de escribir

El pedido pedía un aviso que dijera que marcar es irreversible. No lo es, y se comprobó en dos lugares.

En la interfaz, el clic sobre una casilla ya marcada abre "¿Desmarcar {tarea}? Borra la constancia de
que se hizo, y queda registrado en el cambio" —Ale lo había usado esa misma tarde sobre la casilla 4.6
de otro cambio—. En el proceso principal, el marcado escribe `tasks.md` y anota la operación en
`task-log.md`, en las dos direcciones.

Así que el aviso no podía decir "irreversible": sería falso en el momento de mostrarse, y esta misma
pantalla lo desmiente dos clics después. Un producto que afirma algo que él mismo contradice enseña a no
leer sus avisos.

## Pero la intuición era correcta, y el texto la recoge

Hay un punto donde marcar se vuelve definitivo: el archivado.
`electron/ipc/pipeline-tasks.ts:88` devuelve `archived` cuando `tasks.md` ya no está bajo
`changes/<id>/`, porque un cambio archivado es de sólo lectura.

El aviso dice eso: *"Queda registrado en el cambio. Se puede desmarcar mientras el cambio siga activo;
una vez archivado, ya no."* Informa más que decir "irreversible" y tiene la ventaja de ser cierto.

## Por qué se invierte una decisión anterior

`OpenSpecDashboard.tsx` justificaba la asimetría: marcar agrega una afirmación que su autor hace en ese
momento, desmarcar borra la constancia de algo que alguien afirmó antes. El razonamiento no era erróneo,
era incompleto. Distinguía bien el contenido de cada acción y dejaba fuera lo que comparten: las dos
escriben en el repositorio con un clic que se puede errar.

Y marcar no es inocuo. Tildar la última casilla pendiente cambia el estado del cambio y hace aparecer
archivar como acción principal, que es la puerta a un movimiento de Git. Un clic accidental podía dejar
el cambio ofreciendo cerrarse.

El comentario se reescribió con el motivo nuevo en vez de borrarse, para que nadie reponga la asimetría
con el argumento original.

## La corrección que hizo falta, y por qué

La primera versión puso la confirmación en el bloque del encabezado del panel, el mismo que usa el
archivado. Ale la probó y el defecto apareció enseguida: las casillas se tildan bajando por la lista de
tareas, así que tildar la 5.6 de un cambio con veintitrés obligaba a bajar hasta ella, hacer clic, y
volver a subir hasta arriba de todo para responder.

El argumento con el que se había descartado el toast era además falso. Decía que un toast "aparece
lejos de lo que se tocó" — el que aparecía lejos era el bloque del panel. Y "se va solo" tampoco
aplicaba: los que se van solos son los de éxito, con temporizador; el de decisión de pull espera una
respuesta.

La versión final copia ese patrón: `glass-alert-warning`, ámbar `#f4b942`, `role="alertdialog"`, fijo
abajo de la ventana. Está a la vista sin importar dónde esté el scroll. Es el defecto que sólo aparece
usando la aplicación, no leyendo el código.

No se generalizó el toast de pull para compartir un componente único: tiene lógica propia por modo y
toca un camino de Git que funciona y que nadie pidió tocar. Queda anotado como deuda: si aparece un
tercer uso del patrón, conviene unificarlo antes de escribirlo por tercera vez.

**Sin cruz de descarte.** El toast de pull la lleva porque descartar no es ninguna de sus acciones; acá
"Cancelar" ya está entre los botones, y dos controles con el mismo texto y el mismo efecto es
exactamente lo que la guía de este panel prohíbe.

## Lo otro que se descartó

**Un toast que avise después, con deshacer.** Es más liviano, pero no evita el clic accidental: sólo lo
cuenta. La escritura ya ocurrió, el registro ya se anotó, y si era la última casilla el cambio ya pasó a
ofrecer archivar.

## Resultado real de las comprobaciones

`pnpm exec tsc --noEmit` en cero. Lint limpio sobre los archivos tocados.
`openspec validate confirm-task-check --strict` válido.

`pnpm test` en **103 archivos / 759 tests**. Son tres más que la base de 756: la prueba que fijaba el
comportamiento anterior se actualizó en lugar de agregarse, y las tres nuevas son la cancelación del
marcado, el texto propio del aviso y la superficie fija.

Se corrió cuatro veces: **tres verdes y una con un fallo**. El detalle de ese fallo **no se capturó** —se
perdió al recortar la salida del comando— y no volvió a aparecer en las dos corridas posteriores, ambas
completas. Se declara así en vez de omitirlo: no se sabe si fue uno de los flakes conocidos del proyecto
—EBUSY al borrar temporales, o el caso sensible al tiempo de `pipeline-guided-wiring`— o algo propio de
este cambio. Lo que sí se sabe es que los seis tests de esta funcionalidad pasaron en las cuatro
corridas, porque se corrieron además aislados.

## El riesgo que se asume, sin medir

Tildar varias casillas seguidas pasa a costar el doble de clics, y el circuito de cierre de una tanda
tilda varias. No hay forma de medir cuánto molesta sin usarlo. Si resulta molesto, la vuelta atrás es
una condición en un solo lugar. Lo que no se va a hacer para aliviarlo es recordar la decisión ni
preseleccionar: eso reintroduce el clic que no se quiso hacer.

## Lo que falta

Ale valida en la aplicación y decide si la fricción es aceptable.
