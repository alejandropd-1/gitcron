## Why

Borrar una rama local puede, hoy, apuntar a borrar `main` en el remoto sin decirlo. La causa está en el
código: `components/RepoOverlayLayer.tsx:378-393` resuelve el objetivo remoto del borrado con
`remoteBranchTarget(branchTracking[branch].upstream, branch)`, y `lib/branch-upstream.ts:10` parte el
upstream corto en remote y branch —`origin/main` se vuelve `{remote:'origin', branch:'main'}`. El handler
`electron/ipc/git-sync.ts:427-437` ejecuta entonces `git push origin --delete main` sin más comprobación.

La evidencia del propio dueño lo verifica: `git branch -vv --list "claude/*"` muestra dos ramas locales con
`origin/main` como upstream y una tercera con un upstream `gone`; `git ls-remote --heads origin "claude/*"`
devuelve vacío. Borrar cualquiera de las dos primeras le pediría a GitHub que borre `main`. Hoy no pasa
sólo porque la rama por defecto está protegida; ese rechazo es la única barrera y no es una garantía; en un
repo sin esa protección la operación se ejecuta. A la tercera, con upstream `gone`, la interfaz le ofrece el
borrado remoto igual y la operación falla.

En la misma familia entra otra acción que la interfaz ofrece y Git después rechaza con texto crudo: borrar
una rama que un worktree tiene abierta —`cannot delete branch 'X' used by worktree at 'Y'`—, hoy volcada sin
explicación ni salida.

## What Changes

- **No ofrecer ni ejecutar el borrado remoto cuando el upstream resuelto es la rama por defecto del
  remoto.** La rama por defecto se obtiene localmente con `git symbolic-ref refs/remotes/<remote>/HEAD`;
  una guardia en el handler la rechaza aunque la interfaz falle, y la interfaz deja de ofrecer la acción.
- **No ofrecer el borrado remoto cuando el upstream está `gone` o la rama no existe en el remoto:** sólo el
  local, diciéndolo.
- **Cuando el nombre remoto difiere del local, mostrarlo en la confirmación.** La persona lee exactamente
  qué rama remota se borra antes de aceptar; no lo deduce del nombre local.
- **Reconocer la rama abierta por un worktree antes de ofrecer el borrado**, explicarlo en castellano y
  ofrecer soltar el worktree **y** borrar la rama en un solo paso, con confirmación explícita que nombre el
  directorio eliminado y advierta que los cambios sin confirmar de esa copia de trabajo se pierden. La
  acción no se ejecuta sin esa confirmación.

### Fuera de alcance

No se cambia la resolución del upstream para `push`/`pull`, ni la del `fast-forward`, ni el menú de la rama
remota del sidebar (sólo el flujo de borrado de rama). No se solapa con la detección de la rama del change
(`change-branch-evidence`), que es otra familia. No se altera `git-failure-language` a nivel de spec: su
criterio —explicar el fallo reconocido en el idioma de la aplicación conservando el original, ofrecer la
salida sin ejecutarla— se aplica tal cual al caso worktree. No se adopta `core.fsmonitor` ni se tocan las
ramas parqueadas de otros changes.

## Capabilities

### New Capabilities

- `branch-delete-safety`: cuándo el borrado de una rama no se ofrece ni se ejecuta porque se sabe inviable,
  y cómo se confirma cuando es viable pero conviene mostrar (upstream que es la rama por defecto del
  remoto, upstream `gone`, nombre remoto distinto del local, y rama abierta por un worktree).

### Modified Capabilities

_(ninguna: `git-failure-language` no cambia de spec; se aplica su criterio ya escrito al caso worktree.)_

## Impact

- `electron/ipc/git-sync.ts` — guardia en `git:delete-remote-branch` que rechaza la rama por defecto.
- `electron/ipc/git-ops.ts` — exponer la rama por defecto del remoto y el estado de cambios del worktree
  (parte ya existe en `git:worktree-remove`).
- `hooks/git-actions/remote.ts` y `hooks/git-actions/branches.ts` — acción de «soltar el worktree y borrar
  la rama» y propagar el rechazo de la guardia.
- `hooks/use-repo-loader.ts` y `lib/git-store.ts` — rama por defecto del remoto y worktrees ya disponibles
  para que la UI decida.
- `components/RepoOverlayLayer.tsx` — dejar de ofrecer lo inviable y mostrar las confirmaciones.
- `lib/branch-upstream.ts` — helper de validación pura (¿es la rama por defecto?, ¿hay mismatch?).
- `lib/i18n.ts` — strings ES/EN/ZH. Sin dependencias nuevas.
