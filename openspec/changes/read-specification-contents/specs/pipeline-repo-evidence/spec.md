## ADDED Requirements

### Requirement: La evidencia de una especificación incluye su contenido
La evidencia de cada especificación consolidada SHALL incluir el contenido de su archivo, además del
identificador, el conteo de requisitos y la referencia de origen. Cuando el archivo no se pueda leer,
el contenido SHALL ser `null`, distinguible de un archivo vacío. La lectura SHALL respetar un límite
de tamaño explícito, como ya lo hace la lectura de artefactos de un cambio.

El fundamento es que las especificaciones consolidadas son el estado declarado del producto —lo que
quedó después de archivar cada cambio— y hoy son lo único del método que no se puede leer desde la
aplicación: la barra lateral las lista como texto muerto porque no tiene contenido que mostrar. El
proceso principal ya abre esos archivos para contar requisitos y descarta el texto, así que la
información existe y sólo falta transportarla.

Distinguir `null` de vacío importa porque una especificación sin contenido legible y una especificación
que existe pero está vacía piden respuestas distintas: la primera es un fallo de lectura que hay que
reportar, la segunda es un dato real del repositorio. El límite de tamaño importa porque el snapshot
lleva todas las especificaciones a la vez y viaja por IPC en cada refresco.

#### Scenario: Especificación legible
- **WHEN** el lector encuentra una especificación consolidada con contenido
- **THEN** la evidencia incluye su texto junto al conteo de requisitos

#### Scenario: Especificación que no se puede leer
- **WHEN** el archivo de una especificación no se puede leer
- **THEN** el contenido queda en `null` y se emite el diagnóstico correspondiente

#### Scenario: Especificación abierta desde la barra lateral
- **WHEN** se elige una especificación en la barra lateral
- **THEN** su contenido se muestra en el visor de artefactos con el markdown renderizado
