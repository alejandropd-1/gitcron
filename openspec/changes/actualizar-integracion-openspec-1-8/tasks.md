# Tasks — actualizar-integracion-openspec-1-8

Las tareas distinguen la **capa**: **(B)** motor de integración de GitCron, **(A)** OpenSpec oficial,
**(C)** política operativa de GitCron, **(D)** metodología de Alejandro (fuera de alcance).

**Secuencia y estado.** Las fases 1 y 2 (diagnóstico y contratos de lectura) se completaron y entregaron.
La fase 3 (POC) se ejecutó y cerró con resultado parcial, descubriendo la ausencia de un bundle
autocontenido en upstream. La fase 4 formalizó la decisión humana de no construir un runtime
administrado ni un gestor de paquetes interno, reorientando las fases 5–7 a resolución de CLI por
estrategia (local al repo > global del sistema), diagnóstico profundo y guía no destructiva.

## 1. (B) Diagnóstico del motor (comportamiento: lectura)

- [x] 1.1 Verificar que el cambio sigue activo (`openspec list --json` lo lista) antes de implementar; si no, parar.
- [x] 1.2 En `electron/pipeline/openspec-cli.ts`, parametrizar `CLI` (`:24-26`) para aceptar la ruta resuelta y agregar `discoverOpenSpecCli()` (`openspec --version`, patrón de `StructuredCliRuntimeAdapter.discover()`, timeout 10s, límite de bytes) que devuelva `{ installed, executable, runtimeVersion, evidenceStatus, diagnostics }`.
- [x] 1.3 Determinar la procedencia (`global`/`managed`/`local`/`unknown`) examinando la ruta efectiva; exponer al renderer un `displayPath` de sólo lectura y garantizar (diseño + tests) que no pueda devolverse como ejecutable.
- [x] 1.4 Declarar `SUPPORTED_OPENSPEC_VERSIONS` (rango mínimo/máximo) y clasificar `supported`/`too-old`/`too-new`.

## 2. (B) Contratos, parsing, schemas, slugs, perfiles, lector global, tarjeta, preview diagnóstico (comportamiento: lectura)

- [x] 2.1 En `types/pipeline/index.ts`, definir `OpenSpecEngineStatus` (versión activa, procedencia, `displayPath`, última disponible + fecha, rango) y separar dos fuentes: **configuración global** (`rawProfile`, `delivery`, `configuredWorkflows`, origen/timestamp) e **integración instalada** (tools/targets, `installedWorkflows` por target, `generatedBy`/markers, faltantes/legacy/personalizados/conflictos).
- [x] 2.2 Lector minimizado de configuración global desde el main con el runtime autorizado: timeout y límite de salida; tolera salida real de 1.5 y 1.8; degrada a `unknown`; **no** transporta/loguea/persiste `anonymousId`, telemetría u otros campos ajenos; no expone el archivo global completo al renderer. Fixtures 1.5/1.8 con datos extra desconocidos.
- [x] 2.3 Adaptar el parsing de `OpenSpecChangeStatus` (`:110-116`) a 1.8 como **código de GitCron**: `isPlanningComplete` (con `isComplete` alias), `requires` por artefacto junto a `applyRequires`, `skip_specs`, estados `skipped`, degradación ante campos desconocidos.
- [x] 2.4 Schemas dinámicos: transportar `schemaName` por change y lista dinámica de artefactos; no asumir `proposal`/`design`/`specs`/`tasks` ni que `tasks` es el único gate; representar el grafo real; degradar ante schema/artefacto desconocido. La etiqueta «Spec-Driven» hardcodeada es deuda de presentación.
- [x] 2.5 Perfiles y workflows sobre los conjuntos oficiales 1.8: **core** = `propose`/`explore`/`apply`/`update`/`sync`/`archive`; **ampliado** = los doce (los seis anteriores más `new`/`continue`/`ff`/`verify`/`bulk-archive`/`onboard`). `expanded` es clasificación derivada por GitCron (no persistida); `custom` cualquier otra combinación; `unknown` si no puede leerse; la clasificación indica sobre qué fuente se calculó. La **configuración global efectiva observada** se declara `custom` con cinco workflows (`propose`/`explore`/`apply`/`sync`/`archive`); la **integración instalada legacy** del repo son cinco workflows por target.
- [x] 2.6 Slugs: auditar y alinear **todos** los validadores (`CHANGE_ID_PATTERN` `openspec-cli.ts:29` y `CHANGE_SLUG_PATTERN` `pipeline-next-action.ts:24`) con la gramática 1.8 —letra o número inicial; minúsculas/números/guiones; sin consecutivos ni finales; sin espacios/mayúsculas/underscores/separadores/`..`; límite máximo; seguridad shell/traversal— verificando contra `openspec new change` (1.8).
- [x] 2.7 Crear canales IPC `pipeline:openspec:*` (engine-status, check-latest, update-plan, update-execute, preview) junto a `pipeline-specs.ts:108`, con DI para tests; exponer en `electron/preload.ts` y tipar en `types/electron.d.ts`. El renderer no pasa ejecutable, registry ni rutas libres; argumentos literales o validados.
- [x] 2.8 Consulta de `@fission-ai/openspec` al npm registry por HTTPS con timeout (basar en `lmstudio-adapter.ts:34` generalizado a no-loopback); caché con fecha en `app.getPath('userData')`; offline usa caché declarando antigüedad o declara `offline`/`unknown`; no bloquea el snapshot.
- [x] 2.9 Tarjeta siempre visible en `components/pipeline/OpenSpecDashboard.tsx` con tres ejes independientes (motor/repositorio/integración) y la divergencia global↔repo; nuevos estados en `pipeline-view-state.ts`. `repo-evidence-reader.ts`/`openspec-tooling.ts` leen `generatedBy`, skills legacy `.codex`/`.agent` y personalizados `.agents`; ampliar la lista de 18 tools para reconocer targets 1.8 (`agents`, `minimax-code`, etc.).
- [x] 2.10 Inventario de outputs administrables clasificado `repo-local`/`external-global` (con `minimax-code` → `~/.minimax/skills/openspec-*` como fixture obligatorio y `.github` como repo-local); el target y el path externo se muestran sólo como diagnóstico; el renderer no autoriza paths arbitrarios.
- [x] 2.11 Vista previa: implementar el diagnóstico del CLI actual y el inventario clasificado (`exacta`/`parcial`/`no disponible`); mientras la versión destino no pueda ejecutarse, declarar `parcial`/`no disponible`. La copia, cuando se ejecute, será exhaustiva (todos los inputs/outputs; tipo/permisos/symlinks sin seguirlos/ausencia/casing; configuración global consultada sin mutarla).
- [x] 2.12 Invalidación del plan: transportar y recomprobar ruta canónica, branch, HEAD, working tree, ruta/procedencia/versión del CLI, versión objetivo, integridad del paquete, **configuración global** e **integración instalada**, **clase de cada output**, schema/config, paths con tipo y hash, symlinks y ausencias relevantes; cualquier cambio invalida.
- [x] 2.13 i18n ES/EN/ZH del sub-namespace `pipeline.openspec.engine.*`.

## 3. Registro: POC del runtime administrado (cerrada con resultado PARCIAL)

*Esta fase se ejecutó el 2026-08-16 y concluyó como gate con resultado PARCIAL. Deja constancia de los hallazgos sin constituir trabajo pendiente:*

- **3.1 Evidencia de Node en Electron (demostrado y cumplido):** Se verificó que Electron `42.0.1` empaqueta Node **24.15.0**, superando el requisito de Node ≥ 20.19 de OpenSpec 1.8. Evidencia confirmada tanto en el binario de desarrollo con `ELECTRON_RUN_AS_NODE=1` como en la aplicación empaquetada real (`release/win-unpacked/GitCron.exe` en Windows x64 con `PATH=""`).
- **3.2 Integridad y extracción USTAR vs falta de bundle en upstream (hallazgo estructural):** Se construyó e integró un extractor TAR POSIX endurecido de 0 dependencias externas (`electron/pipeline/openspec-tar-extractor.ts`) y un orquestador de staging con verificación de integridad SRI SHA-512/SHA-256 (`electron/pipeline/openspec-managed-runtime-poc.ts`). Al ejecutar el health check (`openspec --version`) desde staging sobre el tarball extraído, falló con `ERR_MODULE_NOT_FOUND`. La inspección del registry de npm confirmó que `@fission-ai/openspec@1.8.0` tiene `bundleDependencies: null`, 9 dependencias directas y ~76 transitivas no empaquetadas en el tarball. La extracción directa sin un gestor de paquetes (`npm`) no produce un ejecutable funcional.
- **3.3 Mecanismo de ejecución y entorno (demostrado y blindado):** Se evaluó `ELECTRON_RUN_AS_NODE=1` en proceso hijo, confirmando ejecución sin permisos elevados en `userData`, soporte de rutas con espacios, aislamiento de entorno y ejecución offline tras descarga. Se implementó una suite de 27 pruebas de seguridad (`electron/__tests__/pipeline-openspec-managed-runtime-poc.test.ts`).
- **3.4 Multiplataforma (no cubierto):** No se dispone de infraestructura local ni matriz de CI para pruebas empaquetadas en macOS y Linux. Al no existir cobertura multiplataforma verificable y ante el impedimento del tarball, la POC se declaró formalmente parcial.
- **3.5 Resolución de Q1 (cumplido y registrado):** Se resolvió la comparación entre `npm --prefix` y fetch de tarball puro. La descarga directa es inviable sin bundle autocontenido, y `npm --prefix` exige un gestor de paquetes externo que GitCron no debe empaquetar ni suponer.
- **Preservación arquitectónica:** El extractor endurecido y el módulo de staging se conservan sin cablear en `electron/pipeline/` con sus tests pasando, como capacidad dormida y verificada si upstream publica bundles autocontenidos en el futuro.

## 4. Registro: Decisión de rescoping tras la POC (decisión tomada)

*Decisión humana formalizada por Alejandro el 2026-08-16:*

- **4.1 Decisión y rescoping:** **NO se aprueba la construcción de un runtime administrado autodescargable ni la implementación de un gestor de paquetes interno en GitCron.**
- **Fundamento:** Evitar fragilidad operativa y dependencias innecesarias en la aplicación. El alcance de las fases posteriores se reorienta de *ejecutar mutaciones automáticas* a **detectar, diagnosticar y guiar**:
  1. **Resolución por estrategia:** Dar prioridad al CLI local del proyecto (`node_modules/.bin/openspec`) sobre el CLI global en `PATH`, declarando `managed` como no disponible.
  2. **Diagnóstico y evidencia:** Tarjeta siempre visible con tres ejes independientes y divergencia global ↔ repositorio.
  3. **Inventario clasificado:** Clasificación de outputs `repo-local`/`external-global`, bloqueando mutaciones fuera del repositorio.
  4. **Guía no destructiva:** Revisión que declara la matriz oficial (`init` / `update` / `none`) y expone los comandos terminales exactos con sus argumentos recomendados para que el usuario ejecute la actualización en su propio entorno.

## 5. (B) Resolución del CLI por estrategia: local al proyecto y global del sistema

- [x] 5.1 En `electron/pipeline/openspec-engine.ts`, implementar la resolución del CLI local al proyecto (`node_modules/.bin/openspec` o `.cmd` en Windows) inspeccionando `repoPath`, verificando archivo regular y ejecutable, y canonicalizando con `realpathSync`.
- [x] 5.2 Definir e implementar el orden de precedencia explícito: el ejecutable local al proyecto (`local`) tiene precedencia sobre el CLI global del sistema (`global`) cuando ambos existen; si ambos existen con versiones distintas, se selecciona el local y se reporta la procedencia `local`.
- [x] 5.3 Mantener en el contrato la procedencia `managed` tipada y reconocida pero declarada formalmente como no disponible (sin runtime administrado activo), asegurando que el renderer no elija paths ni ejecutables y reciba siempre un `displayPath` de sólo lectura.

## 6. (A+B) Tarjeta de estado, revisión sin mutación, declaración de matriz y guía de actualización

- [x] 6.1 Botón o acción de revisión en la UI (`OpenSpecDashboard.tsx`) cuyo primer clic abre la revisión sin mutar nada: versión actual y última disponible, procedencia efectiva (`local`/`global`), alcance, archivos creados/modificados/retirados según diagnóstico, conflictos con personalizados y comando oficial sugerido.
- [x] 6.2 Declaración de la matriz de actualización y comando guiado: determinar la operación oficial (`init` / `update` / ninguna) y mostrar al usuario el comando exacto a ejecutar en su terminal (p. ej. `openspec init --tools ...` o `openspec update`), con su alcance y archivos involucrados, sin ejecutar mutaciones automáticas ni simular slash commands.
- [x] 6.3 Guía no interactiva para `init`: el plan decide y muestra los argumentos recomendados para ejecución por el usuario (`--tools <allowlist>`, `--profile core|custom`, `--no-animation`, `--copilot-cloud`/`--no-copilot-cloud`), advirtiendo que `--force` sólo debe usarse tras confirmar la limpieza de archivos legacy.
- [x] 6.4 Diagnóstico de regeneración y convivencia `.codex` ↔ `.agents`: declarar qué skills legacy de `.codex` se migrarían, qué skills nuevos de `.agents` se incorporarían, qué personalizados preexistentes en `.agents` no deben tocarse y qué colisiones de nombres existen — en modo de sólo lectura/diagnóstico.

## 7. (B) Pruebas

- [ ] 7.1 CLI ausente con tarjeta visible; procedencia global/local/desconocido (`managed` declarada no disponible); `displayPath` informativo que **no** puede usarse como input ejecutable. *(Cubierta en fase 2).*
- [ ] 7.2 CLI global detectado pero no actualizable atómicamente desde GitCron (sólo informativo); POC parcial que detiene la actualización integral; reporte honesto del estado del motor.
- [ ] 7.3 Versiones ausente/vieja/actual/nueva/incompatible; consulta online con timeout y caché offline; «no afirma desactualizado sin evidencia». *(Cubierta en fase 2).*
- [ ] 7.4 Lector minimizado: `rawProfile`/`delivery`/`configuredWorkflows` leídos; `anonymousId`/telemetría no transportados; degradación `unknown`; fixtures 1.5/1.8 con datos extra. *(Cubierta en fase 2).*
- [ ] 7.5 Dos fuentes separadas y divergencia global↔repo; clasificación derivada `core`/`expanded`/`custom`/`unknown` sobre fuente declarada; perfil observado `custom` con cinco workflows. *(Cubierta en fase 2).*
- [ ] 7.6 Schema `spec-driven`, un custom schema con artefactos diferentes, un artefacto `skipped`, un artefacto/estado futuro desconocido; grafo dinámico con `requires` y `applyRequires`. *(Cubierta en fase 2).*
- [ ] 7.7 Slugs: numérico válido; consecutivos/finales inválidos; límite; mayúsculas/underscore/`..` rechazados; seguridad shell/traversal. *(Cubierta en fase 2).*
- [ ] 7.8 Outputs: clasificación `repo-local`/`external-global`; `minimax-code` (external) bloqueado y sólo diagnóstico; `.github` repo-local; renderer no autoriza paths arbitrarios. *(Cubierta en fase 2).*
- [ ] 7.9 Vista previa diagnóstica y parcial (clasificación de inputs/outputs, inventario de cambios) con invalidación ante cambio de rama/HEAD/CLI/fuentes; sin clase `exacta`.
- [ ] 7.10 Matriz de actualización diagnóstica: repo sin `openspec/` → declara `init`; inicializado → declara `update`; todo al día → declara no mutar; muestra comando exacto sin ejecutarlo.
- [ ] 7.11 Diagnóstico de migración `.codex` → `.agents`: skills OpenSpec viejos/nuevos detectados; `.agents` con personalizados preexistentes conservados; colisiones; `generatedBy` no es prueba única. *(Cubierta en fase 2).*
- [ ] 7.12 IPC con argumentos inválidos y rutas fuera del repositorio rechazadas; parsing con fixtures de OpenSpec 1.5 y 1.8. *(Cubierta en fase 2).*
- [ ] 7.13 i18n ES/EN/ZH del sub-namespace nuevo; UI del flujo de diagnóstico, tarjeta, revisión y guía de actualización (sin etapas de ejecución ni rollback).
- [ ] 7.14 Regresión: el archivado normal sigue usando `openspec archive <id> --yes` y Pipeline abre sin regresiones; sin servicios de IA pagos. *(Cubierta en fase 2).*
- [ ] 7.15 Cobertura de la resolución local al proyecto (`node_modules/.bin/openspec`), verificación de ejecutabilidad y precedencia local > global.

## 8. Cierre

> *Nota de estado (2026-08-16):* Las comprobaciones 8.1 a 8.4 se ejecutaron y verificaron exitosamente para el estado de las Fases 1 y 2 (`tsc --noEmit` en 0, 1277 tests en verde en Vitest, `openspec validate --strict` en 0 con 1.5 y 1.8). Se desmarcan aquí porque el change cuenta con fases de implementación pendientes (Fases 5, 6 y 7) y el portón de cierre completo debe validarse y certificarse una vez implementadas las tareas restantes.

- [ ] 8.1 `pnpm exec tsc --noEmit` del **proyecto** en cero.
- [ ] 8.2 `pnpm test` en verde (correr más de una vez por el flake conocido).
- [ ] 8.3 `openspec validate actualizar-integracion-openspec-1-8 --strict` válido con la versión activa (1.5) y con 1.8 (`npx --yes @fission-ai/openspec@1.8.0 validate … --strict --no-interactive`).
- [ ] 8.4 Revisión visual manual de la tarjeta y el flujo completo por Alejandro. La marca Alejandro.
