# Fix — recuadro vacío del launcher al continuar una tarea OpenSpec

**Change:** `fix-pipeline-launcher-empty-box`
**Rama:** `fix/pipeline-launcher-empty-box`
**Fecha:** 2026-07-29

## Contexto

Al clickear "Continuar con {{task}}" en la solapa Pipeline, aparecía un recuadro vacío (panel con marco, sin contenido) durante el round-trip del IPC `pipeline:runtime:discover`, y recién después se llenaba con el formulario del launcher. El síntoma se agravaba porque el `key` del launcher incluye changeId + taskId, así que cada cambio de change o tarea forzaba un remontaje y el recuadro vacío reaparecía.

No era un error del IPC: el contenido llegaba, después del marco. Era un async-gap de presentación: `PipelineRuntimeLauncher` devolvía `null` mientras `discovery` no resolvió, pero ya estaba montado dentro de un `.launcherPanel` con borde + fondo.

## Qué se tocó

**Estado de carga del launcher (`PipelineRuntimeLauncher.tsx`):**
- Se reemplazó `if (!discovery) return null` por una rama de carga que renderiza el título de sección + el mensaje `pipeline.launcher.discovering`, con `aria-busy` y `aria-live="polite"`. Nunca más hay un panel con marco cuyo interior esté vacío.
- Nueva prop `onDiscoveringChange(loading)` para avisar al contenedor cuándo está cargando.

**Panel contenedor (`OpenSpecDashboard.tsx` + `.module.css`):**
- Estado `launcherLoading` que escucha `onDiscoveringChange`.
- `.launcherPanel` aplica `data-launcher-loading` mientras carga; el CSS retira el marco, padding y fondo en ese estado (el estado de carga vive adentro, sin marco duplicado).

**i18n (`lib/i18n.ts`):** clave `pipeline.launcher.discovering` en ES / EN / ZH.

**Limpieza del string "scaffold" (`electron/pipeline/repo-evidence-reader.ts:151`):** el diagnóstico `openspec.unavailable` decía "el repositorio no tiene scaffold"; ahora describe la causa real: "no tiene `openspec/changes`".

**`AGENTS.md`:** retirada íntegramente la sección "Honestidad de la evidencia" (refería a `docs/pipeline/f03/` y a telemetría fabricada de un encuadre retirado; ya no gobierna).

## Qué NO se tocó

- Contrato IPC `pipeline:runtime:discover` / `:start`: sin cambios.
- `key` del launcher: se evaluó cambiarlo (decisión D3 del design) pero la conversión de `initialInstruction` a prop controlada añadía superficie de sincronización; se descartó usando la cláusula de escape prevista. D1+D2 ya resuelven el síntoma.
- Lógica de Git, adaptadores de runtime, fixtures de `docs/pipeline/f03`, sesiones persistidas, specs de `pipeline-repo-evidence`.

## Decisión de diseño registrada

D3 (remontaje estable) se descartó según su cláusula de escape: convertir `initialInstruction` a prop controlada para quitar `taskId` del `key` habría añadido un `useEffect` de sincronización que compite con la edición manual de la instrucción. El risk/benefit no justifica; el recuadro vacío queda resuelto por D1+D2. Si el remontaje vuelve a molestar, se aborda en un change propio.

## Pruebas

- **Test nuevo** (`pipeline-guided-wiring.test.tsx`): "muestra un estado de carga y no un panel con marco vacío mientras discover no resolvió". Afirma que con `discovery === null` aparece el mensaje `pipeline.launcher.discovering` y existe `[data-launcher-loading]`, y que al resolver ambos desaparecen.

## Comprobaciones de cierre (resultado real)

| Comprobación | Resultado |
|---|---|
| `pnpm exec tsc --noEmit` | **0 errores** |
| `pnpm test` | **548 passed** (76 archivos). Baseline 547 → 548 (+1 test nuevo) |
| `pnpm exec eslint` sobre lo tocado | **0 errores** (1 warning esperado: `.module.css` sin config de lint) |
| `openspec validate fix-pipeline-launcher-empty-box --strict` | **Válido** |

## QA visual pendiente

Reiniciar Electron (`pnpm run electron:dev`, toca el renderer) y verificar:
1. Clickear "Continuar con {{task}}" → debe verse "Comprobando runtimes…" sin recuadro vacío previo, y luego el formulario aparece en el mismo lugar sin salto.
2. Cambiar de change o de tarea → el estado de carga aparece (no un recuadro vacío) y se resuelve al formulario.
3. El diagnóstico de OpenSpec, si llega a dispararse, ya no dice "scaffold".
