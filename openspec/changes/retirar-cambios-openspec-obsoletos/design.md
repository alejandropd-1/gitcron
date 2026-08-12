## Context

GitCron cierra hoy los cambios OpenSpec de una sola manera: `openspec archive <id> --yes` desde el
proceso principal, que valida el cambio, mueve su carpeta a `openspec/changes/archive/<fecha>-<id>/`
y consolida sus delta specs sobre `openspec/specs/`. Ese circuito está implementado por
`archiveOpenSpecChangeWithCli` (`electron/pipeline/openspec-cli.ts:102`), dos canales IPC
(`pipeline:archive-plan` / `pipeline:archive-change` en `electron/ipc/pipeline-archive.ts`), el
preload (`electron/preload.ts:312`) y la UI (`OpenSpecDashboard.tsx`, con `start-archive` en
`pipeline-next-action.ts:36`). Tras ejecutar, el main emite `repo:fs-change` y la evidencia se relee
del disco; un cambio «está archivado» si y sólo si existe su carpeta bajo `archive/`, y el contador
de completados es literalmente `archivedChanges.length`.

OpenSpec 1.5.0 ofrece un flag `--skip-specs` en `archive` («Skip spec update operations»), verificado
con `openspec archive --help`. Eso permite mover un cambio al histórico **sin** consolidar sus specs,
que es justo lo que necesita un cambio obsoleto. Lo que no existe en OpenSpec —ni en este
repositorio— es un registro del motivo por el que un cambio se retiró, ni una forma de distinguir un
retiro de un archivado normal: hoy ambos dejan la misma carpeta bajo `archive/` y son indistinguibles.

## Goals / Non-Goals

**Goals:**
- Un segundo cierre, **Retirar cambio**, que ejecuta `openspec archive <id> --yes --skip-specs` y
  escribe antes un `retirement.md` canónico dentro del cambio.
- Que la decisión humana quede estructurada y registrada (motivo, explicación, estado de
  implementación, reemplazo).
- Que un retirado se distinga para siempre de un completado, sin romper la navegación actual ni el
  archivado normal.
- Que el circuito sea seguro: plan previo, comando exacto, verificación del filesystem, motivo libre
  fuera del shell, sin Git.

**Non-Goals:**
- Deprecar specs canónicas por esta vía (sigue requiriendo un cambio con `MODIFIED`/`REMOVED`).
- Revertir implementación parcial, borrar ramas, hacer commit/push/merge.
- Inventar `openspec cancel` o cambiar OpenSpec upstream.
- Rediseñar Pipeline ni su geometría.
- Sumar un evento semántico `change.retired` distinto de `change.archived`.

## Decisions

### D1. Reutilizar el patrón del archivado, paralelo y desacoplado
Retirar se modela como una operación **paralela** al archivado, no como un flag del archivado
existente: un nuevo wrapper `retireOpenSpecChangeWithCli` con argumentos
`['archive', changeId, '--yes', '--skip-specs']`, dos canales nuevos (`pipeline:retire-plan` /
`pipeline:retire-change`) con el mismo DI y las mismas validaciones (`validRepoPath`,
`validChangeId` con `CHANGE_ID_PATTERN`), una nueva acción `start-retire` en la unión
`PipelineActionIntent`, y un modal de confirmación propio.

**Alternativa considerada:** un único canal `pipeline:archive-change` con un parámetro
`{ skipSpecs: boolean }`. Descartada porque funde dos cierres de dominio distinto en un mismo canal y
en un mismo botón, y el prompt es explícito en que no deben compartir confirmación ni nombre. La
separación además preserva literalmente el archivado normal, que es un criterio de aceptación.

### D2. Lista histórica única con badges, no una sección «Retirados» aparte
El histórico sigue siendo una sola lista —el panel «Completados» actual y la lista de archivados de
la pantalla de entrada— y cada item lleva un badge `Completado` o `Retirado`. No se abre una sección
«Retirados recientes».

**Alternativa considerada:** una sección aparte para retirados. Descartada porque duplica superficie
de navegación y rompe el único punto de entrada que hoy tiene el histórico; además contradice la regla
del panel de no multiplicar superficies por feature. Un badge distingue sin mover nada, que es lo que
el pide la elección que «altere menos la navegación actual».

### D3. `retirement.md` como fuente canónica, dentro del directorio del cambio
El registro se escribe en `openspec/changes/<slug>/retirement.md` **antes** de invocar al CLI, con un
bloque YAML frontmatter (`schemaVersion: "1.0"`, `closureKind: retired`, `disposition`, `retiredAt`,
`replacementChange`, `specSync: skipped`, `implementationState`, `completedTasks`, `totalTasks`,
`sourceBranch`, `sourceHead`, `confirmedBy: human`) seguido de Markdown. Al ejecutarse
`openspec archive`, el CLI mueve la carpeta entera y `retirement.md` viaja con ella sin pasos extra.
Todas las superficies leen de ese archivo.

**Alternativa considerada:** guardar el motivo en SQLite (como las decisiones del Temporal Agent) o en
un manifiesto aparte bajo `archive/`. Descartadas ambas: SQLite no viaja con el repositorio (se pierde
al clonar, igual que ya pasa con la marca `disk` de los timestamps), y un manifiesto aparte requeriría
un paso de escritura extra fuera del movimiento del CLI. Dentro del directorio del cambio, el archivo
es autosuficiente como registro y se mueve solo.

### D4. Discriminante de cierre en el tipo, no un booleano `archived`
`OpenSpecArchivedChangeEvidence` (`types/pipeline/index.ts:118`) suma un campo
`closure: 'completed' | 'retired'` y, para los retirados, los datos leídos del frontmatter de
`retirement.md` (disposición, reemplazo, estado de implementación, fecha). Los históricos sin
`retirement.md` se interpretan como `closure: 'completed'` por compatibilidad.

**Alternativa considerada:** un booleano `archived`/`retired`. Descartada explícitamente por el
prompt: pierde la diferencia de dominio y no escala si aparece un tercer kind de cierre.

### D5. Retirar exige `openspec validate --strict` aprobado, como el archivado
El experimento en un repositorio OpenSpec 1.5.0 temporal demostró que `openspec archive <id> --yes
--skip-specs` **sigue validando** y falla si el cambio no valida («Validation errors in change delta
specs… To skip validation, use --no-validate flag»); `--skip-specs` sólo omite la consolidación, no la
validación. Por eso «estructura OpenSpec válida» se interpreta como *el cambio pasa* `validate
--strict`, y retirar comparte con archivar la condición de habilitación `validation === 'passed'`.
 Las tareas pendientes **no** bloquean (igual que en el archivado).

**Alternativa considerada:** emitir `--no-validate` además de `--skip-specs` para poder retirar
cambios rotos. **Es la pregunta abierta D5/Q1** (ver Open Questions): este diseño la deja fuera por
defecto, porque preservar un cambio cuya especificación no valida lo deja como registro ilegible y
porque el comando del prompt es `--skip-specs` solo. Si se decide aceptar cambios que no validan, el
cambio alcanza con añadir `--no-validate` y aflojar la habilitación; el resto del diseño no varía.

### D6. Orden de escritura y verificación del filesystem
La ejecución, en orden: resolver ruta canónica → validar slug y campos IPC → releer el estado y
comprobar que el plan sigue vigente → escribir `retirement.md` → ejecutar el CLI → releer evidencia →
verificar las cuatro condiciones (dejó activos, apareció en `archive/`, `retirement.md` viajó, specs
canónicas intactas). El éxito se declara por las cuatro condiciones, no por el código de salida del
CLI. Si el CLI falla, `retirement.md` ya quedó en el directorio activo: el reintento lo detecta y lo
reutiliza (idempotencia de registro).

### D7. Plan que no muta y se invalida por estado
El plan (`pipeline:retire-plan`) sólo describe y no escribe. La confirmación transporta un resumen
criptográfico (hash) del estado relevante —carpeta del cambio, `tasks.md`, delta specs, conteo de
tareas— y la ejecución lo recomputa; si difiere, el plan se rechaza y se pide regenerarlo. Es el
mismo principio que preserva «lo mostrado y lo ejecutado no pueden divergir».

### D8. El motivo libre nunca llega al shell
La explicación libre se escribe sólo en `retirement.md` vía escritura de archivo validada (mismo
camino que `task-checkbox-editing`). Los únicos argumentos variables del CLI son el `change-id`,
validado con `CHANGE_ID_PATTERN` antes de llegar al proceso; los flags son literales. Windows sigue
usando `shell: true` con seguridad, como hoy, porque los argumentos son literales o validados.

### D9. Mensaje de commit propio
`lib/change-commit-scope.ts:suggestCommitMessage` antepone hoy `archived ` para archivados; se suma
`retired ` para retirados, y cuando hubo reemplazo se nombra (p. ej.
`chore(openspec): retirar <id> reemplazado por <replacement>`). Retirar no hace commit: deja los
archivos en el circuito existente de «Preparar commit».

## Risks / Trade-offs

- **`--skip-specs` podría cambiar de semántica en una versión futura de OpenSpec** → mitigación: un
  test de integración con una delta spec deliberadamente contradictoria que verifica que la canónica
  queda byte-igual, y este `design.md` nombra la versión (1.5.0) para que se reevalúe si OpenSpec sube.
- **`retirement.md` es una convención nueva, sin respaldo upstream** → mitigación: `schemaVersion:
  "1.0"` en el frontmatter, parseo tolerante (campos ausentes → `unknown`), e interpretación de los
  históricos sin el archivo como `completed`. Si OpenSpec upstream define un registro de retiro, se
  migra leyendo ese `schemaVersion`.
- **Carrera entre plan y ejecución** (edición de `tasks.md` o de la delta spec en el medio) →
  mitigación D7: invalidación por hash del estado.
- **`retirement.md` queda huérfano si el CLI falla** → mitigación D6: el reinterto lo detecta y
  continúa; si la persona cancela, el archivo queda como borrador legible del intento y se puede
  inspeccionar o borrar a mano.
- **Windows `shell: true`** → ya mitigado por el patrón existente (CVE-2024-27980 + argumentos
  literales/validados). No se introduce superficie nueva.

## Migration Plan

No hay migración de datos: los cambios históricos actuales no tienen `retirement.md` y se leen como
`closure: 'completed'` por compatibilidad, que es exactamente lo que ya significan. La feature es
aditiva: el archivado normal no cambia de comando ni de semántica, y el retiro es una acción
secundaria nueva. El rollback es desinstalar la feature; el filesystem queda en un estado válido con
o sin ella (un cambio retirado es, para OpenSpec, un cambio archivado).

## Open Questions

- **Q1 — ¿Retirar debe aceptar cambios que no validan?** El comando del prompt (`--skip-specs` solo)
  exige validación aprobada (verificado). Este diseño la exige, alineado con archivar. Si Ale quiere
  poder retirar cambios rotos/abandonados cuya estructura no valida, basta añadir `--no-validate` y
  aflojar la habilitación; es una decisión pendiente de aprobación explícita, no tomada en este diseño.
- **Q2 — ¿Sumar un evento semántico `change.retired`?** Para el modelo de eventos
  (`SemanticEventKind`) el retiro es, en el filesystem, un archivado, así que `change.archived` basta.
  Si la distinción se necesita en replay/estadísticas, es otro cambio; queda fuera de éste.
