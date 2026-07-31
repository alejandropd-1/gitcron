## Why

`lib/__tests__/git-hunks-ipc.test.ts` fallaba de forma intermitente en Windows con
`EBUSY: resource busy or locked, rmdir '...\repo'`, en su `afterEach`. Corrido aislado pasaba
(6/6); fallaba sólo bajo la carga paralela de la suite completa.

La causa es de plataforma, no del test: `simple-git` levanta procesos `git` hijos y `node:sqlite`
abre archivos; en Windows el handle puede seguir tomado unos milisegundos después de que el proceso
salió. El `fs.rmSync` inmediato choca contra ese handle y hace fallar el `afterEach` de un test que
**ya había pasado**.

Un test que a veces pasa es peor que uno que falla siempre, porque enseña a ignorar el rojo. Ya
pasó: el handoff recibido declaraba la suite en verde con 549 cuando en esa corrida eran 548 y un
fallo.

Este change además resuelve un vacío de método. El arnés de pruebas no tenía dónde vivir en
OpenSpec: no cambia comportamiento de producto, así que ningún spec existente lo describe, y un
change sin deltas no valida en `--strict`. Se crea la capacidad `testing-harness` para que las
garantías del arnés —que son reales y verificables— tengan su lugar, en vez de quedar como trabajo
sin registrar o forzadas dentro de una capacidad de producto que no les corresponde.

## What Changes

- Se crea la capacidad `testing-harness`, que declara las garantías del arnés de pruebas: no
  comportamiento de la aplicación, sino propiedades que las pruebas mismas deben cumplir para que
  su resultado sea creíble.
- La limpieza de directorios temporales en los tests que crean repositorios Git o bases SQLite pasa
  a reintentar el borrado, con las opciones `maxRetries`/`retryDelay` que `fs.rm`/`fs.rmSync`
  ofrecen precisamente para el `EBUSY`/`EPERM`/`ENOTEMPTY` de Windows.
- Se aplica a los **seis** archivos con el mismo patrón vulnerable, no sólo al que falló: los otros
  cinco tenían idéntica exposición y pasaban por suerte de scheduling.
- No cambia ninguna aserción ni se relaja ninguna comprobación. Lo único que cambia es el borrado
  del directorio temporal, que corre después de que el test terminó.

## Capabilities

### New Capabilities

- `testing-harness`: garantías del arnés de pruebas —limpieza de recursos temporales, y que el
  resultado de un test dependa de sus aserciones y no del entorno—. Cubre el arnés, no el producto.

### Modified Capabilities

Ninguna. El comportamiento de la aplicación no cambia.

## Impact

- Nuevo `test-utils/temp-dir.ts` con el helper compartido.
- `lib/__tests__/git-hunks-ipc.test.ts`
- `electron/__tests__/branch-delete-ipc.test.ts`
- `electron/__tests__/git-ops-worktree-submodule.test.ts`
- `electron/__tests__/git-repo-ipc.test.ts`
- `electron/__tests__/git-sync-ipc.test.ts`
- `electron/__tests__/temporal-agent-ipc.test.ts`
- Sin dependencias nuevas. Cero código de producto tocado.
