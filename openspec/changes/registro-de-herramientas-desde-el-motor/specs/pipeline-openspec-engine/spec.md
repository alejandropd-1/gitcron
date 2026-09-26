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

### Requirement: Mientras se lee el motor, la pantalla SHALL decir que está leyendo

Hasta que llegue la primera medición del motor de un repositorio, y mientras se vuelve a medir después
de una acción, GitCron SHALL mostrar que está leyendo, ocupando el mismo lugar que ocupará el
resultado. SHALL NOT mostrar «Ausente», «Desconocido», «No se puede determinar» ni «El CLI de
OpenSpec no está instalado» sin una medición que lo sostenga: son afirmaciones sobre la máquina y,
mostradas por falta de datos, se leen como un error que no existe.

#### Scenario: Primera carga
- **WHEN** se abre la configuración de OpenSpec de un repositorio y el estado del motor todavía no llegó
- **THEN** se ve «Leyendo OpenSpec…» en el lugar del resultado, sin «Ausente» ni «Desconocido», y al llegar el resultado la pantalla no salta

#### Scenario: Motor realmente ausente
- **WHEN** la medición termina y no hay motor de OpenSpec
- **THEN** recién entonces se declara ausente, con el motivo

### Requirement: Un repositorio sin OpenSpec SHALL ofrecer inicializarlo una sola vez, eligiendo herramientas

En un repositorio que no usa OpenSpec, GitCron SHALL ofrecer una única acción de inicializar, que
muestra qué herramientas detectó, deja elegir cuáles configurar y declara qué va a escribir. SHALL NOT
ofrecer un «Configurar» por herramienta: cada uno inicializa OpenSpec en el repositorio aunque diga
otra cosa. Al terminar SHALL decir qué quedó: las herramientas configuradas y los archivos nuevos sin
confirmar.

#### Scenario: Repositorio que no usa OpenSpec
- **WHEN** el repositorio no tiene OpenSpec inicializado y hay herramientas detectadas
- **THEN** se ve un solo bloque «Este repositorio no usa OpenSpec» con la lista de herramientas para elegir y un botón «Inicializar OpenSpec», sin botones por herramienta

#### Scenario: Resultado de inicializar
- **WHEN** termina la inicialización
- **THEN** se informa con qué herramientas quedó y cuántos archivos nuevos quedaron sin confirmar

### Requirement: Las herramientas sin configurar SHALL resumirse con una sola acción

En un repositorio que ya usa OpenSpec, las herramientas presentes sin configurar SHALL mostrarse en
un solo resumen con una única acción «Configurar…» que deja elegir cuáles, y SHALL informar el
resultado. La lista, los nombres y las carpetas SHALL leerse sin superponerse y sin que la pantalla
salte al terminar.

#### Scenario: Varias pendientes
- **WHEN** el motor informa dos o más herramientas presentes sin configurar
- **THEN** se ve una línea «Detectadas sin configurar: …» y un solo botón «Configurar…», que abre la elección

### Requirement: La cabecera y su botón SHALL decir lo mismo

El texto del estado de la integración y el del botón de la cabecera SHALL derivarse de la misma
medición. SHALL NOT mostrarse «Todo al día» cuando el estado declara que falta inicializar, que hay
herramientas pendientes o que la actualización está detenida.

#### Scenario: Repositorio sin inicializar
- **WHEN** el estado de la integración es «Inicialización del repositorio»
- **THEN** el botón no dice «Todo al día»

### Requirement: Las salidas administrables SHALL listarse por carpeta y presentes sólo con instrucciones

La lista de salidas administrables SHALL tener una fila por carpeta física, nombrando las
herramientas que la usan, y SHALL marcarla presente sólo si contiene instrucciones de OpenSpec, no
porque la carpeta exista.

#### Scenario: Carpeta compartida
- **WHEN** varias herramientas comparten `.agents/skills`
- **THEN** hay una sola fila para esa carpeta, con las herramientas que la usan

#### Scenario: Carpeta sin instrucciones
- **WHEN** existe `.github` pero no tiene instrucciones de OpenSpec
- **THEN** su salida no figura como presente

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
