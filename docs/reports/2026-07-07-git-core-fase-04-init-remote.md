# Git-core Fase 04 — Init con vinculo a remoto existente

Branch: `git-core/fase-04-init-remote` (desde `main`, con Fase 03 mergeada). Sin merge, sin tag.

## Objetivo

Extender el cartel de Fase 03 para que una carpeta sin Git pueda inicializarse
de dos maneras:

- **Solo inicializar**: conserva el comportamiento de Fase 03 (`git:init` local).
- **Inicializar y vincular remoto**: inicializa localmente, agrega `origin` con
  una URL de GitHub ya existente y hace el primer push de `main`.

Esta fase no crea repositorios nuevos en GitHub.

## Cambios

### Tanda 1 — Backend del vinculo

- Handler nuevo en `electron/ipc/git-sync.ts`:

```ts
git:add-existing-github-remote(targetPath, remoteUrl, token?)
```

- Implementacion:
  - valida `remoteUrl`;
  - ejecuta `git remote add origin <url>`;
  - ejecuta `git push --set-upstream origin main`;
  - reutiliza `withGitHubToken(...)`, el mismo helper del flujo de push existente.
- La autenticacion para remotos HTTPS de GitHub sigue usando `http.extraheader`
  process-scoped. No se escriben tokens en URLs ni en configuracion persistente.
- Si el primer push falla, el handler devuelve un resultado estructurado
  `first-push-failed`, marca el repo local como reintentable e intenta remover el
  `origin` agregado para que el usuario pueda corregir URL/permisos sin estado
  raro.
- La validacion de URL vive en `lib/github-remote-url.ts` y se comparte entre
  main/renderer:
  - `https://github.com/owner/repo`
  - `https://github.com/owner/repo.git`
  - `git@github.com:owner/repo`
  - `git@github.com:owner/repo.git`

### Tanda 2 — Cartel con dos caminos

- `InitializeRepoGuardModal` ahora muestra dos acciones:
  - `Solo inicializar`;
  - `Inicializar y vincular remoto`.
- El segundo camino revela un input para la URL del remoto existente.
- El renderer valida la URL antes de llamar a `git:init`, evitando crear un repo
  local cuando el input ya es invalido.
- `useRepoLoader.initializePendingRepoWithRemote(remoteUrl, onProgress)` orquesta:
  1. validar URL;
  2. reutilizar `initRepo(...)` / `git:init`;
  3. llamar a `gitAddExistingGitHubRemote(...)`;
  4. abrir/refrescar el repo si todo sale bien.
- Si el push falla, la UI muestra un error legible y conserva el estado
  `isInitialized` en `pendingInitRepo`: el repo local ya quedo listo y el usuario
  puede reintentar solo el vinculo.
- La URL del remoto vive solo en estado local del modal y viaja por IPC al main
  process. No se guarda en storage ni se coloca en parametros de URL.
- `preload.ts` y `types/electron.d.ts` exponen el nuevo metodo tipado:

```ts
gitAddExistingGitHubRemote(repoPath, remoteUrl, token?)
```

### I18n

Claves agregadas en ES/EN/ZH:

- `initGuard.localAction`
- `initGuard.localDesc`
- `initGuard.remoteAction`
- `initGuard.remoteDesc`
- `initGuard.remoteUrlLabel`
- `initGuard.remoteUrlPlaceholder`
- `initGuard.remoteUrlHint`
- `initGuard.remoteConfirm`
- `initGuard.remoteWorking`
- `initGuard.localReady`
- `initGuard.progress.validating`
- `initGuard.progress.initializing`
- `initGuard.progress.linking`
- `initGuard.remoteError.invalidUrl`
- `initGuard.remoteError.addRemote`
- `initGuard.remoteError.auth`
- `initGuard.remoteError.push`
- `initGuard.remoteError.pushLocalReady`
- `initGuard.remoteError.generic`

## Seguridad y alcance

- CSP no fue modificada. `connect-src` sigue sin dominios nuevos.
- Credenciales siguen en main/storage cifrado con `safeStorage`; el renderer solo
  usa el token ya existente en el store, igual que otros flujos de push/clone.
- No hay token-bearing URLs: la autenticacion HTTPS de GitHub sigue pasando por
  `withGitHubToken(...)`.
- La fase no usa Octokit para crear repositorios y no agrega ningun flujo de
  creacion remota.

## Verificacion

- `pnpm exec tsc --noEmit` -> exit 0.
- `pnpm test` -> **264/264** tests verdes (38 archivos).
- Tests nuevos/especificos:
  - `electron/__tests__/git-link-existing-remote-ipc.test.ts`
    - valida URLs ok/invalidas;
    - valida que una URL invalida no toca Git;
    - mockea fallo de primer push y verifica rollback de `origin`.
- Verificacion visual con Playwright + `window.api` mockeada:
  - cartel con input de remoto visible;
  - caso de push rechazado con error legible y repo local reintentable.

Capturas locales de checkpoint:

- `output/playwright/fase-04-init-remote-input.png`
- `output/playwright/fase-04-init-remote-error.png`

## Criterios de aceptacion

- [x] El cartel ofrece init-solo-local o init+vincular-remoto.
- [x] Vincular hace `remote add` + primer push reutilizando credenciales existentes.
- [x] URL validada; push fallido muestra error legible sin romper el repo local ya creado.
- [x] CSP sin dominios nuevos.
- [x] Credenciales solo en main/safeStorage; no tokens en URLs.
- [x] i18n ES/EN/ZH. `tsc` y `pnpm test` verdes. Reporte escrito.

## Backlog explicito

- **Crear repo nuevo en GitHub via Octokit (`createForAuthenticatedUser`), con
  eleccion publico/privado y manejo de nombre ya existente queda para una
  iteracion futura, fuera de esta fase.**
