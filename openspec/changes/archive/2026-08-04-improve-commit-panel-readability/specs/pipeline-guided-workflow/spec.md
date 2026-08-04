## ADDED Requirements

### Requirement: Cada archivo declara su procedencia
La preparación SHALL mostrar de dónde viene cada archivo modificado: del cambio seleccionado, de
otro cambio activo —nombrándolo—, de un archivado, o sin atribuir. SHALL NOT presentar en una misma
lista indistinta todo lo que no pertenece al cambio.

El fundamento es que la atribución existe y hoy se descarta: un archivo bajo la carpeta de un cambio
dice a cuál pertenece. Ocultarlo obliga a recordar qué se tocó en cada trabajo, que es el esfuerzo
que la preparación existe para ahorrar.

#### Scenario: Varios trabajos encimados
- **WHEN** el árbol tiene archivos de más de un cambio activo y restos de un archivado
- **THEN** cada archivo aparece bajo el grupo que le corresponde, y los de otro cambio muestran de
  cuál son

#### Scenario: Código sin atribuir
- **WHEN** un archivo modificado no pertenece a ningún cambio de forma verificable
- **THEN** aparece como sin atribuir, y no se le adjudica un cambio por proximidad ni por orden

### Requirement: El estado de cada archivo se ve
La preparación SHALL indicar el estado de cada archivo —modificado, agregado, borrado, renombrado o
sin seguimiento— con la misma representación que ya usa la aplicación para el área de preparación de
Git.

El fundamento es que borrar y agregar son decisiones distintas y hoy se ven iguales. Reutilizar la
representación existente evita que la misma información se lea de dos maneras según la pantalla.

#### Scenario: Archivos en distintos estados
- **WHEN** la lista incluye archivos agregados, modificados y borrados
- **THEN** cada uno muestra su estado con el distintivo correspondiente

### Requirement: El mensaje se deriva de lo que se va a preparar
El mensaje sugerido SHALL derivarse del conjunto completo de archivos que la preparación va a
incluir, contando los elegidos a mano. SHALL NOT calcularse sólo sobre los atribuibles al cambio.

El fundamento es que el alcance del mensaje describe el commit que se va a hacer. Calcularlo sobre
un subconjunto produce una sugerencia que no corresponde a lo que se confirma, y con ningún archivo
propio no puede derivar nada.

#### Scenario: Todo elegido a mano
- **WHEN** el cambio no tiene archivos propios y se eligen archivos sin atribuir para sumar
- **THEN** el mensaje sugerido refleja el alcance de esos archivos elegidos

#### Scenario: Propios y elegidos juntos
- **WHEN** se preparan archivos propios del cambio junto con otros elegidos a mano
- **THEN** el mensaje se deriva de ambos conjuntos

### Requirement: El contenido del panel se puede copiar
El texto que la guía muestra —rutas de archivo, mensajes y títulos de tarea— SHALL poder
seleccionarse y copiarse.

El fundamento es que son datos que se usan afuera: una ruta se pega en una terminal, un título se
cita en otro lado. Impedir la selección obliga a transcribir a mano lo que ya está en pantalla.

#### Scenario: Copiar una ruta de la lista
- **WHEN** se selecciona el texto de una ruta mostrada en la preparación
- **THEN** el texto queda disponible para copiar
