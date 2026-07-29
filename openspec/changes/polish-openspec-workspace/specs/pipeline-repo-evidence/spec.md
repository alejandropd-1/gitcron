## ADDED Requirements

### Requirement: Contenido de artefactos disponible para lectura
La evidencia del cambio seleccionado SHALL transportar el contenido de `proposal.md`, `design.md` y `tasks.md`, además de su existencia, para que puedan leerse sin abrir el repositorio por fuera de la aplicación. El renderer SHALL NOT recibir un método de lectura de archivos: el contenido llega dentro de la evidencia ya contenida al repositorio.

#### Scenario: Artefacto presente
- **WHEN** el cambio seleccionado tiene `proposal.md` con contenido
- **THEN** la evidencia transporta ese markdown y la vista puede mostrarlo saneado

#### Scenario: Artefacto ausente
- **WHEN** el cambio seleccionado no tiene `design.md`
- **THEN** el contenido queda `null` y la vista declara que ese artefacto no existe, sin inventar un cuerpo vacío

#### Scenario: Sólo el cambio seleccionado
- **WHEN** hay varios cambios activos
- **THEN** sólo el seleccionado transporta contenido, y los demás conservan únicamente la señal de existencia

#### Scenario: Spec delta por capacidad
- **WHEN** el cambio seleccionado toca una o más capacidades
- **THEN** la evidencia transporta el `spec.md` de cada una junto a su identificador y su ruta de origen

#### Scenario: Capacidad sin archivo de spec
- **WHEN** existe la carpeta de una capacidad pero le falta el `spec.md`
- **THEN** la capacidad se lista igual con contenido `null`, porque la carpeta también es evidencia
