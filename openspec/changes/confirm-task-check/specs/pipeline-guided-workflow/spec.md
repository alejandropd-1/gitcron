## ADDED Requirements

### Requirement: Marcar una tarea pide confirmación
Marcar una tarea como hecha SHALL requerir una confirmación explícita antes de escribir. El aviso SHALL
nombrar la tarea, SHALL declarar que la marca queda registrada en el cambio, y SHALL decir que se puede
desmarcar mientras el cambio siga activo y que deja de poder deshacerse una vez archivado. El aviso
SHALL NOT afirmar que la acción es irreversible.

El fundamento es que marcar escribe en el repositorio con un solo clic, y ese clic se puede errar. No es
inocuo: tildar la última casilla pendiente cambia el estado del cambio y hace aparecer archivar como
acción principal, que es la puerta a un movimiento de Git. Un clic accidental no sólo afirma algo que
nadie quiso afirmar, además puede dejar el cambio ofreciendo cerrarse.

Que el aviso no diga "irreversible" no es un matiz de redacción: sería falso en el momento en que se
muestra, porque la misma pantalla ofrece desmarcar dos clics después. Un producto que afirma algo que él
mismo desmiente enseña a no leer sus avisos. Lo que sí es cierto y hace falta decir es hasta cuándo se
puede deshacer: un cambio archivado es de sólo lectura, así que la marca se vuelve definitiva al
archivar, no al hacer clic.

#### Scenario: Clic sobre una casilla sin marcar
- **WHEN** se hace clic en una tarea que no está marcada
- **THEN** aparece la confirmación y la tarea todavía no se marca

#### Scenario: Confirmación aceptada
- **WHEN** se acepta la confirmación de marcado
- **THEN** la tarea queda marcada y el cambio se escribe

#### Scenario: Confirmación cancelada
- **WHEN** se cancela la confirmación de marcado
- **THEN** la tarea sigue sin marcar y no se escribe nada

#### Scenario: Lo que declara el aviso
- **WHEN** se muestra la confirmación de marcado
- **THEN** dice que queda registrado y hasta cuándo se puede deshacer, sin llamarlo irreversible

### Requirement: El desmarcado conserva su propia confirmación
Desmarcar una tarea SHALL seguir pidiendo su confirmación, con su texto propio.

El fundamento es que las dos direcciones ahora preguntan pero no dicen lo mismo: marcar agrega una
afirmación, desmarcar borra la constancia de algo que alguien afirmó antes y lo deja anotado en el
registro del cambio. Unificar los dos textos perdería esa diferencia, que es la que le dice a quien lee
qué está por hacer.

#### Scenario: Clic sobre una casilla marcada
- **WHEN** se hace clic en una tarea ya marcada
- **THEN** aparece la confirmación de desmarcado con su texto propio

### Requirement: La confirmación aparece a la vista, sin depender del scroll
La confirmación de un cambio de casilla SHALL mostrarse en una superficie fija respecto de la ventana,
visible sin desplazar la lista de tareas. SHALL NOT desaparecer sola por temporizador, porque espera una
decisión.

El fundamento es que las casillas se tildan recorriendo la lista de tareas con scroll, y la pregunta
tiene que estar donde la persona ya está mirando. Mostrarla en el encabezado del panel obliga a bajar
hasta la casilla, hacer clic, y volver a subir hasta arriba de todo para encontrarla: en un cambio de
veintitrés tareas eso es un viaje completo por cada casilla. La aplicación ya tiene el patrón resuelto
en su toast de decisión, que es fijo y espera una respuesta.

#### Scenario: Casilla al final de una lista larga
- **WHEN** se tilda una casilla que quedó fuera de la vista inicial por el scroll
- **THEN** la confirmación se ve sin necesidad de volver arriba

#### Scenario: La confirmación espera
- **WHEN** se muestra la confirmación y no se responde
- **THEN** sigue en pantalla hasta que se acepte o se cancele
