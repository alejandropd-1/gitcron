# Git-core Fase 03 — Guard de arranque para carpetas sin `git init`

Branch: `git-core/fase-03-init-guard` (desde `main`). Sin merge, sin tag.

## Objetivo

Cuando el usuario intenta abrir una carpeta que existe pero todavía no es un
repositorio Git, GitCron ya no muestra el error crudo del intento de apertura.
El renderer reconoce ese caso como un resultado estructurado y muestra un cartel
amable para inicializar la carpeta en el acto.

Al confirmar, el renderer llama al handler existente `git:init`; no ejecuta Git
directamente. La conexión a remoto queda fuera de alcance para Fase 04.

## Cambios

### Tanda 1 — Resultado estructurado

- `electron/ipc/git-repo.ts` conserva `checkIsRepo()` como fuente de verdad.
- `git:open-path` y `git:open-repo` ahora devuelven, solo para este caso:

```ts
{
  success: false,
  ok: false,
  reason: 'not-a-repo',
  path,
  error
}
```

- Se mantiene `success: false` para compatibilidad con callers que todavía solo
  miran el contrato histórico.
- `types/electron.d.ts` suma `ok`, `reason` y `path` opcionales en `GitResult`.
- `electron/__tests__/git-repo-ipc.test.ts` cubre ambos handlers y verifica que el
  flujo se corta tras `checkIsRepo()` sin pasar a `status()`.

### Tanda 2 — Cartel de inicialización

- `hooks/use-repo-loader.ts` detecta `reason: 'not-a-repo'` en `openRepo()` y abre
  un estado `pendingInitRepo` en lugar de llamar a `setError`.
- `InitializeRepoGuardModal` en `components/RepoActionModals.tsx` muestra un
  diálogo positivo, no destructivo, con estética glass/LCARS y acciones:
  `Cancelar` / `Inicializar repositorio`.
- `components/RepoOverlayLayer.tsx` monta el modal junto al resto de overlays.
- Al confirmar, `initializePendingRepo()` llama a `initRepo(parentPath, name, true)`.
  Ese helper usa `window.api.gitInit`, que llega al handler existente del main
  process (`git:init`, `git init --initial-branch=main`).
- Cuando el init termina bien, se limpia el pending state, se refresca el repo con
  `loadAll(path)` y se cierra el chooser. La UI queda en el repo recién abierto.

### I18n

Claves agregadas en ES/EN/ZH:

- `initGuard.title`
- `initGuard.desc`
- `initGuard.pathLabel`
- `initGuard.action`
- `initGuard.initializing`

## Verificación

- `./node_modules/.bin/tsc.cmd --noEmit` → exit 0.
- `pnpm test` → **261/261** tests verdes (37 archivos).
- Verificación visual con Playwright CLI + mocks de `window.api`:
  - `openRepo()` devolvió `reason: 'not-a-repo'`.
  - Se mostró el cartel "Esta carpeta todavía no es un repositorio Git".
  - Confirmar llamó a `gitInit` (`initialized: true` en el mock).
  - La UI terminó con `gitcron-init-guard-demo` abierto en `main` y `Initial commit`.

Capturas locales de checkpoint:

- `output/playwright/init-guard-modal.png`
- `output/playwright/init-guard-opened-repo.png`

## Criterios de aceptación

- [x] Abrir una carpeta sin Git ya no muestra error crudo.
- [x] El usuario ve un cartel amable con opción de init local.
- [x] Inicializar reutiliza el handler existente `git:init` del main process.
- [x] Tras inicializar, el repo queda abierto y refrescado en el flujo normal.
- [x] `checkIsRepo()` y `git:init` no fueron reescritos.
- [x] i18n ES/EN/ZH. `tsc` y tests completos verdes. Reporte escrito.

## Backlog

- Queda pendiente el guard amable para el caso "binario de Git faltante". Es de
  la misma familia de UX que este cambio, pero no se resolvió en esta fase.
