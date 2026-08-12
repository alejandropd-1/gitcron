## Context

GitCron integra OpenSpec como un CLI externo. El wrapper `electron/pipeline/openspec-cli.ts` resuelve
el binario por nombre pelado (`openspec`/`openspec.cmd`, `:24-26`) y sólo invoca `init`, `archive`,
`validate` y `status` —no `--version`, `update` ni `doctor`. La versión realmente ejecutada es
`@fission-ai/openspec` **1.5.0** global, mientras la última estable en npm es **1.8.0**
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

**Evidencia de Node (no asumida):** `package.json` declara Electron `^42.0.1`; la instalación actual
es `42.0.1`; con `ELECTRON_RUN_AS_NODE=1` el **binario de desarrollo** reporta **Node 24.15.0** (medido
en el host); OpenSpec 1.8 exige Node ≥ 20.19. La evidencia del binario de desarrollo se distingue de la
**aún pendiente de la aplicación empaquetada**, que la POC debe obtener por plataforma.

Hay dos validadores de change-id desalineados con 1.8: `CHANGE_ID_PATTERN` (`openspec-cli.ts:29`)
acepta guiones consecutivos y finales, y `CHANGE_SLUG_PATTERN` (`pipeline-next-action.ts:24`) exige
letra inicial y rechaza los slugs numéricos válidos en 1.8.

### Las cuatro capas que este cambio distingue

- **(A) OpenSpec oficial:** `init`, `update`, `status`, `instructions`, `validate`, `sync`, `archive`,
  perfiles/workflows, schemas y dependencias de artefactos, archivo histórico, `skip_specs`,
  `retire_capabilities`.
- **(B) Motor de integración de GitCron:** resolver qué CLI se ejecuta, detectar versión/ruta/
  procedencia, ejecutar comandos con argumentos tipados, parsear el JSON de varias versiones, consultar
  la versión remota, producir la vista previa, administrar un runtime propio y verificar el resultado.
- **(C) Política operativa de GitCron:** rama segura, working tree compatible, validación de paths,
  staging selectivo, no commit/push/merge automáticos, preparación del diff y del commit.
- **(D) Metodología de Alejandro:** rama `change/<id>` desde `main` sincronizada, un OpenSpec por vez,
  Draft PR, CI y Deploy Preview, validación humana final, commit de cierre, archive y sync en un segundo
  commit, merge autorizado, verificación de producción.

Nada de B, C o D se presenta como funcionalidad nativa de OpenSpec.

## Goals / Non-Goals

**Goals:** detectar versión/procedencia/`displayPath`; leer configuración global minimizada y separada
de la integración instalada; consultar la última disponible con timeout/caché/offline; tarjeta siempre
visible con motor/repositorio/integración independientes; vista previa en tres clases (diagnóstico/
parcial/exacta); clasificar y bloquear outputs externos; runtime administrado durable con precedencia;
botón único que orquesta la operación oficial correcta (matriz init/update/upgrade, contrato `init`
no interactivo) en entorno controlado sin auto-upgrade lateral; parsing y tipos compatibles con
1.5/1.8, schemas dinámicos; sin Git y sin dependencias de IA pagas en tests.

**Non-Goals (también Out of Scope):** (D) Metodología de Alejandro como parte del actualizador;
implementar el retiro; corregir el archivado con tareas pendientes; el relevamiento SDD general;
**diseñar un custom schema metodológico completo para la metodología de Alejandro (Q3)** —requiere otro
relevamiento (parte schema, parte política del repo, parte automatización Git/GitHub) y no se resuelve
en este change ni se confirma en su aprobación final—; **mutaciones en outputs globales** (p. ej.
`~/.minimax/skills/openspec-*`), bloqueadas aquí y relegadas a otro change con consentimiento, backup y
rollback propios; empaquetar `@fission-ai/openspec`.

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

### D10. Vista previa en tres clases
- **Diagnóstico** del CLI actual + inventario de inputs/outputs clasificados: implementable antes de la
  POC.
- **Preview del resultado destino:** `exacta` sólo con el runtime destino exacto (POC aprobada + runtime
  en staging); `parcial`/`no disponible` mientras no pueda ejecutarse.
- Preview y ejecución real usan el mismo paquete, integridad, runtime, configuración, tools y argumentos.
No se afirma que el preview destino «funciona con global/local» cuando esos runtimes no coinciden con
la versión destino.

### D11. Copia exhaustiva y grado de certeza
La copia incluye todos los inputs/outputs administrables; preserva tipo/permisos/symlinks (sin
seguirlos)/ausencia/casing; la configuración global se consulta sin mutarla; resultado
`exacta`/`parcial`/`no disponible`.

### D12. Invalidación exhaustiva del plan
El plan transporta y recomprueba: ruta canónica, branch, HEAD, working tree, ruta/procedencia/versión
del CLI, versión objetivo, integridad del paquete, **configuración global** e **integración instalada**,
**clase de cada output**, schema/config, paths con tipo y hash, symlinks y ausencias relevantes.

### D13. Compatibilidad = código de GitCron; operación del botón = runtime
La compatibilidad con 1.8 vive en el código de GitCron y se distribuye con la app. La operación del
botón prepara/activa el runtime, ejecuta `init`/`update`, regenera, valida, diffa y ofrece recuperación:
no modifica tipos TS ni código de GitCron.

### D14. Matriz init/update/upgrade
Repo sin `openspec/` → `openspec init` (tools allowlisted/confirmadas, perfil `core`/`custom` explícito,
flags anti-prompt; nunca `update`); inicializado → `openspec update` (1.8 no ofrece `--tools` para
`update`); motor ausente/desactualizado → activar primero el runtime administrado objetivo y ejecutar
después `init`/`update` con ese runtime exacto; motor al día, integración desactualizada → sólo la
regeneración necesaria; todo al día → no mutar. La UI declara `init`/`update`/`upgrade+init`/
`upgrade+update`/ninguna. Preview y ejecución resuelven la misma operación y argumentos.

### D15. Contrato `init` no interactivo
El plan decide y muestra: path canónico del repo; `--tools <allowlist confirmada>`; `--profile
core|custom`; `--no-animation`; decisión explícita `--copilot-cloud`/`--no-copilot-cloud`. `--force` sólo
si el preview mostró exactamente la limpieza legacy y una persona la confirmó; nunca automático. Proceso
sin TTY, con `OPENSPEC_NO_UPDATE_CHECK=1` y telemetría desactivada.

### D16. Entorno controlado: neutralizar el auto-upgrade lateral
Dentro de la operación administrada, preview/`init`/`update`/validaciones se corren en entorno no
interactivo con `OPENSPEC_NO_UPDATE_CHECK=1` y telemetría desactivada (`OPENSPEC_TELEMETRY=0` o
`DO_NOT_TRACK=1`), sin TTY interactiva ni capacidad de disparar un `npm install -g`. La consulta de
versión disponible es responsabilidad separada del motor GitCron.

### D17. Convivencia `.codex` ↔ `.agents` con preservación de personalizaciones
1.8 migra los skills de Codex a `.agents/skills`; el preview y la ejecución detectan skills OpenSpec
viejos en `.codex` y nuevos en `.agents`, distinguen los personalizados ya presentes en `.agents`, no los
borran/sobrescriben, declaran migración/conserva/retiro, detectan colisiones y no usan `generatedBy`
como única prueba.

## Arquitectura del runtime administrado: protocolo durable y precedencia

La actualización integral exige un runtime administrado por GitCron en
`userData/openspec-runtimes/<version>/` gestionado con un **protocolo durable** (propiedades exigidas
desde la planificación; la API concreta la fija la POC):

- **Directorios de versiones inmutables** (cada versión, una carpeta que no se reescribe).
- **Manifiesto/puntero persistido bajo `userData`** con la versión activa y la anterior recuperable.
- **Escritura temporal + reemplazo atómico** del puntero.
- **Health check** (`openspec --version` + verificación) antes de activar.
- **Lock/mutex de proceso**: un segundo clic, dos ventanas o dos repositorios no pueden activar a la vez.
- **Recuperación al iniciar** si quedó staging o un manifiesto incompleto.
- **Nunca limpiar la versión activa ni la anterior recuperable.**
- **Rollback durable** que sobrevive a reinicio/crash.
- **Confinamiento**: la ruta resuelta se valida dentro de `userData/openspec-runtimes`.

Una vez activo el puntero, **todas** las operaciones OpenSpec de GitCron (`status`, `preview`, `init`,
`update`, `validate`, `archive`) usan ese mismo runtime, evitando el «split brain». El renderer no elige
paths ni ejecutables; global/local son evidencia diagnóstica, no una elección. Sin runtime administrado,
el comportamiento de global/local es explícito por operación y la actualización integral permanece
prohibida.

### POC (primer gate) — criterios completos

La POC del runtime administrado es el primer gate de la implementación y debe demostrar, con evidencia
real, que OpenSpec 1.8 puede ejecutarse en GitCron empaquetado:

- **Node:** OpenSpec 1.8 exige Node ≥ 20.19. Evidencia observada: `package.json` Electron `^42.0.1`;
  instalación actual `42.0.1`; con `ELECTRON_RUN_AS_NODE=1` el binario de **desarrollo** reporta **Node
  24.15.0**. La POC debe obtener la evidencia de la **aplicación empaquetada** por plataforma.
- **Integridad y staging:** nombre y versión exactos del paquete; verificación de `dist.integrity`;
  timeout y límite de descarga; staging **fuera** del runtime activo; extracción sin path traversal ni
  escape por symlink; política explícita sobre lifecycle scripts; `openspec --version` y health check
  desde el staging; activación sólo después de todas las verificaciones; limpieza segura del staging
  fallido.
- **Mecanismo de ejecución** concreto en desarrollo y empaquetado, evaluando `ELECTRON_RUN_AS_NODE` o
  una alternativa documentada, sin `node`/`npm` global en `PATH`.
- **Multiplataforma:** evidencia real de Windows, macOS y Linux (local o CI matrix con artefactos
  empaquetados). **Si no existe infraestructura para una plataforma, no se declara éxito
  multiplataforma**: la POC se declara parcial y la actualización integral se bloquea.
- **Entorno:** `userData` sin permisos elevados; paths con espacios; offline tras descargar el runtime.
- **Ciclo de vida:** instalación, actualización, activación atómica, rollback y limpieza; child process
  con señales, timeouts, límites de salida y cierre ordenado al cerrar la app; tests de crash
  antes/durante/después del cambio de puntero.
- **Sin dependencias nuevas** sin aprobación de Ale.

`Q1` (npm `--prefix` en `userData` vs fetch de tarball + verificación de integridad) permanece abierta
**sólo hasta la POC**, porque compara esos dos mecanismos. El criterio de éxito y la evidencia requerida
quedan completos con esta lista.

## Qué ocurre si la POC falla

La implementación de la **actualización integral del motor** se detiene y los artefactos se revisan. Lo
que no depende del runtime administrado —diagnóstico, tarjeta siempre visible, consulta con
caché/offline, inventario de inputs/outputs clasificados y preview `parcial`/`no disponible`— puede
quedar entregado (es comportamiento de las funcionalidades; su implementación sí modifica código en la
rama). No se activa un actualizador global silencioso como fallback; con un CLI global, GitCron sólo
informa la actualización y su alcance.

## Risks / Trade-offs

- **Viabilidad del runtime administrado no medida** → POC como primer gate; si falla, sólo se detiene la
  actualización integral.
- **`openspec update` sin `--dry-run`** → D10/D11: copia temporal exhaustiva con grado de certeza.
- **Auto-upgrade lateral de `openspec update` en 1.8** → D16: entorno controlado con
  `OPENSPEC_NO_UPDATE_CHECK=1` y sin TTY.
- **Outputs external-global (`minimax-code`)** → D9: clasificados y bloqueados en este change.
- **Cambios de schema del JSON entre minors** → D7: tolerancia con degradación y fixtures 1.5/1.8.
- **Choque con skills personalizados bajo `.agents`** → D17: detección dual y preservación.
- **Multiplataforma sin infraestructura** → POC: si falta una plataforma, POC parcial e integral
  bloqueada.
- **Consulta al npm registry (rate limits / disponibilidad)** → caché con TTL y offline; nunca bloquea.

## Migration Plan

El cambio es aditivo: el archivado normal y los comandos existentes no se alteran, y el wrapper sigue
funcionando con la versión activa. El parsing se endurece (tolerancia) en vez de reescribirse, así que un
snapshot de 1.5 sigue legible. No hay migración de datos persistente: el caché de versión es nuevo y
opcional. La precedencia del runtime la fija el main (protocolo durable con puntero persistido al
administrado activo); global y local son evidencia diagnóstica, no una elección del renderer.

## Secuencia con `retirar-cambios-openspec-obsoletos`

Este change no modifica el de retiro. La secuencia posterior, con autorización, es: (1) completar y
cerrar la actualización de OpenSpec; (2) reauditar el change de retiro contra el runtime nuevo; (3)
corregir sus artefactos con autorización; (4) recién entonces considerar su implementación. La
reauditoría deberá revisar, entre otros: la diferencia entre `--skip-specs` y `retire_capabilities`, las
tareas pendientes, el protocolo de dos fases de `retirement.md`, la identidad real del usuario
confirmante, el estado anterior, el schema del change, la sincronización o conservación de specs y el
resultado verificable del movimiento al archivo. Esa corrección no se realiza ahora.

## Open Questions

- **Q1 — Mecanismo del runtime administrado** (npm `--prefix` en `userData` vs fetch de tarball +
  verificación de integridad): abierta **sólo hasta la POC**, que la resuelve comparando ambos contra
  atomicidad, rollback, permisos, multiplataforma, integridad y empaquetado.
