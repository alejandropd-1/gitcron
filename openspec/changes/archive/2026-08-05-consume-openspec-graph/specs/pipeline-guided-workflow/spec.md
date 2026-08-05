## ADDED Requirements

### Requirement: El estado de los artefactos se lee del grafo de OpenSpec

El panel SHALL mostrar, para el cambio seleccionado, el estado de cada artefacto de planificación
tal como lo devuelve `openspec status --json`, y SHALL NOT derivarlo de un modelo propio. El estado
de cada artefacto (`done`, `ready` o `blocked`) SHALL leerse del campo `status.artifacts` del cambio
seleccionado, y cuando un artefacto esté `blocked` SHALL declarar qué dependencias le faltan.

La superficie del grafo SHALL mostrarse junto a los artefactos del cambio seleccionado. Cuando el
grafo no exista —`status` ausente, o `available: false` por un CLI que no pudo correr— la superficie
SHALL NOT renderizarse, y SHALL NOT inventarse un estado derivado de las tareas o la validación como
sustituto. La barra de fases del encabezado y el contador «Paso N de 5» SHALL NOT modificarse en
esta pasada.

Lo que se rompe si no se cumple: el dato que `consume-openspec-status` cableó hasta el renderer
sigue sin consumirse, y el panel continúa mostrando progreso por un modelo de fases que OpenSpec
abandonó, perdiendo la información de qué artefacto bloquea a cuál —que es justo lo que el grafo
trae y la derivación propia no puede producir.

#### Scenario: Cambio seleccionado con grafo completo

- **WHEN** el cambio seleccionado tiene `status` con todos sus artefactos en `done`
- **THEN** la superficie muestra cada artefacto declarado como `done` y no muestra dependencias faltantes

#### Scenario: Artefacto bloqueado declara qué lo bloquea

- **WHEN** un artefacto del cambio seleccionado está en `blocked` con `missingDeps` no vacío
- **THEN** la superficie muestra ese artefacto como `blocked` y declara las dependencias que le faltan

#### Scenario: Sin grafo no se dibuja la superficie

- **WHEN** el cambio seleccionado tiene `status` ausente o `available: false`
- **THEN** la superficie del grafo no se renderiza y no aparece ningún estado inventado en su lugar

#### Scenario: Cambio no seleccionado

- **WHEN** no hay cambio seleccionado
- **THEN** la superficie del grafo no se renderiza, porque el grafo sólo existe para el cambio seleccionado
