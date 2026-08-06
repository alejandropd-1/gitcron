## ADDED Requirements

### Requirement: La atribución de un archivo declara su fuente y su confianza
La evidencia de un archivo modificado SHALL declarar, cuando lo atribuya a un cambio, de qué fuente
salió esa atribución y con qué confianza. Un archivo sin atribución SHALL quedar explícitamente sin
atribuir, y SHALL NOT presentarse como perteneciente a ningún cambio por descarte.

El fundamento es que las fuentes posibles no afirman lo mismo. Una rama es una declaración deliberada
de que ese trabajo pertenece a ese cambio; una observación del árbol de trabajo durante una sesión es
una correlación temporal, y correlación no es pertenencia. Quien confirma en Git decide con esa
información, y necesita poder distinguir una declaración de una coincidencia. Colapsar ambas en un
único identificador de cambio produciría una atribución que parece verificada sin serlo, que es peor
que no tener ninguna: llevaría a confirmar archivos equivocados con confianza.

Dejar explícito lo no atribuido importa porque la mayoría del trabajo de este repositorio no pasa por
ninguna de las dos fuentes, y presentarlo como perteneciente al cambio seleccionado por ser el único
candidato sería inventar el dato.

#### Scenario: Archivo atribuido por la rama del cambio
- **WHEN** un archivo de código se modifica sobre la rama de un cambio
- **THEN** la evidencia lo atribuye a ese cambio declarando la rama como fuente

#### Scenario: Archivo visto por una sesión de runtime
- **WHEN** una sesión de un cambio observa que un archivo cambió mientras estaba abierta
- **THEN** la evidencia lo registra como observado por esa sesión, no como perteneciente al cambio

#### Scenario: Archivo sin ninguna fuente que lo reclame
- **WHEN** un archivo de código no lo reclama ninguna fuente de atribución
- **THEN** queda explícitamente sin atribuir y no se le asigna el cambio seleccionado

### Requirement: Los puntos ciegos de la observación por sesión quedan visibles
Cuando la atribución provenga de la observación de una sesión, la interfaz SHALL declarar sus límites:
sólo alcanza a las sesiones lanzadas desde la aplicación, y dos sesiones solapadas observan los cambios
de la otra.

El fundamento es que esos límites no son defectos a corregir sino el alcance real de lo que esa fuente
puede saber. `captureWorkingTree` corre `git status` sobre todo el árbol, así que no puede separar lo
que hizo una sesión de lo que hizo otra ni de lo que se editó a mano. Una observación presentada sin
sus límites se lee como una verificación, y el lugar donde se muestra es la pantalla desde la que se
confirma trabajo en Git.

#### Scenario: Dos sesiones abiertas a la vez
- **WHEN** dos sesiones de cambios distintos están abiertas al mismo tiempo
- **THEN** la interfaz advierte que la observación no puede separar el trabajo de cada una

#### Scenario: Trabajo hecho fuera de la aplicación
- **WHEN** se edita un archivo sin ninguna sesión abierta desde la aplicación
- **THEN** la interfaz declara que esa fuente no lo alcanza, en vez de dejarlo sin explicación
