## ADDED Requirements

### Requirement: El centro se recorre como una sola pieza

El área central SHALL tener un único desplazamiento y sus regiones SHALL NOT desplazarse por su
cuenta. Un contenido que aparece —como la confirmación de un archivado— SHALL empujar a lo que
sigue, y SHALL NOT reemplazarlo ni retirarlo.

Varias áreas desplazables se reparten un alto que ya es escaso: en ventanas bajas los controles
quedan encimados sobre el contenido o fuera de alcance. Y retirar lo de abajo para hacer lugar
oculta contexto que la persona no pidió esconder.

#### Scenario: Confirmación abierta en una ventana baja

- **WHEN** se abre la confirmación de archivado y el alto disponible es escaso
- **THEN** empuja hacia abajo el contenido que sigue, y todo se recorre con un solo desplazamiento

#### Scenario: Contenido que sigue presente

- **WHEN** hay una confirmación abierta
- **THEN** el contenido de trabajo sigue estando, debajo, alcanzable con el mismo desplazamiento
