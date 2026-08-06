## ADDED Requirements

### Requirement: El progreso no se declara como una secuencia de etapas fijas
El panel SHALL NOT presentar el trabajo de un cambio como una secuencia ordenada de etapas, y SHALL NOT
numerar una posición dentro de ella. El estado de cada artefacto SHALL declararse a partir del grafo
que devuelve el CLI, y las señales operativas —validación, avance de tareas, qué conviene hacer ahora—
SHALL seguir declarándose donde ya se derivan de evidencia.

El fundamento es que OpenSpec abandonó el modelo de fases: se puede trabajar sobre cualquier artefacto
habilitado en cualquier momento, y las dependencias habilitan en vez de bloquear el orden. Un contador
que declara una posición dentro de cinco etapas no es una imprecisión estética: enseña un orden
obligatorio que no existe, y lo enseña con la autoridad de la herramienta. Mientras convivió con el
grafo del CLI, el panel daba dos respuestas distintas a la misma pregunta y una era inventada.

Nada de lo que la secuencia mostraba queda sin respuesta: el estado por artefacto lo da el grafo, la
validación la declara la barra de evidencia, el avance de tareas la lista de cambios, y la acción
siguiente la guía. Retirar la secuencia quita una afirmación falsa sin quitar información.

#### Scenario: Cambio abierto
- **WHEN** se abre un cambio activo
- **THEN** el panel no muestra una secuencia de etapas ni una posición numerada dentro de ella

#### Scenario: La guía conserva su acción
- **WHEN** la guía del siguiente paso declara qué conviene hacer
- **THEN** ofrece su acción sin declarar una posición dentro de una secuencia

#### Scenario: El estado de los artefactos sigue disponible
- **WHEN** el cambio abierto transporta el grafo del CLI
- **THEN** el estado de cada artefacto sigue declarándose a partir de ese grafo

#### Scenario: Relectura de evidencia en curso
- **WHEN** la evidencia se está releyendo con un cambio abierto
- **THEN** el panel lo declara en el encabezado del cambio
