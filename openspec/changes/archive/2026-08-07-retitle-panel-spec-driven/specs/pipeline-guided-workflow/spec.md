## ADDED Requirements

### Requirement: El panel se rotula con el método, no con la herramienta
El encabezado del panel SHALL rotularse «Spec-Driven Development», en dos líneas. El salto SHALL ser
estructural —dos elementos— y SHALL NOT depender del ancho de la ventana. El bloque SHALL dimensionarse
contra la fila de contadores que tiene al lado, de modo que el encabezado quede encuadrado.

El fundamento es que la pantalla muestra el método —qué se propuso, cómo se pensó, qué falta y en qué
anda un ejecutor— y no la herramienta que provee los datos. OpenSpec es una pieza reemplazable: hay
treinta herramientas que lo consumen, y el trabajo que el panel exhibe seguiría siendo el mismo con
otra. Rotular la pantalla con el nombre del proveedor confunde la fuente con lo mostrado.

Que el salto sea estructural importa porque el rótulo tiene dos partes y su corte es parte de cómo se
lee: dejarlo librado al ancho disponible haría que a veces se parta y a veces no, y que se parta en el
lugar equivocado.

#### Scenario: Encabezado del panel
- **WHEN** se muestra el panel
- **THEN** el rótulo dice «Spec-Driven» y «Development» en dos líneas propias

#### Scenario: Ancho de ventana distinto
- **WHEN** cambia el ancho de la ventana
- **THEN** el rótulo conserva sus dos líneas, sin partirse en otro punto
