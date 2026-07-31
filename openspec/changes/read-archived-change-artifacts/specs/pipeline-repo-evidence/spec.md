## ADDED Requirements

### Requirement: Los artefactos de un cambio archivado se pueden revisar

La evidencia del cambio archivado seleccionado SHALL transportar el contenido de sus artefactos, y
la vista SHALL mostrarlos, para poder revisar qué se hizo —incluida la firma humana en `tasks.md`—
sin salir de la aplicación.

El contenido SHALL viajar sólo para el archivado seleccionado, por el mismo motivo que en los
activos: transportar el markdown de todos haría crecer el snapshot sin que nadie lo mire.

#### Scenario: Archivado seleccionado

- **WHEN** se selecciona un cambio de la lista de completados
- **THEN** su propuesta, diseño, tareas y specs delta se pueden leer en la aplicación

#### Scenario: Archivados no seleccionados

- **WHEN** hay otros cambios archivados
- **THEN** no transportan contenido, sólo su identificador y su fecha
