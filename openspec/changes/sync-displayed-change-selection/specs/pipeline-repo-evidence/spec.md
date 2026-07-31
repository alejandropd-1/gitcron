## ADDED Requirements

### Requirement: La evidencia leída corresponde al cambio que se muestra

El renderer SHALL informar el cambio que está mostrando cuando la selección automática no resolvió
ninguno, de modo que la evidencia leída corresponda a lo que hay en pantalla. Un cambio visible
SHALL NOT quedar sin leer por haber sido resuelto por el fallback de la vista.

Esto no habilita al backend a elegir por su cuenta: la selección no ambigua sigue rigiendo y sigue
sin adivinar. Lo que se corrige es que la elección que ya hace la vista para poder mostrar algo
deje de ser invisible para quien lee la evidencia.

La adaptación de la evidencia a la vista SHALL conservar la selección tal como la resolvió el
backend, incluida su ausencia. Sustituirla por un cambio cualquiera vuelve indistinguible "el
backend eligió éste" de "no eligió ninguno", y con esa distinción perdida no hay forma de saber que
hay algo que informar. El fallback para mostrar pertenece a la vista, que además lo informa.

#### Scenario: Selección ausente conservada hasta la vista

- **WHEN** el backend no resolvió ninguna selección
- **THEN** la evidencia adaptada la conserva ausente en vez de sustituirla por un cambio cualquiera

#### Scenario: La rama no identifica ningún cambio activo

- **WHEN** hay varios cambios activos, la rama no coincide con ninguno y la vista muestra uno por defecto
- **THEN** ese cambio se informa como seleccionado y su validación y artefactos se leen

#### Scenario: Selección manual vigente

- **WHEN** el usuario seleccionó manualmente un cambio
- **THEN** esa selección se conserva y el fallback no la pisa

#### Scenario: La selección automática ya resolvió

- **WHEN** la rama identifica un cambio de forma inequívoca
- **THEN** no se informa nada adicional y se respeta la selección automática
