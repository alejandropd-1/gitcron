# Fase C0.2 — Lente "Explorador": árbol de archivos (filesystem)

> Mapea a `GITCRON_CARTOGRAPHY_BRIEF.md` § C0.2. Pegá la caja al agente. Cierra con `tsc` + `pnpm test` + reporte + STOP para QA visual.

```
Continuás la vista "Cartografía" de GitCron (Next.js 15 + React 19 + Electron 42
+ Zustand 5 + TS 5.9, simple-git + Octokit). Ya existe el andamiaje: el flag
`enableCartography`, el componente `components/cartography/CartographyView.tsx`
montado como vista top-level, los tokens `--carto-` y el estado per-repo. Ahora
sumás la primera fuente de datos real: el ÁRBOL DE ARCHIVOS del repo activo.

INVARIANTES (no romper): no tocás lógica de Git; el IPC nuevo es SOLO de lectura;
cómputo en el main, nunca en el renderer; cero red; nada se escribe en el repo;
todo string por lib/i18n.ts en ES/EN/ZH.

Tareas:
1. Agregá un IPC handler de lectura `carto:scan-tree` en electron/main.ts que
   camine el working dir del repo activo y devuelva una estructura de árbol
   serializable. Excluí node_modules, dist, build, .next y .git; respetá
   .gitignore si se puede sin sobre-ingeniería.
2. Tipá el bridge en types/electron.d.ts y exponelo en electron/preload.ts.
3. Poné la transformación de paths→árbol en `lib/carto-tree.ts` como funciones
   PURAS testeables (p. ej. `buildFileTree`), con tests Vitest.
4. Creá `components/cartography/ExplorerLens.tsx`: árbol colapsable de
   carpetas/subcarpetas/archivos, estética TCARS, dentro de CartographyView como
   una "lente" seleccionable.
5. Strings nuevos en lib/i18n.ts (ES/EN/ZH).

Performance: no re-escanees en cada render; escaneá al entrar a la vista o al
pedir refresh.

Aceptación: el árbol refleja el repo activo real con las exclusiones aplicadas;
colapsa/expande sin colgarse con cientos de archivos; es per-repo; el handler es
solo lectura de fs; funciones de árbol con tests Vitest pasando.

Al terminar: `tsc --noEmit` limpio + `pnpm test` verde, reporte escrito, y PARÁ
para el QA visual de Alejandro.
```
