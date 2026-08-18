# branch-notice-consolidation Specification

## Purpose
TBD - created by archiving change filtro-modelos-llm-y-aviso-rama. Update Purpose after archive.
## Requirements
### Requirement: Consolidación del aviso de rama en el contenedor de avisos
El aviso de discrepancia de rama de un cambio activo SHALL renderizarse dentro del contenedor agrupador de AVISOS de la vista central (`noticesGroup`) compartiendo su estructura visual.

#### Scenario: Cambio activo en rama no coincidente
- **WHEN** un cambio activo se visualiza estando en una rama distinta a la que le corresponde
- **THEN** el aviso de discrepancia se renderiza dentro del contenedor de AVISOS y no de forma suelta en el cuerpo central

#### Scenario: Repositorio sin avisos activos
- **WHEN** no existen discrepancias de rama, atención del motor ni problemas de herramientas
- **THEN** el contenedor de AVISOS no se renderiza en la vista central

