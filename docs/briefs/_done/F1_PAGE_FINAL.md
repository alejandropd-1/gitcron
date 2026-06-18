# F1 — Descomposición final de `app/page.tsx` (brief para el agente ejecutor)

> **Leé primero, en este orden:** `docs/00_FUENTE_DE_VERDAD.md` y `docs/01_INVARIANTES.md`.
> Trabajá por TANDAS y PARÁ en cada checkpoint. Este brief es el alcance completo de F1;
> nada fuera de él.

## Contexto

Estás en `C:\www\gitcron`, branch `fallow/test-v4` (worktree limpio). La tanda anterior
extrajo `TopBar.tsx`, `StashModals.tsx` y `ResetCommitModal.tsx` y quedó cortada a mitad
de la descomposición. `app/page.tsx` tiene hoy **2.166 líneas**, con ~63 `useState`,
~37 handlers y una cola de modales/menús contextuales todavía inline (líneas ~1646–2166:
New Branch, Create Tag, context menus de branch/remote/file/commit, merge-needs-checkout,
Rename Branch, Force Push, y los bloques que quizás ya solo rendericen componentes
extraídos — verificalo, no lo asumas).

**Meta de F1:** `page.tsx` por debajo de ~1.400 LOC, **cero cambio de comportamiento**,
sin crear duplicación nueva (Fallow hoy está en 0 issues — mantenelo).

## Modo de trabajo obligatorio

- CodeGraph ANTES de grep para entender áreas e impacto (`codegraph_context`,
  `codegraph_impact` sobre helpers compartidos).
- Una tanda por vez. Cada tanda cierra con: `npx.cmd tsc --noEmit` en 0, `pnpm test`
  verde (80/80 o más), `pnpm exec fallow` con delta (LOC de page.tsx, duplicación, dead
  code), commit con mensaje descriptivo en español, y **STOP para OK visual de Ale**.
- Componentes nuevos solo si NO existe ya un contenedor del dominio. Preferí sumar a
  `RepoModals.tsx`, `RepoActionModals.tsx`, `ContextMenus.tsx`, `StashModals.tsx` antes
  que crear archivos.
- Props explícitas y tipadas; no pasar el store entero ni "bolsas" de callbacks sin tipo.

## TANDA 0 — Auditoría (sin tocar código)

1. Con CodeGraph + lectura directa, armá el inventario REAL de qué sigue inline en
   `page.tsx` vs. qué ya se renderiza desde componentes extraídos. Los comentarios de
   sección (`{/* ──── X MODAL ──── */}`) pueden haber quedado de bloques ya migrados.
2. Listá por bloque: nombre, rango de líneas, estados/handlers que consume, y a qué
   componente destino iría (existente o nuevo).
3. **CHECKPOINT 0:** presentá el inventario como tabla y la propuesta de tandas 1–N
   ajustada a la realidad. No sigas sin OK.

## TANDA 1 — Modales de branch/tag restantes

Extraer los modales que el audit confirme inline (esperables: New Branch, Rename Branch,
Create Tag, Merge-needs-checkout, Force Push) hacia los contenedores existentes del
dominio (`RepoModals.tsx` / `RepoActionModals.tsx`, según dónde vivan sus hermanos).
Mover JSX + su estado local íntimamente ligado; los handlers que tocan git quedan donde
están y se pasan por props.

## TANDA 2 — Context menus restantes

Los menús de branch / remote branch / file / commit que sigan inline van a
`ContextMenus.tsx` (ya existe — respetá su patrón actual de props y posicionamiento).
No cambies posicionamiento ni lógica de cierre (click-outside / Esc).

## TANDA 3 — Repo chooser a hook dedicado

`handleOpenRepoChooser / handleOpenExistingFromChooser / handleCreateRepoFromChooser /
handleCloneRepoFromChooser` + estados asociados → `hooks/use-repo-chooser.ts`.
⚠ Zona delicada: toca GitHub token, force-push confirm, init/clone/loadAll. Mantené el
flujo idéntico (incluido el caso "repo ya existe en GitHub" → recuperar clone URL).
`codegraph_impact` antes de mover cualquier helper compartido.

## TANDA 4 — Barrido final de estados

Agrupá los `useState` de modales que hayan quedado huérfanos en page.tsx junto a su
nuevo dueño. Si después de T1–T3 page.tsx sigue > 1.400 LOC, proponé (sin ejecutar) la
siguiente extracción candidata y PARÁ.

## Qué NO hacer

- No tocar `ChronometricGraph.tsx`, `CommitGraph.tsx`, `StagingPanel.tsx` ni nada de
  `electron/` — F1 es solo `app/page.tsx` + componentes/hook destino.
- No tocar lógica de Git, providers de IA, SQLite, i18n keys existentes (podés AGREGAR
  keys si un texto estaba hardcodeado, en los 3 idiomas).
- No tocar `README.md` ni `CHANGELOG.md` (pasada de docs aparte, al cierre de F1).
- No "optimizar" de paso: nada de memo/useCallback nuevos salvo que la extracción lo
  exija para no romper identidad de props.
- No renombrar APIs públicas de hooks/componentes existentes.
- No mergear a `main` — eso lo decide Ale al cierre de F1.

## Cierre de F1

Reporte final en `docs/reports/F1_REPORT.md`: LOC inicial→final de page.tsx, archivos
creados/modificados, métricas Fallow antes/después, tests, y discrepancias encontradas
con `00_FUENTE_DE_VERDAD.md` (para que Ale lo actualice). STOP.
