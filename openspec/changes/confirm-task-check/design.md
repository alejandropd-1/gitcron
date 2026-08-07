## Decisión: el aviso dice hasta cuándo se puede deshacer, no que sea irreversible

El texto declara que la marca queda registrada, que se puede desmarcar mientras el cambio siga activo, y
que deja de poder deshacerse una vez archivado.

**Alternativa descartada: decir que la acción es irreversible.** Es lo que se pidió al plantear el
cambio, y es más contundente. Se descarta porque es falso en el momento en que se muestra: la misma
pantalla ofrece desmarcar la casilla dos clics después, con su propio diálogo. Un producto que afirma
algo que él mismo desmiente enseña a no leer sus avisos, y este panel se apoya en que lo que dice sea
cierto —es el mismo criterio por el que la evidencia lleva su confianza encima y por el que un fallo se
informa con su motivo real en vez de normalizarse—.

La intuición detrás del pedido igual era correcta y el texto la recoge: hay un punto donde marcar se
vuelve irreversible, y es el archivado. `electron/ipc/pipeline-tasks.ts:88` devuelve `archived` cuando
`tasks.md` ya no está bajo `changes/<id>/`. Decir *cuándo* deja de poder deshacerse informa más que
decir que nunca se puede.

**Alternativa descartada: un aviso posterior con deshacer, sin frenar el clic.** Es más liviano para
tildar varias casillas seguidas. Se descarta porque no evita el clic accidental, sólo lo cuenta después:
la escritura en el repositorio ya ocurrió, el registro en `task-log.md` ya se anotó, y si era la última
casilla pendiente el cambio ya pasó a ofrecer archivar.

## Decisión: el toast fijo del sistema, no el bloque del panel

La confirmación usa el patrón de toast de decisión que ya existe en la aplicación: fijo abajo de la
ventana, ámbar, con su título, su explicación y sus botones.

**Alternativa descartada: reutilizar el bloque de confirmación del panel**, que es lo que usa el
desmarcado. Fue la primera versión de este cambio y estaba mal, con un argumento que además era falso:
se había descartado el toast porque "aparece lejos de lo que se tocó". El que aparece lejos es el bloque
del panel. Ese bloque se renderiza arriba, junto a las pestañas, mientras que las casillas se tildan en
la lista de tareas, que se recorre con scroll: tildar la casilla 5.6 de un cambio con veintitrés tareas
obliga a bajar hasta ella, hacer clic, y volver a subir hasta arriba de todo para encontrar la pregunta.
Ale lo detectó al probarlo, que es donde este tipo de defecto se ve.

Un toast `fixed` no tiene ese problema: está siempre a la vista, sin importar dónde esté el scroll.

El otro argumento descartado —"un toast se va solo y deja el panel sin rastro"— tampoco aplica: los que
se van solos son los de éxito, con temporizador. El de decisión de pull, que es el patrón que se copia,
no se va solo y espera una decisión.

## Decisión: se replica el patrón visual, sin tocar el toast de pull

Se extrae un componente de confirmación con las mismas clases y colores del toast de decisión
—`glass-alert-warning`, ámbar `#f4b942`, `role="alertdialog"`, fijo abajo— y el toast de pull queda
como está.

**Alternativa descartada: generalizar el toast de pull y que ambos usen el mismo componente.** Dejaría
una sola definición del patrón, que es más limpio. Se descarta por ahora porque ese toast tiene lógica
propia por modo —`behind` y `diverged` ofrecen botones distintos— y refactorizarlo entra en un camino de
Git que funciona y que nadie pidió tocar. Queda anotado como deuda conocida: si aparece un tercer uso
del patrón, conviene unificarlo antes de escribirlo por tercera vez.

**El desmarcado se mueve también.** Las dos direcciones comparten el mismo control y el mismo problema
de ubicación; dejar una en el toast y otra en el panel sería peor que cualquiera de las dos opciones
consistentes.

## Decisión: la asimetría anterior se reemplaza, no se contradice

El comentario que justificaba que sólo el desmarcado preguntara se reescribe con el motivo nuevo, en vez
de borrarse.

**Alternativa descartada: quitar el comentario.** Se descarta porque el razonamiento anterior no era
erróneo, era incompleto: distinguía bien el contenido de cada acción y no consideraba que las dos se
disparan con un clic que se puede errar ni que marcar la última casilla habilita archivar. Dejar escrito
por qué cambió evita que alguien reponga la asimetría con el argumento original.

## Riesgo

**Más fricción al tildar varias casillas seguidas.** El circuito de cierre de una tanda tilda varias, y
ahora cuesta el doble de clics. Mitigación: el diálogo se confirma con Enter, y la condición vive en un
solo lugar, así que revertirlo es cambiar una línea. No se mitiga preseleccionando ni recordando la
decisión: eso reintroduciría el clic que no se quiso hacer.

## Sin medir

No se midió cuánto molesta la fricción en el uso real, porque no hay forma de saberlo sin usarlo. La
comprobación es la validación de Ale en la aplicación, y si resulta molesta el camino de vuelta está
escrito arriba.
