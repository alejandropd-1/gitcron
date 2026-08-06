## ADDED Requirements

### Requirement: Los controles del panel se distinguen por peso
Los controles del panel SHALL presentarse en niveles visualmente distinguibles según lo que hacen: la
acción principal sobre el repositorio, las acciones de apoyo, y los controles que despliegan o suman
dentro de una lista. Un nivel SHALL NOT depender de leer su texto para reconocerse. Los controles SHALL
presentarse a un tamaño que no obligue a acercarse, sin que el panel deje de ser denso en información.

Los títulos de grupo, su descripción y su lista SHALL separarse entre sí de modo que se lean como tres
cosas y no como un bloque.

El fundamento es que los controles se agregaron de a uno, cada uno resolviendo su caso, y ninguno se
decidió mirando a los otros: terminaron todos con el mismo tono sobre marco tenue. Un panel donde hay
que leer cada botón para saber cuál pesa más no es productivo, y la densidad que este proyecto busca es
de información, no de tamaño de letra.

#### Scenario: Acción principal frente a las de apoyo
- **WHEN** el panel ofrece a la vez su acción principal y acciones de apoyo
- **THEN** se distinguen entre sí sin leer sus textos

#### Scenario: Controles dentro de una lista
- **WHEN** un grupo o un cambio ofrece desplegar o sumar su contenido
- **THEN** ese control se presenta con un peso distinto del de las acciones sobre el repositorio

#### Scenario: Título, descripción y lista de un grupo
- **WHEN** un grupo declara qué contiene y lista sus archivos
- **THEN** el título, la descripción y la lista quedan separados entre sí

### Requirement: Los conteos concuerdan en número
Todo texto que muestre una cantidad SHALL concordar en número con esa cantidad. La elección entre
singular y plural SHALL resolverse en un solo lugar y SHALL NOT repetirse en cada punto de uso. En las
lenguas que no concuerdan en número, la variante singular SHALL existir igual con el texto que
corresponda.

El fundamento es que un texto que no concuerda delata que nadie miró el caso de uno, y el caso de uno
es el más frecuente al final de cualquier trabajo: la última tarea pendiente, el único archivo
preparado, el primer cambio archivado. Resolverlo en cada punto de uso garantiza que el próximo texto
con número se olvide.

#### Scenario: Una sola unidad
- **WHEN** un texto muestra una cantidad de uno
- **THEN** usa la variante singular

#### Scenario: Varias unidades
- **WHEN** un texto muestra una cantidad distinta de uno
- **THEN** usa la variante plural
