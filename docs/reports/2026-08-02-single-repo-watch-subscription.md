# Reporte — `single-repo-watch-subscription`

**Fecha:** 2026-08-02 · **Base:** `main` en `123544e`

Once suscripciones a los eventos de cambio del repositorio donde debía haber una.

## Diagnóstico

Apareció instrumentando el rendimiento del grafo: la consola de la aplicación declaraba

```
MaxListenersExceededWarning: Possible EventEmitter memory leak detected.
11 repo:fs-change listeners added.
11 repo:commits-changed listeners added.
```

`useRepoLoader` montaba un `useEffect` de observación —`repoWatch`, suscripción a `repo:fs-change`,
suscripción a `repo:commits-changed`, listeners de `focus`/`visibilitychange` y un `setInterval` de
2 s— y ese hook se llama desde ocho lugares: `app/page.tsx`, `use-auto-fetch`, los cuatro
`hooks/git-actions/*`, `BranchFilterDropdown` y `ChronometricGraph`.

Con once instancias vivas, la aplicación hacía once veces el trabajo de Git que necesitaba: un
cambio de archivo disparaba once `refreshStatus` —once `git status` de ~108 ms, sin deduplicar,
porque ese canal no tiene control de concurrencia—, el heartbeat corría once veces cada 2 segundos
en cualquier vista, y un commit disparaba once veces `refreshLog` + `refreshStatus` +
`refreshBranches`.

Ninguno de esos consumidores pidió observar: lo heredaban por pedir las funciones de refresco.
`BranchFilterDropdown` quiere `refreshLog`; `ChronometricGraph`, `loadAll`.

## Qué se tocó

- `hooks/use-repo-loader.ts` — el efecto de observación sale de `useRepoLoader` a un hook propio,
  `useRepoWatch`, que obtiene las funciones de refresco llamando al primero. `useRepoLoader` queda
  sin ningún efecto de alcance global: sólo funciones.
- `app/page.tsx` — monta `useRepoWatch()` una vez, en la raíz, que dura lo que dura la aplicación.
- Aviso en desarrollo: si se monta más de una observación a la vez, se declara en consola con el
  hook responsable. El contador se decrementa en el cleanup, así que el doble montaje de React en
  modo estricto no lo dispara: sólo lo hace la coexistencia real de dos observaciones.

Los cinco disparadores y el debounce quedan idénticos. Cambia cuántas veces ocurren, no cuándo.

Archivos:

- `hooks/use-repo-loader.ts`
- `app/page.tsx`
- `hooks/__tests__/use-repo-watch.test.ts` (nuevo)

## Qué NO se tocó

- `electron/ipc/watchers.ts`. El lado de main ya deduplica por repo; el que se suscribía de más era
  el renderer.
- Control de concurrencia en `git:status`. Con una sola suscripción no hay concurrencia que
  controlar; agregarlo sería tapar el síntoma.
- **El heartbeat de 2 s sigue existiendo**, ahora en una sola instancia en vez de once. Si conviene
  quitarlo del todo —su propio comentario lo declara red de seguridad redundante con chokidar— es
  una decisión para tomar con la aplicación a la vista.
- El número de consumidores de `useRepoLoader`, que sigue siendo ocho. Ya no tiene costo.
- El costo por render de `ChronometricGraph`, medido en 50–70 ms con 500 commits. Es el otro
  hallazgo abierto y necesita su propio change.

## Resultado real de las comprobaciones

| Comprobación | Resultado |
|---|---|
| `pnpm exec eslint <archivos tocados>` | 0 errores; 2 warnings **preexistentes** en `app/page.tsx` (líneas 232 y 900, `exhaustive-deps`), ajenos a este cambio |
| `pnpm exec tsc --noEmit` | 0 errores |
| `pnpm test` (corrida 1) | 86 archivos · 625 tests · verde |
| `pnpm test` (corrida 2) | 86 archivos · 625 tests · verde |
| `pnpm test` (corrida 3) | 86 archivos · 625 tests · verde |
| `openspec validate single-repo-watch-subscription --strict` | válido |

Antes de este change la suite era de 85 archivos y 619 tests; los seis nuevos son los de este hook.

**Sobre el flake:** tres corridas verdes, sin reproducir el `Test timed out in 5000ms` de los cuatro
archivos que crean repos Git reales. Igual que en las dos tandas anteriores: **no está resuelto ni
medido**, sólo no apareció.

## Cobertura agregada

Seis tests, en un archivo nuevo. No había precedente de simular `window.api` en la suite; el store
se sustituye con un objeto que resuelve los setters como funciones sin efecto.

- Tres consumidores de `useRepoLoader` → cero suscripciones, cero `repoWatch`, cero temporizadores.
- Montar la observación → exactamente una suscripción por evento y un temporizador.
- Un cambio de archivo con varios consumidores montados → un solo `git status`.
- Un commit de la aplicación → un `gitLog`, un `gitStatus` y un `gitBranches`.
- Desmontaje → temporizador cancelado, listeners quitados y `repoUnwatch` pedido.
- Desmontaje con refresco pendiente por debounce → ese refresco no se ejecuta.

El único fallo durante el desarrollo fue del mock (`openRepos` no era un array), no del código.

## Lo que este change NO demuestra

**No se declara ninguna mejora de rendimiento medida.** Está verificado que el trabajo redundante
desaparece —once invocaciones pasan a una, y hay tests que lo fijan—, pero cuánto se nota en la
aplicación depende del repositorio y de la máquina. Afirmar una mejora sin medirla sería inventarla.

La comprobación que corresponde hacer con la aplicación es que la consola ya no declare
`MaxListenersExceededWarning`.

## Pendiente

- `4.7 Ale confirma con la aplicación que la consola ya no declara suscripciones de más` — sin marcar.
- `4.8 Archivado confirmado por Ale desde la aplicación` — la marca el botón de archivar.
