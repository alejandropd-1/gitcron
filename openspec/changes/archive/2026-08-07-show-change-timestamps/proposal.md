## Why

Un cambio no dice cuándo empezó. El encabezado del cambio activo muestra su identificador y su
intención, y nada más: para saber si algo lleva una hora o una semana abierto hay que salir a mirar
Git. Un cambio archivado muestra una fecha suelta —`archivedAt`, sin hora— y no dice cuándo se creó,
así que tampoco se puede saber cuánto duró.

En el mismo bloque hay tres filas que ocupan el lugar donde ese dato debería estar, y dos de ellas no
informan nada. En `components/pipeline/OpenSpecDashboard.tsx:1278-1280`, "Especificaciones principales"
y "Actividad y evidencia" están escritas como texto constante: ambas rinden siempre
`t('pipeline.openspec.completed.preserved')`, o sea "Conservadas", sin consultar ningún dato del
cambio. No hay caso en que digan otra cosa. La tercera, "Archivo", muestra
`openspec/changes/archive/2026-08-06-legible-panel-controls`, cuya fecha ya está impresa dos líneas más
arriba.

O sea que el panel dedica tres filas a repetir una fecha y a afirmar dos veces algo que siempre es
cierto, mientras el dato que falta —cuándo empezó, cuándo terminó, cuánto tardó— no está en ninguna
parte.

## What Changes

- El encabezado de un cambio activo muestra, a la derecha del título, la fecha y hora de creación.
- El encabezado de un cambio archivado muestra fecha y hora de creación y fecha y hora de archivado.
- Se retiran las tres filas del resumen de archivado: las dos constantes por no informar nada, y la de
  la ruta por duplicar la fecha que ya se muestra.
- La marca de tiempo declara qué significa: es cuándo quedó confirmado en Git, no cuándo se tipeó.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-repo-evidence`: la evidencia de un cambio lleva su fecha y hora de creación, y la de
  archivado cuando corresponde.
- `pipeline-guided-workflow`: el panel muestra esas marcas y deja de mostrar filas constantes.

## Impact

**Producción:** el lector de evidencia —para derivar ambas marcas—, `types/pipeline/index.ts`, el
encabezado del cambio activo y el resumen de archivado en `OpenSpecDashboard.tsx`, más las claves de
i18n que dejan de usarse.

**Sin tocar:** el orden de la lista de cambios, el archivado, y el `archivedAt` que hoy alimenta la
fecha suelta —se reemplaza su presentación, no la fuente de la que sale—.

**Fuera de alcance:** mostrar duración calculada ("tardó 3 días"), ordenar o filtrar por fecha, y
marcar cuándo se tildó cada casilla. Se muestran las dos marcas y se deja que quien lea saque la
cuenta; lo demás es trabajo aparte que nadie pidió.

**Dependencias:** ninguna.

**Riesgo:** bajo en código. El riesgo está en afirmar una precisión que el dato no tiene, y por eso la
marca declara que es la del commit: un cambio creado a la mañana y confirmado a la noche va a mostrar
la noche. Presentarla como "cuándo se creó" a secas sería vender una exactitud que no existe.

**Comprobado antes de proponer:** ambas marcas se pueden derivar y se midió sobre un caso real.
`git log --follow --diff-filter=A --format=%aI -- <ruta>/proposal.md` devuelve
`2026-08-06T11:59:37-03:00` para `legible-panel-controls`, y `--follow` atraviesa el rename del
archivado, así que la creación sigue siendo alcanzable después de archivar. El commit del movimiento da
el archivado: `2026-08-06T12:03:14-03:00`. Para un cambio todavía sin confirmar, Git no tiene nada que
decir y hace falta un respaldo; la marca de creación del directorio en disco existe y responde
—`14:51:34` sobre un cambio creado hoy—, con el límite de que se pierde al archivar. La elección entre
ambas fuentes está en `design.md`.
