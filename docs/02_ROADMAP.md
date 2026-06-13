# GitCron — Roadmap de fases (documento de Ale — NO pegar a agentes)

> Los agentes reciben SOLO los briefs de `docs/briefs/`. Este archivo es tu tablero.
> Orden = cadena de dependencias + relación valor/riesgo. Un checkpoint por vez.

## Estado: dónde estamos hoy (2026-06-12, v1.8.0)

✅ Cerrado: features Git básicas (stash completo, tags, reset, clean, amend, squash,
cherry-pick, revert, conflict resolver), Temporal Agent end-to-end con SQLite,
modularización de electron/main, use-git-actions y gran parte de page.tsx.
🔄 En curso: descomposición final de `page.tsx` (2.166 LOC) — branch `fallow/test-v4`.

---

## F1 — Cerrar la descomposición de page.tsx  `[BRIEF LISTO: briefs/F1_PAGE_FINAL.md]`
Riesgo bajo · Continuación directa de donde se cortó Claude Code.
Meta: page.tsx < 1.400 LOC sin cambio de comportamiento. Al cerrar: **merge
`fallow/test-v4` → `main`** y pasada de docs (README/CHANGELOG v1.8.x).

## F2 — Staging por hunk / línea  `[brief se escribe al cerrar F1]`
Riesgo medio-alto · **La brecha #1 vs GitKraken/SourceTree.**
Stage/unstage/discard de hunks individuales (y líneas, fase 2 interna) desde el
DiffViewer. Backend: `git apply --cached` con patches generados, o `simple-git` raw.
Es la feature que más cambia la vida diaria; también la más delicada (genera patches).

## F3 — File history + blame
Riesgo bajo-medio · Solo lectura (`git log --follow`, `git blame`).
Historial de un archivo desde el context menu + vista blame con colores por autor/edad.
Reusa HistoryView y la infra de DiffViewer.

## F4 — Interactive rebase visual
Riesgo alto · Reorder / squash / drop / reword con drag (motion/react ya está para
RepoTabs). Implementación segura: construir el todo-list y correr rebase no-interactivo
equivalente, nunca editor externo. Requiere F1 cerrada (UI limpia donde montarlo).

## F5 — Gestión de remotes + operaciones de worktrees y submódulos
Riesgo medio · add/edit/remove remotes; worktree add/remove; submodule add/update/sync.
El sidebar ya los lista — esto agrega las acciones.

## F6 — Dashboard estadístico del Temporal Agent
Riesgo bajo · Cuando SQLite acumule datos: curvas de calibración (Brier), outcomes en el
tiempo, aceptación por tipo, comparación de proveedores. Encaja natural en TCARS/Centauro.

## Housekeeping (fases chicas, intercalables)
- H1: verificar y retirar el write path JSON paralelo del Temporal Agent (si SQLite ya es
  única fuente de verdad).
- H2: prune de ~14 branches viejas ya integradas (con tu OK explícito, una lista primero).
- H3: deuda de tests señalada: PredictionDetail render/state, materializedRef
  active/deleted, rename de `centauroExpanded`.
- H4: fix del bug SVG `calc()` en el grafo cronométrico (computar en JS).

## Backlog sin priorizar (después de F6)
Git LFS · commit signing (GPG/SSH) · patch/apply · archive/export · drag&drop de branches
en el grafo para merge/rebase · búsqueda avanzada (autor/archivo/pickaxe) · web viewer
(Octokit, repos remotos) como producto portfolio.

---

## Flujo de trabajo (recordatorio)
1. Pegás el brief de la fase al ejecutor (Claude Code / Codex / Antigravity / OpenCode).
2. El agente trabaja por tandas, cierra con tsc + tests + fallow + reporte en
   `docs/reports/` y PARA.
3. Vos hacés QA visual — tu OK es la compuerta vinculante.
4. Recién ahí me pedís el brief de la fase siguiente (lo escribo con el reporte a la vista).
