## Why

Hoy GitCron sabe cerrar un cambio OpenSpec de una sola manera: archivarlo cuando está completo,
consolidando sus delta specs sobre `openspec/specs`. Ese circuito no sirve para un cambio que hay
que sacar de en medio **sin** haberse implementado: uno reemplazado por otro, duplicado, invalidado
por una premisa que cambió, o abandonado. La única salida hoy es borrar la carpeta a mano —perdiendo
el registro— o archivarla normalmente —consolidando specs que nunca debieron regir y confundiendo
un cambio que se hizo con uno que no se hizo. Falta un cierre que preserva el cambio en el histórico
como registro legible, declara por qué no se implementó y omite deliberadamente la consolidación.

## What Changes

- Se incorpora una segunda operación de cierre, **Retirar cambio**, que ejecuta `openspec archive
  <change-id> --yes --skip-specs` y crea antes un registro `retirement.md` dentro del directorio del
  cambio, que viaja con él al archivo histórico.
- El archivado normal queda intacto: sigue significando completar y consolidar delta specs, con el
  mismo comando de hoy (`openspec archive <id> --yes`).
- Retirar exige una decisión humana estructurada: un motivo categórico
  (`superseded`/`no-longer-needed`/`duplicate`/`invalidated`/`abandoned`), una explicación libre y
  obligatoria, y una declaración del estado real de implementación (`none`/`partial`/`unknown`). Con
  `superseded`, el cambio reemplazante es obligatorio y se valida.
- `retirement.md` es la **fuente canónica** del retiro (YAML frontmatter + markdown); las superficies
  que muestran el retiro —detalle, badge, motivo, reemplazo, fecha, implementación, «Specs no
  consolidadas»— se derivan de ese archivo y no duplican la explicación en `proposal.md`, `tasks.md`,
  SQLite ni i18n.
- Un cambio retirado se distingue para siempre de uno completado: no incrementa «Completados», lleva
  un badge propio y declara que sus delta specs no se aplicaron.
- Retirar se ejecuta desde el proceso principal con plan previo y confirmación, como el archivado;
  no toca Git (stage/commit/push/branch/PR/merge), y deja los archivos listos para el circuito
  existente de «Preparar commit» con un mensaje sugerido propio.
- Se modela el tipo de cierre explícitamente (`ChangeClosureKind = 'completed' | 'retired'`) en vez
  de un booleano `archived`, para no perder la diferencia de dominio. Los históricos sin
  `retirement.md` se interpretan como `completed` por compatibilidad.

## Capabilities

### New Capabilities

_No se introducen capabilities nuevas: el retiro es una operación del panel Pipeline y vive en la
capability ya existente._

### Modified Capabilities

- `pipeline-guided-workflow`: se agrega la operación de retiro como cierre distinto del archivado
  (requisitos nuevos sobre su habilitación, su decisión estructurada, su registro `retirement.md`, su
  ejecución desde el proceso principal, su plan, su presentación, su interacción con Git y su
  recuperación ante fallos), y se modifica el requisito del mensaje sugerido de commit para que
  distinga también el retiro del archivado y del trabajo en curso.

## Impact

- **Main / IPC:** un nuevo wrapper `retireOpenSpecChangeWithCli` en `electron/pipeline/openspec-cli.ts`
  con argumentos `['archive', changeId, '--yes', '--skip-specs']`, dos canales nuevos
  (`pipeline:retire-plan`, `pipeline:retire-change`) en `electron/ipc/` siguiendo el patrón de
  `pipeline-archive.ts`, y la escritura de `retirement.md` antes de archivar.
- **Renderer:** nueva acción `start-retire` en `pipeline-next-action.ts` y `OpenSpecDashboard.tsx`,
  con su propio modal de confirmación; lectura del discriminante de cierre para mostrar el badge.
- **Tipos compartidos:** `OpenSpecArchivedChangeEvidence` (`types/pipeline/index.ts`) suma el
  discriminante de cierre y los datos del retiro leídos de `retirement.md`.
- **Lector de evidencia:** `repo-evidence-reader.ts` lee `retirement.md` del archivado seleccionado.
- **Alcance de commit:** `lib/change-commit-scope.ts` distingue el commit de retiro en el mensaje
  sugerido.
- **i18n:** nuevo bloque `pipeline.openspec.retire.*` en ES, EN y ZH (`lib/i18n.ts`).
- **Tests:** unitarios (wrapper CLI, IPC, alcance, i18n), de integración (repo temporal con delta
  spec contradictoria que demuestra que la canónica queda intacta) y de UI (flujo de retiro, badge,
  fallos).
- **Sin dependencias nuevas** y **sin cambios en Git**: el archivado normal no sufre regresiones y
  ninguna operación de la feature hace stage/commit/push/merge ni borra ramas.

## Out of Scope

- Deprecar specs canónicas (`openspec/specs/`) por este circuito: eso sigue requiriendo un cambio
  nuevo con `MODIFIED`/`REMOVED Requirements` y archivado normal.
- Revertir implementación parcial, hacer `reset`/`checkout`/`clean` o borrar ramas: la feature no
  ejecuta escrituras de Git; sólo declara el estado conocido y deja la decisión a quien confirma.
- Inventar un comando `openspec cancel` o modificar OpenSpec upstream.
- Modificar la geometría de los grafos ni rediseñar Pipeline: el retiro se integra a la navegación
  existente como un badge y una acción secundaria.
- Emitir un evento semántico `change.retired` distinto de `change.archived`: el retiro es, en el
  filesystem, un archivado, así que el evento existente basta; si la distinción se necesita en el
  modelo de eventos, es otro cambio.
