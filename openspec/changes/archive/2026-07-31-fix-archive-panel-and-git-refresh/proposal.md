## Why

Tres defectos detectados por Ale en el primer uso real del archivado con commits.

1. **Los commits eran reales y la vista los desconocía.** Archivar desde Pipeline commitea desde el
   proceso principal; el watcher emite `repo:fs-change`, pero eso sólo relee el estado del árbol. El
   grafo y el log se quedaban en el commit anterior, así que la única forma de comprobar que había
   funcionado era mirar por fuera de la aplicación.
2. **El panel de confirmación no era usable en ventanas bajas.** Crece con la lista de archivos, y
   el final —donde están los botones— quedaba fuera de pantalla sin forma de alcanzarlo.
3. **La ficha de un cambio archivado se veía cortada por arriba.** Centra su contenido con
   `justify-content: center`, que al desbordar recorta el comienzo, y ese recorte no se alcanza con
   scroll. Además el respiro lateral de la ficha dejaba el markdown demasiado angosto.

## What Changes

- El proceso principal avisa que el historial cambió después de commitear, y las vistas de Git
  releen historial, estado y ramas. Se emite sólo cuando hubo commits.
- El panel de confirmación se acota y desplaza dentro de sí mismo, con los botones pegados abajo:
  alcanzables sin llegar al final del scroll.
- La ficha del completado deja de recortar su comienzo y da más ancho al visor de artefactos.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pipeline-guided-workflow`: lo que la aplicación hace en Git se refleja en sus vistas, y los
  controles de una acción son alcanzables a cualquier alto de ventana.

## Impact

- `electron/ipc/pipeline-archive.ts`, `electron/main.ts`, `electron/preload.ts`,
  `types/electron.d.ts` — la señal de historial cambiado.
- `hooks/use-repo-loader.ts` — relectura de historial, estado y ramas al recibirla.
- `components/pipeline/OpenSpecDashboard.module.css` — los dos arreglos de layout.
- Sin dependencias nuevas.
