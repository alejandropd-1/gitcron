# Spec Delta

## ADDED Requirements

### Requirement: La lista y el estado de las herramientas SHALL salir del motor que responde en el repositorio

GitCron SHALL obtener del motor de OpenSpec que responde en cada repositorio qué herramientas
reconoce, cuáles están presentes, cuáles configuradas, cuáles necesitan actualizarse y si el perfil
de workflows requiere sincronizar, y SHALL usar esa respuesta en todos los lugares que muestran o
derivan el estado de las herramientas. SHALL hacerlo sólo si el paquete leído es la misma versión que
responde, en un proceso aparte y con un tope de tiempo.

Una lista propia mantenida a mano se desfasa con cada versión nueva del motor y hace que la pantalla
afirme cosas que el motor no sostiene: una herramienta «sin configurar» que el motor da por
configurada, o una que el motor ni reconoce.

#### Scenario: El motor contesta
- **WHEN** el motor del repositorio se puede leer y su versión coincide con la que responde
- **THEN** la lista, la presencia, la configuración y la vigencia de cada herramienta son las que el motor informa, y la pantalla no muestra herramientas que el motor no reconoce

#### Scenario: Carpeta compartida
- **WHEN** varias herramientas comparten la misma carpeta de instrucciones y el motor resuelve cuál la atiende
- **THEN** GitCron muestra configurada la que el motor resuelve y no presenta a las otras como pendientes por esa carpeta

#### Scenario: Paquete de otra versión
- **WHEN** el paquete encontrado no es la versión que responde el motor
- **THEN** no se usa y rige el respaldo, declarando el motivo

### Requirement: Si el motor no se puede leer, SHALL usarse la lista propia declarándolo

Cuando el motor no se puede leer —no se encuentra su paquete, la versión no coincide, su parte
interna cambió o no contesta a tiempo—, GitCron SHALL usar su lista propia, que es una copia de la
del motor en la versión del ciclo SDD, y SHALL avisarlo en pantalla con el motivo. La copia propia
SHALL corresponder a la versión del ciclo SDD; una verificación automática SHALL fallar cuando no.

#### Scenario: Respaldo en uso
- **WHEN** GitCron no puede leer el motor
- **THEN** la pantalla de herramientas indica que usa la lista propia de GitCron y por qué

#### Scenario: Copia propia desfasada
- **WHEN** se sube la versión del ciclo SDD y la copia propia sigue siendo de la anterior
- **THEN** la verificación automática falla indicando cómo volver a capturarla

## MODIFIED Requirements

### Requirement: El estado de la integración SHALL derivarse de los targets instalados y no del recuento de skills

GitCron SHALL determinar la vigencia de la integración a partir de qué targets tienen instalados sus
workflows —la evidencia `installedWorkflowsByTarget` y `targets` que la inspección ya produce— y no
MUST declararla al día por el solo hecho de que existan skills. La derivación actual cuenta skills
sin mirar dónde están, y eso produce una afirmación falsa comprobada en la aplicación: con diez
skills en el esquema anterior, ninguno en el target oficial vigente, y el propio panel informando
«Agents Multi-Agent sin configurar», la tarjeta declara la integración al día. Una tarjeta que
afirma lo contrario de lo que muestra debajo deja de ser evidencia.

La integración SHALL declararse al día cuando las herramientas configuradas están al día y el perfil
de workflows no requiere sincronizar, según el motor: es lo que `openspec update` puede arreglar, y
por eso es lo único que la acción «Actualizar» SHALL ofrecer resolver. Una herramienta presente sin
configurar SHALL declararse aparte, junto al estado de la integración, con la acción de
inicializarla; SHALL NOT volver la integración desactualizada ni ofrecer «Actualizar», que no
configura herramientas nuevas.

#### Scenario: Skills sólo en targets del esquema anterior
- **WHEN** los workflows están instalados únicamente en targets del esquema anterior y ninguno en el vigente
- **THEN** la integración se declara desactualizada, no al día

#### Scenario: Coherencia entre el estado y el detalle
- **WHEN** el detalle informa que una herramienta presente quedó sin configurar
- **THEN** el estado resumido la declara pendiente junto al de la integración, no lo omite, y ofrece inicializarla

#### Scenario: Herramienta sin configurar no pide actualizar
- **WHEN** las herramientas configuradas están al día y hay una presente sin configurar
- **THEN** no se ofrece «Actualizar» por esa herramienta y se ofrece inicializarla

#### Scenario: Herramienta configurada desactualizada
- **WHEN** el motor informa que una herramienta configurada necesita actualizarse o que el perfil requiere sincronizar
- **THEN** la integración se declara desactualizada y se ofrece «Actualizar»
