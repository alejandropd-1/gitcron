## ADDED Requirements

### Requirement: El panel distingue un repositorio sin OpenSpec y ofrece salida
El panel SHALL distinguir un repositorio sin `openspec/` de uno con OpenSpec y sin cambios activos, y
SHALL NOT presentar el primero como una lista vacía de contadores en cero. En ese estado SHALL ofrecer
inicializar OpenSpec, enumerando antes qué se va a escribir en el repositorio, y la ejecución SHALL
requerir una acción humana explícita.

El fundamento es que ambos estados coinciden hoy en los contadores —cuatro ceros— y piden respuestas
distintas: uno se resuelve creando un cambio, el otro no se puede resolver desde el panel en absoluto.
El caso es real y cercano: `C:\www\odontoPia` es un repositorio Git sin `openspec/`, y quien lo abre en
la aplicación no recibe ninguna indicación de qué le falta.

Enumerar lo que se va a escribir antes de escribirlo es la condición que rige toda escritura nueva en
un repositorio del usuario, y exigir una acción humana evita que la inicialización ocurra por el mero
hecho de haber abierto una carpeta.

#### Scenario: Repositorio Git sin openspec/
- **WHEN** se abre un repositorio Git que no tiene `openspec/`
- **THEN** el panel declara ese estado y ofrece inicializar OpenSpec

#### Scenario: Repositorio con OpenSpec y sin cambios activos
- **WHEN** se abre un repositorio con `openspec/` y ningún cambio activo
- **THEN** el panel no ofrece inicializar y guía hacia crear un cambio

#### Scenario: Antes de escribir nada
- **WHEN** se ofrece la inicialización
- **THEN** se enumeran los archivos que se van a escribir y nada se escribe sin una acción humana

### Requirement: El estado sin OpenSpec nombra su consecuencia
El panel SHALL explicar, en el estado sin `openspec/`, que crear un cambio sin inicializar igual
funciona pero deja al ejecutor sin contexto ni reglas.

El fundamento es que el fallo es silencioso y se comprobó con una sonda: `openspec new change` funciona
sin `init`, el `config.yaml` resultante queda vacío y `openspec instructions` devuelve contexto vacío y
ninguna regla. Sin nombrar esa consecuencia, inicializar parece opcional, y el camino de menor
resistencia lleva a un ejecutor trabajando con reglas locales sin saber que le faltan las del
proyecto: el fallo que este repositorio ya sufrió una vez.

#### Scenario: Aviso del estado sin inicializar
- **WHEN** el panel declara que el repositorio no tiene OpenSpec
- **THEN** explica que crear un cambio igual funciona y que el ejecutor quedaría sin contexto ni reglas

### Requirement: La inicialización siembra reglas, no un config vacío
La inicialización SHALL dejar el `config.yaml` con un juego de reglas base, y SHALL NOT dejarlo sin
ninguna. Entre esas reglas SHALL ir las de forma de las tareas: numeración jerárquica y redacción
autosuficiente para un ejecutor que no participó de la conversación. Las reglas sembradas SHALL ser
genéricas y SHALL NOT arrastrar el contexto de producto de este repositorio.

El fundamento es que un `config.yaml` vacío deja al ejecutor exactamente donde estaba antes de
inicializar: recibe el encargo por el canal y ninguna convención por el mismo canal. Inicializar sin
sembrar nada mueve el problema de sitio en vez de resolverlo.

Que entren las reglas de forma, y no sólo las de contenido, es lo que la evidencia pide. En
`C:\www\odontoPau` el `config.yaml` está poblado y sus reglas de `tasks` cubren separación por área,
puertas de aprobación y comandos de cierre; bajo ese canal, cuatro de sus cinco cambios traen secciones
y casillas jerárquicas —164 casillas `N.N`, ninguna plana— y el quinto no tiene ninguna sección y sus
seis casillas son una lista plana. Ninguna regla menciona la forma, así que los cuatro que coinciden lo
hacen por imitación de los archivos vecinos, no porque el canal se las haya dado. Esa costumbre se
sostiene hasta el primer ejecutor que no mira alrededor, y ese caso ya ocurrió. La convención de numerar
`1.1`, `1.2`, `1.3` en este repositorio descansa exactamente sobre lo mismo.

Que sean genéricas importa porque un repositorio ajeno no quiere heredar el contexto de gitCronos:
quiere arrancar con lo que hace legible un artefacto para cualquiera.

#### Scenario: Repositorio recién inicializado
- **WHEN** se inicializa OpenSpec en un repositorio que no lo tenía
- **THEN** el `config.yaml` queda con reglas base y no vacío

#### Scenario: Reglas de forma de las tareas
- **WHEN** un ejecutor pide las instrucciones de las tareas en ese repositorio
- **THEN** recibe la convención de numeración jerárquica y de redacción autosuficiente

#### Scenario: Reglas genéricas, sin contexto ajeno
- **WHEN** se siembran las reglas base
- **THEN** ninguna arrastra el contexto de producto de gitCronos
