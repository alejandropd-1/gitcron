## Why

La aplicación se vuelve a dibujar por completo cada 2 segundos mientras la ventana está enfocada, sin que nada haya cambiado en disco. El latido de `hooks/use-repo-loader.ts:719` llama a `refreshStatus`, que a su vez llama a `updateRepoByPath` (`lib/git-store.ts:263`); ese updater reconstruye el array `openRepos` con `.map()` aunque el patch no modifique ningún campo, y como el componente raíz se suscribe al store entero sin selector (`app/page.tsx:113`), la referencia nueva fuerza un re-render de la raíz y con él de toda la aplicación. Medido sobre una réplica mínima del store con `zustand/vanilla`: 10 llamadas a `updateRepoByPath` con un patch que no cambia nada producen **10 notificaciones** a los suscriptores — una por latido, una por re-render. Ale reportó que la máquina entera se ralentiza con GitCron abierta, y este ciclo es la causa.

## What Changes

Cuatro correcciones que rompen la cadena ociosa, sin tocar el comportamiento funcional:

- El latido de respaldo deja de disparar `refreshStatus` cuando el resultado sería idéntico al estado actual: la llamada a `git status` sólo provoca un `set` del store si el árbol cambió. El temporizador se conserva —sigue siendo la red de seguridad para eventos de filesystem que Windows, editores y guardados atómicos pierden— y su intervalo no se modifica.
- `updateRepoByPath` devuelve el mismo array `openRepos` cuando el patch no altera ningún campo del repositorio afectado, dejando de emitir notificaciones sin sentido. Lo mismo se aplica a `updateActiveRepo`, que padece el mismo defecto.
- El componente raíz `app/page.tsx` deja de suscribirse al store entero: pasa a leer por selectores, siguiendo la convención que ya usa para `language`, `fontSize` y `theme`.
- Se borra el comentario falso de `components/pipeline/OpenSpecDashboard.tsx:539-541` que justificaba no memoizar invocando un React Compiler que no está configurado, y se resuelve la memoización de esa derivación con el motivo verdadero.

## Capabilities

### New Capabilities
- `idle-render-isolation`: aislamiento del re-render ocioso. Cubre tres cosas: que el store no notifique cuando el patch no cambia nada, que el componente raíz se suscriba sólo a lo que usa, y que las justificaciones de optimización en el código correspondan a mecanismos que existen. Es una capacidad nueva: hoy no hay spec que obligue a silenciar notificaciones sin delta ni a acotar la suscripción de la raíz.

### Modified Capabilities
_Ninguna._ Los disparadores que `repo-watch-lifecycle` conserva —filesystem, commits, foco, visibilidad y latido de respaldo— siguen existiendo sin alteración: el latido sigue llamando a `refreshStatus` cada 2 segundos, que es lo que cubre los eventos perdidos. Lo que cambia es lo que el store hace con el resultado, y eso vive en `idle-render-isolation`.

## Impact

Código afectado: `hooks/use-repo-loader.ts` (latido), `lib/git-store.ts` (`updateRepoByPath`, `updateActiveRepo`), `app/page.tsx` (suscripción del componente raíz), `components/pipeline/OpenSpecDashboard.tsx` (comentario falso y derivación). Sin dependencias nuevas: no se instala React Compiler ni ninguna otra librería. Sin cambios en APIs de Electron ni en el contrato IPC. Tests: se actualizan los que afirmaban el defecto (array nuevo por call, re-render incondicional) y se agregan los que protegen el comportamiento nuevo; el detalle se declarará en el reporte. La mejora de rendimiento se mide contando notificaciones del store y re-renders antes y después, con el método documentado en `design.md`.
