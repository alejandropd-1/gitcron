## ADDED Requirements

### Requirement: El control de volver se presenta como un botón
El control para volver del panel SHALL presentarse con contorno y con separación respecto del texto
vecino, de modo que se distinga como un control accionable y no como texto. SHALL usar los tokens
visuales del panel, y SHALL NOT adoptar la tipografía ni los bordes del resto de la aplicación.

El fundamento es que hoy declara `border: 0` y `background: none`, así que es una etiqueta con una
flecha al lado. Ya hay antecedente de que eso no alcanza en este panel: `legible-panel-controls` existió
porque los controles no parecían botones. El equivalente de Configuración —"Volver al Repositorio"—
resuelve lo mismo con borde y respiro, y se lee a primera vista.

Que use los tokens del panel y no las clases de aquel botón importa porque el panel tiene su propio
lenguaje visual —monoespaciada, paleta propia—: un control con la tipografía del resto de la aplicación
en medio del panel se vería pegado en vez de integrado. Lo que hay que igualar es la legibilidad del
control, no la hoja de estilos.

#### Scenario: Control de volver en el encabezado de un cambio
- **WHEN** se muestra el encabezado de un cambio
- **THEN** el control de volver se distingue como botón, con contorno y separación

#### Scenario: Control de volver en la vista de una especificación
- **WHEN** se muestra una especificación abierta
- **THEN** su control de volver se ve igual que el del encabezado, sin reglas propias
