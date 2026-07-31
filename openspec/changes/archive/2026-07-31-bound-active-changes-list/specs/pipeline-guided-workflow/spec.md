## ADDED Requirements

### Requirement: La lista de cambios activos es acotada y navegable

La lista de cambios activos SHALL tener un alto acotado y desplazamiento propio, de modo que todo
cambio activo sea alcanzable y las secciones siguientes del navegador queden accesibles sin
recorrerla entera. Ningún cambio activo SHALL quedar fuera de vista sin señal de que existe.

#### Scenario: Más cambios activos que alto disponible

- **WHEN** los cambios activos no entran en el alto de su sección
- **THEN** la lista se desplaza dentro de su propio espacio y las secciones siguientes siguen accesibles

### Requirement: Desplegar un cambio es una acción pedida, no un efecto de seleccionarlo

Un cambio SHALL desplegar su detalle sólo cuando se lo pide con el control destinado a eso.
Seleccionar un cambio SHALL NOT desplegarlo, y ningún elemento de la lista SHALL aparecer o
desaparecer de la vista como efecto lateral de una acción distinta.

Desplegar el seleccionado ocupaba varias veces el alto de un ítem plegado, así que al cambiar la
selección se plegaba el anterior y aparecía un cambio hasta entonces invisible. Un elemento que se
descubre por rebote de otra acción no está realmente presentado.

#### Scenario: Selección de un cambio

- **WHEN** se selecciona un cambio de la lista
- **THEN** el cambio queda seleccionado y su detalle permanece plegado hasta que se lo pida

#### Scenario: Despliegue explícito

- **WHEN** se activa el control de desplegado de un cambio
- **THEN** ese cambio muestra su detalle, con independencia de cuál esté seleccionado
