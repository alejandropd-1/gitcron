## ADDED Requirements

### Requirement: El panel abre en el estado del repositorio
El panel SHALL abrir mostrando el estado del repositorio y SHALL NOT entrar a ningún cambio que la
persona no haya elegido. Entrar a un cambio SHALL ser una acción explícita, y volver al estado del
repositorio SHALL seguir siendo posible después de haber entrado. La pantalla de entrada SHALL
declarar los cambios en curso con su avance de tareas, lo archivado y las especificaciones, y SHALL
ofrecer abrir un cambio nuevo.

El fundamento es que un cambio elegido por orden de lista no es información: el panel entraba al
primero de `activeChanges` y mostraba sus tareas como si fueran el asunto del momento, sin que nada
distinguiera esa elección de una deliberada. Mostrar primero el panorama es lo que permite decidir por
dónde seguir, que es la pregunta real al abrir la herramienta.

#### Scenario: Apertura con varios cambios en curso
- **WHEN** se abre el panel en un repositorio con más de un cambio activo y sin elección previa
- **THEN** se muestra el estado del repositorio con cada cambio y su avance, y no se entra a ninguno

#### Scenario: Entrar a un cambio
- **WHEN** se elige un cambio desde la pantalla de entrada o desde la lista
- **THEN** el panel muestra ese cambio, y esa elección se informa como el cambio en pantalla

#### Scenario: Abrir un cambio nuevo desde la entrada
- **WHEN** se pide empezar un trabajo nuevo desde la pantalla de entrada
- **THEN** el flujo de creación queda disponible sin tener que entrar antes a un cambio ajeno

### Requirement: La correspondencia entre rama y cambio se declara sin navegar
Cuando el estado del repositorio identifica un cambio a partir de la rama actual, el panel SHALL
señalarlo en la pantalla de entrada y SHALL NOT entrar a ese cambio por su cuenta. La señal SHALL
distinguirse de la elección de una persona.

El fundamento es que esa correspondencia es el dato más útil para decidir por dónde seguir, y gastarlo
en saltar adentro lo vuelve invisible: quien llegaba a un cambio no podía distinguir si estaba ahí
porque su rama lo identificaba o porque era el primero de la lista.

#### Scenario: La rama identifica un cambio
- **WHEN** el estado del repositorio informa un cambio derivado de la rama actual
- **THEN** ese cambio queda señalado en la pantalla de entrada, sin que el panel entre a él

#### Scenario: La rama no identifica ninguno
- **WHEN** el estado del repositorio no informa ningún cambio para la rama actual
- **THEN** la pantalla de entrada no señala ninguno y no se elige uno por descarte

### Requirement: Un repositorio sin nada archivado no se lee como vacío
El panel SHALL declarar el estado de un repositorio que tiene cambios en curso y ningún archivado
como lo que es —trabajo abierto que todavía no llegó a su primer archivado— y SHALL NOT presentarlo
sólo como una cuenta en cero junto a las demás. Las cuentas que significan ausencia de trabajo y las
que significan trabajo sin cerrar SHALL distinguirse entre sí.

El fundamento es que un cero de archivados y un cero de cambios activos significan cosas opuestas: el
primero es el estado normal de cualquier proyecto antes de su primer archivado, y el segundo es un
repositorio sin trabajo abierto. Presentarlos igual hace que un repositorio con la mayoría de sus
tareas hechas se lea como uno donde no pasó nada. Es el mismo principio por el que un valor
desconocido no se muestra como cero, aplicado a un cero que no significa ausencia.

#### Scenario: Repositorio antes de su primer archivado
- **WHEN** el repositorio tiene cambios activos, ninguno archivado y ninguna especificación
- **THEN** la pantalla declara que todavía no se archivó nada y muestra el avance real de los cambios
  en curso, en vez de presentar el estado como vacío

#### Scenario: Repositorio sin ningún trabajo abierto
- **WHEN** el repositorio no tiene ningún cambio activo
- **THEN** la pantalla lo declara como tal y ofrece empezar uno, distinguiéndolo del caso anterior
