## ADDED Requirements

### Requirement: Desenlace de sesión fiel al fracaso declarado del run
El desenlace de una sesión SHALL ser `failed` cuando algún `run.completed` observado declaró
`success: false`, y SHALL NOT depender únicamente del fallo del proceso que la ejecutó. Una sesión
SHALL cerrar como `completed` sólo si ningún run declaró fracaso.

El fundamento es que el fracaso puede venir declarado dentro del stream sin que el proceso falle.
Derivar el desenlace sólo del proceso hace que la actividad registre el error y el desenlace afirme
lo contrario, en el mismo registro y para la misma sesión.

#### Scenario: Run fallido con proceso exitoso
- **WHEN** el stream emite `run.completed` con `success: false` y el proceso termina sin fallar
- **THEN** la sesión se cierra como `failed` y su actividad registra `session.failed`

#### Scenario: Run exitoso
- **WHEN** todos los `run.completed` observados declaran `success: true` y el proceso no falla
- **THEN** la sesión se cierra como `completed`

#### Scenario: Interrupción pedida por el usuario
- **WHEN** la sesión se detiene por pedido explícito, con o sin run fallido previo
- **THEN** la sesión se cierra como `interrupted` y esa causa tiene precedencia sobre el fracaso del run
