# Prompt para continuar la optimizacion de GitCron con otro agente

Estas trabajando dentro de `C:\www\gitCronos`, un cliente Git desktop hecho con Next.js 15, React 19, Electron 42, TypeScript 5.9, Zustand 5, simple-git y Octokit. El usuario quiere seguir una optimizacion gradual de codigo sin romper features existentes.

## Modo de trabajo obligatorio

- Trabaja por fases pequenas y valida antes de dar por cerrada cada fase.
- Siempre corre `npx.cmd tsc --noEmit` y `pnpm test` antes de considerar terminada una fase.
- Usa `pnpm exec fallow` para medir dead code, duplicacion y complejidad. Es esperable que falle por deuda existente; reporta metricas concretas.
- Usa CodeGraph para preguntas estructurales: definiciones, callers, impacto y contexto. No empieces con grep si estas buscando simbolos.
- No reviertas cambios ajenos. El worktree puede estar sucio.
- No elimines funciones solo porque Fallow marque complejidad. Primero confirma que no sostienen features vivas.
- No rompas ni simplifiques las features de idioma, Temporal Agent, predicciones futuras, ramas `imagined/*`, vista cronometric, resolver de conflictos, clean untracked, stash avanzado o GitHub auth.

## Estado actual importante

Validaciones ya pasadas despues de la ultima tanda:

- `npx.cmd tsc --noEmit`: OK.
- `pnpm test`: OK, 9 archivos de test, 80 tests.
- `pnpm exec fallow`: falla por deuda de duplicacion y complejidad, pero reporta:
  - dead files: 0.
  - dead exports: 0.
  - maintainability: 90.9 (good).
  - duplicacion: 4.3%.
  - `app/page.tsx`: todavia es el target principal, cerca de 4.8k LOC.

## Cambios ya hechos en la optimizacion

Se extrajo UI y logica desde `app/page.tsx`:

- `components/RepoTabs.tsx`
  - Contiene las tabs multi-repo con `motion/react` `Reorder`.
  - Conserva mitigacion de clicks durante drag con `isDraggingRef`.
  - Conserva controles Electron de minimizar, maximizar/restaurar y cerrar.

- `components/RepoSidebarParts.tsx`
  - Contiene `SidebarSection`, `SidebarItem`, `BranchTree`, `RemoteBranchTree`, `StashItem`, `TagItem`.
  - Mantiene agrupacion de branches locales/remotas, colores por branch via `colorForBranch`, ahead/behind, acciones hover, tags, stashes y descarte de branches `imagined/*`.

- `components/DangerConfirmDialog.tsx`
  - Centraliza confirmaciones destructivas.
  - Ya reemplaza eliminar branch/futuro materializado, eliminar tag y descartar archivo.
  - Mantiene callbacks async y estados originales.

- `components/RepoContentViews.tsx`
  - Contiene `HistoryView` y `CommitTabView`.

- `components/CopyButton.tsx`
  - Reutilizado por Temporal Agent / ChronometricGraph.

- `lib/display-format.ts`
  - Contiene `formatDate` y `formatInitials`.

Se optimizo logica:

- `hooks/use-repo-loader.ts`
  - Cambio a selectores granulares de Zustand en lugar de destructuring amplio.
  - Agrego helpers para parsear repos guardados, graph modes, target de refresh y escritura de datos activa/explita.
  - Conserva carga, restore, refresh y multi-repo.

- `electron/ai/provider-parsing.ts`
  - Centraliza parsing tolerante de JSON y normalizacion de ramas especulativas.
  - Usado por providers Claude/OpenRouter.

- `app/page.tsx`
  - Agrego helpers `childPath`, `isPushRejected`, `cloneUrlFromGitHubCreateResult`.
  - `handleCreateRepoFromChooser` bajo de 97 a 68 lineas y de cognitive 71 a 51, pero sigue siendo complejo.

Docs ya actualizados:

- `README.md` documenta la componentizacion y arquitectura nueva.
- `CHANGELOG.md` tiene entrada `v1.6.8` con la tanda de optimizacion.
- No se cambio `package.json`; sigue en `1.6.5`.

## Pendientes recomendados

Prioridad 1: seguir bajando `app/page.tsx` sin redisenar comportamiento.

Candidatos seguros:

- Extraer bloques de modales/paneles que son puramente UI y tienen callbacks ya definidos.
- Extraer secciones del panel central que solo renderizan estado: profile/settings/help/repo chooser si se puede hacer sin mover demasiada logica.
- Extraer helpers puros cerca de handlers complejos, especialmente donde se repiten decisiones de error/estado.
- Revisar si los callbacks de repo chooser pueden moverse a un hook dedicado, pero con cuidado porque tocan GitHub token, force push confirm, init/clone/loadAll.

Prioridad 2: deuda que Fallow sigue marcando.

- Duplicacion entre `components/CommitGraph.tsx` y tests diagnosticos:
  - `lib/__tests__/label-side-diagnostic.test.ts`
  - `lib/__tests__/scratch-debug.test.ts`
  - Confirmar si esos tests siguen siendo necesarios o si pueden usar helpers compartidos.

- Duplicacion entre `components/ChronometricGraph.tsx` y tests diagnosticos.
  - No tocar geometria visual sin screenshot/validacion visual.

- Duplicacion en `electron/main.ts` alrededor de deteccion de conflictos/error.
  - Candidato: helper puro para clasificar conflictos en merge/rebase/cherry-pick/push.
  - Cuidado con mensajes localizados y shape de IPC.

- Duplicacion en `hooks/use-git-actions.ts`:
  - `mergeIntoCurrent`, `rebaseOnto`, `cherryPickCommit` tienen patrones parecidos.
  - No romper manejo de conflictos ni refresh posterior.

Prioridad 3: componentes grandes.

- `components/ChronometricGraph.tsx` sigue enorme, pero es visualmente delicado.
- `components/TemporalAgentSettings.tsx` sigue grande, pero sostiene idioma, modelos, keys y predicciones. No remover opciones de idioma ni modelos.
- `components/StagingPanel.tsx` tiene `StagingFileRow` complejo; buen candidato para extraccion menor.

## Invariantes de producto

- El usuario valora mucho que las features existentes sigan andando. No borrar "idioma chino", "predicciones futuras", "FUTUROS", "Centauro", `TemporalAgentSettings`, `SpeculativeBranches` ni providers.
- El resolver de conflictos debe seguir apareciendo dentro del cuerpo central, no como modal flotante.
- Los cambios visuales deben mantener la estetica GitCron actual: denso, oscuro, productivo, con glass sobrio.
- No uses landing pages ni textos explicativos dentro de la app.
- Si haces frontend visible, verifica visualmente cuando sea posible.

## Comandos utiles

```powershell
npx.cmd tsc --noEmit
pnpm test
pnpm exec fallow
git status --short
git diff --stat
```

Para inspeccion estructural usa CodeGraph antes de editar:

- `codegraph_status`
- `codegraph_context` para areas grandes
- `codegraph_search` para simbolos
- `codegraph_impact` antes de cambiar helpers compartidos

## Objetivo de la proxima fase

Elegir una extraccion pequena, de bajo riesgo y medible. Idealmente:

1. Usar CodeGraph para entender el area.
2. Extraer un componente/helper que reduzca `app/page.tsx` o una duplicacion real de Fallow.
3. Correr `npx.cmd tsc --noEmit`.
4. Correr `pnpm test`.
5. Correr `pnpm exec fallow`.
6. Reportar el delta: LOC, duplicacion, dead code, tests.

No intentes resolver toda la deuda en una sola pasada. La meta es bajar complejidad sin regresiones.
