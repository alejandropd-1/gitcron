// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { OpenSpecDashboard } from '../OpenSpecDashboard';
import { usePipelineStore } from '@/lib/pipeline-store';
import type { PipelineSnapshot } from '../pipeline-view-state';

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

afterEach(cleanup);

beforeEach(() => {
  usePipelineStore.setState({
    selectedChangeId: null,
    openSpecificationId: null,
    prepareOpen: false,
  });
});

function mockChange(changeId: string) {
  return {
    changeId,
    intent: `Intención completa del cambio ${changeId}`,
    tasks: [
      {
        id: 't-1',
        text: '1.1 Tarea con un texto descriptivo muy largo que no debe ser cortado por elipsis bajo ninguna circunstancia',
        completed: false,
        line: 10,
        sourceRef: 'tasks.md:10',
      },
      {
        id: 't-2',
        text: '1.2 Segunda tarea ya completada para verificar estado del cambio',
        completed: true,
        line: 20,
        sourceRef: 'tasks.md:20',
      },
    ],
    proposalExists: true,
    designExists: true,
    specsCount: 1,
    validation: 'unknown' as const,
    artifacts: {
      proposal: '# Propuesta\n\nTexto de propuesta.',
      specs: [{ name: 'spec-1', content: '# Spec 1' }],
      design: '# Diseño\n\nTexto de diseño.',
      tasks: '- [ ] 1.1 Tarea\n- [x] 1.2 Tarea',
    },
  };
}

function mockSnapshot(overrides: {
  diffs?: PipelineSnapshot['diffs'];
  activity?: PipelineSnapshot['activity'];
} = {}): PipelineSnapshot {
  return {
    schemaVersion: '1.0',
    repoId: 'repo-test',
    availableSources: ['git'],
    hermesConnected: false,
    hasPipelineActivity: true,
    now: {
      headlineKey: 'x',
      runtime: null,
      role: null,
      taskLabel: null,
      tasksDone: null,
      tasksTotal: null,
      elapsedMs: null,
      costUsd: null,
      costBasis: 'unknown',
      needsHuman: false,
    },
    stations: [],
    decisions: [],
    agents: [],
    activity: overrides.activity ?? [],
    economy: { reasoningAvailable: null } as PipelineSnapshot['economy'],
    diffs: overrides.diffs ?? [],
    openSpec: {
      selectedChangeId: 'cambio-activo',
      activeChanges: [mockChange('cambio-activo')],
      archivedChanges: [],
      specifications: [],
      reports: [],
      diagnostics: [],
      observedAt: null,
      latestGate: null,
    },
  } as unknown as PipelineSnapshot;
}

function renderActiveChange(props: {
  diffs?: PipelineSnapshot['diffs'];
  projection?: any;
  currentBranch?: string;
} = {}) {
  const rendered = render(
    <OpenSpecDashboard
      snapshot={mockSnapshot({ diffs: props.diffs })}
      repoPath="C:/repo"
      currentBranch={props.currentBranch ?? 'main'}
      workingTreeClean={true}
      leftOpen={false}
      rightOpen={false}
      leftWidth={320}
      rightWidth={320}
      onResizeLeft={() => undefined}
      onResizeRight={() => undefined}
      projection={props.projection ?? null}
      runtimeHistory={[]}
      onRefresh={() => undefined}
      onPauseAfterTask={() => undefined}
      onRespondDecision={() => undefined}
    />,
  );

  const enterBtns = screen.queryAllByRole('button', { name: /openspec\.start\.enter/ });
  if (enterBtns.length > 0) {
    fireEvent.click(enterBtns[0]);
  }
  return rendered;
}

describe('Intercambiador de vistas en la pantalla del cambio activo', () => {
  it('elegir una entrada del panel intercambia la vista del cuerpo entre tareas y artefactos', () => {
    renderActiveChange();

    // 1. Por defecto en el cuerpo se monta la vista soberana de tareas
    expect(screen.getByRole('region', { name: 'pipeline.switcher.tasks' })).toBeTruthy();
    expect(screen.getByRole('list')).toBeTruthy();

    // 2. El rail ofrece la vista alternativa de artefactos
    const artifactsBtn = screen.getByRole('button', { name: 'pipeline.switcher.artifacts' });
    expect(artifactsBtn).toBeTruthy();

    // 3. Al hacer clic en artefactos, el cuerpo pasa a mostrar artefactos y evidencia
    fireEvent.click(artifactsBtn);
    expect(screen.getByRole('region', { name: 'pipeline.switcher.artifacts' })).toBeTruthy();
    expect(screen.getByRole('tablist', { name: 'pipeline.details.title' })).toBeTruthy();

    // 4. El rail ahora ofrece tareas para poder volver
    const tasksBtn = screen.getByRole('button', { name: /pipeline\.switcher\.tasks/ });
    expect(tasksBtn).toBeTruthy();

    // 5. Al hacer clic en tareas, el cuerpo vuelve a mostrar las tareas
    fireEvent.click(tasksBtn);
    expect(screen.getByRole('region', { name: 'pipeline.switcher.tasks' })).toBeTruthy();
    expect(screen.getByRole('list')).toBeTruthy();
  });

  it('sin diffs la entrada de diffs no existe en el panel y con diffs permite verlos', () => {
    // Caso 1: Sin diffs, no existe la entrada en el rail
    const { unmount } = renderActiveChange({ diffs: [] });
    expect(screen.queryByRole('button', { name: /pipeline\.switcher\.diffs/ })).toBeNull();
    unmount();

    // Caso 2: Con diffs, la entrada existe y conmuta a la vista de diffs
    renderActiveChange({
      diffs: [
        {
          filePath: 'src/archivo.ts',
          diffContent: '@@ -1 +1 @@\n-old\n+new',
          agentId: null,
          taskId: null,
        },
      ],
    });
    const diffsBtn = screen.getByRole('button', { name: /pipeline\.switcher\.diffs/ });
    expect(diffsBtn).toBeTruthy();

    fireEvent.click(diffsBtn);
    expect(screen.getByRole('region', { name: 'pipeline.switcher.diffs' })).toBeTruthy();
  });

  it('sin sesión la entrada de actividad no existe en el panel y con sesión permite verla', () => {
    // Caso 1: Sin sesión ni actividad, no existe la entrada en el rail
    const { unmount } = renderActiveChange({ projection: null });
    expect(screen.queryByRole('button', { name: /pipeline\.switcher\.activity/ })).toBeNull();
    unmount();

    // Caso 2: Con sesión para este cambio, la entrada existe y conmuta a actividad
    renderActiveChange({
      projection: {
        sessionId: 'session-1',
        changeId: 'cambio-activo',
        startedAt: '2026-09-05T10:00:00Z',
        runtime: 'hermes',
        role: 'agent',
        taskId: 't-1',
        status: 'running',
        activity: [
          {
            id: 'act-1',
            timestamp: '2026-09-05T10:00:00Z',
            channel: 'narrative',
            text: 'Iniciando tarea 1.1',
          },
        ],
      },
    });
    const activityBtn = screen.getByRole('button', { name: /pipeline\.switcher\.activity/ });
    expect(activityBtn).toBeTruthy();

    fireEvent.click(activityBtn);
    expect(screen.getByRole('region', { name: 'pipeline.switcher.activity' })).toBeTruthy();
  });

  it('los textos de las tareas no se cortan con elipsis ni nowrap en los estilos', () => {
    renderActiveChange();

    // La tarea con texto largo se renderiza en el DOM completamente (número en strong, texto en span)
    const taskLabel = screen.getByText('1.1');
    expect(taskLabel).toBeTruthy();
    const longTaskText = screen.getByText(/Tarea con un texto descriptivo muy largo que no debe ser cortado/);
    expect(longTaskText).toBeTruthy();

    // Verificación estricta en el CSS: no existe nowrap ni text-overflow: ellipsis en .taskList > li > strong
    const cssPath = path.resolve(process.cwd(), 'components/pipeline/OpenSpecDashboard.module.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    const strongRuleMatch = cssContent.match(/\.taskList\s*>\s*li\s*>\s*strong\s*\{([^}]+)\}/);
    expect(strongRuleMatch).not.toBeNull();
    const strongRuleBody = strongRuleMatch![1];
    expect(strongRuleBody).not.toMatch(/text-overflow:\s*ellipsis/);
    expect(strongRuleBody).not.toMatch(/white-space:\s*nowrap/);
  });

  it('una tarea sin sesión no dibuja ficha de detalle ni frase de disculpa', () => {
    renderActiveChange({ projection: null });

    // No se dibuja ningún dl ni fichas de información no reportada
    expect(screen.queryByText(/pipeline\.openspec\.task\.agent/i)).toBeNull();
    expect(screen.queryByText(/pipeline\.openspec\.task\.source/i)).toBeNull();
    expect(screen.queryByText(/pipeline\.openspec\.task\.workingTree/i)).toBeNull();

    // Enmienda fechada 2026-09-04: Tampoco se dibuja frase de disculpa
    expect(screen.queryByText(/pipeline\.openspec\.task\.noSession/i)).toBeNull();
  });

  it('la cabecera desinflada no contiene botón de glosario ni botones fijos de archivar o ver diff', () => {
    renderActiveChange({
      diffs: [
        {
          filePath: 'src/archivo.ts',
          diffContent: '@@ -1 +1 @@\n-old\n+new',
          agentId: null,
          taskId: null,
        },
      ],
    });

    const header = screen.getByRole('banner');
    expect(header).toBeTruthy();

    // No hay botón de glosario
    expect(screen.queryByRole('button', { name: /glosario/i })).toBeNull();
    expect(screen.queryByText(/pipeline\.details\.glossary/i)).toBeNull();

    // No hay botones fijos de archivar o ver diff dentro de la cabecera
    const headerButtons = header.querySelectorAll('button');
    const headerButtonTexts = Array.from(headerButtons).map((btn) => btn.textContent || '');
    expect(headerButtonTexts.some((txt) => /pipeline\.openspec\.archive/i.test(txt))).toBe(false);
    expect(headerButtonTexts.some((txt) => /pipeline\.openspec\.actions\.diff/i.test(txt))).toBe(false);

    // Archivar vive en la ranura de entorno del panel (environmentSlot)
    const rail = screen.getByRole('navigation', { name: 'pipeline.switcher.views' });
    const archiveBtnInRail = rail.querySelector('button[title*="pipeline.openspec.archive"]');
    expect(archiveBtnInRail).not.toBeNull();
  });

  it('la vista de artefactos reserva el contenedor para la línea de tiempo con data-slot="artifact-timeline"', () => {
    const { container } = renderActiveChange();

    // Cambiar a vista de artefactos
    fireEvent.click(screen.getByRole('button', { name: 'pipeline.switcher.artifacts' }));

    // El contenedor reservado para la línea de tiempo existe con su identificador de ranura
    const timelineSlot = container.querySelector('div[data-slot="artifact-timeline"]');
    expect(timelineSlot).not.toBeNull();
    expect(timelineSlot?.getAttribute('aria-label')).toBe('pipeline.openspec.artifacts.timelineSlot');
  });
});
