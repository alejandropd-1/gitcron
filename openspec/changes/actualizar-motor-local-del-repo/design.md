# Design

## Context

Ver proposal.md, «Why». Lo que ya existe y se reusa:

- **Resolución del motor** (`electron/pipeline/openspec-engine.ts`, `resolveOpenSpecExecutable`):
  primero `<repo>/node_modules/.bin/openspec`, después el `PATH`. El estado que llega al renderer
  trae `cli.provenance: 'global' | 'local' | 'managed' | 'unknown'` (`types/pipeline/index.ts`).
- **Dos canales de instalación**, los dos con `targetVersion` opcional y validado:
  `pipeline:openspec:install-local` (exige `package.json`, pausa el vigilante, deja manifiesto y
  lockfile sin confirmar, enumera archivos tocados) y `pipeline:openspec:install-global`. Ambos
  recalculan el estado desde el disco y lo devuelven en `engineStatus`.
- **La confirmación global** (`components/pipeline/OpenSpecGlobalInstallConfirm.tsx`), que hoy sólo
  usa la tarjeta del motor (`OpenSpecEngineCard.tsx`).
- **El recorrido combinado** (`components/pipeline/OpenSpecUpdateRunner.tsx`), montado por
  `OpenSpecUpdateReview.tsx`, que recibe `engine = { installed, latest }` y hoy:
  - llama `installGlobal({ repoPath })` sin versión (instala `@latest`);
  - evalúa con `assessOpenSpecEngineAfterInstall`, que sólo mira que el motor responda;
  - «volver atrás» llama `installGlobal({ repoPath, targetVersion: installed })`.

## Goals / Non-Goals

**Goals:**
- El recorrido combinado instala donde vive el motor resuelto, la versión anunciada, y verifica esa
  versión.
- Volver atrás en el mismo lugar.
- La fijación exacta del manifiesto sobrevive.

**Non-Goals:**
- Cambiar la precedencia de resolución (local antes que global): es correcta y está documentada.
- Tocar las dos acciones separadas de la tarjeta del motor.
- Ofrecer «pasar de copia local a global» o al revés desde este botón.

## Decisions

### 1. La procedencia viaja con el plan

`OpenSpecUpdateReview` ya tiene el estado completo; el `engine` que le pasa al runner suma
`provenance` (`{ installed, latest, provenance }`). El runner elige el canal por ese dato:
`local` → `installLocal`, `global` → la confirmación global y después `installGlobal`,
cualquier otro → el paso se declara no disponible (texto propio, sin botón que no hace nada).

Alternativa descartada: que el proceso principal decida el canal con un tercer canal «actualizar el
que se usa». Duplica la resolución y esconde a la persona dónde va a escribir, que es justo lo que la
spec pide declarar.

### 2. Versión exacta del plan, no `@latest`

El runner pasa `targetVersion: engine.latest` en los dos canales. El plan dijo «→ v1.13.2»; lo que
se instala es 1.13.2 aunque npm publique otra cosa mientras tanto.

### 3. La verificación compara versión, no sólo respuesta

Se agrega una evaluación que recibe el estado recalculado **y la versión pedida**:
`ok` sólo si `cli.runtimeVersion === targetVersion` (comparación semver, no de texto) además de las
comprobaciones que ya hace `assessOpenSpecEngineAfterInstall`. Si responde otra versión, el veredicto
es `version-mismatch` con `{ requested, responded, provenance }` para que el texto diga de dónde sale
lo que respondió. La tarjeta del motor (`OpenSpecGlobalInstallConfirm`) sigue usando la evaluación
existente: no tiene plan con versión anunciada. No se cambia la firma de la función existente para
no mover a sus otros consumidores; se agrega una al lado en `pipeline-domain.ts`.

### 4. Fijación exacta: se decide en el proceso principal

`installOpenSpecLocal` lee el `package.json` del repositorio antes de ejecutar. Si la entrada de
`@fission-ai/openspec` (en `devDependencies` o `dependencies`) es una versión exacta
(`MAJOR.MINOR.PATCH` con prerelease opcional, sin prefijo), agrega el indicador de exactitud del
gestor: `--save-exact` para pnpm y npm, `--exact` para yarn y bun. Si es un rango o no está, no
agrega nada. `getPackageManagerInstallArgs` gana un parámetro opcional para eso; el comando mostrado
(`commandExecuted`) refleja el indicador.

Alternativa descartada: reescribir el `package.json` a mano después de instalar. Deja el lockfile y
el manifiesto desalineados y es otro escritor del mismo archivo.

### 5. Volver atrás por el mismo canal

El runner recuerda por qué canal instaló (`ranEngine.provenance`) y vuelve por ese mismo, con
`targetVersion: installed`. La verificación de la vuelta usa la misma comparación de la decisión 3.

### 6. La confirmación global dentro del recorrido

Cuando la procedencia es `global`, al tocar «Actualizar» el paso del motor no ejecuta: muestra la
confirmación global con el comando, el gestor y los repositorios abiertos afectados. El comando y la
ruta del gestor salen del canal `pipeline:openspec:install-plan` (ya existe, sólo lectura); los
repositorios abiertos, de `openRepoPaths`, que `OpenSpecUpdateReview` ya recibe y hoy pasa a la
tarjeta del motor. Confirmar ejecuta la
instalación y el recorrido sigue; cancelar vuelve al estado previo sin invocar ningún gestor. Hay
**una sola** llamada de instalación por recorrido: si se reusa `OpenSpecGlobalInstallConfirm`, el
runner consume su `onInstalled` y no vuelve a llamar a `installGlobal`; si se extrae su parte de
presentación, la instalación la hace el runner. Lo que no puede pasar es instalar dos veces.

## Risks / Trade-offs

- [La instalación local en un árbol con cambios ajenos] → ya existe la advertencia de árbol sucio
  del runner y la instalación enumera sólo los archivos que tocó; no se agrega nada.
- [El CI del proyecto valida con la copia local y la nueva versión es más estricta] → no es de
  GitCron decidirlo; la instalación local queda sin confirmar en Git, reversible, y el plan declara
  que toca ese repositorio.
- [Comparar versiones con prerelease] → se usa `parseSemver`/`compareSemver` de
  `lib/openspec-version.ts`, que ya descarta el sufijo de prerelease; `1.14.0-beta.1` pedido contra
  `1.14.0` respondido cuenta como igual. Aceptable: el plan nunca anuncia prereleases (sale de
  `latestAvailable`).
- [Un proyecto sin la dependencia en el manifiesto pero con el binario en `node_modules/.bin`
  (instalado como transitiva)] → la instalación local la agrega como dependencia de desarrollo
  directa, que es lo que la acción local de la tarjeta ya hace hoy.

## Grupo 6 — agregado tras la revisión en pantalla

Ver proposal.md, «Agregado tras la revisión en pantalla». Medido el 2026-09-25 corriendo
`inspectInstalledEvidence` sobre una copia de OdontoPau con las copias viejas repuestas desde Git:
`conflicts: ["Coexistencia de configuración legacy (.codex/.agent) y nueva (.agents)."]`,
`configuredTools: ["agents","codex"]`, `legacy: ["codex"]`, las cinco `.codex/skills/openspec-*` con
origen `legacy-codex`. Y sobre OdontoPau sin ellas: `configuredTools: ["agents"]`,
`presentToolDirectories: ["agents","codex","github"]`, 1 de 2 agentes → `integrationState:
'outdated'` por `hasUnconfiguredTarget` (`electron/ipc/pipeline-openspec.ts:266-282`). OpenSpec
1.13.2 escribe el dueño de la carpeta compartida en `.agents/skills/.openspec-target` (un valor, p.
ej. `codex`; `dist/core/shared-skill-target.js`, `readSharedSkillTarget`), y `openspec init --force`
sobre la copia dejó las cinco `.codex/` intactas: «Left 5 files in .codex/ that differ from the copy
in .agents/. Nothing was overwritten».

### 7. El motivo sale del estado, no del plan

`generateUpdatePlan` (`electron/pipeline/openspec-preview.ts:157-167`) deja de poner el texto fijo
de la POC en `reason`. El motivo de `blocked` se deriva del estado con un código tipado, ampliando
`deriveUpdateBlockReason` (`lib/openspec-update-guide.ts`) más allá de `cli-not-installed` y
`version-unknown`: `legacy-coexistence` (hay skills de origen `legacy-codex`/`legacy-agent`),
`customized` (integración `custom`), `evidence-unknown` (lectura incompleta) y `unclassified`. La
revisión (`OpenSpecUpdateReview.tsx`, `resolveBlockReasonText`) traduce el código; no muestra
`updatePlan.reason` ni el texto libre de `conflicts`, que está sólo en castellano.

Alternativa descartada: mostrar el texto de `conflicts` tal cual. Es texto interno, en un solo
idioma y con nombres de carpeta técnicos; el código tipado se traduce y se prueba.

### 8. Retirar copias viejas: el proceso principal decide qué se borra

Dos canales nuevos en `electron/ipc/pipeline-openspec.ts`, con el patrón de validación de los
existentes (`validateStrictPayloadKeys`, `validateRepo`):

- `pipeline:openspec:legacy-skills-plan` `{ repoPath }` → para cada copia vieja (skills de origen
  `legacy-codex`/`legacy-agent` según `inspectInstalledEvidence`), si se puede retirar y, si no,
  por qué: `untracked` (no seguida en Git) o `modified` (cambios sin confirmar). Sólo lectura.
- `pipeline:openspec:remove-legacy-skills` `{ repoPath }` → vuelve a calcular la lista en el proceso
  principal (no acepta rutas del renderer), borra sólo las retirables con `fs.rm` recursivo bajo
  `withRepoWatcherPaused` (en Windows un handle abierto impide borrar), no confirma nada y devuelve
  `{ removed, skipped: [{ path, reason }], engineStatus }` con el estado recalculado.

La revisión reemplaza la sección «Limpieza de configuración legacy (--force)» por «Copias viejas de
las instrucciones»: lista las retirables con un botón «Retirar copias viejas» (con confirmación que
enumera las carpetas) y las no retirables con su motivo. La revisión deja de pasar `force` al
recorrido; si el prop `force` del runner queda sin uso, se saca. `runUpdate` conserva su parámetro
(es la API del canal y sus pruebas).

Alternativa descartada: correr `openspec init --force`. Medido: no borra copias que difieren, y
reinicializar para limpiar mezcla dos operaciones.

### 9. La marca de la carpeta compartida configura la herramienta

`inspectInstalledEvidence` lee `.agents/skills/.openspec-target` (con la misma contención de rutas
que ya usa para el resto) y, si nombra una herramienta del registro, la agrega a `configuredTools`.
Dos consecuencias a cuidar:

- La regla de conflicto (`openspec-evidence.ts:420-426`) hoy usa `configuredTools.includes('codex')`
  como «hay legacy»: con la marca, Codex estaría siempre en `configuredTools` y el conflicto sería
  permanente. La regla pasa a mirar si hay skills de origen `legacy-codex`/`legacy-agent`.
- `.codex/` presente sólo con `config.toml` sigue en `presentToolDirectories`, pero ya no deja a
  Codex «sin configurar».
