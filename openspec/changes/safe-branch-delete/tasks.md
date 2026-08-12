## 1. Helpers puros de validación

- [x] 1.1 En `lib/branch-upstream.ts`, agregar helpers puros y testeables: `isRemoteBranchDefault(remoteBranch,
      defaultBranch)` y `remoteBranchDiffers(remoteBranch, localBranch)`. Reutilizan `remoteBranchTarget`;
      `origin/main` con default `main` → `isRemoteBranchDefault` verdadero
- [x] 1.2 En `lib/__tests__/branch-upstream.test.ts`, cubrir los nuevos helpers (default coincidente/no
      coincidente, mismatch y coincidencia)

## 2. Rama por defecto del remoto y guardia del handler

- [x] 2.1 En `electron/ipc/git-ops.ts`, agregar handler `git:default-branch(repoPath, remote)` que devuelva
      el nombre corto vía `git symbolic-ref --short refs/remotes/<remote>/HEAD` (sin red); `null` si no está
      resuelto
- [x] 2.2 En `electron/preload.ts` y `types/electron.d.ts`, exponer `gitDefaultBranch(repoPath, remote)`
- [x] 2.3 En `electron/ipc/git-sync.ts`, guardia en `git:delete-remote-branch`: resolver la rama por defecto
      del `remote` y, si `branch` coincide, rechazar con `{ success: false, error: 'DEFAULT_BRANCH', data: {
      remote, branch, defaultBranch } }` sin ejecutar `push --delete`
- [x] 2.4 Test del handler (mock `simpleGit`/`symbolic-ref`): la rama por defecto se rechaza y una rama
      común pasa

## 3. Rama por defecto en el store

- [x] 3.1 En `lib/git-store.ts`, agregar `defaultRemoteBranch: string | null` y su setter
- [x] 3.2 En `hooks/use-repo-loader.ts`, poblar `defaultRemoteBranch` (para `origin`) al refrescar ramas,
      pidiendo `gitDefaultBranch`; que no falle el flujo si devuelve `null`

## 4. Acción «soltar el worktree y borrar la rama»

- [x] 4.1 En `hooks/git-actions/` (ramas o remote), agregar `deleteBranchAndWorktree(branch, worktreePath,
      opts: { force })`: llama `gitWorktreeRemove(repoPath, worktreePath, force)`; si sale bien,
      `deleteBranch(branch)`; si vuelve `HAS_CHANGES`, lo reporta para reconfirmar
- [x] 4.2 Test de la acción (mock de los IPC): remove OK → delete; `HAS_CHANGES` → no delete y lo reporta

## 5. Interfaz: no ofrecer lo inviable y confirmar lo sensible

- [x] 5.1 En `components/RepoOverlayLayer.tsx`, `onDeleteRemote`/`onDeleteBoth`: si
      `branchTracking[branch]?.gone` o `!hasRemote`, no armar scope remoto (dejar sólo local con mensaje);
      si `remoteBranch === defaultRemoteBranch`, bloquear con mensaje en castellano
- [x] 5.2 El diálogo de borrado muestra `remote/remoteBranch` cuando `remoteBranchDiffers(remoteBranch,
      branch)`, para que leer borrar `main` sea visible
- [x] 5.3 En el flujo de borrado local, si `worktrees` incluye uno con `branch === branch && !detached &&
      path !== repoPath`, ofrecer el flujo worktree (explicar + botón «soltar y borrar») en vez del borrado
      directo
- [x] 5.4 Confirmación del flujo worktree: nombra el directorio (`worktree.path`) y, consultando
      `gitStatus(worktreePath)`, dice la cantidad de archivos sin confirmar y que se pierden; sólo pasa
      `force` si se confirmó sabiendo eso
- [x] 5.5 Excluir el worktree cuyo `path` es el del repositorio abierto de la oferta de «soltar»

## 6. Idioma (i18n)

- [x] 6.1 En `lib/i18n.ts`, strings ES (fuente) / EN / ZH para: bloqueo por rama por defecto, upstream gone
      (sólo local), nombre remoto distinto en la confirmación, y los del flujo worktree (explicación, botón,
      confirmación con directorio y advertencia de pérdida)

## 7. Pruebas automatizadas con Git real

- [x] 7.1 En un repositorio temporal real creado desde el test: rama con upstream apuntando a `origin/main`
      → la guardia del handler la rechaza; rama `gone` y rama con nombre remoto distinto se comportan como
      los requisitos (aislar el archivo si la suite cae por contención)

## 8. Cierre

- [x] 8.1 `pnpm exec tsc --noEmit` en cero
- [x] 8.2 `pnpm exec vitest run --maxWorkers=2` en verde, declarando el delta contra 134 archivos / 1048
      pruebas
- [x] 8.3 `pnpm exec eslint` limpio sobre los archivos tocados
- [x] 8.4 `npx openspec validate safe-branch-delete --strict` válido
- [x] 8.5 Reporte en `docs/reports/` con qué se cambió archivo por archivo, qué se probó con ramas/worktrees
      reales, la salida real de los cuatro comandos, qué NO se hizo, lo encontrado de paso y la lista exacta
      de archivos sin confirmar
- [ ] 8.6 **Ale valida**, con la app abierta: rama con upstream a `origin/main` no ofrece borrar la remota;
      rama `gone` ofrece sólo local; nombre remoto distinto se muestra; rama en un worktree ofrece soltarlo y
      borrarla con la confirmación que nombra el directorio y la pérdida. Validación humana
