// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PipelineDetails } from '../PipelineDetails';
import { PipelineArtifactGraph } from '../PipelineArtifactGraph';
import type { OpenSpecChangeStatus } from '@/types/pipeline';
import type { OpenSpecChangeSummary, PipelineSnapshot } from '../pipeline-view-state';

vi.mock('../PipelineRuntimeLauncher', () => ({
  PipelineRuntimeLauncher: ({
    initialInstruction,
    changeId,
  }: {
    initialInstruction?: string;
    changeId?: string;
  }) => (
    <div
      data-testid="pipeline-runtime-launcher"
      data-instruction={initialInstruction}
      data-change-id={changeId}
    >
      Launcher: {initialInstruction} ({changeId})
    </div>
  ),
}));


/**
 * El grafo de artefactos que `openspec status --json` devuelve se consume en
 * la pestaña Artefactos. La superficie declara el estado real del CLI para
 * cada artefacto; si el grafo no existe, no se dibuja ni se inventa nada.
 */

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

function snapshot(): PipelineSnapshot {
  return {
    schemaVersion: '1.0',
    repoId: 'repo-1',
    availableSources: ['git'],
    hermesConnected: false,
    hasPipelineActivity: true,
    now: {
      headlineKey: 'x', runtime: null, role: null, taskLabel: null,
      tasksDone: null, tasksTotal: null, elapsedMs: null,
      costUsd: null, costBasis: 'unknown', needsHuman: false,
    },
    stations: [],
    decisions: [],
    agents: [],
    activity: [],
    economy: { reasoningAvailable: null } as PipelineSnapshot['economy'],
    diffs: [],
    openSpec: {
      selectedChangeId: 'mirado',
      activeChanges: [],
      archivedChanges: [],
      specifications: [],
      reports: [],
      diagnostics: [],
      observedAt: null,
      latestGate: null,
    },
  } as PipelineSnapshot;
}

function change(status: OpenSpecChangeStatus | null): OpenSpecChangeSummary {
  return {
    changeId: 'mirado',
    intent: null,
    tasks: [],
    proposalExists: true,
    designExists: true,
    specsCount: 0,
    validation: 'unknown',
    artifacts: null,
    status,
  };
}

function renderDetails(selectedChange: OpenSpecChangeSummary | null) {
  render(<PipelineDetails snapshot={snapshot()} selectedChange={selectedChange} />);
}

afterEach(cleanup);

describe('grafo de artefactos de OpenSpec', () => {
  it('muestra cada artefacto con su estado real cuando el grafo está', () => {
    renderDetails(change({
      available: true,
      artifacts: [
        { id: 'proposal', state: 'done', missingDeps: [] },
        { id: 'design', state: 'ready', missingDeps: [] },
      ],
      applyRequires: ['tasks'],
      isComplete: false,
    }));
    expect(screen.getByText('pipeline.openspec.graph.artifact.proposal')).toBeTruthy();
    expect(screen.getByText('pipeline.openspec.graph.state.done')).toBeTruthy();
    expect(screen.getByText('pipeline.openspec.graph.artifact.design')).toBeTruthy();
    expect(screen.getByText('pipeline.openspec.graph.state.ready')).toBeTruthy();
  });

  it('un artefacto bloqueado declara las dependencias que le faltan', () => {
    renderDetails(change({
      available: true,
      artifacts: [
        { id: 'tasks', state: 'blocked', missingDeps: ['design'] },
      ],
      applyRequires: ['tasks'],
      isComplete: false,
    }));
    expect(screen.getByText('pipeline.openspec.graph.artifact.tasks')).toBeTruthy();
    expect(screen.getByText('pipeline.openspec.graph.state.blocked')).toBeTruthy();
    expect(screen.getByText(/pipeline\.openspec\.graph\.missingDeps/).textContent).toMatch(/design/);
  });

  it('renderiza artefactos con estado skipped y unknown sin romper', () => {
    renderDetails(change({
      available: true,
      artifacts: [
        { id: 'specs', state: 'skipped', missingDeps: [] },
        { id: 'custom', state: 'unknown', missingDeps: [], rawState: 'future-state' },
      ],
      applyRequires: ['tasks'],
      isComplete: false,
    }));
    expect(screen.getByText('pipeline.openspec.graph.artifact.specs')).toBeTruthy();
    expect(screen.getByText('pipeline.openspec.graph.state.skipped')).toBeTruthy();
    expect(screen.getByText('custom')).toBeTruthy();
    expect(screen.getByText('pipeline.openspec.graph.state.unknown')).toBeTruthy();
  });

  it('la ficha de cada artefacto presenta su rótulo traducido y NO el identificador crudo (7.12)', () => {
    const { container } = render(
      <PipelineArtifactGraph
        status={{
          available: true,
          artifacts: [
            { id: 'proposal', state: 'done', missingDeps: [] },
            { id: 'design', state: 'ready', missingDeps: [] },
            { id: 'specs', state: 'blocked', missingDeps: [] },
            { id: 'tasks', state: 'skipped', missingDeps: [] },
          ],
          applyRequires: [],
          isComplete: false,
        }}
      />
    );

    const ids = Array.from(container.querySelectorAll('.pipeline-artifact-graph__id')).map(
      (el) => el.textContent?.trim()
    );

    // Los 4 artefactos conocidos deben presentar su clave de traducción
    expect(ids).toEqual([
      'pipeline.openspec.graph.artifact.proposal',
      'pipeline.openspec.graph.artifact.design',
      'pipeline.openspec.graph.artifact.specs',
      'pipeline.openspec.graph.artifact.tasks',
    ]);

    // Ninguno debe contener el identificador en crudo
    expect(ids).not.toContain('proposal');
    expect(ids).not.toContain('design');
    expect(ids).not.toContain('specs');
    expect(ids).not.toContain('tasks');
  });

  it('sin grafo (status null) no renderiza la superficie ni inventa estado', () => {
    renderDetails(change(null));
    expect(screen.queryByText('pipeline.openspec.graph.state.done')).toBeNull();
    expect(screen.queryByText('pipeline.openspec.graph.state.ready')).toBeNull();
    expect(screen.queryByText('pipeline.openspec.graph.state.blocked')).toBeNull();
    expect(screen.queryByLabelText('pipeline.openspec.graph.label')).toBeNull();
  });

  it('con available false (CLI que no pudo correr) tampoco se renderiza', () => {
    renderDetails(change({ available: false, artifacts: [], applyRequires: [], isComplete: false }));
    expect(screen.queryByLabelText('pipeline.openspec.graph.label')).toBeNull();
  });

  it('sin cambio seleccionado no renderiza la superficie', () => {
    renderDetails(null);
    expect(screen.queryByLabelText('pipeline.openspec.graph.label')).toBeNull();
  });

  it('ordena los artefactos topológicamente según requires', () => {
    // Entran desordenados: tasks (depende de specs y design), design (depende de proposal), specs (depende de proposal), proposal (sin dependencias)
    const { container } = render(
      <PipelineArtifactGraph
        initialGraph={{
          ok: true,
          artifacts: [
            { id: 'tasks', status: 'ready', requires: ['specs', 'design'] },
            { id: 'design', status: 'ready', requires: ['proposal'] },
            { id: 'specs', status: 'ready', requires: ['proposal'] },
            { id: 'proposal', status: 'done', requires: [] },
          ],
        }}
      />,
    );

    const ids = Array.from(container.querySelectorAll('.pipeline-artifact-graph__id')).map(
      (el) => el.textContent?.trim(),
    );

    // proposal (nivel 0) -> design (nivel 1, orden original 1) -> specs (nivel 1, orden original 2) -> tasks (nivel 2)
    expect(ids).toEqual([
      'pipeline.openspec.graph.artifact.proposal',
      'pipeline.openspec.graph.artifact.design',
      'pipeline.openspec.graph.artifact.specs',
      'pipeline.openspec.graph.artifact.tasks',
    ]);
  });

  it('un artefacto bloqueado no ofrece acción y muestra qué lo bloquea', () => {
    render(
      <PipelineArtifactGraph
        initialGraph={{
          ok: true,
          artifacts: [
            {
              id: 'tasks',
              status: 'blocked',
              requires: ['specs'],
              dependencies: [{ id: 'specs', done: false, path: 'specs.md', description: 'Especificaciones' }],
            },
          ],
        }}
      />,
    );

    // Selecciona el nodo bloqueado primero
    fireEvent.click(screen.getByRole('tab', { name: /tasks/i }));

    // No ofrece botón de acción
    expect(screen.queryByText('pipeline.openspec.graph.generateWithAgent')).toBeNull();
    // Muestra qué lo bloquea
    expect(screen.getByText(/pipeline\.openspec\.graph\.missingDeps/).textContent).toContain('specs');
  });

  it('si el canal falla muestra el error y NINGÚN nodo de artefacto', () => {
    const { container } = render(
      <PipelineArtifactGraph
        initialGraph={{
          ok: false,
          error: 'Error de prueba del CLI',
        }}
      />,
    );

    // El error está a la vista con role="alert"
    const alert = screen.getByRole('alert');
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain('Error de prueba del CLI');

    // Ningún nodo renderizado
    expect(container.querySelectorAll('li').length).toBe(0);
    expect(screen.queryByText('pipeline.openspec.graph.artifact.proposal')).toBeNull();
  });

  it('un campo ausente (description o outputPath) no se muestra ni se rellena', () => {
    const { container } = render(
      <PipelineArtifactGraph
        initialGraph={{
          ok: true,
          artifacts: [
            {
              id: 'proposal',
              status: 'ready',
              requires: [],
              // Sin description ni outputPath
            },
          ],
        }}
      />,
    );

    // El nodo existe con su título y estado
    expect(screen.getByText('pipeline.openspec.graph.artifact.proposal')).toBeTruthy();
    expect(screen.getByText('pipeline.openspec.graph.state.ready')).toBeTruthy();

    // No hay párrafos de descripción ni ruta de salida
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(0);
  });

  it('muestra confirmación con existingOutputPaths antes de abrir el lanzador', () => {
    render(
      <PipelineArtifactGraph
        repoPath="C:/repo"
        changeId="cambio-test"
        initialGraph={{
          ok: true,
          artifacts: [
            {
              id: 'proposal',
              status: 'ready',
              requires: [],
              instruction: 'Instrucción original del motor para proposal',
              existingOutputPaths: ['openspec/changes/cambio-test/proposal.md'],
            },
          ],
        }}
      />,
    );

    // Selecciona el nodo primero
    fireEvent.click(screen.getByRole('tab', { name: /proposal/i }));

    // El lanzador NO está montado
    expect(screen.queryByTestId('pipeline-runtime-launcher')).toBeNull();

    // Clic en "Generar con el agente"
    const generateBtn = screen.getByText('pipeline.openspec.graph.generateWithAgent');
    fireEvent.click(generateBtn);

    // Se muestra el aviso de sobrescritura y las rutas existentes
    expect(screen.getByText('pipeline.openspec.graph.confirmOverwrite')).toBeTruthy();
    expect(screen.getByText('openspec/changes/cambio-test/proposal.md')).toBeTruthy();

    // El lanzador todavía no se abre
    expect(screen.queryByTestId('pipeline-runtime-launcher')).toBeNull();

    // Al confirmar, se abre el lanzador
    const confirmBtn = screen.getByText('pipeline.openspec.graph.confirmAndLaunch');
    fireEvent.click(confirmBtn);

    const launcher = screen.getByTestId('pipeline-runtime-launcher');
    expect(launcher).toBeTruthy();
    expect(launcher.getAttribute('data-instruction')).toBe('Instrucción original del motor para proposal');
    expect(launcher.getAttribute('data-change-id')).toBe('cambio-test');
  });

  it('un nodo habilitado sin existingOutputPaths abre directamente el lanzador con instruction del motor', () => {
    render(
      <PipelineArtifactGraph
        repoPath="C:/repo"
        changeId="cambio-test"
        initialGraph={{
          ok: true,
          artifacts: [
            {
              id: 'specs',
              status: 'ready',
              requires: [],
              instruction: 'Instrucción exacta generada por el CLI para specs',
              existingOutputPaths: [],
            },
          ],
        }}
      />,
    );

    // Selecciona el nodo primero
    fireEvent.click(screen.getByRole('tab', { name: /specs/i }));

    const generateBtn = screen.getByText('pipeline.openspec.graph.generateWithAgent');
    fireEvent.click(generateBtn);

    // Abre directamente el lanzador con instruction y changeId del motor
    const launcher = screen.getByTestId('pipeline-runtime-launcher');
    expect(launcher).toBeTruthy();
    expect(launcher.getAttribute('data-instruction')).toBe('Instrucción exacta generada por el CLI para specs');
    expect(launcher.getAttribute('data-change-id')).toBe('cambio-test');
  });

  it('renderiza exactamente una ficha debajo de la fila y conmuta al seleccionar otro nodo', () => {
    const { container } = render(
      <PipelineArtifactGraph
        initialGraph={{
          ok: true,
          artifacts: [
            { id: 'proposal', status: 'done', requires: [], description: 'Descripción de proposal' },
            { id: 'design', status: 'ready', requires: [], description: 'Descripción de design' },
          ],
        }}
      />,
    );

    expect(container.querySelectorAll('[class*="timelineCard"]').length).toBe(1);
    expect(screen.getByText('Descripción de proposal')).toBeTruthy();
    expect(screen.queryByText('Descripción de design')).toBeNull();

    fireEvent.click(screen.getByRole('tab', { name: /design/i }));

    expect(container.querySelectorAll('[class*="timelineCard"]').length).toBe(1);
    expect(screen.getByText('Descripción de design')).toBeTruthy();
    expect(screen.queryByText('Descripción de proposal')).toBeNull();
  });

  it('cuando isArchived es true, no consulta el IPC, no muestra error y presenta los artefactos como done', () => {
    const getArtifactGraphMock = vi.fn();
    (window as any).api = {
      pipelineOpenSpec: {
        getArtifactGraph: getArtifactGraphMock,
      },
    };

    const onSelectTab = vi.fn();
    render(
      <PipelineArtifactGraph
        repoPath="C:/repo"
        changeId="cambio-archivado"
        isArchived={true}
        activeTab="proposal"
        onSelectTab={onSelectTab}
      />,
    );

    expect(getArtifactGraphMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();

    const proposalTab = screen.getByRole('tab', { name: /proposal/i });
    expect(proposalTab).toBeTruthy();

    const doneStates = screen.getAllByText('pipeline.openspec.graph.state.done');
    expect(doneStates.length).toBe(4);

    fireEvent.click(screen.getByRole('tab', { name: /tasks/i }));
    expect(onSelectTab).toHaveBeenCalledWith('tasks');
  });
});
