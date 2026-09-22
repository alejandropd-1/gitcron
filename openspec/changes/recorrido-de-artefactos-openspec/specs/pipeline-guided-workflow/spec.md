## MODIFIED Requirements

### Requirement: Lo escrito en el flujo de cambio nuevo sobrevive a salir del panel
El panel SHALL conservar el borrador del flujo de cambio nuevo —que esté abierto, el paso del
recorrido, el objetivo, el slug, las restricciones, las casillas y las sesiones que cada paso
arrancó— cuando se sale de Pipeline y se vuelve. El borrador SHALL tener alcance por repositorio, y
SHALL descartarse al cerrar el flujo explícitamente y cuando la persona pasa al cambio recién
creado desde el propio recorrido.

El fundamento original sigue: se pierde entero no por decisión sino por cómo están montadas las
solapas (`components/RepoMainView.tsx`: cada solapa es un `return` distinto, ir al grafo desmonta
`PipelineWorkspace`). Lo que cambia es el momento en que se descarta. Antes se descartaba al
arrancar la sesión, porque en ese instante lo escrito ya estaba en manos del ejecutor. Con el
recorrido de apertura (`change-opening-journey`) ese instante ya no es el final: el paso tiene que
mostrar qué contestó el motor, y para eso el borrador guarda la sesión que arrancó. Descartarlo al
arrancar dejaría al paso sin forma de encontrar su respuesta. El momento en que la persona terminó
con el borrador pasa a ser cuando ella misma pasa al cambio recién creado, o cuando cierra el flujo
a mano. Que el tablero saltara solo apenas aparecía la carpeta fue rechazado por Alejandro el
2026-09-22 mirando la pantalla: el salto ocurría con la bitácora todavía corriendo y sin decir que
el trabajo había terminado. Una exploración sin
propuesta se queda en el borrador hasta que se cierre: es la memoria del recorrido, no basura.

Decisión medida el 2026-09-21 en la tanda 4a del change `recorrido-de-artefactos-openspec`: el
ejecutor quitó el descarte al arrancar sin declararlo; se conserva el cambio de regla porque el
recorrido lo necesita, y se declara acá.

#### Scenario: Volver a Pipeline después de mirar otra solapa
- **WHEN** se está escribiendo un cambio nuevo, se va a otra solapa y se vuelve a Pipeline
- **THEN** el formulario sigue abierto con el paso, el objetivo, el slug y lo demás como estaban

#### Scenario: Otro repositorio
- **WHEN** se vuelve a Pipeline en un repositorio distinto de aquel donde se estaba escribiendo
- **THEN** el formulario no muestra el borrador del otro repositorio

#### Scenario: Cerrar el flujo sin empezar
- **WHEN** se cierra el flujo con la acción de cerrar sin empezar
- **THEN** el borrador se descarta y volver a Pipeline no lo trae de vuelta

#### Scenario: Sesión arrancada
- **WHEN** se arranca la sesión de un paso con la instrucción compuesta
- **THEN** el borrador guarda el identificador de esa sesión en el paso y no se descarta

#### Scenario: El cambio propuesto aparece
- **WHEN** el cambio propuesto aparece en el repositorio y la sesión que lo creó terminó
- **THEN** el recorrido lo declara y ofrece pasar al cambio, sin llevar a la persona por su cuenta

#### Scenario: La persona pasa al cambio creado
- **WHEN** la persona acepta pasar al cambio recién creado desde el recorrido
- **THEN** el tablero lo selecciona, el borrador se descarta y abrir «Nuevo cambio» después empieza de cero
