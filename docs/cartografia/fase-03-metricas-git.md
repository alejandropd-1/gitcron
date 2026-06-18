# Fase C0.3 — Overlays de git: churn + último toque + co-change

> Mapea a `GITCRON_CARTOGRAPHY_BRIEF.md` § C0.3. Pegá la caja al agente. Cierra con `tsc` + `pnpm test` + reporte + STOP para QA visual.

```
Continuás la vista "Cartografía" de GitCron (Next.js 15 + React 19 + Electron 42
+ Zustand 5 + TS 5.9, simple-git + Octokit). Ya existen el andamiaje y la lente
Explorador con el árbol de archivos (carto:scan-tree, lib/carto-tree.ts). Ahora
computás MÉTRICAS DE GIT por archivo, que son el diferencial de GitCron como
cliente de Git.

INVARIANTES (no romper): el IPC nuevo es SOLO de lectura (usás `git log`, nunca
mutás el repo); cómputo en el main; cero red; cero IA en esta fase; todo string
por lib/i18n.ts en ES/EN/ZH.

Tareas:
1. Agregá un IPC handler de lectura `carto:git-metrics` en electron/main.ts que,
   con simple-git, recorra `git log` (acotado a los últimos N commits, N
   configurable con default 500) y compute por archivo: churn (cantidad de
   commits que lo modificaron), último toque (fecha), y co-change (pares de
   archivos que aparecen en el mismo commit, con su frecuencia).
2. Tipá el bridge en types/electron.d.ts y exponelo en electron/preload.ts.
3. Poné la lógica en `lib/carto-metrics.ts` como funciones PURAS testeables:
   computeChurn, computeLastTouched, computeCochange, y una normalización a 0..1.
   Tests Vitest, con al menos un caso de co-change verificable a mano.
4. Cableá las métricas al estado de la vista. Todavía NO las dibujamos como grafo
   (eso es la próxima fase); alcanza con que estén disponibles, y si querés,
   mostrarlas como números en el panel del Explorador.

Documentá el tope de commits y por qué existe (no colgar repos enormes).

Aceptación: las métricas reflejan la historia real del repo activo; el co-change
devuelve pares con frecuencia normalizada a 0..1; hay tope de commits configurable
y no se cuelga en repos grandes; funciones puras con tests Vitest pasando; cero
IPC de Git de escritura; cero red.

Al terminar: `tsc --noEmit` limpio + `pnpm test` verde, reporte escrito, y PARÁ
para el QA visual de Alejandro.
```
