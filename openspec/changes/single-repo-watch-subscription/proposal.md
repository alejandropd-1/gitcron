## Why

`useRepoLoader` monta un `useEffect` de observación del repositorio, y ese hook se llama desde ocho
lugares distintos. Cada instancia suscribe `repo:fs-change` y `repo:commits-changed`, agrega
listeners de `focus` y `visibilitychange`, y arranca **su propio** `setInterval` de 2 segundos.

La consola de la aplicación lo declara sin ambigüedad:

```
MaxListenersExceededWarning: Possible EventEmitter memory leak detected.
11 repo:fs-change listeners added.
11 repo:commits-changed listeners added.
```

Con once instancias vivas, la aplicación hace once veces el trabajo de Git que necesita:

- un cambio de archivo dispara once `refreshStatus`, es decir once procesos `git status` de ~108 ms;
- el heartbeat corre once veces cada 2 segundos, en cualquier vista, mientras la ventana esté
  enfocada;
- un commit dispara once veces `refreshLog` + `refreshStatus` + `refreshBranches`, 33 operaciones.

Nada de eso se deduplica: el canal `git:status` no tiene control de concurrencia. Esos procesos
compiten por CPU con el renderer, así que además degradan el resto de la aplicación —el arrastre del
grafo, medido aparte, dispone de menos CPU de la que debería—.

Los consumidores son `app/page.tsx`, `use-auto-fetch`, los cuatro `hooks/git-actions/*`,
`BranchFilterDropdown` y `ChronometricGraph`. Ninguno pidió observar el repositorio: lo heredaron por
llamar a un hook que además trae las funciones de refresco.

## What Changes

- La observación del repositorio se separa de `useRepoLoader` a un hook propio, que la aplicación
  monta **una sola vez**.
- `useRepoLoader` queda como lo que sus consumidores realmente usan: funciones de carga y refresco,
  sin efectos de alcance global.
- El montaje duplicado deja de ser silencioso: si el hook de observación se monta más de una vez, se
  declara en consola durante el desarrollo en vez de degradar el rendimiento sin señal.

**No cambia** qué se refresca ni cuándo: los mismos disparadores —cambio de archivo, commit, foco,
visibilidad y heartbeat— con el mismo debounce. Cambia cuántas veces ocurre.

## Capabilities

### New Capabilities

- `repo-watch-lifecycle`: cuántas veces la aplicación observa un repositorio abierto y qué garantiza
  esa observación — unicidad, cobertura de los disparadores existentes y limpieza al cerrar.

### Modified Capabilities

Ninguna.

## Impact

- `hooks/use-repo-loader.ts` — se le quita el efecto de observación.
- `app/page.tsx` — monta el hook de observación una vez.
- Cobertura nueva sobre el conteo de suscripciones, que hoy no tiene ninguna.
- Sin cambios de IPC, de i18n ni de dependencias. `electron/ipc/watchers.ts` no se toca: el problema
  está del lado del renderer, que se suscribe de más.
- Efecto esperado sobre el resto de la aplicación: menos procesos `git status` compitiendo por CPU.
  **No se declara una mejora medida**; la medición corresponde a quien la observe con la aplicación.
