## Decisión: Git como fuente, el disco como respaldo

La marca de creación sale del primer commit que añade `proposal.md`, seguido con `--follow` para que
sobreviva al rename del archivado. La de archivado sale del commit que mueve el cambio a `archive/`.
Cuando el cambio todavía no está confirmado, y sólo entonces, se usa la fecha de creación del
directorio en disco.

**Alternativa descartada: el disco como fuente principal.** Es más directa —no hay que recorrer
historia— y para el archivado es incluso más cercana al momento real: sobre `legible-panel-controls` el
directorio en `archive/` marca `12:01:40`, que es cuando `openspec archive` lo movió, mientras que el
commit del movimiento es `12:03:14`. Se descarta porque esa marca no sobrevive a nada: se pierde al
archivar —el directorio en `archive/` se crea nuevo, así que la fecha de creación original desaparece,
verificado— y también al clonar o copiar el repositorio, donde todos los cambios pasarían a figurar
creados el día de la copia. Una marca que miente después de un `git clone` es peor que no tenerla.

La contrapartida asumida es de precisión: la marca es la del commit, no la del momento en que alguien
escribió el archivo. Un cambio creado a la mañana y confirmado a la noche muestra la noche. Se asume
declarándolo en la interfaz en vez de disimularlo, porque el error de leer "creado a las 20:00" como
"lo empecé a las 20:00" es exactamente el tipo de precisión falsa que este panel evita en el resto de
su evidencia.

## Decisión: el respaldo sólo cubre lo no confirmado

El disco se consulta únicamente cuando Git no tiene nada, y ese caso se distingue en la interfaz en vez
de presentarse igual que una marca confirmada.

**Alternativa descartada: usar la más antigua de las dos.** Suena más exacto y evitaría el salto entre
"sin confirmar" y "confirmado". Se descarta porque mezcla dos afirmaciones distintas bajo una misma
etiqueta sin que se pueda saber cuál se está leyendo, que es el mismo criterio por el que la atribución
de archivos lleva su fuente encima. Además el salto es información: que un cambio pase de marca de
disco a marca de Git significa que se confirmó, y esconderlo no ayuda a nadie.

## Decisión: retirar las tres filas, no reemplazarlas por otras tres

El bloque `<dl>` del resumen de archivado se retira, y las marcas de tiempo van al encabezado, junto al
título, donde ya vive la fecha suelta actual.

**Alternativa descartada: conservar el `<dl>` y sustituir su contenido por las fechas.** Mantiene la
estructura y es menos diff. Se descarta porque el pedido es ver las fechas *al lado del título*, que es
donde se busca la identidad del cambio, y porque dos de las tres filas que se van no informaban nada:
"Especificaciones principales" y "Actividad y evidencia" rinden texto constante, sin consultar el
cambio. Reemplazar una lista de descripción que existía para decir "Conservadas" dos veces conserva un
contenedor que nunca tuvo motivo.

La fila "Archivo" se va por duplicación, no por inútil: la ruta contiene la fecha de archivado, que
pasa a mostrarse formateada y con hora dos líneas más arriba.

## Riesgos

**Recorrer historia por cada cambio encarece el snapshot.** El panel lista todos los archivados, así
que serían dos consultas de historia por cambio. Mitigación: medir el costo del refresco antes y
después —hay precedente de que el costo del refresco importó en este panel— y, si pesa, derivar ambas
marcas en una sola pasada de historia en vez de una consulta por cambio.

**`--follow` es frágil ante renames encadenados.** Mitigación: está comprobado sobre el rename real del
archivado, que es el único que estos archivos sufren, y el proyecto ya depende de que funcione ahí —es
el motivo por el que las dos mitades de un archivado van juntas en un mismo commit—.

## Sin medir

No se midió cuánto agrega al refresco recorrer la historia de cuarenta y nueve cambios archivados. Se
comprobó que las consultas devuelven el dato correcto sobre un caso; el costo agregado es la tarea 1.3.
