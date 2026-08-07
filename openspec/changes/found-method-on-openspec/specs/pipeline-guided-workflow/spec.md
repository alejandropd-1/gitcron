## ADDED Requirements

### Requirement: El método del proyecto se funda en OpenSpec
`AGENTS.md` SHALL declarar que la base del método es OpenSpec y que sus instrucciones no se duplican.
Una regla propia SHALL existir sólo cuando cubra algo que OpenSpec no cubra, y SHALL contrastarse con
`openspec instructions` antes de escribirse. La declaración SHALL nombrar el límite del principio.

El fundamento es que este proyecto armó su método por reacción: cada vez que algo salía mal se escribía
una regla. Medido después, ocho de sus dieciséis reglas decían lo mismo que el CLI ya entregaba. Sin el
criterio escrito, la próxima se escribe igual, porque nada obliga a mirar antes si el problema ya estaba
resuelto.

Nombrar el límite importa tanto como el principio. OpenSpec es una implementación concreta del
desarrollo guiado por especificación, no un estándar ratificado; leer «la base es OpenSpec» como
«OpenSpec siempre tiene razón» llevaría a tirar criterio propio que funcionaba. Ceder es el
comportamiento por defecto, no un acto de fe: cuando el criterio propio es mejor, se sostiene y se
escribe por qué.

#### Scenario: Antes de agregar una regla al proyecto
- **WHEN** se quiere escribir una regla nueva
- **THEN** se contrasta con `openspec instructions` y no se escribe si ya está dicha ahí

#### Scenario: Una regla que OpenSpec no cubre
- **WHEN** la regla dice algo que las instrucciones del CLI no dicen
- **THEN** se conserva, con lo que aporta explicitado

#### Scenario: Criterio propio mejor que el de la herramienta
- **WHEN** el criterio del proyecto es mejor que el de OpenSpec en un punto
- **THEN** se sostiene y se escribe el motivo, en vez de ceder por defecto

### Requirement: Ninguna regla se escribe sin aprobación explícita
Una regla nueva SHALL requerir aprobación humana explícita antes de escribirse, tanto en `AGENTS.md`
como en `openspec/config.yaml` o en cualquier repositorio ajeno. Proponerla SHALL ser posible; añadirla
por cuenta propia SHALL NOT serlo.

El fundamento es que una regla es método: obliga a todo el que venga después y sobrevive a quien la
escribió, a diferencia de un cambio de código, que se revierte mirando el diff. Las ocho reglas que hubo
que retirar se acumularon así, una por una, cada una razonable en su momento y ninguna contrastada
contra lo que el CLI ya entregaba.

Que se pueda proponer es parte del requisito y no una concesión: quien detecta el hueco suele ser quien
está trabajando, y prohibir la propuesta perdería esa información. Lo que se reserva es la decisión.

#### Scenario: Se detecta un hueco que ninguna regla cubre
- **WHEN** durante el trabajo se detecta algo que convendría declarar como regla
- **THEN** se propone con qué cubre y por qué OpenSpec no lo cubre, sin escribirla

#### Scenario: Regla aprobada
- **WHEN** la propuesta se aprueba explícitamente
- **THEN** la regla se escribe en el archivo que corresponda
