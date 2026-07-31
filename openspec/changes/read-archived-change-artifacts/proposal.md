## Why

Cuando un change pasa a "Completados recientes" no hay forma de revisar qué se hizo desde la
aplicación. La ficha muestra el identificador, la fecha y la ubicación del archivo, y nada más: la
evidencia de un archivado sólo transporta esos tres datos.

Para ver el `tasks.md` —por ejemplo, para confirmar que la firma humana quedó tildada— hay que salir
a leer el diff del commit de archivado o abrir el archivo a mano. Justo el registro que este método
produce para poder revisarlo es el que no se puede revisar.

## What Changes

- La evidencia del archivado **seleccionado** transporta el contenido de sus artefactos.
- La ficha del cambio completado los muestra, con el mismo visor que ya usan los activos.
- Los archivados no seleccionados no transportan contenido, igual que los activos.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pipeline-repo-evidence`: los artefactos de un cambio archivado se pueden revisar desde la
  aplicación.

## Impact

- `electron/pipeline/repo-evidence-reader.ts` — lectura de los artefactos del archivado seleccionado.
- `types/pipeline/index.ts`, `components/pipeline/pipeline-view-state.ts` — el contenido opcional.
- `components/pipeline/OpenSpecDashboard.tsx` + CSS — el visor dentro de la ficha.
- Sin dependencias nuevas. Sin cambios en IPC ni SQLite.
