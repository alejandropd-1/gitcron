## ADDED Requirements

### Requirement: Las reglas del proyecto no repiten lo que el CLI ya entrega
Las reglas de `openspec/config.yaml` SHALL decir únicamente lo que la `instruction` de OpenSpec no dice.
Antes de agregar una regla, SHALL contrastarse con la salida de `openspec instructions` para el
artefacto que corresponda. El archivo SHALL declarar ese criterio.

El fundamento es que el CLI entrega, junto con las reglas del proyecto, la instrucción propia de cada
artefacto, y ahí ya están el formato de las tareas, las cuatro almohadillas de un escenario, el bloque
entero que exige MODIFIED, las alternativas de cada decisión y los riesgos con su mitigación. Una regla
repetida gasta atención del ejecutor en algo que recibió dos párrafos antes, y entierra las que sí son
del proyecto entre las que no aportan.

El criterio se declara en el propio archivo porque sin él la duplicación vuelve: ya pasó una vez, cuando
se agregaron reglas de forma dando por sentado que la convención no viajaba por el canal, cuando sí
viajaba.

#### Scenario: Agregar una regla nueva al proyecto
- **WHEN** se quiere agregar una regla al `config.yaml`
- **THEN** se contrasta antes con `openspec instructions` y no se escribe si ya está dicha

#### Scenario: Regla que el CLI no cubre
- **WHEN** una regla dice algo que la instrucción de OpenSpec no dice
- **THEN** se conserva en el `config.yaml`
