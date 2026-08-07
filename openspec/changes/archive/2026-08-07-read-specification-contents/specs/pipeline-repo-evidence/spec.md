## ADDED Requirements

### Requirement: El contenido de una especificación se puede leer desde la aplicación
La aplicación SHALL poder obtener el contenido de una especificación consolidada a partir de su
identificador. La respuesta SHALL distinguir el contenido leído, el archivo vacío y el fallo de lectura.
La lectura SHALL respetar un límite de tamaño explícito. El contenido SHALL NOT transportarse en el
snapshot.

El fundamento es que las especificaciones consolidadas son el estado declarado del producto —lo que
quedó después de archivar cada cambio— y hoy son lo único del método que no se puede leer desde la
aplicación: la barra lateral las lista como texto muerto porque no tiene contenido que mostrar.

Que no viajen en el snapshot es una restricción medida, no una preferencia: las de este repositorio
pesan 145 KB en quince archivos, con una sola de 84,9 KB, y el snapshot se rearma en cada refresco que
dispara el watcher con cada guardado. Una especificación consolidada cambia cuando se archiva un cambio,
no cuando se guarda un archivo, así que atar su contenido al refresco paga un costo continuo por algo
que casi nunca cambia y casi nunca se mira.

Distinguir los tres casos importa porque piden respuestas distintas: un archivo vacío es un dato real
del repositorio, un fallo es algo que hay que reportar con su motivo, y confundirlos deja al visor en
blanco sin explicar por qué.

#### Scenario: Especificación legible
- **WHEN** se pide el contenido de una especificación que existe
- **THEN** se devuelve su texto

#### Scenario: Especificación vacía
- **WHEN** se pide el contenido de una especificación cuyo archivo está vacío
- **THEN** se devuelve vacío como dato, distinguible de un fallo

#### Scenario: Lectura que falla
- **WHEN** el archivo de una especificación no se puede leer
- **THEN** se informa el fallo en vez de devolver contenido vacío

### Requirement: La lectura no acepta rutas del renderer
El proceso principal SHALL recibir el identificador de la especificación y SHALL componer la ruta por su
cuenta. El identificador SHALL validarse contra el mismo alfabeto acotado que ya se exige al listar las
especificaciones, y la ruta resultante SHALL resolverse contenida al repositorio.

El fundamento es la invariante de seguridad del proyecto: el renderer no le entrega paths sin validar al
proceso principal. Aceptar la referencia de origen que el snapshot ya expone sería más directo, y sería
exactamente el agujero que esa invariante evita. Componer la ruta del lado del principal deja el control
donde tiene que estar, y no cuesta nada porque el identificador ya viene acotado.

#### Scenario: Identificador fuera del alfabeto
- **WHEN** se pide una especificación con un identificador que no respeta el alfabeto acotado
- **THEN** se rechaza sin tocar el disco

#### Scenario: Intento de salir del repositorio
- **WHEN** el identificador pretende escapar del directorio de especificaciones
- **THEN** se rechaza y no se lee ningún archivo fuera del repositorio
