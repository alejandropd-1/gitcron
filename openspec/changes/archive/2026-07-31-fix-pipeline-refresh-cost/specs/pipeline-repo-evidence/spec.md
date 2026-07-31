## ADDED Requirements

### Requirement: Costo de lectura acotado al cambio seleccionado

La lectura de evidencia SHALL invocar el CLI de OpenSpec para validar únicamente el cambio
seleccionado. Un cambio activo que no está seleccionado SHALL reportar `validation: 'unknown'`
sin ejecutar ningún subproceso, porque no saber si un cambio es válido no es lo mismo que
saber que no lo es, y ninguna vista consume la validación de un cambio no seleccionado.

Este criterio SHALL alinearse con el que ya rige para el contenido de artefactos: el trabajo
caro se paga sólo por el cambio que la vista efectivamente muestra.

#### Scenario: Varios cambios activos

- **WHEN** el repositorio tiene varios cambios activos y uno está seleccionado
- **THEN** el CLI de validación se invoca exactamente una vez, para el cambio seleccionado

#### Scenario: Cambio activo no seleccionado

- **WHEN** un cambio activo no es el seleccionado
- **THEN** su `validation` queda `unknown` y no se ejecuta ningún subproceso por él

#### Scenario: Sin cambio seleccionado

- **WHEN** la selección no identifica ningún cambio
- **THEN** no se invoca el CLI de validación para ningún cambio activo
