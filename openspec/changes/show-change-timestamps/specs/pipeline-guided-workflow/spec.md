## ADDED Requirements

### Requirement: El panel muestra cuándo empezó y cuándo terminó un cambio
El encabezado de un cambio activo SHALL mostrar su fecha y hora de creación junto al título. El
encabezado de un cambio archivado SHALL mostrar fecha y hora de creación y fecha y hora de archivado.
Una marca no confirmada SHALL presentarse de modo distinguible, y el panel SHALL declarar que la marca
corresponde al momento en que el trabajo quedó confirmado, no a cuándo se escribió.

El fundamento es que la antigüedad de un cambio es lo primero que se quiere saber al mirarlo y hoy
obliga a salir a Git: el cambio activo no muestra ninguna fecha, y el archivado muestra una sola y sin
hora, con lo cual no se puede saber cuánto duró.

Declarar qué significa la marca no es un detalle: se deriva del commit, así que un cambio creado a la
mañana y confirmado a la noche muestra la noche. Presentarla como "creado" a secas afirmaría una
exactitud que el dato no tiene, y este panel califica el resto de su evidencia por ese mismo criterio.

#### Scenario: Cambio activo en el encabezado
- **WHEN** se muestra un cambio activo
- **THEN** su fecha y hora de creación aparecen junto al título

#### Scenario: Cambio archivado en el encabezado
- **WHEN** se muestra un cambio archivado
- **THEN** aparecen su creación y su archivado, ambas con fecha y hora

#### Scenario: Cambio sin confirmar
- **WHEN** el cambio todavía no tiene ningún commit
- **THEN** su marca se muestra distinguible de una confirmada

### Requirement: El resumen de archivado no muestra filas constantes
El resumen de un cambio archivado SHALL NOT mostrar filas cuyo contenido no dependa del cambio, ni
repetir un dato que ya se muestre en el mismo encabezado.

El fundamento es que las tres filas actuales no informan: "Especificaciones principales" y "Actividad y
evidencia" rinden texto constante sin consultar el cambio —siempre dicen "Conservadas", no existe caso
en que digan otra cosa— y "Archivo" muestra una ruta cuya fecha ya está impresa dos líneas más arriba.
Ocupan el lugar donde va el dato que sí falta, y una fila que siempre dice lo mismo enseña a la vista a
saltear el bloque entero, incluida la información que sí varía.

#### Scenario: Resumen de un cambio archivado
- **WHEN** se muestra el resumen de un cambio archivado
- **THEN** no aparecen filas de texto constante ni la ruta que duplica la fecha
