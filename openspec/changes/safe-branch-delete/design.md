# Diseño — safe-branch-delete

## Context

El borrado de una rama local resuelve el objetivo remoto del **upstream configurado** y lo pasa a
`git push <remote> --delete <branch>` sin validar. Cuando el upstream es la rama por defecto del remoto
(`origin/main`), eso apunta a borrar `main`. Tres hechos verifican el cuadro y acotan el cambio:

- `lib/branch-upstream.ts:10` parte `origin/main` en `{remote:'origin', branch:'main'}`.
- `components/RepoOverlayLayer.tsx:378-393` usa ese resultado como objetivo del borrado remoto.
- `electron/ipc/git-sync.ts:427-437` lo ejecuta sin más comprobación.
- `electron/ipc/git-ops.ts:317-341` ya mapea cada worktree con la rama que tiene abierta, y `:352-376` ya
  detecta cambios sin confirmar en el worktree y los protege con `HAS_CHANGES`.

El store ya expone `worktrees`, `branchTracking` (con `gone` y `hasRemote`) y `remoteBranches`. Falta la
rama por defecto del remoto. El criterio de lenguaje para el fallo worktree ya está en `git-failure-language`
(explicar en el idioma de la app conservando el original, ofrecer la salida sin ejecutarla); no se
reescribe.

## Goals / Non-Goals

- **Goals:** que borrar una rama no pueda apuntar a la rama por defecto del remoto; que el `gone` o la
  rama ausente en el remoto no ofrezcan un borrado remoto que va a fallar; que el nombre remoto, si difiere
  del local, se vea en la confirmación; y que la rama abierta por un worktree se reconozca, se explique y se
  ofrezca soltar el worktree y borrar la rama en un paso, con confirmación explícita de la pérdida.
- **Non-Goals:** no se toca la resolución de upstream para `push`/`pull`/`fast-forward`, ni el menú de la
  rama remota del sidebar, ni el flujo de `change-branch-evidence`. No se hace configurable el bloqueo de la
  rama por defecto: un cliente no debe borrarla por la puerta trasera.

## Decisions

1. **Defensa en profundidad: la UI no ofrece y el handler rechaza.** La UI (`RepoOverlayLayer`) decide qué
   ofrecer con los datos del store; el handler `git:delete-remote-branch` tiene además una guardia que
   rechaza la rama por defecto aunque la UI falle o el IPC se llame por otro camino. Alternativa descartada:
   validar sólo en la UI — el IPC es alcanzable y un cliente no puede depender de una sola capa para no
   borrar `main`.

2. **Rama por defecto del remoto por `git symbolic-ref`, sin red.** Se resuelve con
   `git symbolic-ref --short refs/remotes/<remote>/HEAD`. Medido en este repo: devuelve `origin/main`, sin
   ir a la red. Alternativa descartada: `git remote show <remote>` — pide red y credenciales en privado.
   Alternativa descartada: asumir `main`/`master` — frágil y exactamente el tipo de suposición que causó el
   defecto.

3. **Si la rama por defecto no se puede resolver, el mismatch visible es la red de seguridad.**
   `refs/remotes/<remote>/HEAD` no siempre está (depende del clone/fetch). Cuando falta, no se bloquea por
   defecto; pero la confirmación muestra el **nombre remoto** que se va a borrar (decisión 4), así que
   borrar `main` se vuelve visible aunque no bloqueable. Es una degradación honesta y declarada, no una
   promesa de bloqueo absoluto.

4. **El nombre remoto distinto se muestra, no se bloquea.** Cuando `remoteBranch !== branch`, la
   confirmación nombra el remote y la rama remota exacta. No bloquea: cambiar de nombre al empujar es
   legítimo; lo que no lo es, es borrarlo sin verlo. Esta es la protección que cubre el caso `claude/* →
   main` incluso si la decisión 2 no resolvió la rama por defecto.

5. **`gone` o ausente en el remoto ⇒ sólo local.** La UI deja de ofrecer el scope remoto/ambos cuando
   `branchTracking[branch].gone` o `!hasRemote`, y ofrece sólo el local diciéndolo. No se intenta un `push
   --delete` que se sabe que falla.

6. **Worktree: detectar con los worktrees del store y resolver con los IPC que ya existen.** Si
   `worktrees.find(w => w.branch === branch && !w.detached)` existe, la rama está abierta en ese worktree.
   La confirmación nombra el directorio (`worktree.path`) y, reusando `git:status` sobre ese path, dice si
   **tiene** archivos sin confirmar y se perderán. Al confirmar se ejecuta
   `gitWorktreeRemove(repoPath, path, force = tiene cambios)` y, si sale bien, `deleteBranch(branch)`. El
   handler `git:worktree-remove` ya devuelve `HAS_CHANGES` sin `force`, así que la protección de cambios ya
   vive en main; acá se la hace visible **antes** de ofrecer. Alternativa descartada: explicar el error
   crudo de Git después — no resuelve, sólo traduce; Ale pidió resolver en un paso.

## Risks / Trade-offs

- **[La rama por defecto no se resuelve (`refs/remotes/<remote>/HEAD` ausente)]** → no hay bloqueo duro;
  la confirmación con el nombre remoto visible (decisión 4) es la red de seguridad. Declarado, no oculto.
- **[Soltar un worktree con cambios sin confirmar pierde trabajo]** → la confirmación lo dice con el número
  de archivos y no se ejecuta sin ella; el `force` sólo se pasa cuando la persona confirmó sabiendo eso.
- **[El bloqueo duro rechaza un caso legítimo]** (alguien configura a propósito el upstream a `main`) → el
  mensaje explica por qué y la persona puede hacerlo desde la terminal; borrar `main` vía una rama local
  nunca es el camino querido en la app.
- **[El worktree principal también aparece en la lista]** → si la rama es la actual del repo principal, el
  flujo no debe ofrecer "soltar el worktree principal"; se excluye el worktree cuyo path es el del repo
  abierto.

## Migration Plan

Sin migración de datos ni feature flag. Los IPC nuevos (`git:default-branch`) son aditivos; los existentes
no cambian firma, sólo agregan una rama de rechazo. Rollback: revertir el cambio; el comportamiento vuelve
al actual (el defecto vuelve, no hay estado persistido).

## Open Questions

Ninguna abierta: las decisiones se tomaron con la evidencia del código. La única degradación conocida
(rama por defecto no resuelta → sólo mismatch visible) está declarada en la decisión 3.
