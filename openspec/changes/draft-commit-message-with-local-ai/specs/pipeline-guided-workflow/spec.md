## ADDED Requirements

### Requirement: El mensaje sugerido declara de dónde salió
El panel SHALL declarar, junto al campo del mensaje, de qué se derivó lo que muestra. Cuando lo haya
redactado un modelo, SHALL declararlo como tal y SHALL NOT presentarlo como una afirmación de la
aplicación.

El fundamento es que hoy la sugerencia es trivial —el identificador del cambio, derivado de rutas y de la
rama— y no necesita explicación. En cuanto afirme **qué se hizo**, pasa a afirmar algo que la aplicación
no verificó, y quien confirma en Git tiene que poder ver que eso lo escribió un modelo. Es el mismo
criterio por el que la atribución de archivos lleva su fuente: una afirmación que parece verificada sin
serlo es peor que ninguna.

#### Scenario: Sugerencia derivada de la evidencia del repositorio
- **WHEN** la sugerencia sale de las rutas o de la rama
- **THEN** el panel declara esa procedencia junto al campo

#### Scenario: Mensaje redactado por un modelo
- **WHEN** el mensaje lo redactó un modelo local
- **THEN** el panel lo declara como redactado por ese modelo, nombrándolo

#### Scenario: Sin nada que sugerir
- **WHEN** ninguna fuente aporta descripción
- **THEN** el campo queda con el prefijo y sin descripción, para que la escriba una persona

### Requirement: La sugerencia no decide el commit
El mensaje sugerido SHALL ser editable y SHALL NOT pisar lo que una persona haya escrito. Sugerir SHALL
NOT confirmar.

El fundamento es que el mensaje es la parte del commit por la que sólo una persona puede responder, y una
sugerencia que se impone convierte en automático lo que este panel mantiene deliberadamente manual.
Preparar no confirma, y hay una prueba que falla si alguien mete el commit en la preparación.

#### Scenario: Mensaje ya escrito
- **WHEN** hay un mensaje escrito y llega una sugerencia nueva
- **THEN** lo escrito se conserva

#### Scenario: Redacción pedida
- **WHEN** se pide redactar el mensaje con un modelo
- **THEN** no se confirma ningún commit por hacerlo

### Requirement: El modelo se elige de lo que la máquina tiene, con su estado a la vista
El panel SHALL ofrecer elegir entre los modelos que el servidor reporta en el momento, declarando por cada
uno si está cargado, con qué contexto lo está y en qué dispositivo vive. SHALL NOT fijar un modelo en el
código, y el endpoint del servidor SHALL ser configurable.

El fundamento es que el catálogo es de la máquina y cambia: un modelo fijo falla el día que no está, y el
criterio de elección depende de qué equipo tiene la placa y qué está cargado, que la aplicación no puede
decidir. El contexto declarado tiene que ser el de la carga y no el máximo del modelo: está medido que un
modelo con `max_context_length` de 262144 puede estar cargado con 65536, y el presupuesto real es el
segundo. El dispositivo importa porque con LM Link el catálogo mezcla máquinas y «cargado» no dice en
cuál.

#### Scenario: Catálogo con modelos en distintos estados
- **WHEN** se abre el selector
- **THEN** cada modelo declara su estado, su contexto cargado y su dispositivo

#### Scenario: Servidor en otra máquina
- **WHEN** el servidor local no está en la misma máquina que la aplicación
- **THEN** se lo alcanza por el endpoint configurado, sin depender de una ruta fija

### Requirement: Redactar con un modelo declara su costo y no deja residuo
Cuando haga falta cargar un modelo, el panel SHALL declarar antes qué recursos va a ocupar, SHALL requerir
una acción humana explícita, y SHALL cargarlo acotado en el tiempo. Si el modelo no devuelve contenido,
SHALL declarar que no contestó en vez de mostrar un mensaje vacío.

El fundamento del primer punto es la invariante que rige toda escritura de esta aplicación: se declara qué
va a pasar antes de que pase, y cargar un modelo ocupa la memoria de la placa de una persona. El del
último está medido: un modelo con razonamiento agota el presupuesto de tokens pensando y devuelve
contenido vacío con `finish_reason=length` —pasó con 200 y con 1.200 tokens de techo—, y un campo en
blanco sin explicación se lee como un defecto de la aplicación.

#### Scenario: Modelo sin cargar
- **WHEN** el modelo elegido no está cargado
- **THEN** el panel declara qué va a ocupar antes de cargarlo, y no lo carga sin una acción humana

#### Scenario: El modelo agota su presupuesto razonando
- **WHEN** la respuesta llega sin contenido porque se agotó el límite de tokens
- **THEN** el panel declara que el modelo no contestó, y el mensaje anterior no se pierde

#### Scenario: Contexto insuficiente para el diff
- **WHEN** el contexto cargado no alcanza para lo que hay que mandar
- **THEN** el panel lo declara antes de intentar la redacción
