# Reporte — determinismo de la limpieza de temporales en tests

**Fecha:** 2026-07-31 · **Rama:** `fix/openspec-artifacts-selection` · **Change:** `make-temp-repo-cleanup-reliable`

## Qué problema resolvía

`lib/__tests__/git-hunks-ipc.test.ts` fallaba de forma intermitente con
`EBUSY: resource busy or locked, rmdir '...\repo'` en su `afterEach`. Aislado pasaba (6/6); fallaba
sólo bajo la carga paralela de la suite completa.

La causa es de plataforma, no del test: `simple-git` levanta procesos `git` hijos y `node:sqlite`
abre archivos; en Windows el handle puede seguir tomado unos milisegundos después de que el proceso
salió. El `fs.rmSync` inmediato choca contra ese handle.

Un test que a veces pasa es peor que uno que falla siempre, porque enseña a ignorar el rojo. Ya
había pasado: el handoff recibido declaraba la suite en verde con 549 cuando en esa corrida eran
548 y un fallo.

## Qué se tocó

Nuevo helper `test-utils/temp-dir.ts` con `removeTempDir(target)`, que usa las opciones
`maxRetries: 10` / `retryDelay: 100` que `fs.rmSync` ofrece precisamente para el `EBUSY`/`EPERM`/
`ENOTEMPTY` de Windows.

Aplicado a los **seis** archivos con el mismo patrón vulnerable, no sólo al que falló — los otros
cinco tenían idéntica exposición y pasaban por suerte de scheduling:

- `lib/__tests__/git-hunks-ipc.test.ts`
- `electron/__tests__/branch-delete-ipc.test.ts`
- `electron/__tests__/git-ops-worktree-submodule.test.ts`
- `electron/__tests__/git-repo-ipc.test.ts`
- `electron/__tests__/git-sync-ipc.test.ts`
- `electron/__tests__/temporal-agent-ipc.test.ts`

## Qué NO se tocó

- Ninguna aserción. Lo único que cambió es el borrado del directorio temporal, que corre **después**
  de que el test terminó. No se enmascara ningún fallo: si una aserción falla, sigue fallando igual.
- Cero código de producto. Cero dependencias nuevas.

## Resultado real de las comprobaciones

| Comprobación | Resultado |
|---|---|
| `pnpm exec tsc --noEmit` | **0** |
| `pnpm test` × 3 corridas seguidas | **568 passed / 78 archivos** las tres veces, 0 failed |
| `pnpm exec eslint` sobre los 7 archivos tocados | **limpio** |

Las tres corridas consecutivas son la comprobación que importa acá: el defecto era intermitente, así
que una sola corrida en verde no probaba nada.

## Nota de método — resuelta

Este trabajo planteaba un vacío: no cambia comportamiento de producto, así que no modifica ningún
spec existente, y un change sin deltas no valida en `--strict`:

> Change must have at least one delta. No deltas found.

Las opciones eran (a) dejarlo fuera de OpenSpec con reporte, (b) crear una capacidad para el arnés
de pruebas, o (c) meterlo dentro del change de producto que lo motivó. **Ale eligió (b).**

Se crea entonces la capacidad **`testing-harness`**, con dos requirements:

1. *Un test que pasó no falla por su propia limpieza* — la liberación de recursos temporales
   tolera la demora del SO en soltar handles, y esa tolerancia no se extiende a las aserciones.
2. *El resultado de la suite no depende de la concurrencia* — una prueba da lo mismo aislada que
   en la suite completa, y la suite no se declara verde mientras exista una diferencia.

El segundo requirement existe justamente por lo que ya pasó acá: se declaró la suite en verde
mientras había una prueba que sólo fallaba bajo carga.

**Límite de la capacidad**, escrito en `design.md` del change para que se pueda citar al revisar
changes futuros y no se vuelva un cajón de sastre: entran propiedades del arnés que determinan si
su resultado es creíble; no entra nada observable usando la aplicación. Regla práctica: si el
requirement se pudiera romper sin que ningún usuario note nada, pero haría que dejemos de confiar
en un "verde", es de esta capacidad.

**Nota de formato para futuros deltas:** `openspec validate --strict` trunca el texto del
requirement a ~100 caracteres al parsearlo, así que el `SHALL`/`MUST` tiene que aparecer dentro de
esa primera parte. Un requirement que abre con dos líneas de contexto y recién después dice `SHALL`
es rechazado con *"must contain SHALL or MUST"* aunque sí lo contenga. Conviene liderar con la
norma y dejar el fundamento debajo.
