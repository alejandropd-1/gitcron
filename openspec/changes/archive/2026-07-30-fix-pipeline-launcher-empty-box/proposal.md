## Why

Al continuar una tarea OpenSpec, el botón "Continuar con {{task}}" monta el `PipelineRuntimeLauncher` dentro de un panel con marco. El launcher devuelve `null` mientras su `discover` IPC no resolvió, así que el marco se pinta vacío durante ese round-trip y recién después aparece el formulario. El usuario lo percibe como un recuadro vacío que "de repente" se llena. El síntoma se agrava porque el `key` del launcher incluye changeId + taskId, así que cada cambio de change o tarea fuerza un remontaje y el recuadro vacío reaparece.

No es un error del IPC: el contenido llega, después del marco. Es un async-gap de presentación.

De yapa, `repo-evidence-reader.ts` todavía emite un diagnóstico que dice "el repositorio no tiene scaffold", palabra que sobrevivió al cleanup que retiró el andamiaje. Y `AGENTS.md` arrastra una sección "Honestidad de la evidencia" referida a fixtures de `docs/pipeline/f03/` y a telemetría fabricada de una fase retirada; ya no aplica al método OpenSpec actual y se pide retirarla.

## What Changes

- El launcher muestra un estado de carga explícito mientras `discover` no resolvió, en vez de devolver `null` dentro de un panel con marco. No se inventa contenido: se dice qué está pasando.
- El panel contenedor no pinta su marco cuando el launcher está cargando, para no ofrecer un cajón vacío.
- Se limpia la palabra "scaffold" del diagnóstico de `repo-evidence-reader.ts`.
- Se retira de `AGENTS.md` la sección "Honestidad de la evidencia" (ya no gobierna fixtures de fases retiradas).

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `pipeline-runtime-capabilities`: incorpora el requisito de presentación honesta del launcher durante el descubrimiento de runtimes: no pintar un panel con marco mientras no hay contenido, y mostrar un estado de carga explícito.

## Impact

**Producción:** `components/pipeline/PipelineRuntimeLauncher.tsx`, `components/pipeline/OpenSpecDashboard.tsx`, `components/pipeline/OpenSpecDashboard.module.css`, `lib/i18n.ts` (ES/EN/ZH), `electron/pipeline/repo-evidence-reader.ts`, `AGENTS.md`.

**Sin tocar:** lógica de Git, IPC del runtime, adaptadores de runtime, fixtures de `docs/pipeline/f03`, sesiones persistidas, specs de `pipeline-repo-evidence`.

**Dependencias:** ninguna agregada ni removida.

**Riesgo:** bajo. Sólo cambia cómo se presenta el estado de carga del launcher; el flujo de discover/start y los contratos IPC quedan intactos.
