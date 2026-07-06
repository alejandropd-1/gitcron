# Git-core Fase 01 — Indicador local / remoto en el sidebar

> Reemplaza los puntitos de color a la derecha de cada branch por un indicador que comunica si la branch es solo-local, local+remota-sincronizada, o local+remota-divergida. Sin acciones destructivas: es solo lectura + UI. Prepara el terreno para la Fase 02 (borrado). Branch `git-core/fase-01-branch-status`. Cierra con `tsc` + `pnpm test` + reporte + push + STOP (no merge).

```
Trabajás en GitCron (Next.js 15 + React 19 + Electron 42 + Zustand 5 + TS 5.9, simple-git +
Octokit). El sidebar izquierdo lista las branches locales (components/RepoSidebar.tsx +
RepoSidebarParts.tsx). Hoy, a la derecha del nombre de cada branch hay un puntito de color cuya
función es redundante con el ícono de la izquierda. DECISIÓN de producto: reemplazar ese puntito
por un INDICADOR DE ESTADO local/remoto, que después (Fase 02) habilita el menú de borrado.

Esta fase es SOLO LECTURA + UI. No se borra ni se modifica ninguna branch.

BRANCH: git-core/fase-01-branch-status desde main. Commits solo ahí, y COMMITEÁ CADA TANDA antes
de seguir (no dejes trabajo sin commitear entre tandas). Al final: push y STOP. No merge.

INVARIANTES (condición de aceptación):
- Cero cambios en lógica de Git existente: solo AGREGÁS un handler de lectura si hace falta. No
  toques checkout, merge, create, delete.
- Strings de UI via lib/i18n.ts (ES/EN/ZH). Todo texto nuevo en los 3 idiomas.
- Secretos siguen en el main process con safeStorage. CSP no se toca.
- codegraph_context / codegraph_impact ANTES de grep para ubicar dónde se renderiza el puntito.
- Nada de llamadas de red a GitHub: el estado local/remoto se calcula del repo local (refs), no
  de la API de GitHub.

TANDA 1 — Backend de estado (si no existe ya):
- Verificá si el handler git:branches ya devuelve info de tracking (upstream). Si NO la devuelve,
  extendé ESE handler (no crees uno nuevo) para incluir por branch: { hasRemote: boolean,
  ahead: number, behind: number }. Fuente: simple-git — `git branch -vv` o comparar refs/heads
  contra refs/remotes. Sin red.
- Tests Vitest para el parseo del estado (solo-local / sincronizada / divergida / adelante /
  atrás). Usá fixtures, no un repo real.
- COMMIT de la tanda. CHECKPOINT: mostrame la forma del dato que devuelve el handler y esperá OK.

TANDA 2 — Indicador visual:
- En RepoSidebarParts.tsx (o donde se renderice la fila de branch): reemplazar el puntito de
  color por un ícono/badge que refleje el estado:
  · solo-local  → un ícono claro de "local" (ej: lucide `HardDrive` o `Monitor`).
  · local+remota sincronizada → ícono de "nube ok" (ej: `Cloud` / `Check`).
  · divergida (ahead/behind) → mismo ícono con contador o color de aviso, mostrando ↑ahead ↓behind.
- Tooltip por i18n explicando el estado al hacer hover.
- Respetá la estética TCARS/LCARS existente (mismos tokens de color que ya usa el sidebar; no
  inventes paleta nueva).
- COMMIT de la tanda. CHECKPOINT: screenshot del sidebar con los tres estados visibles.

TANDA 3 — Cierre:
- tsc --noEmit en 0 y pnpm test verde.
- Reporte en docs/reports/ (mismo formato que los anteriores): qué handler se extendió, forma del
  dato, íconos elegidos por estado, claves i18n agregadas.
- COMMIT + push de la branch. STOP.

CRITERIOS DE ACEPTACIÓN:
- [ ] Cada branch del sidebar muestra un indicador de estado local/remoto (ya no el puntito viejo).
- [ ] Los tres estados (solo-local / sincronizada / divergida) se distinguen a simple vista.
- [ ] El estado se calcula sin llamadas de red a GitHub.
- [ ] Tooltip i18n en ES/EN/ZH. Cero cambios en flujos de Git existentes.
- [ ] tsc y pnpm test en verde. Reporte escrito. Branch pusheada sin merge.
```
