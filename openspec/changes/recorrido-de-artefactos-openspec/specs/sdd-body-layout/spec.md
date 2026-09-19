## ADDED Requirements

### Requirement: El ancho del cuerpo SHALL derivarse del contenedor y ser uno solo

El cuerpo SDD SHALL declarar un único ancho de contenido, consumido por el encabezado del cambio,
el cuerpo, sus paneles y el esqueleto de carga, y SHALL derivarlo del ancho del contenedor: crece
en contenedores anchos y conserva un relleno lateral propio en todos los casos. Tres anchos
independientes para el mismo cuerpo es lo que hoy hace que un panel asome por los costados del
encabezado y que en un monitor grande el contenido quede flotando en una columna angosta.

#### Scenario: Contenedor ancho
- **WHEN** el contenedor del cuerpo mide 1400 px o más
- **THEN** el contenido usa un ancho mayor que el base y conserva relleno lateral; ningún texto toca los bordes del contenedor

#### Scenario: Contenedor angosto
- **WHEN** el contenedor mide menos que el ancho base
- **THEN** el contenido ocupa el ancho disponible con el mismo relleno lateral, sin desborde horizontal

#### Scenario: Un solo ancho
- **WHEN** se mide el ancho del encabezado, del cuerpo, de un panel del cuerpo y del esqueleto de carga
- **THEN** los cuatro coinciden

### Requirement: El encabezado pegajoso SHALL cubrir el ancho del cuerpo

El encabezado del cambio SHALL seguir pegajoso al scrollear y SHALL cubrir con fondo opaco el
ancho del cuerpo, de modo que ningún contenido del cuerpo se vea por debajo ni por los costados.

#### Scenario: Scroll con un panel abierto
- **WHEN** el panel «Confirmar archivado» está abierto y la lista de tareas se scrollea
- **THEN** el panel pasa por debajo del encabezado sin asomar por los costados

### Requirement: El riel flotante SHALL mantener separación del encabezado

El riel flotante SHALL quedar separado de la línea inferior del encabezado por un espacio de la
escala, tanto pegado al scrollear como en reposo.

#### Scenario: Riel en reposo y pegado
- **WHEN** el cuerpo está arriba del todo y cuando está scrolleado
- **THEN** entre el borde inferior del encabezado y el borde superior del riel hay el mismo espacio, mayor que cero
