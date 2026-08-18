## Context

GitCron integra OpenSpec como un CLI externo. El wrapper `electron/pipeline/openspec-cli.ts` resuelve
el binario por nombre pelado (`openspec`/`openspec.cmd`, `:24-26`) y sólo invoca `init`, `archive`,
`validate` y `status` —no `--version`, `update` ni `doctor`. La versión realmente ejecutada en el host
es `@fission-ai/openspec` **1.5.0** global, mientras la última estable en npm es **1.8.0**
(`latest 1.8.0`). La integración del propio repositorio quedó en `generatedBy: "1.5.0"` (20 skills en
`.codex`/`.claude`/`.agent`/`.opencode`); `.agents/skills` ya existe con skills **personalizados** de
GitCron, sin skills OpenSpec. La **configuración global efectiva observada** es `profile=custom` con
cinco workflows (`propose`, `explore`, `apply`, `sync`, `archive`); la **integración instalada legacy**
en el repo son cinco workflows por target sobre skills en `.codex`/`.agent`.

La diferencia entre generaciones se verificó directamente. Con 1.5, `status --json` devuelve
`isComplete` y artefactos con `status`. Con **1.8** (vía `npx --yes @fission-ai/openspec@1.8.0`, sin
instalar global ni mutar el repo) devuelve además `isPlanningComplete` (alias de compatibilidad) y cada
artefacto trae `requires`. El único schema disponible hoy es `spec-driven`. Los flags de `init` en 1.8
se verificaron con `openspec init --help` (1.5 y 1.8): `--tools`, `--profile core|custom`, `--force`,
y en 1.8 además `--no-animation`, `--copilot-cloud`/`--no-copilot-cloud`; `--tools` 1.8 incluye
`minimax-code` (escribe en `~/.minimax/skills/openspec-*`, output **external-global**) y el target
neutral `agents`.

**Evidencia de Node y POC (Fase 3):** `package.json` declara Electron `^42.0.1`; con
`ELECTRON_RUN_AS_NODE=1` el binario de desarrollo reporta **Node 24.15.0** y la aplicación empaquetada
(Windows `release/win-unpacked/GitCron.exe` con `PATH=""`) reporta **Node 24.15.0**, superando el mínimo
exigido (≥ 20.19). Sin embargo, la POC demostró que `@fission-ai/openspec@1.8.0` en npm **no es un bundle
autocontenido** (`bundleDependencies: null`, 9 dependencias directas y ~76 transitivas): extraer el
tarball sin `npm` en PATH arroja `ERR_MODULE_NOT_FOUND`. Al no existir infraestructura CI para macOS y
Linux y no desearse implementar un gestor de paquetes interno en GitCron, en la **Fase 4 se decidió no
construir un runtime administrado autodescargable y rescopear la integración a resolución por estrategia
(local > global), diagnóstico profundo y guía no destructiva**.

Hay dos validadores de change-id desalineados con 1.8: `CHANGE_ID_PATTERN` (`openspec-cli.ts:29`)
acepta guiones consecutivos y finales, y `CHANGE_SLUG_PATTERN` (`pipeline-next-action.ts:24`) exige
letra inicial y rechaza los slugs numéricos válidos en 1.8.

### Las cuatro capas que este cambio distingue

- **(A) OpenSpec oficial:** `init`, `update`, `status`, `instructions`, `validate`, `sync`, `archive`,
  perfiles/workflows, schemas y dependencias de artefactos, archivo histórico, `skip_specs`,
  `retire_capabilities`.
- **(B) Motor de integración de GitCron:** resolver qué CLI se ejecuta (estrategia local `node_modules` > global),
  detectar versión/ruta/procedencia, ejecutar comandos con argumentos tipados, parsear el JSON de varias
  versiones, consultar la versión remota, producir la vista previa diagnóstica y guiar con comandos oficiales.
- **(C) Política operativa de GitCron:** rama segura, working tree compatible, validación de paths,
  staging selectivo, no commit/push/merge automáticos, preparación del diff y del commit.
- **(D) Metodología de Alejandro:** rama `change/<id>` desde `main` sincronizada, un OpenSpec por vez,
  Draft PR, CI y Deploy Preview, validación humana final, commit de cierre, archive y sync en un segundo
  commit, merge autorizado, verificación de producción.

Nada de B, C o D se presenta como funcionalidad nativa de OpenSpec.

## Goals / Non-Goals

**Goals:**
- Detectar versión, procedencia (`local`, `global`, `managed` declarada no disponible, `unknown`) y `displayPath` canónico de sólo lectura.
- Resolver el CLI por estrategia: prioridad al CLI local del proyecto (`node_modules/.bin/openspec`) sobre el global del sistema.
- Leer configuración global minimizada y separada de la integración instalada en el repositorio.
- Consultar la última versión disponible en npm registry con timeout, caché offline y degradación honesta.
- Tarjeta siempre visible en Pipeline con tres ejes independientes (motor, repositorio, integración) y divergencia global ↔ repo.
- Vista previa diagnóstica e inventario clasificado (`repo-local` / `external-global`), bloqueando mutaciones fuera del repositorio.
- Botón y modal de revisión que declara la matriz oficial (`init` / `update` / `none`) y guía al usuario mostrando el comando exacto a ejecutar en su terminal, sin mutaciones automáticas de disco ni simulación de slash commands.
- Parsing y tipos compatibles con 1.5 y 1.8, soporte para schemas dinámicos y grafo real de artefactos.
- Cero dependencias de IA pagas en pruebas y cero mutaciones no autorizadas en repositorios.

**Non-Goals (también Out of Scope):**
- Implementar un gestor de paquetes o resolvedor de dependencias npm interno dentro de GitCron.
- Descarga dinámica y ejecución de runtimes sin `npm` en PATH (descartado tras la POC de Fase 3 / Fase 4).
- Mutación automática del repositorio o de archivos globales desde el motor (el flujo es de diagnóstico y guía).
- Diseñar un custom schema metodológico completo para la metodología de Alejandro (Q3).
- Mutaciones en outputs globales (p. ej. `~/.minimax/skills/openspec-*`).
- Empaquetar `@fission-ai/openspec` dentro de la distribución de GitCron.

## Decisions

### D1. Cuatro capas explícitas en proposal/specs/design/tasks
Cada ítem identifica su capa (A/B/C/D) para que la UI futura pueda declarar de qué capa proviene cada
bloqueo o recomendación.

### D2. Dos fuentes de evidencia: configuración global e integración instalada
Se transportan por separado: **(A/B) configuración global efectiva** (`rawProfile`, `delivery`,
`configuredWorkflows`, origen/timestamp) y **(B) integración instalada** (tools/targets,
`installedWorkflows` por target, `generatedBy`/markers, faltantes/legacy/personalizados/conflictos). La
tarjeta declara la divergencia; la clasificación `core`/`expanded`/`custom`/`unknown` indica sobre qué
fuente se calculó; un cambio en cualquiera invalida el preview. La configuración global no se llama
«perfil del repositorio».

### D3. Perfiles y workflows sobre los conjuntos oficiales 1.8; `expanded` derivado, no persistido
OpenSpec persiste oficialmente sólo `core`/`custom`. **Core** = `propose`, `explore`, `apply`, `update`,
`sync`, `archive` (seis); **ampliado** = los seis anteriores más `new`, `continue`, `ff`, `verify`,
`bulk-archive`, `onboard` (doce). GitCron deriva `expanded` cuando están los doce workflows del conjunto
ampliado, sobre una fuente declarada; `custom` para cualquier otra combinación; `unknown` si no puede
leerse. La configuración global efectiva observada es **`custom`** con cinco workflows; la integración
instalada legacy del repo son cinco workflows por target.

### D4. Lector minimizado de configuración global
Un lector del main, con el runtime autorizado y con timeout/límite de salida, obtiene sólo
`rawProfile`/`delivery`/`configuredWorkflows`/origen-timestamp; tolera la salida real de 1.5 y 1.8;
degrada a `unknown` si no interpreta; **no transporta, loguea ni persiste** `anonymousId`, telemetría u
otros campos ajenos; y no expone el archivo global completo al renderer. Se mantiene separado de los
`installedWorkflows` del repo. Fixtures 1.5/1.8 y datos extra desconocidos cubren el parsing.

### D5. `displayPath` canónico, informativo y de sólo lectura
El main resuelve la ruta efectiva y expone un `displayPath` informativo; el renderer no puede
devolverlo como ejecutable ni elegir una ruta arbitraria. Tests verifican que un `displayPath` no se
acepta como input ejecutable.

### D6. Tarjeta con tres ejes independientes, siempre visible
Motor, repositorio e integración por separado. Se muestra siempre, sin motor inclusive, y admite un
resumen sin colapsar las evidencias.

### D7. Schemas dinámicos y grafo de artefactos real
Cada change transporta `schemaName` y su lista dinámica de artefactos; Pipeline lee `requires` por
artefacto y `applyRequires` del CLI. La etiqueta «Spec-Driven» hardcodeada es deuda de presentación.

### D8. Slugs: auditoría y alineación, no «aflojar» uno solo
Se alinean **todos** los validadores con la gramática 1.8. El cambio real está en `CHANGE_SLUG_PATTERN`
(`pipeline-next-action.ts:24`, exige letra) y en el rechazo faltante de consecutivos/finales en
`CHANGE_ID_PATTERN`.

### D9. Outputs administrables clasificados; los externos al repo se bloquean
Cada output de `init`/`update` se clasifica `repo-local` o `external-global` (p. ej. `minimax-code` →
`~/.minimax/skills/openspec-*`). La clase entra en preview e invalidación; el target y el path externo
se muestran sólo como diagnóstico; en este change, cualquier operación que escribiría fuera del repo se
bloquea; el renderer no autoriza paths arbitrarios. `.github` es `repo-local` aunque tenga efectos en
CI. Git/rama/working tree **no** protegen outputs globales.

### D10. Vista previa diagnóstica y parcial
- **Diagnóstico** del CLI actual + inventario de inputs/outputs clasificados (`repo-local`/`external-global`).
- **Estado de vista previa:** al no existir runtime destino autodescargado, la vista previa destino se declara
  `parcial` o `no disponible`. La clase `exacta` queda formalmente retirada al requerir la ejecución de un
  runtime destino no presente.
- La vista previa no ejecuta mutaciones en el repositorio.

### D11. Inspección diagnóstica exhaustiva
La inspección incluye todos los inputs/outputs administrables; preserva tipo/permisos/symlinks (sin
seguirlos)/ausencia/casing; la configuración global se consulta sin mutarla; resultado
`parcial`/`no disponible`.

### D12. Invalidación exhaustiva del plan
El plan transporta y recomprueba: ruta canónica, branch, HEAD, working tree, ruta/procedencia/versión
del CLI, versión objetivo, **configuración global** e **integración instalada**, **clase de cada output**,
schema/config, paths con tipo y hash, symlinks y ausencias relevantes.

### D13. Compatibilidad = código de GitCron; guía del botón = comandos oficiales
La compatibilidad con 1.8 vive en el código de GitCron y se distribuye con la app. La acción del botón
abre la revisión diagnóstica y expone los comandos oficiales exactos que el usuario puede ejecutar
en su terminal, sin alterar código ni tipos de GitCron.

### D14. Matriz init/update declarada
Repo sin `openspec/` → declara `openspec init` (con tools allowlisted y flags sugeridos); repo inicializado →
declara `openspec update`; todo al día → declara no requerir cambios. La UI declara `init`/`update`/ninguna,
mostrando el comando terminal exacto sin simular slash commands.

### D15. Contrato `init` mostrado
El plan decide y muestra: path canónico del repo; `--tools <allowlist confirmada>`; `--profile
core|custom`; `--no-animation`; decisión explícita `--copilot-cloud`/`--no-copilot-cloud`. Advierte que
`--force` sólo debe usarse si una persona confirma la limpieza legacy.

### D16. Entorno controlado para lecturas diagnósticas
Las lecturas diagnósticas de versión y metadata se ejecutan con `OPENSPEC_NO_UPDATE_CHECK=1` y telemetría
desactivada (`OPENSPEC_TELEMETRY=0` o `DO_NOT_TRACK=1`), sin TTY interactiva.

### D17. Convivencia `.codex` ↔ `.agents` con preservación de personalizaciones
1.8 migra los skills de Codex a `.agents/skills`; el diagnóstico detecta skills OpenSpec viejos en `.codex`
y nuevos en `.agents`, distingue los personalizados ya presentes en `.agents`, no sugiere borrarlos/sobrescribirlos,
y declara la situación de convivencia y colisiones.

## Arquitectura de resolución del CLI por estrategia

Tras la decisión de la Fase 4 de no construir un runtime administrado autodescargable, la resolución
del ejecutable de OpenSpec se rige por una **estrategia de precedencia transparente**:

1. **CLI local al proyecto (`local`):** Busca `node_modules/.bin/openspec` (o `.cmd` en Windows) en la raíz
   del repositorio activo (`repoPath`). Es el patrón estándar para herramientas de desarrollo por repositorio,
   asegurando que la versión ejecutada coincide exactamente con el lockfile del proyecto (`package.json` / `pnpm-lock.yaml`).
2. **CLI global del sistema (`global`):** Si no hay versión local en el repositorio, busca `openspec` en el `PATH`
   del sistema.
3. **Procedencia administrada (`managed`):** Se mantiene tipada en el contrato de GitCron para compatibilidad
   futura (si upstream llegara a publicar binarios/bundles autocontenidos), pero se declara formalmente como
   **no disponible**.
4. **CLI ausente (`unknown`):** Si no se encuentra ningún binario, se informa en la tarjeta y se guía al usuario
   para su instalación.

El renderer **nunca elige paths ni ejecutables**: consume exclusivamente el runtime autorizado por el proceso
principal y recibe un `displayPath` de sólo lectura.

## Risks / Trade-offs

- **Sin runtime administrado autodescargable** → El usuario ejecuta la actualización en su entorno con su package manager habitual (`npm`/`pnpm`/`npx`), evitando añadir un gestor de paquetes a GitCron.
- **`openspec update` sin `--dry-run` nativo** → Inspección exhaustiva de árbol y declaración clara de alcance en la revisión.
- **Outputs external-global (`minimax-code`)** → Clasificados y bloqueados como diagnósticos.
- **Cambios de schema del JSON entre minors** → Tolerancia con degradación y fixtures 1.5/1.8.
- **Choque con skills personalizados bajo `.agents`** → Detección dual y preservación diagnóstica.
- **Consulta al npm registry (rate limits / disponibilidad)** → Caché con TTL y modo offline; nunca bloquea Pipeline.

## Migration Plan

El cambio es aditivo: el archivado normal y los comandos existentes no se alteran, y el wrapper sigue
funcionando con la versión activa. El parsing se endurece (tolerancia) en vez de reescribirse, así que un
snapshot de 1.5 sigue legible. La precedencia de resolución la fija el main (local > global); el renderer
no toma decisiones de paths.

## Open Questions

- **Q1 — Mecanismo del runtime administrado:** CERRADA en Fase 3/4. La POC demostró que `@fission-ai/openspec`
  no distribuye un bundle autocontenido y requiere un árbol completo de dependencias en `node_modules`. No se
  construye un gestor de paquetes interno en GitCron; el alcance se rescopeó a resolución local/global,
  diagnóstico y guía.
