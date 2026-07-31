# Reporte — fix-archive-panel-and-git-refresh

**Fecha:** 2026-07-31 · **Rama:** `fix/openspec-artifacts-selection` · **Change:** `fix-archive-panel-and-git-refresh`

## Qué problema resolvía

Tres defectos del primer uso real del archivado con commits, los tres detectados por Ale.

**1. Los commits eran reales y la vista los desconocía.** Verificado con `git log`: los cuatro
commits estaban, correctos y en orden —`feat`/`fix` del trabajo y `chore(openspec): archivar …`—
con el árbol limpio. Pero el grafo seguía mostrando HEAD en el commit anterior. La causa: el watcher
emite `repo:fs-change` y el renderer sólo llama a `refreshStatus`, no a `refreshLog`. El estado del
árbol se releía; el historial no.

**2. El panel de confirmación no era usable en ventanas bajas.** Crece con la lista de archivos
—que puede tener decenas— y el final, donde están los botones, quedaba fuera de pantalla.

**3. La ficha del archivado se veía cortada por arriba.** `justify-content: center` recorta el
comienzo del contenido al desbordar, y ese recorte **no se alcanza con scroll**. Es un
comportamiento conocido de flexbox y la causa exacta de lo que se veía.

## Qué se tocó

| Archivo | Cambio |
|---|---|
| `electron/ipc/pipeline-archive.ts` | Emite `repo:commits-changed` tras commitear, sólo si hubo commits. |
| `electron/main.ts`, `electron/preload.ts`, `types/electron.d.ts` | La señal y su suscripción. |
| `hooks/use-repo-loader.ts` | Al recibirla, relee historial, estado y ramas; limpia la suscripción. |
| `components/pipeline/OpenSpecDashboard.module.css` | Panel acotado con scroll propio y botones pegados abajo; ficha con `safe center` y más ancho para el visor. |

**Por qué una señal nueva y no reutilizar `repo:fs-change`:** ese evento se dispara con cada
guardado de archivo. Colgarle una relectura del log haría pagar un `git log` en cada tecleo. La
señal nueva se emite sólo cuando la aplicación crea commits.

**`justify-content: safe center` en lugar de `flex-start`:** conserva el centrado cuando el
contenido entra —que es la mayoría de los casos y como estaba diseñada la ficha— y se alinea al
comienzo sólo cuando desborda. No se pierde el diseño para arreglar el borde.

## Resultado real de las comprobaciones

| Comprobación | Resultado |
|---|---|
| `pnpm exec tsc --noEmit` | **0** |
| `pnpm test` | **608 passed / 84 archivos**, 0 failed |
| `pnpm exec eslint` sobre los archivos tocados | **limpio** |
| `openspec validate fix-archive-panel-and-git-refresh --strict` | **válido** |

## Pendiente de QA visual

Los tres arreglos son de render o de cableado entre procesos: **ninguno es verificable con la suite
actual**. El de layout necesita una ventana baja para reproducirse, y el del historial necesita un
archivado real con commits. Los tres los tiene que ver Ale.
