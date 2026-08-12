# Reporte — safe-branch-delete

**Cambio:** `safe-branch-delete` (OpenSpec, rama `change/safe-branch-delete`).
**Fecha:** 2026-08-11.
**Base de comparación:** 134 archivos / 1048 pruebas, `tsc` en 0.

Esta tanda la empezó Zai y se cortó por límite de sesión a mitad de las traducciones. Lo que sigue
distingue lo que dejó hecho de lo que se completó después, porque el registro tiene que decir quién
verificó qué.

## 1. El árbol quedó roto y hubo que rescatarlo primero

Al retomar, `pnpm exec tsc --noEmit` estaba **en rojo**:

```
app/page.tsx(1837,9): error TS2322: Type 'Dispatch<SetStateAction<{ branch: string;
scope: "local" | "remote" | "both"; ... }>>' is not assignable to ...
```

**Causa:** el tipo `DeleteBranchState` se amplió en `components/RepoOverlayLayer.tsx` con el scope
`'worktree'` y los campos `worktreePath` y `confirmedLoss`, pero `app/page.tsx` tenía **su propia copia
del tipo** en el `useState` que lo guarda. Dos definiciones de lo mismo se separan al primer cambio, y
se separaron.

**Corrección:** el tipo se exporta desde `RepoOverlayLayer` —que es quien lo consume— y `page.tsx` lo
importa. Una sola fuente, y el compilador vuelve a servir de red en vez de ser el que avisa tarde.

## 2. Qué cambió, archivo por archivo

- **`lib/branch-upstream.ts`** — helpers puros `isRemoteBranchDefault` y `remoteBranchDiffers`, sobre
  `remoteBranchTarget`. Puros y testeables aparte: son la base de las decisiones de la interfaz.
- **`electron/ipc/git-ops.ts`** — handler `git:default-branch(repoPath, remote)`, que resuelve el nombre
  corto con `git symbolic-ref --short refs/remotes/<remote>/HEAD`. Sin red; `null` si no está resuelto.
- **`electron/ipc/git-sync.ts`** — **la guardia dura**. Antes de `push --delete`, resuelve la rama por
  defecto del remoto y, si coincide con la que se pide borrar, rechaza con `DEFAULT_BRANCH` **sin
  ejecutar nada**. Está en el IPC y no sólo en la interfaz porque el canal es alcanzable por su cuenta.
- **`electron/preload.ts`**, **`types/electron.d.ts`** — binding y tipo de `gitDefaultBranch`.
- **`lib/git-store.ts`**, **`hooks/use-repo-loader.ts`** — `defaultRemoteBranch` en el store, poblado al
  refrescar ramas. Si vuelve `null`, el flujo sigue: no saber cuál es la rama por defecto no puede
  romper el refresco.
- **`hooks/git-actions/branches.ts`** — `deleteBranchAndWorktree(branch, worktreePath, { force })`:
  suelta el worktree y **sólo entonces** borra la rama. Si vuelve `HAS_CHANGES`, no borra y lo reporta
  para que la interfaz pida la segunda confirmación.
- **`components/RepoOverlayLayer.tsx`** — no ofrece scope remoto cuando el upstream está `gone` o no hay
  remoto; bloquea cuando el remoto es la rama por defecto; muestra `remote/remoteBranch` cuando el
  nombre difiere del local; ofrece el flujo de worktree en vez del borrado directo.
- **`app/page.tsx`** — el `useState` con el tipo importado (punto 1).
- **`lib/i18n.ts`** — los textos, en los tres idiomas.

## 3. Los tres tests que faltaban

Zai dejó la implementación completa y **0 de 23 tareas tildadas**. Al verificar tarea por tarea contra
el código, tres pruebas no existían:

- **2.4 — la guardia que impide borrar la rama por defecto.** Era la más importante y la que faltaba:
  la protección existía sin nada que la sostuviera. Se agregó en
  `electron/__tests__/git-sync-ipc.test.ts`, **contra Git real** —repositorio bare como remoto, clon,
  y `git remote set-head` para que `refs/remotes/origin/HEAD` exista—, porque lo que hay que verificar
  es que la resolución funcione con la salida real de `symbolic-ref`. Comprueba además que **`main`
  sigue existiendo en el remoto después del rechazo**: sin esa aserción, un borrado que ocurre y
  después informa el error pasaría igual.
- **4.2 — la secuencia de soltar y borrar.** Nuevo archivo
  `hooks/__tests__/delete-branch-worktree.test.ts`: soltar OK → borra; `HAS_CHANGES` → **no** borra y lo
  reporta; `force` se propaga. `useRepoLoader` se mockea entero porque montarlo arrastraría observadores
  y temporizadores ajenos a lo que se prueba.
- **7.1** queda cubierta por el test de 2.4, que es exactamente el escenario con Git real que pedía.

**Detalle del entorno:** `vitest.config.ts` incluye `hooks/__tests__/**/*.test.ts` —no `.tsx`— y su
entorno por defecto es `node`. El archivo nuevo usa `createElement` en vez de JSX y declara
`// @vitest-environment jsdom` en la cabecera, siguiendo lo que ya hacía `use-repo-watch.test.ts`.

## 4. Cierre (salida real)

| Comando | Resultado |
|---|---|
| `pnpm exec tsc --noEmit` | **exit 0** |
| `pnpm exec vitest run --maxWorkers=2` | **135 archivos / 1061 pruebas** — base 134/1048, **+1 archivo, +13 pruebas** |
| `pnpm exec eslint` (13 archivos) | 0 errores, **2 warnings preexistentes** en `app/page.tsx` (`exhaustive-deps`, líneas 258 y 922), ya presentes en `main` |
| `npx openspec validate safe-branch-delete --strict` | **válido** |

Sin flakes. Ningún test existente se modificó ni se aflojó: las 1048 originales siguen pasando
intactas.

## 5. Qué NO se hizo

- **Las tres claves `discardConfirm.title`, `discardConfirm.warning` y `discardConfirm.button` que usa
  `RepoOverlayLayer` no existen en `lib/i18n.ts`.** Se comprobó contra `main`: **ya faltaban antes de
  esta tanda**. No se tocaron —sería refactor de paso— pero quedan declaradas acá porque en pantalla se
  ven como la clave cruda.
- **Sin `git add`, `commit`, `push`, `merge`, `tag` ni `release`.**
- **Sin dependencias nuevas.**

## 6. Encontrado de paso, no tocado

- **Borrar una rama remota que no tiene contraparte local sigue sin existir.** El menú contextual de
  una rama bajo REMOTO ofrece Checkout, Crear nueva branch, Copiar nombre y Cerrar: no hay borrar. En
  el repositorio de Ale hay **45 ramas en `origin` contra 17 locales**, acumuladas por esto. Es una
  capacidad faltante, no un fallo de manejo, y por eso no entra en este cambio: los cuatro casos de acá
  parten de una rama local.
- **Las carpetas de ramas del sidebar aparecen siempre desplegadas** y no recuerdan si se cerraron. Con
  45 ramas bajo `origin`, hay que domarlas en cada apertura.
- `app/page.tsx` arrastra dos warnings de `exhaustive-deps` desde antes.

## 7. Archivos sin confirmar

**Modificados:**

1. `app/page.tsx`
2. `components/RepoOverlayLayer.tsx`
3. `electron/ipc/git-ops.ts`
4. `electron/ipc/git-sync.ts`
5. `electron/preload.ts`
6. `hooks/git-actions/branches.ts`
7. `hooks/use-repo-loader.ts`
8. `lib/branch-upstream.ts`
9. `lib/git-store.ts`
10. `lib/i18n.ts`
11. `types/electron.d.ts`
12. `lib/__tests__/branch-upstream.test.ts`
13. `lib/__tests__/git-store-no-idle-notify.test.ts`
14. `electron/__tests__/git-sync-ipc.test.ts`

**Nuevos:**

15. `hooks/__tests__/delete-branch-worktree.test.ts`
16. `openspec/changes/safe-branch-delete/` (proposal, design, specs, tasks)
17. `docs/reports/2026-08-11-safe-branch-delete.md`

## 8. Lo que falta, y es de Ale

La tarea **8.6**, única sin tildar. Con la aplicación abierta:

- una rama cuyo upstream apunte a `origin/main` **no** ofrece borrar la remota;
- una rama con upstream `gone` ofrece **sólo** el borrado local;
- cuando el nombre remoto difiere del local, la confirmación **lo muestra**;
- una rama tomada por un worktree ofrece soltarlo y borrarla, con una confirmación que **nombra el
  directorio** y advierte qué se pierde.

El caso del worktree tiene un ejemplo real a mano: `claude/cool-driscoll-aa09d4`.
