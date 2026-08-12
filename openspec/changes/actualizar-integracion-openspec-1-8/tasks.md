# Tasks — actualizar-integracion-openspec-1-8

Las tareas distinguen la **capa**: **(B)** motor de integración de GitCron, **(A)** OpenSpec oficial,
**(C)** política operativa de GitCron, **(D)** metodología de Alejandro (fuera de alcance).

**Secuencia y gate.** Las fases 1–2 cubren diagnóstico y contratos: describen **comportamiento** de las
funcionalidades (no mutan el repositorio del usuario, leen); su **implementación** sí modifica **código
en la rama** del change. La **fase 3 (POC) es un gate obligatorio** que aprueba Alejandro (fase 4)
**antes** de cualquier mutación integral. Si la POC falla, se detiene la actualización integral, se
revisan los artefactos y las fases 1–2 pueden quedar entregadas. Ninguna tarea se marca completada:
seguimos en planificación.

## 1. (B) Diagnóstico del motor (comportamiento: lectura)

- [ ] 1.1 Verificar que el cambio sigue activo (`openspec list --json` lo lista) antes de implementar; si no, parar.
- [ ] 1.2 En `electron/pipeline/openspec-cli.ts`, parametrizar `CLI` (`:24-26`) para aceptar la ruta resuelta y agregar `discoverOpenSpecCli()` (`openspec --version`, patrón de `StructuredCliRuntimeAdapter.discover()`, timeout 10s, límite de bytes) que devuelva `{ installed, executable, runtimeVersion, evidenceStatus, diagnostics }`.
- [ ] 1.3 Determinar la procedencia (`global`/`managed`/`local`/`unknown`) examinando la ruta efectiva; exponer al renderer un `displayPath` de sólo lectura y garantizar (diseño + tests) que no pueda devolverse como ejecutable.
- [ ] 1.4 Declarar `SUPPORTED_OPENSPEC_VERSIONS` (rango mínimo/máximo) y clasificar `supported`/`too-old`/`too-new`.

## 2. (B) Contratos, parsing, schemas, slugs, perfiles, lector global, tarjeta, preview diagnóstico (comportamiento: lectura)

- [ ] 2.1 En `types/pipeline/index.ts`, definir `OpenSpecEngineStatus` (versión activa, procedencia, `displayPath`, última disponible + fecha, rango) y separar dos fuentes: **configuración global** (`rawProfile`, `delivery`, `configuredWorkflows`, origen/timestamp) e **integración instalada** (tools/targets, `installedWorkflows` por target, `generatedBy`/markers, faltantes/legacy/personalizados/conflictos).
- [ ] 2.2 Lector minimizado de configuración global desde el main con el runtime autorizado: timeout y límite de salida; tolera salida real de 1.5 y 1.8; degrada a `unknown`; **no** transporta/loguea/persiste `anonymousId`, telemetría u otros campos ajenos; no expone el archivo global completo al renderer. Fixtures 1.5/1.8 con datos extra desconocidos.
- [ ] 2.3 Adaptar el parsing de `OpenSpecChangeStatus` (`:110-116`) a 1.8 como **código de GitCron**: `isPlanningComplete` (con `isComplete` alias), `requires` por artefacto junto a `applyRequires`, `skip_specs`, estados `skipped`, degradación ante campos desconocidos.
- [ ] 2.4 Schemas dinámicos: transportar `schemaName` por change y lista dinámica de artefactos; no asumir `proposal`/`design`/`specs`/`tasks` ni que `tasks` es el único gate; representar el grafo real; degradar ante schema/artefacto desconocido. La etiqueta «Spec-Driven» hardcodeada es deuda de presentación.
- [ ] 2.5 Perfiles y workflows sobre los conjuntos oficiales 1.8: **core** = `propose`/`explore`/`apply`/`update`/`sync`/`archive`; **ampliado** = los doce (los seis anteriores más `new`/`continue`/`ff`/`verify`/`bulk-archive`/`onboard`). `expanded` es clasificación derivada por GitCron (no persistida); `custom` cualquier otra combinación; `unknown` si no puede leerse; la clasificación indica sobre qué fuente se calculó. La **configuración global efectiva observada** se declara `custom` con cinco workflows (`propose`/`explore`/`apply`/`sync`/`archive`); la **integración instalada legacy** del repo son cinco workflows por target.
- [ ] 2.6 Slugs: auditar y alinear **todos** los validadores (`CHANGE_ID_PATTERN` `openspec-cli.ts:29` y `CHANGE_SLUG_PATTERN` `pipeline-next-action.ts:24`) con la gramática 1.8 —letra o número inicial; minúsculas/números/guiones; sin consecutivos ni finales; sin espacios/mayúsculas/underscores/separadores/`..`; límite máximo; seguridad shell/traversal— verificando contra `openspec new change` (1.8).
- [ ] 2.7 Crear canales IPC `pipeline:openspec:*` (engine-status, check-latest, update-plan, update-execute, preview) junto a `pipeline-specs.ts:108`, con DI para tests; exponer en `electron/preload.ts` y tipar en `types/electron.d.ts`. El renderer no pasa ejecutable, registry ni rutas libres; argumentos literales o validados.
- [ ] 2.8 Consulta de `@fission-ai/openspec` al npm registry por HTTPS con timeout (basar en `lmstudio-adapter.ts:34` generalizado a no-loopback); caché con fecha en `app.getPath('userData')`; offline usa caché declarando antigüedad o declara `offline`/`unknown`; no bloquea el snapshot.
- [ ] 2.9 Tarjeta siempre visible en `components/pipeline/OpenSpecDashboard.tsx` con tres ejes independientes (motor/repositorio/integración) y la divergencia global↔repo; nuevos estados en `pipeline-view-state.ts`. `repo-evidence-reader.ts`/`openspec-tooling.ts` leen `generatedBy`, skills legacy `.codex`/`.agent` y personalizados `.agents`; ampliar la lista de 18 tools para reconocer targets 1.8 (`agents`, `minimax-code`, etc.).
- [ ] 2.10 Inventario de outputs administrables clasificado `repo-local`/`external-global` (con `minimax-code` → `~/.minimax/skills/openspec-*` como fixture obligatorio y `.github` como repo-local); el target y el path externo se muestran sólo como diagnóstico; el renderer no autoriza paths arbitrarios.
- [ ] 2.11 Vista previa: implementar el diagnóstico del CLI actual y el inventario clasificado (`exacta`/`parcial`/`no disponible`); mientras la versión destino no pueda ejecutarse, declarar `parcial`/`no disponible`. La copia, cuando se ejecute, será exhaustiva (todos los inputs/outputs; tipo/permisos/symlinks sin seguirlos/ausencia/casing; configuración global consultada sin mutarla).
- [ ] 2.12 Invalidación del plan: transportar y recomprobar ruta canónica, branch, HEAD, working tree, ruta/procedencia/versión del CLI, versión objetivo, integridad del paquete, **configuración global** e **integración instalada**, **clase de cada output**, schema/config, paths con tipo y hash, symlinks y ausencias relevantes; cualquier cambio invalida.
- [ ] 2.13 i18n ES/EN/ZH del sub-namespace `pipeline.openspec.engine.*`.

## 3. (B) POC del runtime administrado — GATE obligatorio antes de cualquier mutación integral

- [ ] 3.1 Ejecutar la POC con evidencia real: Node ≥ 20.19 — evidencia observada `package.json` Electron `^42.0.1`, instalación `42.0.1`, `ELECTRON_RUN_AS_NODE=1` binario de desarrollo Node **24.15.0** — y obtener la evidencia de la **aplicación empaquetada** por plataforma.
- [ ] 3.2 Integridad y staging: nombre y versión exactos del paquete; verificar `dist.integrity`; timeout y límite de descarga; staging **fuera** del runtime activo; extracción sin path traversal ni escape por symlink; política explícita sobre lifecycle scripts; `openspec --version` y health check desde el staging; activación sólo tras todas las verificaciones; limpieza segura del staging fallido.
- [ ] 3.3 Mecanismo de ejecución concreto en dev y empaquetado evaluando `ELECTRON_RUN_AS_NODE` o alternativa documentada, sin `node`/`npm` global en `PATH`; `userData` sin permisos elevados; paths con espacios; offline tras descargar el runtime.
- [ ] 3.4 Multiplataforma: evidencia real de Windows, macOS y Linux (local o CI matrix con artefactos empaquetados). **Si no existe infraestructura para una plataforma, declarar POC parcial y bloquear la actualización integral.**
- [ ] 3.5 Resolver **Q1** (npm `--prefix` en `userData` vs fetch de tarball + verificación de integridad) con la POC. Documentar el resultado real.

## 4. Aprobación humana del resultado de la POC (la marca Alejandro)

- [ ] 4.1 Alejandro aprueba el resultado real de la POC. Si **no** aprueba, se detiene la actualización integral (fases 5–6), se revisan los artefactos y las fases 1–2 pueden quedar entregadas; sin fallback global silencioso.

## 5. (B) Runtime administrado durable: versiones, manifiesto, atomicidad, concurrencia, recuperación

- [ ] 5.1 Implementar versiones inmutables en `userData/openspec-runtimes/<version>/` con manifiesto/puntero persistido que registra la versión activa y la anterior recuperable; escritura temporal + reemplazo atómico del puntero; health check antes de activar.
- [ ] 5.2 Lock/mutex de proceso que impide activar a la vez desde un segundo clic, dos ventanas o dos repositorios; recuperación al iniciar si quedó staging o manifiesto incompleto; nunca limpiar la versión activa ni la anterior recuperable; rollback durable que sobrevive a reinicio/crash; validar que la ruta resuelta permanece bajo `userData/openspec-runtimes`. Tests de crash antes/durante/después del cambio de puntero.
- [ ] 5.3 Una vez activo, `status`/`preview`/`init`/`update`/`validate`/`archive` usan ese mismo runtime; el renderer no elige paths ni ejecutables; global/local son sólo evidencia diagnóstica. Sin administrado, el comportamiento de global/local queda explícito por operación y la integral permanece prohibida.

## 6. (A+B) Botón único, matriz init/update/upgrade, contrato init, preview exacta y entorno controlado (sólo tras runtime)

- [ ] 6.1 Botón «Actualizar OpenSpec» cuyo primer clic abre la revisión sin mutar nada: versión actual/destino, procedencia, alcance, rama, archivos creados/modificados/retirados, conflictos con personalizados, validaciones, **operación oficial real** y recuperación.
- [ ] 6.2 Tras confirmación, ejecutar la operación que decide la matriz: repo sin `openspec/` → `openspec init` (tools allowlisted y confirmadas, perfil `core`/`custom` explícito, flags anti-prompt; nunca `update`); repo inicializado → `openspec update` (1.8 no ofrece `--tools`, no se inventa); motor ausente/desactualizado → activar primero el runtime administrado objetivo y ejecutar después `init`/`update` con ese runtime exacto; integración desactualizada → sólo la regeneración necesaria; todo al día → no mutar. La UI declara `init`/`update`/`upgrade+init`/`upgrade+update`/ninguna, sin simular slash commands.
- [ ] 6.3 Contrato `init` no interactivo: el plan decide y muestra path canónico, `--tools <allowlist confirmada>`, `--profile core|custom`, `--no-animation`, `--copilot-cloud`/`--no-copilot-cloud`; `--force` sólo si el preview mostró exactamente la limpieza legacy y Alejandro la confirmó. Proceso sin TTY, con `OPENSPEC_NO_UPDATE_CHECK=1` y telemetría desactivada.
- [ ] 6.4 Preview **exacta** ahora posible: se ejecuta con el runtime destino exacto (mismo paquete/integridad/runtime/config/tools/args que la ejecución real); copia exhaustiva de todos los inputs/outputs; clasificación creados/modificados/retirados/conflictivos; declaración `exacta`/`parcial`/`no disponible`.
- [ ] 6.5 Entorno controlado para preview/`init`/`update`/validaciones: `OPENSPEC_NO_UPDATE_CHECK=1`, telemetría off (`OPENSPEC_TELEMETRY=0` o `DO_NOT_TRACK=1`), sin TTY interactiva ni `npm install -g` lateral; la consulta de versión es responsabilidad separada del motor GitCron.
- [ ] 6.6 Regeneración (cuando proceda `update`): comprobar versión/perfil/herramientas/skills/rutas/validación/diff; detectar skills OpenSpec en `.codex` y nuevos en `.agents`, distinguirlos de los personalizados en `.agents`, no borrarlos/sobrescribirlos, declarar migración/conserva/retiro, detectar colisiones, `generatedBy` no es prueba única. Bloquear cualquier output `external-global`.
- [ ] 6.7 Etapas comprensibles (comprobando/preparando runtime/verificando descarga/calculando cambios/actualizando integración/validando/completado/requiere atención/revirtiendo); ante error, declarar etapa, qué se actualizó, qué no, si hubo rollback y qué acción segura tomar; sin comandos crudos. El botón no modifica tipos TS ni código de GitCron.

## 7. (C) Seguridad Git y recuperación

- [ ] 7.1 Bloquear sobre `main` y con working tree sucio; exigir rama segura; detectar cambios locales ajenos; no `add`/commit/push/PR/merge/archive ni borrar ramas; al final ofrecer «Preparar commit». (Protege outputs `repo-local`; **no** protege outputs globales.)
- [ ] 7.2 Estado `update-incomplete` (motor ok + repo falla, o viceversa): conservar evidencia, ofrecer reintento o rollback; éxito completo sólo con motor+integración consistentes y validación pasada.

## 8. (B) Pruebas

- [ ] 8.1 CLI ausente con tarjeta visible; procedencia global/local/administrado/desconocido; `displayPath` informativo que **no** puede usarse como input ejecutable.
- [ ] 8.2 CLI global detectado pero no actualizable atómicamente (sólo informativo); runtime administrado durable con activación, rollback y concurrencia; **POC fallida que detiene sólo la actualización integral**.
- [ ] 8.3 Protocolo durable: crash antes/durante/después del cambio de puntero; lock ante segundo clic/dos ventanas/dos repos; recuperación al iniciar con staging/manifiesto incompleto; rollback durable tras reinicio; confinamiento en `userData/openspec-runtimes`.
- [ ] 8.4 Versiones ausente/vieja/actual/nueva/incompatible; consulta online con timeout y caché offline; «no afirma desactualizado sin evidencia».
- [ ] 8.5 Lector minimizado: `rawProfile`/`delivery`/`configuredWorkflows` leídos; `anonymousId`/telemetría no transportados; degradación `unknown`; fixtures 1.5/1.8 con datos extra.
- [ ] 8.6 Dos fuentes separadas y divergencia global↔repo; clasificación derivada `core`/`expanded`/`custom`/`unknown` sobre fuente declarada; perfil observado `custom` con cinco workflows.
- [ ] 8.7 Schema `spec-driven`, un custom schema con artefactos diferentes, un artefacto `skipped`, un artefacto/estado futuro desconocido; grafo dinámico con `requires` y `applyRequires`.
- [ ] 8.8 Slugs: numérico válido; consecutivos/finales inválidos; límite; mayúsculas/underscore/`..` rechazados; seguridad shell/traversal.
- [ ] 8.9 Outputs: clasificación `repo-local`/`external-global`; `minimax-code` (external) bloqueado y sólo diagnóstico; `.github` repo-local; renderer no autoriza paths arbitrarios.
- [ ] 8.10 Preview en tres clases: diagnóstico antes de POC; `parcial`/`no disponible` sin runtime destino; `exacta` con el runtime destino exacto (mismo paquete/integridad/runtime/config/tools/args que la ejecución); copia exhaustiva; invalidación ante cambio de branch/HEAD/contenido/symlink/profile/tool/CLI/fuentes/clase-de-output entre preview y ejecución.
- [ ] 8.11 Matriz init/update/upgrade: repo sin `openspec/` → `init` (nunca `update`); inicializado → `update` sin `--tools`; `upgrade+init`/`upgrade+update`; todo al día → no mutar. Contrato `init`: argumentos decididos/mostrados; `--force` sólo con confirmación de limpieza legacy; sin TTY, versión/telemetría off. El botón no ejecuta slash commands ni modifica código de GitCron.
- [ ] 8.12 Entorno controlado: `OPENSPEC_NO_UPDATE_CHECK=1` y telemetría off presentes; sin TTY; sin `npm install -g` lateral; versión objetivo respetada.
- [ ] 8.13 Migración `.codex` → `.agents`: skills OpenSpec viejos/nuevos detectados; `.agents` con personalizados preexistentes conservados; colisiones; `generatedBy` no es prueba única.
- [ ] 8.14 IPC con argumentos inválidos y rutas fuera del repositorio rechazadas; parsing con fixtures de OpenSpec 1.5 y 1.8.
- [ ] 8.15 i18n ES/EN/ZH del sub-namespace nuevo; UI del flujo completo (tarjeta, revisión, etapas, error, rollback).
- [ ] 8.16 Regresión: el archivado normal sigue usando `openspec archive <id> --yes` y Pipeline abre sin regresiones; sin servicios de IA pagos.

## 9. Cierre

- [ ] 9.1 `pnpm exec tsc --noEmit` del **proyecto** en cero.
- [ ] 9.2 `pnpm test` en verde (correr más de una vez por el flake conocido).
- [ ] 9.3 `openspec validate actualizar-integracion-openspec-1-8 --strict` válido con la versión activa (1.5) y con 1.8 (`npx --yes @fission-ai/openspec@1.8.0 validate … --strict --no-interactive`).
- [ ] 9.4 Revisión visual manual de la tarjeta y el flujo completo por Alejandro. La marca Alejandro.
