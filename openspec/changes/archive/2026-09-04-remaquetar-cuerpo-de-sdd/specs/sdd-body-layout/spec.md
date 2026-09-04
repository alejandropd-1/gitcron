## ADDED Requirements

### Requirement: La presentación SHALL declarar su jerarquía

Un cuerpo de contenido SHALL presentar sus bloques en un orden que corresponda a lo que se va a
hacer, y SHALL distinguir por tamaño, peso y posición lo que importa de lo accesorio. La jerarquía
NO SHALL depender del color: el color identifica o comunica un dato, no ordena.

El fundamento es medido. Con las columnas retiradas, el cuerpo de la vista del ciclo quedó con la
cabecera ocupando el primer tercio de la pantalla —volver, nombre, fecha, intención recortada con
puntos suspensivos, tres solapas y tres botones del mismo peso— y la lista de tareas abajo del
pliegue. Lo primero que se lee no es lo primero que se hace.

#### Scenario: Un bloque accesorio por encima del principal
- **WHEN** un bloque que informa una condición permanente se presenta antes que el trabajo en curso
- **THEN** se reordena para que el trabajo se lea primero, o el bloque se pliega

#### Scenario: Controles de distinto peso presentados igual
- **WHEN** una fila reúne la acción principal y acciones accesorias
- **THEN** la principal se distingue por tratamiento, y las accesorias no compiten con ella

### Requirement: Un control SHALL verse como lo que es

Un control SHALL presentarse con la forma que corresponde a su función. Una solapa SHALL verse como
solapa y no como botón, aunque su semántica ya sea correcta.

El caso declarado: `components/pipeline/PipelineDetails.tsx:61` ya declara `role="tab"` dentro de un
`role="tablist"`, pero cada solapa lleva borde, fondo y radio propios, así que la fila se lee como
cinco botones sueltos. La semántica estaba bien y la forma decía otra cosa.

#### Scenario: Forma que contradice la función
- **WHEN** un control declara un rol y se presenta con la forma de otro
- **THEN** la forma se corrige, no el rol

### Requirement: Un dato NO SHALL presentarse dos veces en la misma pantalla

Cuando un dato ya se declara en la franja de identidad o en el panel lateral, el cuerpo NO SHALL
repetirlo. Cuando un estado se puede decir con un ícono, NO SHALL ocupar además una palabra por
ficha.

Casos declarados: el avance del cambio aparece en la barra del lateral y otra vez en el texto del
siguiente paso; el aviso de rama repite lo que la franja ya dice; la ficha de tarea informa «No
informado» en tres de sus cuatro filas; y las fichas de artefactos repiten la palabra «HECHO» cuatro
veces seguidas donde alcanzaría un ícono.

#### Scenario: Dato repetido entre franja y cuerpo
- **WHEN** un dato ya presentado en la franja de identidad vuelve a presentarse en el cuerpo
- **THEN** se retira del cuerpo

#### Scenario: Estado repetido en fichas contiguas
- **WHEN** varias fichas contiguas declaran el mismo estado con la misma palabra
- **THEN** el estado se presenta con un ícono
