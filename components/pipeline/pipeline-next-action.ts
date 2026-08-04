import type { RuntimeProjection } from '@/types/pipeline';
import type { DecisionRequest } from './pipeline-domain';
import type { OpenSpecChangeSummary } from './pipeline-view-state';

/**
 * Derivación del "siguiente paso" del workspace OpenSpec.
 *
 * Vive fuera del componente a propósito: la pregunta "¿qué corresponde hacer
 * ahora?" tiene once respuestas posibles que se superponen entre sí, y resolverla
 * con condicionales encadenados en JSX vuelve imposible probar cada fila por
 * separado. Acá es una función pura: mismas entradas, misma respuesta.
 *
 * La regla de honestidad de F04 sigue mandando. Esta función no infiere que algo
 * pasó porque un proceso terminó; sólo mira evidencia observada (tareas leídas de
 * `tasks.md`, validación, proyección de la sesión).
 */

/** Orden del ciclo de vida OpenSpec, usado para el contador "paso N de 5". */
const LIFECYCLE_TOTAL = 5;

/**
 * Contrato de nombre de change verificado contra `openspec new change`:
 * debe empezar con letra, admite sólo minúsculas, dígitos y guiones, y rechaza
 * guiones consecutivos o finales. Se fija una sola vez para que la validación y
 * el mensaje de error no puedan divergir.
 */
export const CHANGE_SLUG_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export function isValidChangeSlug(value: string): boolean {
  return CHANGE_SLUG_PATTERN.test(value);
}

/**
 * Qué hace una acción al confirmarse.
 *
 * `executable` en el botón se deriva de esto: sólo los intents que abren un
 * proceso de runtime lo llevan en `true`.
 */
export type PipelineActionIntent =
  | { kind: 'open-propose-flow' }
  | { kind: 'open-explore-flow' }
  | { kind: 'start-apply'; changeId: string; taskId: string }
  | { kind: 'start-archive'; changeId: string }
  | { kind: 'focus-decision'; decisionId: string }
  | { kind: 'view-activity' }
  | { kind: 'view-evidence' }
  | { kind: 'view-diff' }
  | { kind: 'refresh-validation' }
  | { kind: 'pause-after-task' };

/** Los únicos intents que pueden iniciar un proceso real. */
const EXECUTABLE_INTENTS: ReadonlySet<PipelineActionIntent['kind']> = new Set([
  'start-apply',
  'start-archive',
]);

export type PipelineNextActionButton = {
  intent: PipelineActionIntent;
  labelKey: string;
  labelParams?: Record<string, string | number>;
  /**
   * `true` cuando confirmar la acción abre un runtime. El render no vuelve a
   * decidirlo: si esto es `false`, no hay camino a `pipelineRuntime.start`.
   */
  executable: boolean;
};

export type PipelineNextActionKind =
  | 'fixture-preview'
  | 'decision-pending'
  | 'session-running'
  | 'archiving'
  | 'session-retry'
  | 'change-archived'
  | 'no-active-change'
  | 'task-pending'
  | 'validation-unknown'
  | 'validation-failed'
  | 'ready-to-archive';

export type PipelineNextAction = {
  kind: PipelineNextActionKind;
  /** Posición en el ciclo de vida, o `null` cuando el estado no pertenece a él. */
  step: { index: number; total: number } | null;
  titleKey: string;
  titleParams?: Record<string, string | number>;
  /** Una sola frase. El tope es estructural, no estilístico. */
  helpKey: string;
  /** Parámetros de la frase de ayuda. Sin esto los `{{...}}` llegan crudos a pantalla. */
  helpParams?: Record<string, string | number>;
  primary: PipelineNextActionButton | null;
  /** Sólo cuando existe una alternativa real; nunca relleno. */
  secondary: PipelineNextActionButton | null;
  /** Instrucción exacta bajo divulgación progresiva. `null` si no hay ninguna. */
  instruction: string | null;
};

export type PipelineNextActionInput = {
  /** Hay datos de vista previa en pantalla. Bloquea todo lo ejecutable. */
  fixtureActive: boolean;
  selectedChange: OpenSpecChangeSummary | null;
  selectedArchivedChangeId: string | null;
  decisions: DecisionRequest[];
  projection: RuntimeProjection | null;
};

function button(
  intent: PipelineActionIntent,
  labelKey: string,
  labelParams?: Record<string, string | number>,
): PipelineNextActionButton {
  return {
    intent,
    labelKey,
    ...(labelParams ? { labelParams } : {}),
    executable: EXECUTABLE_INTENTS.has(intent.kind),
  };
}

/**
 * Numeración humana de una tarea, tomada del propio texto de `tasks.md`.
 *
 * `TaskEvidence.id` es un hash estable derivado de archivo, línea y contenido:
 * sirve para identificar la tarea aunque se renumere, pero no es lo que la
 * persona escribió ni lo que un agente entiende. El "2.1" vive dentro del texto,
 * así que se extrae de ahí y el hash queda para uso interno.
 */
const TASK_LABEL_PATTERN = /^(\d+(?:\.\d+)*)[.)]?\s+(.*)$/;

export function resolveTaskLabel(task: { id: string; text: string }): string {
  return TASK_LABEL_PATTERN.exec(task.text)?.[1] ?? task.id;
}

/** El texto sin su numeración, para no repetirla al lado de la etiqueta. */
export function resolveTaskText(task: { id: string; text: string }): string {
  return TASK_LABEL_PATTERN.exec(task.text)?.[2] ?? task.text;
}

/**
 * Instrucción de implementación, autosuficiente.
 *
 * Antes empezaba con `/opsx:apply`, un comando de extensión que sólo existe si
 * el runtime lo tiene instalado. En este repositorio viven en
 * `.agent/workflows/` y `.opencode/commands/`, pero `.claude/commands/` no
 * existe: con Claude la sesión terminaba sin hacer nada. Es el mismo defecto que
 * ya se corrigió en `composeArchiveInstruction`, que quedó a medias.
 *
 * Esos comandos son guiones en markdown que indican correr el CLI. Nombrar esos
 * comandos acá hace lo mismo sin depender de que el guion esté instalado.
 */
export function composeApplyInstruction(changeId: string, taskId: string, taskText: string): string {
  return [
    `Implementá la tarea ${taskId} del change «${changeId}» en este repositorio.`,
    '',
    'Antes de escribir, consultá el estado y las instrucciones del artefacto:',
    `  openspec status --change "${changeId}" --json`,
    `  openspec instructions tasks --change "${changeId}" --json`,
    '',
    `Tarea ${taskId}: ${taskText}`,
    '',
    'Marcá la casilla en tasks.md sólo después de haberla completado.',
  ].join('\n');
}

/**
 * Comando real de archivado.
 *
 * Antes devolvía `/opsx:archive <id>`, un slash command que Claude Code no
 * tiene —los lee de `.claude/commands/`, y ahí no existe `opsx`—. La sesión
 * cerraba en milisegundos con `"Unknown command"` e `is_error: false`, así que
 * la app declaraba éxito sin haber archivado nada.
 *
 * Ahora archiva el proceso principal invocando el CLI, y esto es literalmente
 * lo que se ejecuta: lo mostrado y lo ejecutado no pueden divergir.
 */
export function composeArchiveInstruction(changeId: string): string {
  return `openspec archive ${changeId} --yes`;
}

/**
 * Instrucción de propuesta, autosuficiente por el mismo motivo que la de
 * implementación.
 *
 * La línea de alcance se omite entera cuando no hay texto: emitirla vacía le
 * pediría al agente que respete una restricción que nadie escribió.
 */
export function composeProposeInstruction(slug: string, objective: string, constraints?: string): string {
  const scope = constraints?.trim();
  const lines = [
    `Creá el change «${slug}» en este repositorio y generá sus artefactos de planificación.`,
    '',
    `  openspec new change "${slug}"`,
    `  openspec status --change "${slug}" --json`,
    '',
    'Para cada artefacto que quede en estado `ready`, pedí sus instrucciones antes de escribirlo:',
    `  openspec instructions <artefacto> --change "${slug}" --json`,
    '',
    `Objetivo: ${objective.trim()}`,
  ];
  if (scope) lines.push(`Alcance y restricciones: ${scope}`);
  return lines.join('\n');
}

/**
 * Instrucción de exploración.
 *
 * No crea nada a propósito: explorar es pensar en voz alta antes de comprometer
 * estructura, y arrancar creando un change convertiría la duda en una decisión.
 */
export function composeExploreInstruction(description: string): string {
  return [
    'Explorá esta idea en el repositorio sin crear ningún change ni artefacto todavía.',
    '',
    `Quiero explorar: ${description.trim()}`,
    '',
    'Mirá cómo está resuelto hoy, proponé el camino más limpio y decime qué alcance tendría.',
    'Si la idea se sostiene, el change se crea después, como paso aparte.',
  ].join('\n');
}

function taskCounts(change: OpenSpecChangeSummary): { completed: number; total: number } {
  return {
    completed: change.tasks.filter((task) => task.completed).length,
    total: change.tasks.length,
  };
}

/** Disponibilidad del archivado, con su motivo y lo que queda pendiente. */
export type ArchiveAvailability = {
  available: boolean;
  /** Por qué no se puede archivar. `null` cuando sí se puede. */
  reasonKey: string | null;
  /** Tareas sin tildar. Se muestra para que archivar no sea una decisión a ciegas. */
  pendingTasks: number;
};

/**
 * Si archivar está permitido, y qué queda pendiente si lo está.
 *
 * Responde una pregunta distinta a la de `derivePipelineNextAction`. Esa dice
 * qué *conviene* hacer ahora; ésta dice qué está *permitido* hacer. Mezclarlas
 * obligaba a elegir entre mentir —anunciar el archivo como siguiente paso con
 * tareas pendientes— y bloquear, que es lo que pasaba.
 *
 * La validación aprobada es la única condición. Las tareas pendientes NO lo
 * son, y no por comodidad: la convención de `tasks.md` cierra cada change con
 * una tarea de handoff humano que ningún runtime tilda, así que exigir cero
 * pendientes volvía el archivo inalcanzable en todos los changes, siempre. Una
 * sesión persistida tampoco bloquea: es historia, no un permiso.
 *
 * Lo que sí se conserva es que sin validación aprobada no se archiva, y que el
 * pendiente se declara en vez de esconderse.
 */
export function deriveArchiveAvailability(
  change: OpenSpecChangeSummary | null,
  archived: boolean,
): ArchiveAvailability {
  if (!change || archived) return { available: false, reasonKey: null, pendingTasks: 0 };
  const counts = taskCounts(change);
  const pendingTasks = counts.total - counts.completed;
  if (change.validation !== 'passed') {
    return {
      available: false,
      reasonKey: change.validation === 'failed'
        ? 'pipeline.openspec.archive.blockedFailed'
        : 'pipeline.openspec.archive.blockedUnknown',
      pendingTasks,
    };
  }
  return { available: true, reasonKey: null, pendingTasks };
}

/**
 * Deriva el único siguiente paso a mostrar.
 *
 * El orden de evaluación ES la prioridad, y no es arbitrario:
 *
 * 1. El fixture va primero porque es una restricción de seguridad, no un estado
 *    de trabajo: cualquier otra rama podría devolver una acción ejecutable.
 * 2. La decisión pendiente va antes que la sesión activa porque bloquea el avance.
 * 3. Recién después se miran sesión, tareas, validación y archivo.
 */
export function derivePipelineNextAction(input: PipelineNextActionInput): PipelineNextAction {
  const { fixtureActive, selectedChange, selectedArchivedChangeId, decisions, projection } = input;

  // 1 · Vista previa: se declara como tal y no ofrece ninguna acción.
  if (fixtureActive) {
    return {
      kind: 'fixture-preview',
      step: null,
      titleKey: 'pipeline.next.fixture.title',
      helpKey: 'pipeline.next.fixture.help',
      primary: null,
      secondary: null,
      instruction: null,
    };
  }

  // 2 · Una decisión humana pendiente detiene todo lo demás.
  const pendingDecision = decisions[0] ?? null;
  if (pendingDecision) {
    return {
      kind: 'decision-pending',
      step: null,
      titleKey: 'pipeline.next.decision.title',
      helpKey: 'pipeline.next.decision.help',
      primary: button({ kind: 'focus-decision', decisionId: pendingDecision.decisionId }, 'pipeline.next.decision.action'),
      secondary: null,
      instruction: null,
    };
  }

  // 3 · Sesión viva. Archivar y trabajar una tarea se ven distintos aunque
  //     ambos sean "hay un proceso corriendo".
  if (projection?.active === true) {
    const archiving = projection.taskId === null && selectedChange?.validation === 'passed';
    const canPause = projection.controlCapabilities.includes('pause-after-task');
    return {
      kind: archiving ? 'archiving' : 'session-running',
      step: archiving ? { index: 5, total: LIFECYCLE_TOTAL } : { index: 3, total: LIFECYCLE_TOTAL },
      titleKey: archiving ? 'pipeline.next.archiving.title' : 'pipeline.next.running.title',
      ...(archiving || !projection.taskId ? {} : { titleParams: { task: projection.taskId } }),
      helpKey: archiving ? 'pipeline.next.archiving.help' : 'pipeline.next.running.help',
      primary: button({ kind: 'view-activity' }, 'pipeline.next.running.action'),
      // La pausa sólo aparece si la sesión declara soportarla de verdad.
      secondary: !archiving && canPause
        ? button({ kind: 'pause-after-task' }, 'pipeline.next.running.pause')
        : null,
      instruction: null,
    };
  }

  // 4 · Sesión cerrada que no movió la evidencia.
  //
  //     Cubre fallo, interrupción y también el cierre "exitoso" cuya tarea sigue
  //     pendiente en `tasks.md`. Ese último caso es el que evita declarar éxito
  //     porque el proceso terminó.
  if (projection && selectedChange && projection.changeId === selectedChange.changeId) {
    // Se compara contra la etiqueta humana porque es lo que se envió como
    // `taskId` al iniciar la sesión. Compararlo contra el hash no coincidiría
    // nunca y el reintento jamás se ofrecería.
    const targetTask = projection.taskId
      ? selectedChange.tasks.find((task) => resolveTaskLabel(task) === projection.taskId) ?? null
      : null;
    const failed = projection.outcome === 'failed' || projection.outcome === 'interrupted';
    const stalled = targetTask !== null && !targetTask.completed;
    if (targetTask && (failed || stalled)) {
      return {
        kind: 'session-retry',
        step: { index: 3, total: LIFECYCLE_TOTAL },
        titleKey: failed ? 'pipeline.next.retry.title' : 'pipeline.next.retry.stalledTitle',
        titleParams: { task: resolveTaskLabel(targetTask) },
        helpKey: failed ? 'pipeline.next.retry.help' : 'pipeline.next.retry.stalledHelp',
        primary: button(
          { kind: 'start-apply', changeId: selectedChange.changeId, taskId: resolveTaskLabel(targetTask) },
          'pipeline.next.retry.action',
          { task: resolveTaskLabel(targetTask) },
        ),
        secondary: button({ kind: 'view-activity' }, 'pipeline.next.retry.activity'),
        instruction: composeApplyInstruction(
          selectedChange.changeId,
          resolveTaskLabel(targetTask),
          resolveTaskText(targetTask),
        ),
      };
    }
  }

  // 5 · Cambio archivado seleccionado: ese trabajo terminó.
  if (!selectedChange && selectedArchivedChangeId) {
    return {
      kind: 'change-archived',
      step: null,
      titleKey: 'pipeline.next.archived.title',
      helpKey: 'pipeline.next.archived.help',
      primary: button({ kind: 'open-propose-flow' }, 'pipeline.next.archived.action'),
      secondary: button({ kind: 'open-explore-flow' }, 'pipeline.next.noActive.explore'),
      instruction: null,
    };
  }

  // 6 · Sin cambio activo: los dos caminos se distinguen explícitamente.
  if (!selectedChange) {
    return {
      kind: 'no-active-change',
      step: { index: 1, total: LIFECYCLE_TOTAL },
      titleKey: 'pipeline.next.noActive.title',
      helpKey: 'pipeline.next.noActive.help',
      primary: button({ kind: 'open-propose-flow' }, 'pipeline.next.noActive.propose'),
      secondary: button({ kind: 'open-explore-flow' }, 'pipeline.next.noActive.explore'),
      instruction: null,
    };
  }

  // 7 · Tarea pendiente.
  const nextTask = selectedChange.tasks.find((task) => !task.completed) ?? null;
  if (nextTask) {
    const counts = taskCounts(selectedChange);
    return {
      kind: 'task-pending',
      step: { index: 3, total: LIFECYCLE_TOTAL },
      titleKey: 'pipeline.next.task.title',
      titleParams: { task: resolveTaskLabel(nextTask), completed: counts.completed, total: counts.total },
      helpKey: 'pipeline.next.task.help',
      helpParams: { completed: counts.completed, total: counts.total },
      primary: button(
        { kind: 'start-apply', changeId: selectedChange.changeId, taskId: resolveTaskLabel(nextTask) },
        'pipeline.next.task.action',
        { task: resolveTaskLabel(nextTask) },
      ),
      secondary: null,
      instruction: composeApplyInstruction(
        selectedChange.changeId,
        resolveTaskLabel(nextTask),
        resolveTaskText(nextTask),
      ),
    };
  }

  // 8 · Tareas completas: manda el estado de validación.
  if (selectedChange.validation === 'failed') {
    return {
      kind: 'validation-failed',
      step: { index: 4, total: LIFECYCLE_TOTAL },
      titleKey: 'pipeline.next.validationFailed.title',
      helpKey: 'pipeline.next.validationFailed.help',
      primary: button({ kind: 'view-evidence' }, 'pipeline.next.validationFailed.action'),
      secondary: null,
      instruction: null,
    };
  }

  if (selectedChange.validation === 'unknown') {
    return {
      kind: 'validation-unknown',
      step: { index: 4, total: LIFECYCLE_TOTAL },
      titleKey: 'pipeline.next.validationUnknown.title',
      helpKey: 'pipeline.next.validationUnknown.help',
      primary: button({ kind: 'refresh-validation' }, 'pipeline.next.validationUnknown.action'),
      secondary: button({ kind: 'view-evidence' }, 'pipeline.next.validationUnknown.evidence'),
      instruction: null,
    };
  }

  // 9 · Validación aprobada y nada pendiente: recién acá aparece archivar.
  return {
    kind: 'ready-to-archive',
    step: { index: 5, total: LIFECYCLE_TOTAL },
    titleKey: 'pipeline.next.readyToArchive.title',
    helpKey: 'pipeline.next.readyToArchive.help',
    primary: button({ kind: 'start-archive', changeId: selectedChange.changeId }, 'pipeline.next.readyToArchive.action'),
    secondary: button({ kind: 'view-diff' }, 'pipeline.next.readyToArchive.diff'),
    instruction: composeArchiveInstruction(selectedChange.changeId),
  };
}
