## ADDED Requirements

### Requirement: El indicador de carga del modelo SHALL ser indeterminado, porque el servidor no expone la fracción
Mientras el modelo carga, el indicador SHALL presentarse como indeterminado —sin
fracción ni porcentaje— y SHALL NOT declarar `aria-valuenow`, `aria-valuemin` ni
`aria-valuemax`. El servidor local de modelos no expone el progreso de carga por
ningún canal accesible sin credencial: está probado por dos vías independientes —el
log de una carga real, que entre `load_model` y `model loaded` sólo registra hitos
discretos sin porcentaje, y el WebSocket en escucha (`/llm`, `/system`,
`/diagnostics`) que durante una carga de 16,5 s no emitió ningún mensaje. Un avance
simulado sería afirmar un estado de la máquina que nadie sabe, que es la misma
mentira que este change corrige en otros canales.

El antecedente es `diagnostics.streamLogs` (tarea 4.26 del change archivado
`draft-commit-message-with-local-ai`): un canal cerrado por el servidor, no por
nosotros. La tarea 4.25 de ese mismo change decía que el servidor exponía la
fracción por WebSocket —es falso, y éste es el change que lo registra para que no
se reabra la investigación.

#### Scenario: Carga en curso
- **WHEN** el modelo está cargando
- **THEN** el indicador se muestra indeterminado, sin `aria-valuenow`, y ningún elemento afirma un porcentaje

#### Scenario: No se consume ni inventa una fracción
- **WHEN** el servidor no emite progreso de carga
- **THEN** el indicador no la simula: se queda indeterminado hasta el fin de la carga

### Requirement: Aparecer el indicador de carga SHALL no mover el panel
El bloque del indicador SHALL ocupar una posición fija dentro de la fila de
controles, de modo que aparecer al apretar el botón de carga no cambie la altura
del panel. El fundamento es que la carga arranca con el botón, justo cuando la
persona está mirando el panel: un salto de contenido en ese instante se lee como
defecto, y es el motivo por el que el bloque ya vive en la fila de controles y no
en una línea propia encima (tarea 4.55 del change archivado). Esa restricción se
conserva.

#### Scenario: Se aprieta cargar
- **WHEN** se inicia la carga del modelo
- **THEN** la altura del panel no cambia al aparecer el indicador

### Requirement: El feedback de carga SHALL ser perceptible y respetar el movimiento reducido
El indicador SHALL dar movimiento y contraste mientras carga —una espera de 8 a 30
segundos sin nada que se mueva se lee como colgada—, y SHALL apagar la animación
con `prefers-reduced-motion: reduce` sin perder la información de que está
cargando. SHALL declarar `role="progressbar"` y `aria-busy="true"`. El movimiento es
informativo, no decorativo; quien lo reduce no lo quiere, pero el dato sigue siendo
necesario, así que la degradación conserva el estado y sólo quita la animación.

#### Scenario: Cargando con movimiento
- **WHEN** el modelo carga y el usuario no pide movimiento reducido
- **THEN** el indicador muestra una animación y declara `role="progressbar"` con `aria-busy="true"`

#### Scenario: Cargando con movimiento reducido
- **WHEN** el modelo carga y el entorno pide `prefers-reduced-motion: reduce`
- **THEN** la animación se apaga, el indicador sigue visible y sigue declarando su estado accesible

### Requirement: El bloque del indicador y su texto SHALL reordenarse y conservar la legibilidad al angostar
La barra SHALL ir arriba, en su propia línea, y el texto de los segundos debajo.
Al angostar la ventana, el bloque SHALL conservar la legibilidad sin que el texto
haga un wrap que rompa su sentido. El fundamento es que hoy la barra y el texto
comparten una sola línea dentro de la fila de controles, y el texto hace wrap raro
al angostar; Ale lo marcó y pidió explícitamente la barra arriba y el texto debajo.

#### Scenario: Disposición del bloque
- **WHEN** el indicador está visible
- **THEN** la barra ocupa su propia línea arriba y el texto de los segundos va debajo

#### Scenario: Ventana angosta
- **WHEN** la ventana se angosta y el indicador está visible
- **THEN** el texto conserva su legibilidad sin un wrap que lo rompa
