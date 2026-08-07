## ADDED Requirements

### Requirement: La atribución de un archivo declara su fuente
La evidencia de un archivo modificado SHALL declarar, cuando lo atribuya a un cambio, de qué fuente salió
esa atribución. Un archivo sin atribución SHALL quedar explícitamente sin atribuir, y SHALL NOT
presentarse como perteneciente a ningún cambio por descarte.

El fundamento es que las fuentes posibles no afirman lo mismo. Que un artefacto viva bajo la carpeta de
su cambio es un hecho de ubicación y no se puede equivocar. Que un archivo de código se haya editado
sobre la rama de un cambio es una declaración deliberada —alguien puso el trabajo ahí, y Git la sostiene
con independencia de quién editó, con qué herramienta y desde dónde—, pero afirma sobre el archivo por
dónde se lo editó, no por lo que el archivo es. Quien confirma en Git decide con esa información, y
necesita poder distinguir un hecho de una declaración. Colapsar las dos en un único identificador de
cambio produciría una atribución que parece verificada sin serlo, que es peor que no tener ninguna:
llevaría a confirmar archivos equivocados con confianza.

Dejar explícito lo no atribuido importa porque el trabajo hecho fuera de la rama de un cambio no lo
reclama ninguna fuente, y presentarlo como perteneciente al cambio seleccionado por ser el único
candidato sería inventar el dato.

#### Scenario: Archivo atribuido por la rama del cambio
- **WHEN** un archivo de código se modifica sobre la rama de un cambio
- **THEN** la evidencia lo atribuye a ese cambio declarando la rama como fuente

#### Scenario: Artefacto de otro cambio sobre la misma rama
- **WHEN** se modifica un artefacto que vive bajo la carpeta de un cambio distinto del de la rama
- **THEN** la evidencia lo atribuye por su ubicación, y la rama no la pisa

#### Scenario: Archivo sin ninguna fuente que lo reclame
- **WHEN** un archivo de código se modifica fuera de la rama de un cambio
- **THEN** queda explícitamente sin atribuir y no se le asigna el cambio seleccionado

### Requirement: El punto ciego de la atribución por rama queda visible donde se atribuye
La interfaz SHALL declarar, donde muestra una atribución por rama, que la rama afirma dónde se editó el
archivo y no para qué, y que el trabajo hecho sobre esa rama para otra cosa también aparece atribuido.
Esa declaración SHALL estar en la pantalla donde se atribuye, y SHALL NOT quedar sólo en un reporte.

El fundamento es que ese límite no es un defecto a corregir sino el alcance real de lo que la fuente
puede saber, y crece con el tiempo que se pasa en una rama: un typo, una dependencia o un arreglo no
relacionado, hechos durante días de trabajo sobre `change/<slug>`, quedan atribuidos igual. Una
declaración presentada sin su límite se lee como una verificación, y el lugar donde se muestra es la
pantalla desde la que se confirma trabajo en Git.

#### Scenario: Grupo atribuido por rama
- **WHEN** el panel muestra archivos atribuidos por la rama de un cambio
- **THEN** declara junto al grupo que puede contener trabajo hecho para otra cosa, y pide revisarlo

#### Scenario: Nada preseleccionado por efecto de la atribución
- **WHEN** hay archivos atribuidos por rama
- **THEN** ninguno entra elegido por esa atribución
