# Fase 1 — Andamiaje: flag + vista top-level + lienzo vacío

> Fase 1 de Cartografía · plan completo en `00-indice.md`. Pegá la caja al agente. Cierra con `tsc` + `pnpm test` + reporte + STOP para QA visual.

```
Trabajás en GitCron, un cliente Git de escritorio: Next.js 15 + React 19 +
Electron 42 + Zustand 5 + TypeScript 5.9, con simple-git (backend de Git) y
Octokit (GitHub). Vamos a empezar una vista nueva llamada "Cartografía" que
ayuda a entender cualquier repo abierto: dónde están las cosas, qué se relaciona
con qué, y qué se rompe si tocás algo. Esta fase es solo el ANDAMIAJE, sin datos.

INVARIANTES (no romper): no tocás lógica de Git (esto es solo lectura/
visualización); nada se escribe en el working tree ni en .git; cero red; cómputo
pesado en el main, nunca en el renderer; baseline de Electron intacto
(contextIsolation/sandbox/webSecurity); todo string por lib/i18n.ts en ES/EN/ZH.

Reconocimiento primero (leé estos archivos ANTES de tocar nada, para no pifiarla):
- lib/git-store.ts → el patrón del flag `enableCronometric` y la forma de RepoState.
- app/page.tsx + las vistas integradas (Settings/Ayuda/Perfil) → cómo se monta una vista top-level y el show/hide del TCAR/LCAR y del switch.
- app/globals.css → los bloques de tokens con namespace (Shared/Classic/Cronometric).
- lib/i18n.ts → la estructura de strings ES/EN/ZH.
- Referencia de verdad: docs/00_FUENTE_DE_VERDAD.md y docs/01_INVARIANTES.md.

Branch y entrega:
- Antes de empezar, creá una branch desde main: `cartografia/fase-01-andamiaje`.
- Hacé todos tus commits en esa branch.
- Al cerrar (tsc + tests + reporte): pusheá la branch y PARÁ. NO mergees a main.
- El merge a main lo hace Alejandro tras su QA visual y OK. La fase siguiente sale de main ya con esta mergeada.

Tareas:
1. Agregá un feature flag `enableCartography` al store Zustand, persistido cifrado
   con safeStorage (replicá EXACTAMENTE el patrón del flag `enableCronometric`),
   apagado por defecto. Sumá su toggle en la pantalla de Ajustes.
2. Creá `components/cartography/CartographyView.tsx`: por ahora solo un lienzo
   vacío con estética TCARS y un placeholder localizado ("Cartografía — sin datos aún").
3. Montá esa vista como una VISTA DE WORKSPACE TOP-LEVEL, hermana de la vista de
   grafo, siguiendo el MISMO patrón que las vistas integradas existentes
   (Settings/Ayuda/Perfil): mismo manejo de show/hide del TCAR/LCAR y del switch
   Clásico/Cronométrico al entrar. NO la agregues como tercer valor del switch
   classic/chronometric; es una vista aparte.
4. Agregá un acceso (botón/ícono localizado) visible SOLO con el flag on y con un
   repo activo abierto.
5. Guardá en RepoState el sub-estado per-repo de "estoy en Cartografía" (que
   sobreviva el cambio de tab) y permití volver al grafo.
6. Definí los tokens `--carto-` en su PROPIO bloque de globals.css, sin tocar los
   bloques Shared/Classic/Cronometric.
7. Strings nuevos en lib/i18n.ts (ES/EN/ZH).

NO agregues dependencias nuevas. NO traigas datos todavía.

Aceptación: con el flag off, nada de Cartografía visible ni montado; con el flag
on y repo activo, se entra y se vuelve sin glitches; el estado es per-repo;
Classic/Cronométrica/Settings/Ayuda/Perfil/Abrir-Crear-Clonar siguen intactas;
cero strings hardcodeados.

Al terminar: `tsc --noEmit` limpio + `pnpm test` verde, reporte escrito de
archivos tocados y por qué, y PARÁ para el QA visual de Alejandro. No sigas.
```
