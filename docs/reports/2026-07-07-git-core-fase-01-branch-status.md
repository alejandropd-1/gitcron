# Git-core Fase 01 — Indicador local / remoto en el sidebar

Branch: `git-core/fase-01-branch-status` (desde `main`). Sin merge, sin tag.

## Objetivo

Reemplazar el puntito de color a la derecha de cada branch local del sidebar —
redundante con el ícono de la izquierda— por un **indicador de estado local/remoto**
que comunica de un vistazo si la branch es solo-local, sincronizada o divergida.
Prepara el terreno para la Fase 02 (menú de borrado).

Fase **solo lectura + UI**: no se borra ni modifica ninguna branch. Cero cambios en
flujos de Git existentes (checkout, merge, create, delete intactos). El estado se
calcula contra refs **locales**, sin llamadas de red a GitHub.

## Hallazgo previo

El handler `git:branches` **ya** calculaba tracking por branch (`upstream`, `ahead`,
`behind`, `gone`) vía `git for-each-ref` sobre `refs/heads` — sin red. No se creó un
handler nuevo: se **extendió** ese mismo. El parseo estaba inline en el handler; se
extrajo a una función pura para poder testearlo con fixtures.

## Cambios

### Tanda 1 — Backend de estado

- **`types/electron.d.ts`**: `BranchTrackingInfo` suma el campo `hasRemote: boolean`
  (upstream configurado **y** vivo, es decir no `gone`). Los campos previos
  (`upstream`, `ahead`, `behind`, `gone`) se mantienen.
- **`electron/ipc/branch-tracking.ts`** (nuevo): función pura `parseBranchTracking(raw)`
  que convierte la salida de
  `git for-each-ref --format=%(refname:short)|%(upstream:short)|%(upstream:track) refs/heads`
  en `Record<string, BranchTrackingInfo>`. Sin dependencias de electron/simple-git →
  unit-testable con fixtures.
- **`electron/ipc/git-ops.ts`**: el handler `git:branches` reemplaza el parseo inline por
  una llamada a `parseBranchTracking`. Misma fuente de datos, mismo alcance (best-effort
  dentro de `try/catch`).
- **`electron/__tests__/branch-tracking.test.ts`** (nuevo): 8 tests con fixtures cubriendo
  solo-local / sincronizada / adelante / atrás / divergida / gone / múltiples branches /
  salida vacía.

**Forma del dato que devuelve `git:branches`** (sin cambios de contrato salvo el campo
nuevo):

```ts
{
  local:   string[],
  remote:  string[],
  current: string,
  tracking: Record<string, {
    upstream: string | null,   // ej "origin/main" | null
    ahead:    number,          // commits locales pendientes de push
    behind:   number,          // commits remotos pendientes de pull
    gone:     boolean,         // upstream configurado pero borrado en el remoto
    hasRemote: boolean,        // NUEVO: upstream vivo (configurado y no gone)
  }>
}
```

### Tanda 2 — Indicador visual

- **`components/RepoSidebarParts.tsx`**: nuevo componente `BranchStatusIndicator`
  que reemplaza el puntito de color (`<span>` con `backgroundColor: branchColor`) en la
  fila de branch local (`BranchRow`). Consolida además los contadores ahead/behind y el
  badge `gone` que antes se renderizaban sueltos.
- Se preserva el comportamiento existente: para branches `imagined/*` en hover se sigue
  mostrando el botón de descartar (Trash2); en el resto de los casos va el indicador.

**Íconos por estado** (lucide, tamaño 12–13px):

| Estado | Condición | Ícono | Token de color |
|---|---|---|---|
| solo-local | `!hasRemote && !gone` | `HardDrive` | `text-text-secondary/60` (#9eacc0) |
| sincronizada | `hasRemote && ahead===0 && behind===0` | `Cloud` + `Check` | `text-secondary` (#a3f185) |
| divergida | `hasRemote && (ahead>0 \|\| behind>0)` | `Cloud` + `↑ahead ↓behind` | `text-git-mod` (#fd9d1a); ahead en `text-secondary`, behind en `text-git-mod` |
| gone | `gone` | `CloudOff` | `text-error/80` (#ff716c) |

Todos los tokens ya existían en el sidebar (estética TCARS/LCARS intacta; sin paleta
nueva).

### Claves i18n agregadas (`lib/i18n.ts`, ES/EN/ZH)

Tooltip por estado, con interpolación `{{upstream}}` / `{{ahead}}` / `{{behind}}`:

- `sidebar.branchStatus.local`
- `sidebar.branchStatus.synced`
- `sidebar.branchStatus.diverged`
- `sidebar.branchStatus.gone`

## Verificación

- `npx tsc --noEmit` → exit 0.
- `pnpm test` → **251/251** tests verdes (34 archivos), incluidos los 8 nuevos de
  `parseBranchTracking`.
- Lint: `branch-tracking.ts` limpio. `RepoSidebarParts.tsx` sólo arrastra un warning
  **preexistente** (`react-hooks/set-state-in-effect` en `BranchFolderView`, línea no
  tocada por esta fase).

## Criterios de aceptación

- [x] Cada branch del sidebar muestra un indicador de estado local/remoto (ya no el puntito).
- [x] Los estados solo-local / sincronizada / divergida se distinguen a simple vista.
- [x] El estado se calcula sin llamadas de red a GitHub (solo `for-each-ref` sobre refs locales).
- [x] Tooltip i18n en ES/EN/ZH. Cero cambios en flujos de Git existentes.
- [x] `tsc` y `pnpm test` en verde. Reporte escrito. Branch pusheada sin merge.
