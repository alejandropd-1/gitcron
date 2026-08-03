## ADDED Requirements

### Requirement: El grafo de artefactos se lee del estado real
La aplicación SHALL obtener el estado de los artefactos de un cambio desde el CLI de OpenSpec, leyendo su grafo de dependencias con estados `blocked` / `ready` / `done`, las dependencias faltantes de cada artefacto y los requisitos de `apply`. La lectura SHALL ejecutarse sólo para el cambio seleccionado: el spawn del CLI es costoso y el watcher refresca en cada guardado, así que leerlo para todos los cambios activos pagaría un costo que ningún consumidor usa.

El fundamento es que el panel Pipeline se está convirtiendo en la interfaz visual de OpenSpec, y OpenSpec abandonó el modelo de fases a favor de un grafo de dependencias. Sin leer ese grafo, el panel no puede reflejar qué artefacto bloquea a cuál ni qué falta para que `apply` esté listo, y termina adivinando con un ciclo de vida fijo que no coincide con la realidad del cambio.

#### Scenario: Cambio seleccionado transporta el grafo
- **WHEN** se selecciona un cambio activo y la lectura del CLI del grafo está disponible
- **THEN** el cambio transporta el estado de cada artefacto, sus dependencias faltantes y los requisitos de `apply`

#### Scenario: Los cambios no seleccionados no pagan el costo
- **WHEN** hay varios cambios activos pero sólo uno está seleccionado
- **THEN** la lectura del grafo se invoca una sola vez y los cambios no seleccionados transportan el campo como nulo

#### Scenario: El CLI no pudo ejecutarse
- **WHEN** la invocación del CLI del estado no puede ejecutarse o falla
- **THEN** el campo declara que no está disponible sin confundir esa indisponibilidad con un grafo vacío, y el resto del snapshot sigue llegando
