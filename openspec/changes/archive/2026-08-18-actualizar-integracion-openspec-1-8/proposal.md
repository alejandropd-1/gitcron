## Why

GitCron depende de un CLI de OpenSpec cuya versión y procedencia **desconoce**: el wrapper lo
resuelve por `PATH` (`electron/pipeline/openspec-cli.ts:24-26`) y sólo invoca `init`, `archive`,
`validate` y `status` —nunca `--version`, `update` ni `doctor`. La versión real en el host es
`@fission-ai/openspec` 1.5.0 instalada globalmente, mientras la última estable en npm es **1.8.0**
(`latest 1.8.0`), y la integración del propio repositorio quedó fijada en `generatedBy: "1.5.0"` en
los 20 skills (`.codex`/`.claude`/`.agent`/`.opencode`, 4 tools × 5 skills). Quien abre Pipeline no
ve la versión, no ve la procedencia y no puede diagnosticar el estado del motor ni regenerar los skills sin salir a
una terminal. Cada mejora del motor entre 1.5 y 1.8 (`skip_specs`, `isPlanningComplete`, target
`agents`, `retire_capabilities`, skills neutrales bajo `.agents/skills`) queda fuera del alcance de
GitCron hasta que alguien actualice.

Este cambio toca **cuatro capas distintas**, que la planificación distingue para que cada bloqueo o
recomendación futuro pueda declarar de cuál proviene: **(A) OpenSpec oficial** —`init`, `update`,
`status`, `instructions`, `validate`, `sync`, `archive`, perfiles/workflows, schemas y dependencias de
artefactos, archivo histórico, `skip_specs`, `retire_capabilities`—; **(B) el motor de integración de
GitCron** —resolver qué CLI se ejecuta (estrategia local `node_modules` > global), detectar versión/ruta/procedencia,
ejecutar comandos con argumentos tipados, parsear el JSON de varias versiones, consultar la versión remota,
producir la vista previa diagnóstica y guiar con comandos oficiales exactos—; **(C) la política
operativa de GitCron** —rama segura, working tree compatible, validación de paths, staging selectivo,
no commit/push/merge automáticos, preparación del diff y del commit—; y **(D) la metodología de
Alejandro** —una rama `change/<id>` desde `main` sincronizada, un OpenSpec por vez, Draft PR, CI y
Deploy Preview, validación humana final, commit de cierre, archive y sync en un segundo commit, merge
autorizado, verificación de producción—. Nada de B, C o D se presenta como funcionalidad nativa de
OpenSpec.

## What Changes

- **(B) Detección del motor y resolución por estrategia:** GitCron detecta la versión y la procedencia
  del CLI que ejecuta, aplicando prioridad: **local al proyecto** (`node_modules/.bin/openspec`) > **global del sistema**
  (`PATH`), con procedencia `managed` declarada no disponible, exponiendo al renderer un `displayPath` canónico informativo
  y de sólo lectura; la ejecución usa siempre el runtime resuelto y autorizado por el main.
- **(B) Dos fuentes de evidencia separadas:** la **configuración global efectiva de OpenSpec**
  (`rawProfile`, `delivery`, `configuredWorkflows`, origen y timestamp de lectura, obtenidos con un
  lector minimizado que no transporta `anonymousId`, telemetría ni otros campos ajenos) y el **estado
  instalado en el repositorio** (tools/targets, `installedWorkflows` por target, `generatedBy`/markers,
  archivos faltantes/legacy/personalizados/conflictos) se transportan por separado, y la tarjeta
  muestra su divergencia. La configuración global **no** se llama «perfil del repositorio»; la
  observada es `custom` con cinco workflows (`propose`, `explore`, `apply`, `sync`, `archive`).
- **(B) Consulta remota:** compara esa versión con la última estable de `@fission-ai/openspec` con
  timeout, caché con fecha y degradación offline, sin aceptar registries arbitrarios desde el renderer.
- **(B/C) Tarjeta de estado siempre visible** en la pantalla principal, aún sin motor, que representa
  por separado el estado del **motor** (ausente/global/local/administrado no disponible/desconocida/demasiado
  vieja/más nueva que el rango), el del **repositorio** (no inicializado/inicializado/desconocido) y el
  de la **integración** (al día/desactualizada/requiere regeneración/herramientas incompletas/
  personalizada o con conflictos/actualización parcial).
- **(B) Perfiles y workflows** modelados con los conjuntos oficiales 1.8: **core** = `propose`,
  `explore`, `apply`, `update`, `sync`, `archive`; **ampliado** = los seis anteriores más `new`,
  `continue`, `ff`, `verify`, `bulk-archive`, `onboard` (doce en total). OpenSpec persiste sólo
  `core`/`custom`; `expanded` es una **clasificación derivada por GitCron**, no un tercer valor
  persistido. La **configuración global efectiva observada** en este host es `custom` con cinco
  workflows (`propose`, `explore`, `apply`, `sync`, `archive`); la **integración instalada legacy** en
  el repo son cinco workflows por target (`propose`, `explore`, `apply`, `sync`, `archive`) sobre
  skills en `.codex`/`.agent`, y `.agents/skills` sólo contiene skills personalizados, no OpenSpec.
- **(B) Vista previa diagnóstica y parcial:** el diagnóstico del CLI actual y el inventario de inputs/outputs
  clasificados (`repo-local` / `external-global`) se exponen con grado de certeza honesto (`parcial` / `no disponible`),
  sin ejecutar mutaciones automáticas en disco.
- **(B) Outputs externos clasificados y bloqueados:** cada output administrable se clasifica como
  `repo-local` o `external-global` (p. ej. `minimax-code` escribe en `~/.minimax/skills/openspec-*`).
  En este change, cualquier operación sobre paths externos se muestra sólo como diagnóstico y se bloquea;
  el renderer no autoriza ni suministra paths arbitrarios.
- **(A+B) Tarjeta con revisión y guía de actualización:** ofrece un punto de entrada que abre la revisión
  sin mutar nada y declara la operación oficial correspondiente según la matriz: repo sin `openspec/` → declara `init`;
  inicializado → declara `update`; todo al día → declara no mutar. Muestra los argumentos recomendados para `init`
  (`--tools`, `--profile`, `--no-animation`, `--copilot-cloud`/`--no-copilot-cloud`) y el **comando terminal exacto**
  para ejecución por el usuario, sin simular slash commands ni mutar código de GitCron.
- **(B) Entorno controlado en lecturas diagnósticas:** las inspecciones se ejecutan con `OPENSPEC_NO_UPDATE_CHECK=1`
  y telemetría desactivada (`OPENSPEC_TELEMETRY=0` o `DO_NOT_TRACK=1`), sin TTY interactiva.
- **(B) Compatibilidad como código de GitCron:** tipos y parsing tolerante para 1.5 y 1.8 —`isPlanningComplete`
  con `isComplete` como alias, `requires` por artefacto, `applyRequires` del CLI, `skip_specs`, estados `skipped`,
  slugs con prefijo numérico, skills neutrales `.agents/skills`, target `agents`, `retire_capabilities`, schemas
  dinámicos y degradación ante campos desconocidos.
- **(B) Convivencia `.codex` ↔ `.agents`:** el diagnóstico detecta los skills OpenSpec viejos en `.codex`,
  los nuevos en `.agents`, distingue los skills personalizados ya presentes en `.agents` (que existen hoy en este repo)
  y preserva las personalizaciones.

## Capabilities

### New Capabilities

- `pipeline-openspec-engine`: el contrato del **motor de integración de GitCron** (capa B) para con
  OpenSpec —detección de versión y resolución por estrategia (local al proyecto > global), `displayPath` de
  sólo lectura, rango de compatibilidad, separación entre configuración global e integración instalada con
  lector minimizado, consulta remota con timeout/caché/offline, tarjeta con motor/repositorio/integración
  como evidencias independientes, vista previa diagnóstica con inventario clasificado, bloqueo de outputs externos,
  entorno controlado para lecturas, guía de actualización con declaración de matriz oficial y comandos exactos—
  y la adaptación del parsing a OpenSpec 1.8 como código de GitCron.

### Modified Capabilities

- `pipeline-guided-workflow`: la pantalla principal pasa a mostrar la tarjeta de estado de OpenSpec
  (motor, repositorio e integración como evidencias independientes, siempre visible incluso sin motor)
  y ofrece desde ahí la revisión diagnóstica y la guía de actualización no destructiva.

## Impact

- **(B) Wrapper CLI:** `electron/pipeline/openspec-cli.ts` parametriza `CLI` para usar la resolución por
  estrategia (local al proyecto > global), suma `discoverOpenSpecCli()` (`openspec --version`), un lector minimizado
  de configuración global y declara `SUPPORTED_OPENSPEC_VERSIONS`.
- **(B) Módulo engine / IPC:** orquesta detección, consulta remota, inspección diagnóstica y clasificación de outputs;
  canales IPC `pipeline:openspec:*` expuestos en `preload.ts` y tipados en `types/electron.d.ts`.
- **(B) Tipos / evidencia:** `types/pipeline/index.ts` suma `OpenSpecEngineStatus` (con `displayPath`,
  procedencia `local`/`global`/`managed`/`unknown`, fuentes separadas, schema por change, clasificación de outputs)
  y adapta el parsing a `isPlanningComplete`/`requires`/`skipped` y schemas dinámicos; `openspec-tooling.ts`
  reconoce targets 1.8 (`agents`, `minimax-code`, etc.).
- **(B) Renderer:** tarjeta siempre visible en `OpenSpecDashboard.tsx` y modal de revisión y guía.
- **(B) i18n:** sub-namespace `pipeline.openspec.engine.*` en ES, EN y ZH.
- **(B) Tests:** discovery, procedencias, estrategia local > global, versiones, online/offline, preview
  diagnóstica e inventario, invalidación, fuentes separadas y divergencia, outputs externos bloqueados,
  declaración de matriz, lector minimizado, `.codex`↔`.agents`, slugs, schemas dinámicos, displayPath no ejecutable,
  i18n y UI, sin dependencias de IA pagas.

## Out of Scope

- **(D) Metodología de Alejandro** no se incorpora al actualizador: no clasificación
  trivial/especificado/exploración, no Draft PR, no Deploy Preview, no cierre humano automático, no
  merge, no verificación de producción.
- **(B) Gestor de paquetes interno:** GitCron no construye un resolvedor npm propio ni autodescarga paquetes dependientes.
- **(B) Mutaciones automáticas de disco o en outputs globales** (p. ej. `~/.minimax/skills/openspec-*`): bloqueadas.
- Implementar `retirar-cambios-openspec-obsoletos`: queda congelado; tras cerrar este change se
  reaudita contra el runtime nuevo, con autorización, antes de cualquier corrección o implementación.
- Relevamiento general de GitCron como interfaz SDD: produce un backlog posterior, no amplía este change.
- Diseñar un custom schema metodológico completo para la metodología de Alejandro (Q3).
- Empaquetar `@fission-ai/openspec` en el instalador de GitCron.
- Activar silenciosamente un actualizador global como fallback.
