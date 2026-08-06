## ADDED Requirements

### Requirement: El panel se puede recorrer con teclado
Cada control del panel SHALL declarar su estado de foco con un contorno de contraste suficiente, y
SHALL NOT quedarse con el contorno por defecto del navegador sobre superficies de color propio. Ningún
control SHALL desactivar su contorno sin declarar un reemplazo. El foco SHALL declararse en
`:focus-visible`, de modo que aparezca al recorrer con teclado y no al hacer clic.

Una acción que no está disponible SHALL seguir siendo alcanzable con el teclado y SHALL anunciarse como
deshabilitada, en vez de salir del orden de foco, cuando su ausencia impida descubrir que la acción
existe.

El fundamento es que este panel se validó siempre mirándolo, y hay defectos que sólo aparecen
recorriéndolo. El contorno por defecto sobre un botón relleno en tema oscuro casi no se distingue,
mientras el resto del panel declara todos sus estados: quien recorre con teclado pierde de vista dónde
está parado. Y la acción principal del panel está deshabilitada justo en el estado en que el panel se
abre —sin archivos elegidos—, así que sacarla del orden de foco la vuelve indescubrible para quien no
usa el mouse: no se puede aprender lo que no se puede alcanzar.

Que sea `:focus-visible` y no `:focus` responde a que el contorno informa dónde quedó el teclado; al
hacer clic la persona ya sabe dónde apretó, y el contorno ahí es ruido.

#### Scenario: Recorrido con teclado por los controles del panel
- **WHEN** se recorre el panel con el teclado
- **THEN** cada control declara que tiene el foco con un contorno visible

#### Scenario: Foco tras un clic
- **WHEN** se apreta un control con el mouse
- **THEN** no se dibuja el contorno de foco

#### Scenario: Acción principal sin archivos elegidos
- **WHEN** el panel está abierto y no hay ningún archivo elegido
- **THEN** la acción de preparar se puede alcanzar con el teclado, se anuncia como deshabilitada, y
  apretarla no prepara nada
