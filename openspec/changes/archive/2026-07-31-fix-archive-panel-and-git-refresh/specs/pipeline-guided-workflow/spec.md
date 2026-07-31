## ADDED Requirements

### Requirement: Lo que la aplicación confirma en Git se refleja en sus vistas

Cuando la aplicación crea commits por su cuenta, SHALL avisar que el historial cambió, y las vistas
de Git SHALL releer historial, estado y ramas. Un commit hecho por la aplicación SHALL NOT quedar
invisible en su propio grafo.

El aviso de cambios en el árbol no alcanza: relee el estado de los archivos, no el historial. Sin
una señal propia, la única forma de comprobar que el commit ocurrió es mirar por fuera de la
aplicación.

#### Scenario: Archivado con commits

- **WHEN** se archiva un cambio confirmando también en Git
- **THEN** el historial, el estado y las ramas se releen, y los commits nuevos aparecen en el grafo

#### Scenario: Archivado sin commits

- **WHEN** se archiva sin confirmar en Git
- **THEN** no se emite el aviso de historial cambiado

### Requirement: Los controles de una acción son alcanzables a cualquier alto de ventana

Un panel de confirmación SHALL mantener sus controles alcanzables aunque su contenido supere el
alto disponible, desplazándose dentro de sí mismo en lugar de empujarlos fuera de pantalla.

Un contenedor que centra su contenido SHALL NOT recortar el comienzo al desbordar, porque ese
recorte no se puede alcanzar con scroll.

#### Scenario: Ventana baja

- **WHEN** el panel de confirmación no entra en el alto disponible
- **THEN** el panel se desplaza dentro de su espacio y sus botones siguen a la vista

#### Scenario: Contenido que desborda una ficha centrada

- **WHEN** el contenido de una ficha centrada supera el alto disponible
- **THEN** se alinea al comienzo y se puede recorrer entero, sin recorte inalcanzable
