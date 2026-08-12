## Why

GitCron depende de un CLI de OpenSpec cuya versión y procedencia **desconoce**: el wrapper lo
resuelve por `PATH` (`electron/pipeline/openspec-cli.ts:24-26`) y sólo invoca `init`, `archive`,
`validate` y `status` —nunca `--version`, `update` ni `doctor`. La versión real es
`@fission-ai/openspec` 1.5.0 instalada globalmente, mientras la última estable en npm es **1.8.0**
(`latest 1.8.0`), y la integración del propio repositorio quedó fijada en `generatedBy: "1.5.0"` en
los 20 skills (`.codex`/`.claude`/`.agent`/`.opencode`, 4 tools × 5 skills). Quien abre Pipeline no
ve la versión, no ve la procedencia y no puede actualizar el motor ni regenerar los skills sin salir a
una terminal. Cada mejora del motor entre 1.5 y 1.8 (`skip_specs`, `isPlanningComplete`, target
`agents`, `retire_capabilities`, skills neutrales bajo `.agents/skills`) queda fuera del alcance de
GitCron hasta que alguien actualice a mano.

Este cambio toca **cuatro capas distintas**, que la planificación distingue para que cada bloqueo o
recomendación futuro pueda declarar de cuál proviene: **(A) OpenSpec oficial** —`init`, `update`,
`status`, `instructions`, `validate`, `sync`, `archive`, perfiles/workflows, schemas y dependencias de
artefactos, archivo histórico, `skip_specs`, `retire_capabilities`—; **(B) el motor de integración de
GitCron** —resolver qué CLI se ejecuta, detectar versión/ruta/procedencia, ejecutar comandos con
argumentos tipados, parsear el JSON de varias versiones, consultar la versión remota, producir la
vista previa, administrar un runtime propio y verificar el resultado real—; **(C) la política
operativa de GitCron** —rama segura, working tree compatible, validación de paths, staging selectivo,
no commit/push/merge automáticos, preparación del diff y del commit—; y **(D) la metodología de
Alejandro** —una rama `change/<id>` desde `main` sincronizada, un OpenSpec por vez, Draft PR, CI y
Deploy Preview, validación humana final, commit de cierre, archive y sync en un segundo commit, merge
autorizado, verificación de producción—. Nada de B, C o D se presenta como funcionalidad nativa de
OpenSpec.

## What Changes

- **(B) Detección del motor:** GitCron detecta la versión y la procedencia del CLI que ejecuta
  (global, local, administrado por GitCron o desconocido) con el patrón de `RuntimeAdapter.discover()`
  (`--version` + rango de compatibilidad), y expone al renderer un `displayPath` canónico informativo
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
  por separado el estado del **motor** (ausente/global/local/administrado/desconocida/demasiado
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
- **(B) Vista previa en tres clases:** el diagnóstico del CLI actual y el inventario de inputs/outputs
  pueden implementarse antes de la POC; pero la vista previa del resultado de la versión destino se
  declara `exacta` sólo cuando se ejecuta con el runtime destino exacto (después de la POC y de
  preparar el runtime en staging), `parcial` o `no disponible` mientras no pueda ejecutarse. Preview y
  ejecución real usan el mismo paquete, integridad, runtime, configuración, tools y argumentos.
- **(B) Outputs externos clasificados y bloqueados:** cada output administrable se clasifica como
  `repo-local` o `external-global` (p. ej. `minimax-code` escribe en `~/.minimax/skills/openspec-*`).
  En este change, cualquier `init`/`update` que escribiría fuera del repositorio SHALL bloquearse; el
  target y el path externo se muestran sólo como diagnóstico; el renderer no autoriza ni suministra
  paths arbitrarios. Soportar mutaciones globales requiere otro change, con consentimiento, backup y
  rollback propios. Git/rama/working tree **no** protegen outputs globales.
- **(B) Runtime administrado como arquitectura objetivo** para la actualización integral del motor,
  con puntero **durable** (versiones inmutables, manifiesto persistido en `userData`, reemplazo
  atómico, health check, lock de proceso, recuperación al iniciar y rollback que sobrevive a
  reinicio/crash). Una vez activo, **todas** las operaciones OpenSpec de GitCron usan ese mismo runtime
  autorizado. La actualización **global** no se promete atómica ni reversible: con un CLI global,
  GitCron sólo **informa**; la actualización integral sigue prohibida sin administrado.
- **(A+B) Botón único «Actualizar OpenSpec»** cuyo primer clic abre una revisión sin mutar nada y, tras
  confirmación, **orquesta** la operación oficial que corresponde según la **matriz init/update/
  upgrade**. El contrato `init` no interactivo decide y muestra: path canónico, `--tools <allowlist
  confirmada>`, `--profile core|custom`, `--no-animation` y la decisión explícita
  `--copilot-cloud`/`--no-copilot-cloud`; `--force` se usa sólo si el preview mostró exactamente la
  limpieza legacy y Alejandro la confirmó. El proceso corre sin TTY, con chequeo de versión y
  telemetría desactivados. Repo sin `openspec/` → `init` (nunca `update`); inicializado → `update` (1.8
  no ofrece `--tools` para `update`); motor ausente → activar primero el runtime objetivo y ejecutar
  después con ese runtime exacto; todo al día → no mutar.
- **(B) Entorno controlado sin auto-upgrade lateral:** preview, `init`/`update` y validaciones se
  ejecutan con entorno no interactivo, desactivando el chequeo de versión interno de OpenSpec
  (`OPENSPEC_NO_UPDATE_CHECK=1`) y la telemetría (`OPENSPEC_TELEMETRY=0` o `DO_NOT_TRACK=1`), sin TTY
  interactiva ni `npm install -g` inesperado: la consulta de versión disponible es responsabilidad
  separada del motor GitCron.
- **(C) Seguridad Git:** nunca sobre `main`, exige working tree compatible y rama segura, detecta
  cambios locales ajenos, no hace `add`/commit/push/PR/merge/archive ni borra ramas; deja el árbol
  listo para «Preparar commit». (Esto protege outputs repo-local; **no** protege outputs globales.)
- **(B) Compatibilidad como código de GitCron** (no como operación del botón): tipos y parsing
  tolerante para 1.5 y 1.8 —`isPlanningComplete` con `isComplete` como alias, `requires` por artefacto,
  `applyRequires` del CLI, `skip_specs`, estados `skipped`, slugs con prefijo numérico, skills neutrales
  `.agents/skills`, target `agents`, `retire_capabilities`, schemas dinámicos y degradación ante
  campos desconocidos.
- **(B) Convivencia `.codex` ↔ `.agents`:** el preview y la ejecución detectan los skills OpenSpec
  viejos en `.codex`, los nuevos en `.agents`, distinguen los skills personalizados ya presentes en
  `.agents` (que existen hoy en este repo) y no los borran ni sobrescriben.

## Capabilities

### New Capabilities

- `pipeline-openspec-engine`: el contrato del **motor de integración de GitCron** (capa B) para con
  OpenSpec —detección de versión/procedencia con `displayPath` de sólo lectura, rango de
  compatibilidad, separación entre configuración global e integración instalada con lector minimizado,
  consulta remota con timeout/caché/offline, tarjeta con motor/repositorio/integración como evidencias
  independientes, vista previa en tres clases (diagnóstico/parcial/exacta), clasificación y bloqueo de
  outputs externos, runtime administrado durable con precedencia, entorno controlado sin auto-upgrade
  lateral, contrato `init` no interactivo, matriz init/update/upgrade, seguridad Git (capa C) y
  recuperación— y la adaptación del parsing a OpenSpec 1.8 como código de GitCron.

### Modified Capabilities

- `pipeline-guided-workflow`: la pantalla principal pasa a mostrar la tarjeta de estado de OpenSpec
  (motor, repositorio e integración como evidencias independientes, siempre visible incluso sin motor)
  y ofrece desde ahí el botón único de actualización con revisión y confirmación.

## Impact

- **(B) Wrapper CLI:** `electron/pipeline/openspec-cli.ts` parametriza `CLI` (`:24-26`) para usar el
  runtime autorizado, suma `discoverOpenSpecCli()` (`openspec --version`), un lector minimizado de
  configuración global, wrappers para `init`/`update`/`doctor` y declara `SUPPORTED_OPENSPEC_VERSIONS`.
- **(B) Módulo engine / IPC:** un nuevo módulo del main orquesta detección, consulta remota (timeout
  basado en `lmstudio-adapter.ts:34`), vista previa aislada, clasificación de outputs y actualización;
  canales nuevos `pipeline:openspec:*` junto a `pipeline-specs.ts:108`, expuestos en `preload.ts` y
  tipados en `types/electron.d.ts`. El renderer recibe `displayPath` pero no puede enviarlo como
  ejecutable.
- **(B) Tipos / evidencia:** `types/pipeline/index.ts` suma `OpenSpecEngineStatus` (con `displayPath`,
  procedencia, configuración global separada de la integración instalada, schema por change,
  clasificación repo-local/external-global de outputs) y adapta el parsing de `OpenSpecChangeStatus`
  (`:110-116`) a `isPlanningComplete`/`requires`/`skipped` y schemas dinámicos; `openspec-tooling.ts`
  (lista de 18 tools hoy) se amplía para reconocer targets 1.8 (`agents`, `minimax-code`, etc.) y su
  clase de output.
- **(C) Política Git:** validación de rama/working tree y preparación del diff reutilizando el
  circuito existente de «Preparar commit»; sin escrituras de Git automáticas.
- **(B) Renderer:** tarjeta siempre visible en `OpenSpecDashboard.tsx`, botón con revisión, etapas,
  errores recuperables; nuevos estados en `pipeline-view-state.ts`.
- **(B) i18n:** sub-namespace `pipeline.openspec.engine.*` en ES, EN y ZH.
- **(B) Tests:** discovery y procedencia, versiones, online/offline, preview en sus tres clases,
  invalidación del plan, dos fuentes y divergencia, outputs externos bloqueados, matriz init/update/
  upgrade, contrato init, entorno controlado, runtime durable (crash/concurrencia/rollback), lector
  minimizado, `.codex`↔`.agents`, slugs, schemas dinámicos, displayPath no ejecutable, i18n y UI, sin
  regresiones ni servicios de IA pagos.
- **Sin dependencias nuevas:** el runtime administrado, si se adopta, se instala en `userData`, no como
  dependencia de build.

## Out of Scope

- **(D) Metodología de Alejandro** no se incorpora al actualizador: no clasificación
  trivial/especificado/exploración, no Draft PR, no Deploy Preview, no cierre humano automático, no
  merge, no verificación de producción.
- **(B) Mutaciones en outputs globales** (p. ej. `~/.minimax/skills/openspec-*`): bloqueadas en este
  change; requieren otro change con consentimiento, backup y rollback propios.
- Implementar `retirar-cambios-openspec-obsoletos`: queda congelado; tras cerrar este change se
  reaudita contra el runtime nuevo, con autorización, antes de cualquier corrección o implementación.
- Relevamiento general de GitCron como interfaz SDD (quick changes, sync, verify, bulk archive,
  dependencias, historial, salud metodológica): produce un backlog posterior, no amplía este change.
- Corregir el archivado actual con tareas pendientes (contradice la metodología vigente pero no se
  incorpora sin ampliar el alcance formalmente).
- Diseñar un custom schema metodológico completo para la metodología de Alejandro (Q3): requiere otro
  relevamiento (parte schema, parte política del repo, parte automatización Git/GitHub) y no se
  resuelve en este change ni se confirma en su aprobación final.
- Empaquetar `@fission-ai/openspec` en el instalador de GitCron: evaluado y descartado para este
  change (fija la versión al ciclo de release y exige reestructurar el build).
- Activar silenciosamente un actualizador global como fallback que incumpla el contrato atómico/
  reversible: no se hace. Con un CLI global, GitCron sólo informa la actualización y su alcance.
