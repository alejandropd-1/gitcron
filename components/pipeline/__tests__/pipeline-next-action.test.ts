import { describe, expect, it } from 'vitest';
import { translate } from '@/lib/i18n';
import type { RuntimeProjection } from '@/types/pipeline';
import type { DecisionRequest } from '../pipeline-domain';
import type { OpenSpecChangeSummary } from '../pipeline-view-state';
import {
  composeApplyInstruction,
  composeArchiveInstruction,
  composeExploreInstruction,
  composeProposeInstruction,
  derivePipelineNextAction,
  isValidChangeSlug,
  resolveTaskLabel,
  resolveTaskText,
  type PipelineNextActionInput,
} from '../pipeline-next-action';

/**
 * Forma real de la evidencia: `id` es el hash estable que produce
 * `parseMarkdownTasks`, y la numeración humana vive dentro del texto.
 */
function task(label: string, completed: boolean, text = `hacer ${label}`) {
  return {
    id: `hash-${label.replace('.', '-')}`,
    text: `${label} ${text}`,
    completed,
    line: 1,
    sourceRef: 'tasks.md',
  };
}

function change(overrides: Partial<OpenSpecChangeSummary> = {}): OpenSpecChangeSummary {
  return {
    changeId: 'demo-change',
    intent: 'intención',
    tasks: [task('1.1', true), task('1.2', false)],
    proposalExists: true,
    designExists: true,
    specsCount: 1,
    validation: 'unknown',
    artifacts: null,
    ...overrides,
  };
}

function projection(overrides: Partial<RuntimeProjection> = {}): RuntimeProjection {
  return {
    schemaVersion: '1.0',
    repoId: 'repo-1',
    sessionId: 'session-1',
    runtime: 'claude',
    changeId: 'demo-change',
    taskId: '1.2',
    role: 'builder',
    active: false,
    outcome: 'completed',
    startedAt: '2026-07-28T10:00:00.000Z',
    endedAt: '2026-07-28T10:05:00.000Z',
    agents: [],
    activity: [],
    reasoningVisibility: 'unknown',
    telemetry: null,
    controlCapabilities: [],
    droppedActivity: 0,
    diagnostics: [],
    ...overrides,
  } as RuntimeProjection;
}

function decision(overrides: Partial<DecisionRequest> = {}): DecisionRequest {
  return {
    decisionId: 'decision-1',
    kind: 'clarification',
    title: 'Hace falta una definición',
    why: null,
    options: [],
    risk: 'medium',
    riskProvenance: null,
    evidenceRefs: [],
    technicalContext: null,
    provenance: 'repo',
    evidenceStatus: 'observed',
    ...overrides,
  } as DecisionRequest;
}

function input(overrides: Partial<PipelineNextActionInput> = {}): PipelineNextActionInput {
  return {
    fixtureActive: false,
    selectedChange: null,
    selectedArchivedChangeId: null,
    decisions: [],
    projection: null,
    ...overrides,
  };
}

describe('derivePipelineNextAction · matriz de estados', () => {
  it('declara la vista previa y no ofrece ninguna acción', () => {
    const result = derivePipelineNextAction(input({ fixtureActive: true, selectedChange: change() }));
    expect(result.kind).toBe('fixture-preview');
    expect(result.primary).toBeNull();
    expect(result.secondary).toBeNull();
  });

  it('sin cambio activo distingue proponer de explorar', () => {
    const result = derivePipelineNextAction(input());
    expect(result.kind).toBe('no-active-change');
    expect(result.primary?.intent.kind).toBe('open-propose-flow');
    expect(result.secondary?.intent.kind).toBe('open-explore-flow');
  });

  it('un cambio archivado informa que ese trabajo terminó', () => {
    const result = derivePipelineNextAction(input({ selectedArchivedChangeId: 'viejo-change' }));
    expect(result.kind).toBe('change-archived');
    expect(result.primary?.intent.kind).toBe('open-propose-flow');
  });

  it('nombra la próxima tarea pendiente y compone su instrucción', () => {
    const result = derivePipelineNextAction(input({ selectedChange: change() }));
    expect(result.kind).toBe('task-pending');
    expect(result.titleParams).toMatchObject({ task: '1.2', completed: 1, total: 2 });
    expect(result.primary?.intent).toEqual({ kind: 'start-apply', changeId: 'demo-change', taskId: '1.2' });
    expect(result.instruction).toBe('/opsx:apply demo-change\n\nContinuar con 1.2: hacer 1.2');
  });

  it('con sesión activa dirige a la actividad y no ofrece arrancar otra', () => {
    const result = derivePipelineNextAction(input({
      selectedChange: change(),
      projection: projection({ active: true, outcome: 'running' }),
    }));
    expect(result.kind).toBe('session-running');
    expect(result.primary?.executable).toBe(false);
    expect(result.secondary).toBeNull();
  });

  it('ofrece pausar sólo cuando la sesión declara la capability', () => {
    const result = derivePipelineNextAction(input({
      selectedChange: change(),
      projection: projection({ active: true, outcome: 'running', controlCapabilities: ['pause-after-task'] }),
    }));
    expect(result.secondary?.intent.kind).toBe('pause-after-task');
  });

  it('una decisión pendiente lleva el foco a la decisión real', () => {
    const result = derivePipelineNextAction(input({ selectedChange: change(), decisions: [decision()] }));
    expect(result.kind).toBe('decision-pending');
    expect(result.primary?.intent).toEqual({ kind: 'focus-decision', decisionId: 'decision-1' });
    expect(result.secondary).toBeNull();
  });

  it('una sesión fallida ofrece reintentar la misma tarea', () => {
    const result = derivePipelineNextAction(input({
      selectedChange: change(),
      projection: projection({ outcome: 'failed' }),
    }));
    expect(result.kind).toBe('session-retry');
    expect(result.primary?.intent).toEqual({ kind: 'start-apply', changeId: 'demo-change', taskId: '1.2' });
    expect(result.instruction).toBe('/opsx:apply demo-change\n\nContinuar con 1.2: hacer 1.2');
  });

  it('una sesión interrumpida también ofrece reintentar', () => {
    const result = derivePipelineNextAction(input({
      selectedChange: change(),
      projection: projection({ outcome: 'interrupted' }),
    }));
    expect(result.kind).toBe('session-retry');
  });

  it('con tareas completas y validación desconocida pide comprobar el cambio', () => {
    const result = derivePipelineNextAction(input({
      selectedChange: change({ tasks: [task('1.1', true)], validation: 'unknown' }),
    }));
    expect(result.kind).toBe('validation-unknown');
    expect(result.primary?.intent.kind).toBe('refresh-validation');
  });

  it('con validación fallida dirige a corregir', () => {
    const result = derivePipelineNextAction(input({
      selectedChange: change({ tasks: [task('1.1', true)], validation: 'failed' }),
    }));
    expect(result.kind).toBe('validation-failed');
  });

  it('con validación aprobada ofrece archivar', () => {
    const result = derivePipelineNextAction(input({
      selectedChange: change({ tasks: [task('1.1', true)], validation: 'passed' }),
    }));
    expect(result.kind).toBe('ready-to-archive');
    expect(result.primary?.intent).toEqual({ kind: 'start-archive', changeId: 'demo-change' });
    expect(result.instruction).toBe('/opsx:archive demo-change');
  });

  it('distingue el archivo en curso de una tarea en curso', () => {
    const result = derivePipelineNextAction(input({
      selectedChange: change({ tasks: [task('1.1', true)], validation: 'passed' }),
      projection: projection({ active: true, outcome: 'running', taskId: null }),
    }));
    expect(result.kind).toBe('archiving');
    expect(result.secondary).toBeNull();
  });
});

describe('derivePipelineNextAction · prioridad entre estados superpuestos', () => {
  it('el fixture gana sobre cualquier otro estado', () => {
    const result = derivePipelineNextAction(input({
      fixtureActive: true,
      selectedChange: change(),
      decisions: [decision()],
      projection: projection({ active: true, outcome: 'running' }),
    }));
    expect(result.kind).toBe('fixture-preview');
  });

  it('la decisión gana sobre la sesión activa y la tarea pendiente', () => {
    const result = derivePipelineNextAction(input({
      selectedChange: change(),
      decisions: [decision()],
      projection: projection({ active: true, outcome: 'running' }),
    }));
    expect(result.kind).toBe('decision-pending');
  });

  it('la sesión activa gana sobre la tarea pendiente', () => {
    const result = derivePipelineNextAction(input({
      selectedChange: change(),
      projection: projection({ active: true, outcome: 'running' }),
    }));
    expect(result.kind).toBe('session-running');
  });

  it('el reintento gana sobre la tarea pendiente cuando la sesión cerró sin avanzar', () => {
    const result = derivePipelineNextAction(input({
      selectedChange: change(),
      projection: projection({ outcome: 'completed' }),
    }));
    expect(result.kind).toBe('session-retry');
  });
});

describe('derivePipelineNextAction · honestidad de la evidencia', () => {
  it('ninguna acción derivada de un fixture es ejecutable', () => {
    const scenarios: PipelineNextActionInput[] = [
      input({ fixtureActive: true, selectedChange: change() }),
      input({ fixtureActive: true, selectedChange: change({ tasks: [task('1.1', true)], validation: 'passed' }) }),
      input({ fixtureActive: true, selectedArchivedChangeId: 'viejo' }),
      input({ fixtureActive: true, decisions: [decision()] }),
      input({ fixtureActive: true, projection: projection({ active: true, outcome: 'running' }) }),
    ];
    for (const scenario of scenarios) {
      const result = derivePipelineNextAction(scenario);
      expect(result.primary?.executable ?? false).toBe(false);
      expect(result.secondary?.executable ?? false).toBe(false);
    }
  });

  it('la validación fallida nunca habilita archivar', () => {
    const result = derivePipelineNextAction(input({
      selectedChange: change({ tasks: [task('1.1', true)], validation: 'failed' }),
    }));
    expect(result.primary?.intent.kind).not.toBe('start-archive');
    expect(result.secondary?.intent.kind).not.toBe('start-archive');
  });

  it('un proceso terminado no marca la tarea como completada', () => {
    const result = derivePipelineNextAction(input({
      selectedChange: change(),
      projection: projection({ outcome: 'completed', taskId: '1.2' }),
    }));
    expect(result.kind).toBe('session-retry');
    expect(result.titleKey).toBe('pipeline.next.retry.stalledTitle');
  });

  it('cuando la tarea sí avanzó, pasa a la siguiente en vez de ofrecer reintento', () => {
    const result = derivePipelineNextAction(input({
      selectedChange: change({ tasks: [task('1.1', true), task('1.2', true), task('1.3', false)] }),
      projection: projection({ outcome: 'completed', taskId: '1.2' }),
    }));
    expect(result.kind).toBe('task-pending');
    expect(result.titleParams).toMatchObject({ task: '1.3' });
  });

  it('es determinística: las mismas entradas dan el mismo resultado', () => {
    const scenario = input({ selectedChange: change(), projection: projection({ active: true, outcome: 'running' }) });
    expect(derivePipelineNextAction(scenario)).toEqual(derivePipelineNextAction(scenario));
  });
});

describe('composición de instrucciones', () => {
  it('compone Apply con cambio, tarea y texto', () => {
    expect(composeApplyInstruction('c1', '2.1', 'hacer algo')).toBe('/opsx:apply c1\n\nContinuar con 2.1: hacer algo');
  });

  it('compone Archive', () => {
    expect(composeArchiveInstruction('c1')).toBe('/opsx:archive c1');
  });

  it('compone Propose con restricciones', () => {
    expect(composeProposeInstruction('mi-cambio', 'lograr X', 'sin tocar Y'))
      .toBe('/opsx:propose mi-cambio\n\nObjetivo: lograr X\nAlcance y restricciones: sin tocar Y');
  });

  it('omite la línea de alcance cuando no hay restricciones', () => {
    expect(composeProposeInstruction('mi-cambio', 'lograr X')).toBe('/opsx:propose mi-cambio\n\nObjetivo: lograr X');
    expect(composeProposeInstruction('mi-cambio', 'lograr X', '   ')).toBe('/opsx:propose mi-cambio\n\nObjetivo: lograr X');
  });

  it('compone Explore', () => {
    expect(composeExploreInstruction('  una idea  ')).toBe('/opsx:explore\n\nQuiero explorar: una idea');
  });
});

describe('interpolación de textos', () => {
  // Se escapó a producción una frase que mostraba "{{completed}} of {{total}}"
  // porque la ayuda se renderizaba sin sus parámetros. Esta prueba recorre la
  // matriz y verifica que ningún texto quede con marcadores sin resolver.
  const scenarios: Array<[string, PipelineNextActionInput]> = [
    ['fixture', input({ fixtureActive: true, selectedChange: change() })],
    ['sin cambio activo', input()],
    ['archivado', input({ selectedArchivedChangeId: 'viejo' })],
    ['tarea pendiente', input({ selectedChange: change() })],
    ['sesión activa', input({ selectedChange: change(), projection: projection({ active: true, outcome: 'running' }) })],
    ['decisión', input({ selectedChange: change(), decisions: [decision()] })],
    ['reintento', input({ selectedChange: change(), projection: projection({ outcome: 'failed' }) })],
    ['validación desconocida', input({ selectedChange: change({ tasks: [task('1.1', true)], validation: 'unknown' }) })],
    ['validación fallida', input({ selectedChange: change({ tasks: [task('1.1', true)], validation: 'failed' }) })],
    ['listo para archivar', input({ selectedChange: change({ tasks: [task('1.1', true)], validation: 'passed' }) })],
  ];

  for (const [name, scenario] of scenarios) {
    it(`resuelve todos los marcadores en "${name}"`, () => {
      const action = derivePipelineNextAction(scenario);
      const rendered = [
        translate(action.titleKey, 'es', action.titleParams),
        translate(action.helpKey, 'es', action.helpParams),
        action.primary ? translate(action.primary.labelKey, 'es', action.primary.labelParams) : '',
        action.secondary ? translate(action.secondary.labelKey, 'es', action.secondary.labelParams) : '',
      ];
      for (const text of rendered) expect(text).not.toMatch(/\{\{|\}\}/);
    });
  }
});

describe('resolveTaskLabel / resolveTaskText', () => {
  // `parseMarkdownTasks` siempre asigna un hash como `id`; el "2.1" queda en el
  // texto. Mostrar el hash era exactamente lo que se veía roto en pantalla.
  it('toma la numeración del texto, no el hash', () => {
    const item = { id: 'a1b2c3d4e5f6', text: '2.1 Add CSS variables' };
    expect(resolveTaskLabel(item)).toBe('2.1');
    expect(resolveTaskText(item)).toBe('Add CSS variables');
  });

  it('admite numeración de un solo nivel y de tres', () => {
    expect(resolveTaskLabel({ id: 'h', text: '3 Preparar' })).toBe('3');
    expect(resolveTaskLabel({ id: 'h', text: '1.2.3 Preparar' })).toBe('1.2.3');
  });

  it('admite el punto o el paréntesis tras el número', () => {
    expect(resolveTaskLabel({ id: 'h', text: '4. Cerrar' })).toBe('4');
    expect(resolveTaskText({ id: 'h', text: '4) Cerrar' })).toBe('Cerrar');
  });

  it('cae al hash cuando la tarea no trae numeración', () => {
    const item = { id: 'a1b2c3d4e5f6', text: 'Sin numerar' };
    expect(resolveTaskLabel(item)).toBe('a1b2c3d4e5f6');
    expect(resolveTaskText(item)).toBe('Sin numerar');
  });

  it('no confunde una versión dentro del texto con la numeración', () => {
    expect(resolveTaskLabel({ id: 'h', text: 'Actualizar a 2.1 el paquete' })).toBe('h');
  });
});

describe('isValidChangeSlug', () => {
  it('acepta los nombres que acepta el CLI', () => {
    for (const value of ['ok9-name', 'guide-openspec-next-actions', 'a', 'a1']) {
      expect(isValidChangeSlug(value)).toBe(true);
    }
  });

  it('rechaza los mismos nombres que rechaza el CLI', () => {
    for (const value of ['Bad_Name', 'has spaces', 'UPPER', 'trailing-', 'a--b', '9start', 'acento-ñ', '']) {
      expect(isValidChangeSlug(value)).toBe(false);
    }
  });
});
