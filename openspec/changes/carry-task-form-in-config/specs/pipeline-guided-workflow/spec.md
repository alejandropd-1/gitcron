## ADDED Requirements

### Requirement: La forma de un tasks.md viaja por el canal de instrucciones
La forma de un `tasks.md` SHALL estar declarada en `openspec/config.yaml`, de modo que el CLI la
entregue a cualquier ejecutor que pida instrucciones. Las reglas SHALL exigir secciones numeradas, y
cada casilla SHALL numerarse dentro de su sección. Cada regla SHALL poder comprobarse leyendo
únicamente el archivo en cuestión, y SHALL NOT remitir a otros archivos como referencia de forma.

El fundamento es que hoy la forma no está escrita en ningún lado: las reglas de `tasks` existentes
hablan de verificabilidad, de quién marca y de cuándo, pero ninguna de estructura. Que todos los
`tasks.md` de este repositorio coincidan es imitación de los archivos vecinos, y esa costumbre se
sostiene hasta el primer ejecutor que no los mira. En `C:\www\odontoPau` aguantó cuatro de cinco
cambios —164 casillas jerárquicas sin una plana— y se rompió en el quinto, que quedó como lista plana
sin secciones.

Que las reglas se comprueben sobre un archivo solo es lo que las distingue de la costumbre que
reemplazan. Una regla que dijera "seguí el formato de los demás cambios" tendría el mismo punto ciego:
quien no mira alrededor no va a mirar alrededor porque una regla se lo pida.

#### Scenario: Ejecutor que pide instrucciones para escribir tareas
- **WHEN** un ejecutor pide por el CLI las instrucciones del artefacto de tareas
- **THEN** recibe la forma completa —secciones numeradas y casillas jerárquicas— sin remitir a otros archivos

#### Scenario: Casilla fuera de toda sección
- **WHEN** una tarea no pertenece a ninguna sección
- **THEN** las reglas indican que falta la sección, no que la casilla vaya suelta

#### Scenario: Comprobación sobre un archivo solo
- **WHEN** se quiere verificar si un `tasks.md` cumple la forma
- **THEN** alcanza con leer ese archivo, sin consultar ningún otro cambio

### Requirement: Las tareas se redactan para quien no estuvo en la conversación
Cada tarea SHALL nombrar el archivo, el comando o el criterio concreto que la hace verificable, de modo
que un ejecutor que no participó de la conversación pueda ejecutarla. El archivo SHALL NOT llevar
marcas propias del ejecutor —identificadores, comentarios u otras anotaciones— porque cada casilla se
identifica por su posición en el archivo.

El fundamento es que un `tasks.md` es el encargo que recibe alguien que llega después, y una tarea
redactada como recordatorio de quien la pensó no le sirve. La prohibición de marcas propias no es
estética: en el caso observado cada casilla arrastraba un `<!-- id: N -->` que ningún consumidor lee
—GitCron identifica las casillas por número de línea—, agregado por un ejecutor que suplió con
invención lo que nadie le había declarado.

#### Scenario: Tarea sin referencia concreta
- **WHEN** una tarea no nombra archivo, comando ni criterio comprobable
- **THEN** no cumple la regla, porque quien llega después no puede saber cuándo está hecha

#### Scenario: Anotaciones agregadas por el ejecutor
- **WHEN** un ejecutor agrega identificadores o comentarios a las casillas
- **THEN** no cumple la regla, porque la identificación es posicional y nadie consume esas marcas

### Requirement: La forma rige igual al documentar trabajo ya hecho
Un cambio escrito para documentar trabajo ya realizado SHALL usar la misma forma que uno escrito por
delante. Que el trabajo ya esté hecho SHALL NOT habilitar una estructura distinta.

El fundamento es que el único desvío observado ocurrió exactamente en ese contexto: el encargo fue
documentar en OpenSpec una tarea que ya estaba a medio hacer, sin flujo previo y sin pedir
instrucciones, y el ejecutor resolvió sobre la marcha. Lo que en un flujo normal se sobreentiende, en
uno improvisado se omite, y el artefacto que queda se lee peor durante el resto de su vida sin que
nada haya fallado en el momento.

#### Scenario: Cambio creado para documentar lo ya hecho
- **WHEN** se pide documentar en OpenSpec una tarea que ya está empezada o terminada
- **THEN** el `tasks.md` usa secciones numeradas y casillas jerárquicas igual que cualquier otro
