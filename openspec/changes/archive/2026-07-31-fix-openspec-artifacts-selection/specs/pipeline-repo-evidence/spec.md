## ADDED Requirements

### Requirement: Selección manual de change con precedencia sobre la automática
El renderer SHALL poder seleccionar manualmente un change activo para que ese change transporte el contenido de sus artefactos, sin depender de la rama. La selección manual SHALL tener precedencia sobre la selección automática por rama. Cuando no haya selección manual, SHALL aplicarse la selección automática existente. La selección manual SHALL reiniciarse al cambiar de repositorio.

#### Scenario: Varios changes activos en main con selección manual
- **WHEN** hay varios changes activos, la rama no coincide con ninguno, y el renderer selecciona manualmente uno
- **THEN** ese change transporta el contenido de sus artefactos y el renderer puede mostrarlos

#### Scenario: Sin selección manual
- **WHEN** el renderer no selecciona manualmente
- **THEN** se aplica la selección automática por rama como hasta hoy

#### Scenario: Cambio de repositorio
- **WHEN** se cambia de repositorio
- **THEN** la selección manual se reinicia y se aplica la automática del nuevo repo

### Requirement: Contenido de artefactos en pestaña dedicada
El markdown de los artefactos del change seleccionado SHALL mostrarse en una pestaña dedicada al lado de Trabajo y Actividad, no como un bloque al final del panel.

#### Scenario: Lectura de un artefacto
- **WHEN** se selecciona un artefacto (proposal, design, tasks o specs)
- **THEN** su contenido se muestra en la pestaña dedicada con el markdown saneado
