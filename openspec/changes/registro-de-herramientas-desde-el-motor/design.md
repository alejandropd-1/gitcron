# Design

## Context

Ver proposal.md, «Why». Medido el 2026-09-25 con OpenSpec 1.13.2:

- El paquete publica sólo `"."` en `exports`; `AI_TOOLS` y las funciones de detección son internas:
  `dist/core/config.js` (`AI_TOOLS`, `OPENSPEC_SKILL_NAMES`, sin imports),
  `dist/core/available-tools.js` (`getAvailableTools(projectPath)`),
  `dist/core/shared/tool-detection.js` (`getToolStates`, `getConfiguredTools`,
  `getAllToolVersionStatus(projectRoot, currentVersion)`),
  `dist/core/profile-sync-drift.js` (`getToolsNeedingProfileSync(projectPath, workflows, delivery, configuredTools)`).
  Todas leen sólo del sistema de archivos.
- Cada herramienta de `AI_TOOLS` trae `value`, `name`, `skillsDir` y, según el caso,
  `legacySkillsDirs`, `detectionPaths`, `globalSkillsDir`, `available`. Codex:
  `skillsDir: '.agents'`, `legacySkillsDirs: ['.codex']`, `detectionPaths: ['.agents/skills', '.codex/skills']`.
  GitHub Copilot: `skillsDir: '.github'`, con `detectionPaths` que no incluyen flujos genéricos de
  `.github/workflows`. No hay herramienta «GitHub Workflows».
- Respuestas reales: OdontoPau → disponibles `[codex]`, configuradas `[codex]`, vigencia al día,
  sincronización de perfil `[]`. gitCronos → disponibles
  `[antigravity, claude, codex, opencode, qwen, zcode]`, configuradas las mismas menos `zcode`.
- Ubicar el paquete del motor que responde: copia del repositorio →
  `<repo>/node_modules/@fission-ai/openspec` (en pnpm es un enlace; `realpath` lleva al paquete).
  Motor del sistema → el ejecutable que GitCron ya resuelve (`resolveOpenSpecExecutable`) es un
  lanzador que apunta a `…/@fission-ai/openspec/bin/openspec.js`: en POSIX `realpath` llega directo;
  en Windows los lanzadores `.cmd`, sh y `.ps1` de npm y pnpm contienen esa ruta en texto
  (`%~dp0\..\global\v11\…\node_modules\@fission-ai\openspec\bin\openspec.js`). `pnpm root -g` no
  sirve: en pnpm 11 devuelve `…\pnpm\global\v11` y el paquete está un nivel más abajo.
- Hoy el estado de herramientas lo arman tres lectores con reglas propias: `inspectInstalledEvidence`
  (`openspec-evidence.ts`), `readOpenSpecTooling` (`repo-evidence-reader.ts`) y la divergencia del
  perfil (`pipeline-openspec.ts:359-415`), más `hasUnconfiguredTarget` en `buildEngineStatusSnapshot`.
  El renderer importa el registro estático en cinco archivos.
- `openspec init --tools <lista>` ya se invoca desde `initOpenSpecWithCli` (`openspec-cli.ts:63-78`).

## Goals / Non-Goals

**Goals:**
- Una sola fuente del estado de herramientas por repositorio, que viaja en el estado del motor.
- Respaldo declarado y copia propia verificable contra la versión del ciclo SDD.

**Non-Goals:**
- Reemplazar la inspección de skills de GitCron (copias viejas, skills modificadas a mano,
  convivencia): sigue siendo de GitCron; sólo deja de decidir presencia y configuración.
- Pedirle a OpenSpec un comando público (queda como pregunta abierta).

## Decisions

### 1. Un proceso aparte corre las funciones del motor

`readEngineToolReport` (nuevo, `electron/pipeline/openspec-engine-tools.ts`) ubica el paquete
(decisión 2), comprueba su `package.json` (`name` `@fission-ai/openspec` y `version` igual a
`cli.runtimeVersion`) y lanza `process.execPath` con `ELECTRON_RUN_AS_NODE=1` (en pruebas, el `node`
del sistema, inyectable) con un script corto que importa los cuatro módulos por URL de archivo, llama
a las funciones y escribe un JSON. Tope de 10 s, salida acotada, sin shell. Recibe los workflows y la
entrega (`delivery`) del perfil global que GitCron ya lee (`OpenSpecGlobalConfig`) para
`getToolsNeedingProfileSync`.

Por qué aparte y no un `import()` en el proceso principal: el código del motor no corre con los
privilegios de GitCron, un fallo no lo tumba, y cada repositorio puede tener otra versión (un
`import()` queda cacheado por ruta dentro del proceso).

### 2. Ubicar el paquete sin adivinar

Copia del repositorio: `realpath(<repo>/node_modules/@fission-ai/openspec)`. Motor del sistema:
`realpath` del ejecutable resuelto; si termina en `bin/openspec.js`, el paquete es la carpeta de
arriba de `bin`; si no, se lee el lanzador (hasta 64 KB) y se busca una única ruta que termine en
`@fission-ai/openspec/bin/openspec.js` (con `/` o `\`, relativa a la carpeta del lanzador o
absoluta). Más de una candidata o ninguna: respaldo con motivo `package-not-found`.

### 3. El informe

```
OpenSpecToolReport {
  source: 'engine' | 'gitcron-fallback';
  engineVersion: string | null;
  fallbackReason?: 'package-not-found' | 'version-mismatch' | 'engine-api-changed' | 'timeout' | 'failed';
  tools: Array<{ id, label, skillsDir, legacySkillsDirs, available, configured, needsUpdate, generatedBy }>;
  profileSyncNeeded: string[];
}
```

Viaja en `OpenSpecEngineStatus` como `toolReport`. La forma del JSON se valida estrictamente: un
campo que falta o de otro tipo da `engine-api-changed`.

### 4. Respaldo: la copia de la versión del ciclo

`electron/pipeline/openspec-tools-snapshot.json` guarda `{ version, tools, skillNames }` capturados
de 1.13.2 con `scripts/capturar-herramientas-openspec.mjs` (lee el paquete del motor del sistema o
el que se le indique). En respaldo, GitCron calcula presencia y configuración con su propia lógica
sobre esa copia y con la misma semántica que el motor: `detectionPaths` o `skillsDir`, la marca
`.openspec-target` para carpetas compartidas, y copias viejas por `legacySkillsDirs` + `skillNames`.
Una prueba compara `version` (mayor.menor) con `OPENSPEC_CYCLE_TARGET_VERSION` y, si no coinciden,
falla con el comando para recapturar.

`OPENSPEC_TOOL_DIRECTORIES` queda sólo con los datos de presentación propios de GitCron (clave de
descripción, `blocked` para las globales) indexados por id; directorios y nombres salen del informe.
Se retiran la entrada `github`, `isOpenSpecConfigurableTool` y la lectura propia de
`.openspec-target` fuera del respaldo.

### 5. Qué significa «al día» y qué se ofrece

Con informe: la integración está `outdated` si alguna herramienta configurada tiene `needsUpdate` o
si `profileSyncNeeded` no está vacío, y `up-to-date` si no. Las herramientas presentes sin configurar
van a una lista aparte, `pendingTools`, en el estado, y no cambian `integrationState`. La revisión y
la tarjeta muestran «Falta configurar: Zcode» con la acción de inicializar: `openspec init --tools`
con **la unión** de las configuradas y las pendientes elegidas, para no perder ninguna configurada
(se mide en una copia antes de cablear, tarea 4.1). «Actualizar» no aparece por eso.

**Medido (tarea 4.1, 2026-09-26, por el auditor):** sobre una copia de gitCronos (`.agents`,
`.claude`, `.codex`, `.opencode`, `.qwen`, `.zcode`, `openspec/config.yaml`) fuera del repositorio,
`openspec init --tools antigravity,claude,codex,opencode,qwen,zcode --no-animation --no-copilot-cloud .`
con OpenSpec 1.13.2 contestó «Created: Antigravity, ZCode · Refreshed: Claude Code, Codex, OpenCode,
Qwen Code». No borró ningún archivo, no modificó ninguno de los existentes (sumas de control iguales)
y sólo agregó `.zcode/commands/opsx/*.md` y `.zcode/skills/openspec-*/SKILL.md` (más los `.gitkeep`
de `openspec/` que faltaban en la copia). Después, el motor da las seis configuradas. Por lo tanto la
acción «Configurar» ejecuta `init --tools` con la unión; no hace falta mostrar el comando en su lugar.

Se conservan las reglas que sí son de GitCron: skills sólo en targets del esquema anterior da
desactualizada; copias viejas dan detenida con su motivo.

## Risks / Trade-offs

- [OpenSpec cambia sus módulos internos] → `engine-api-changed`: respaldo con aviso en pantalla, que
  es la señal para recapturar o adaptar el lector.
- [Costo de lanzar un proceso por cada lectura de estado] → el informe se cachea por ruta del
  paquete, versión y repositorio, y se invalida con los mismos eventos que ya refrescan el estado del
  motor.
- [`init --tools` en un repositorio ya inicializado podría configurar de más o de menos] → se mide en
  una copia (tarea 4.1) antes de ofrecerlo; si no resulta seguro, la acción muestra el comando para
  copiar en lugar de ejecutarlo.
- [Diferencias de semántica entre el respaldo y el motor] → las pruebas del respaldo usan los mismos
  árboles que las del motor real (OdontoPau, gitCronos) y comparan resultados.

## Open Questions

- Proponerle a OpenSpec un `openspec tools --json` público (`openspec feedback`). No cambia este
  diseño: si aparece, el lector lo usa primero.
