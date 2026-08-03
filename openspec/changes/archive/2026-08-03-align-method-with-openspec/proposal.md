## Why

La metodología de trabajo de este repositorio vive en archivos que sólo lee quien los abre, y varias
de sus reglas contradicen a la herramienta que dice usar.

**OpenSpec declara explícitamente qué no hace**, en su README:

> El framework deja el control de versiones a los usuarios — OpenSpec gestiona artefactos de
> planificación, no commits de git ni operaciones de repositorio.

Y su workflow abandonó las fases:

> El enfoque legacy imponía fases —planificar, implementar, archivar— generando fricción cuando los
> requisitos cambiaban. **"Acciones, no fases: creá, implementá, actualizá, archivá — hacé cualquiera
> en cualquier momento."**

Sobre eso, este repositorio agregó convenciones propias que sólo existen acá: una tarea de firma con
texto literal, un `commit.md` por change, y un archivado que además confirma en Git. Nada de eso es
de OpenSpec, y ninguna es descubrible desde el CLI: un agente que corra `openspec status` no se
entera de que existen. Sólo funcionan si alguien lee `AGENTS.md` — que es exactamente lo que falla
cuando el ejecutor no lo tiene a mano. En este mismo repositorio, `.claude/commands/` no existe, así
que Claude nunca vio el workflow de `opsx` y trabajó con las reglas locales.

Además, los documentos se contradicen entre sí:

| Dónde | Dice | Realidad |
|---|---|---|
| `00_FUENTE_DE_VERDAD.md` §2 | 547 tests / 76 archivos | 632 / 88 |
| `00_FUENTE_DE_VERDAD.md` §7 | 289/289 verde | tercera cifra, mismo documento |
| `00_FUENTE_DE_VERDAD.md` §7 | `pnpm exec fallow` obligatorio | invariante 17: no es automatismo |
| `00_FUENTE_DE_VERDAD.md` §7 | `npx.cmd tsc --noEmit` | `AGENTS.md`: `pnpm exec tsc` |
| `00_FUENTE_DE_VERDAD.md` §7 | `codegraph_context` | no existe esa herramienta |

Y el reporte obligatorio en `docs/reports/` está escrito en tres lugares distintos.

Se verificó que **`openspec/config.yaml` es el canal nativo** para esto: `context` y `rules` por
artefacto llegan a `openspec instructions <artefacto> --change <id> --json`, que es lo que cualquier
agente consulta antes de escribir. Comprobado en este repositorio antes de proponer el cambio.

## What Changes

- **La verdad operativa se muda a `openspec/config.yaml`.** Lo que hoy vive en `AGENTS.md` y sólo
  lee quien lo abre pasa a `context` (global) y `rules` (por artefacto), y el CLI se lo entrega a
  cualquier ejecutor, con GitCron o sin él.
- **Se retiran las convenciones que OpenSpec no tiene y que nadie puede descubrir**: la tarea de
  firma con texto literal y el manifiesto `commit.md`.
- **Archivar deja de confirmar en Git.** Pasa a hacer lo que OpenSpec define —mover el change y
  consolidar specs— y nada más. **BREAKING** para quien esperaba que el botón commiteara.
- El reporte en `docs/reports/` deja de ser obligatorio: se escribe cuando aporta.
- Se corrigen las cifras y comandos desactualizados de `00_FUENTE_DE_VERDAD.md`, y se retira el
  vocabulario de fases, previo a OpenSpec.

**Fuera de alcance, declarado:** reconstruir la confirmación en Git como acción propia de GitCron
—con lista de archivos derivada y mensaje editable— es un trabajo aparte y va en su propio change.
Este retira el acoplamiento; no diseña el reemplazo. Tampoco se toca `derivePipelineNextAction` ni
el modelo de fases del panel: eso es el otro trabajo grande y necesita validación visual.

Los `commit.md` de los changes ya archivados no se tocan: son registro de cómo se trabajó entonces.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `pipeline-guided-workflow`: el archivado deja de confirmar en Git y de marcar una tarea de firma;
  su requisito cambia de comportamiento observable.

## Impact

- `openspec/config.yaml` — pasa a contener la metodología.
- `AGENTS.md`, `docs/00_FUENTE_DE_VERDAD.md`, `docs/01_INVARIANTES.md`.
- `electron/pipeline/change-commit-manifest.ts` y su test — se retiran.
- `electron/ipc/pipeline-archive.ts` — queda sólo el archivado.
- `components/pipeline/OpenSpecDashboard.tsx` y `lib/i18n.ts` (ES/EN/ZH) — el panel pierde la lista
  de archivos y la casilla de Git.
- Sin cambios de dependencias ni de superficie de seguridad.
