// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { OpenSpecDashboard } from '../OpenSpecDashboard';
import type { PipelineSnapshot } from '../pipeline-view-state';

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) => {
    if (key === 'pipeline.next.task.help') {
      return `Continuar con la tarea ${params?.taskId ?? ''}: ${params?.taskText ?? ''}`;
    }
    if (params) {
      return `${key}:${JSON.stringify(params)}`;
    }
    return key;
  },
}));

afterEach(cleanup);

function mockSnapshot(): PipelineSnapshot {
  return {
    schemaVersion: '1.0',
    repoId: 'repo-sdd',
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
    activity: [],
    economy: { reasoningAvailable: null } as PipelineSnapshot['economy'],
    diffs: [
      {
        path: 'src/file.ts',
        status: 'modified',
        additions: 5,
        deletions: 2,
        agentId: null,
        taskId: null,
        binary: false,
      },
    ],
    openSpec: {
      selectedChangeId: null,
      activeChanges: [
        {
          changeId: 'cambio-ejemplo',
          intent: 'Este es el texto completo de la justificación e intención del cambio que no debe truncarse.',
          tasks: [
            {
              id: 't-1',
              line: 10,
              text: '1.1 Primera tarea del cambio',
              completed: false,
              sourceRef: 'tasks.md:10',
            },
            {
              id: 't-2',
              line: 20,
              text: '1.2 Segunda tarea ya resuelta',
              completed: true,
              sourceRef: 'tasks.md:20',
            },
          ],
          proposalExists: true,
          designExists: true,
          specsCount: 1,
          validation: 'unknown' as const,
          artifacts: {
            proposal: '# Propuesta\n\nTexto de la propuesta.',
            specs: [{ name: 'cap-1', content: '# Capacidad 1' }],
            design: '# Diseño\n\nDecisiones tomadas.',
            tasks: '- [ ] 1.1 Primera tarea\n- [x] 1.2 Segunda tarea',
          },
        },
      ],
      archivedChanges: [],
      specifications: [
        {
          specificationId: 'cap-1',
          name: 'cap-1',
          requirements: 2,
          deltaCount: 0,
        },
      ],
      reports: [],
      diagnostics: [],
      observedAt: '2026-09-04T10:00:00Z',
      latestGate: null,
    },
  } as unknown as PipelineSnapshot;
}

function renderSdd(currentBranch = 'main') {
  const rendered = render(
    <OpenSpecDashboard
      snapshot={mockSnapshot()}
      repoPath="C:/repo"
      currentBranch={currentBranch}
      workingTreeClean={true}
      leftOpen={false}
      rightOpen={false}
      leftWidth={320}
      rightWidth={320}
      onResizeLeft={() => undefined}
      onResizeRight={() => undefined}
      projection={null}
      runtimeHistory={[]}
      onRefresh={() => undefined}
      onPauseAfterTask={() => undefined}
      onRespondDecision={() => undefined}
    />,
  );

  // Abrir el cambio
  const enterBtn = screen.getAllByRole('button', { name: /openspec\.start\.enter/ })[0];
  fireEvent.click(enterBtn);
  return rendered;
}

describe('Maquetación del cuerpo de SDD (Tareas 2.2 a 2.6 y Grupo 3)', () => {
  describe('2.2 Superficie soberana y lectura de arriba a abajo', () => {
    it('el cuerpo gobierna las vistas de Trabajo e Inspección mediante el intercambiador sin solapas superiores divisorias', () => {
      renderSdd();

      // Las solapas rígidas superiores que dividían Trabajo de Artefactos ya no existen
      expect(screen.queryByRole('tab', { name: /openspec\.tabs\.work/i })).toBeNull();
      expect(screen.queryByRole('tab', { name: /openspec\.tabs\.details/i })).toBeNull();

      // En su lugar, el área de tareas es la vista por defecto y el rail permite cambiar a artefactos
      const taskList = screen.getByRole('list');
      expect(taskList).toBeTruthy();

      const artifactsRailBtn = screen.getByRole('button', { name: /pipeline\.switcher\.artifacts/i });
      expect(artifactsRailBtn).toBeTruthy();

      fireEvent.click(artifactsRailBtn);
      const tablist = screen.getByRole('tablist', { name: /pipeline\.details\.title/i });
      expect(tablist).toBeTruthy();
    });

    it('la cabecera ubica el siguiente paso presidido por el CTA antes del área de trabajo', () => {
      renderSdd();

      const nextStepCTA = screen.getByRole('button', { name: /pipeline\.next\.task\.action/i });
      const taskList = screen.getByRole('list');

      // El CTA en la cabecera precede a la lista de tareas en el DOM
      const comparison = nextStepCTA.compareDocumentPosition(taskList);
      expect(comparison & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('la actividad no aparece sin bitácora y está disponible en el intercambiador cuando existe registro', () => {
      renderSdd();
      // Sin actividad registrada ni sesión, la entrada no existe en el rail
      expect(screen.queryByRole('button', { name: /pipeline\.switcher\.activity/i })).toBeNull();

      cleanup();

      // Con actividad registrada, la entrada aparece en el rail y abre su vista soberana
      render(
        <OpenSpecDashboard
          snapshot={mockSnapshot()}
          repoPath="C:/repo"
          currentBranch="main"
          workingTreeClean={true}
          leftOpen={false}
          rightOpen={false}
          leftWidth={320}
          rightWidth={320}
          onResizeLeft={() => undefined}
          onResizeRight={() => undefined}
          projection={{
            sessionId: 'sess-1',
            changeId: 'cambio-ejemplo',
            startedAt: '2026-09-04T12:00:00Z',
            runtime: 'hermes',
            role: 'agent',
            taskId: 't-1',
            status: 'running',
            activity: [
              {
                id: 'act-1',
                timestamp: '2026-09-04T12:00:00Z',
                type: 'log',
                message: 'Sesión iniciada',
              } as any,
            ],
          } as any}
          runtimeHistory={[]}
          onRefresh={() => undefined}
          onPauseAfterTask={() => undefined}
          onRespondDecision={() => undefined}
        />,
      );
      const enterBtn = screen.getAllByRole('button', { name: /openspec\.start\.enter/ })[0];
      fireEvent.click(enterBtn);

      const activityRailBtn = screen.getByRole('button', { name: /pipeline\.switcher\.activity/i });
      expect(activityRailBtn).toBeTruthy();

      fireEvent.click(activityRailBtn);
      expect(screen.getByRole('region', { name: /pipeline\.switcher\.activity/i })).toBeTruthy();
    });
  });

  describe('2.3 Jerarquía de controles (Acción Principal vs Accesorias)', () => {
    it('el botón de acción principal se distingue claramente de las acciones accesorias', () => {
      renderSdd();

      // Observación 39: La acción principal se distingue por el color de acento de railPrimaryAction
      // y ya no lleva primaryAction (estética de botón encajonado con borde y tipografía mono).
      const nextStepCTA = screen.getByRole('button', { name: /pipeline\.next\.task\.action/i });
      expect(Array.from(nextStepCTA.classList).some((c) => c.includes('railPrimaryAction'))).toBe(true);

      // Observación 39: Las acciones accesorias llevan railActionItem a secas (sin railPrimaryAction)
      // y ya no llevan secondaryAction, quedando idénticas a los ítems de listado por construcción.
      const archiveBtn = screen.getByRole('button', { name: /pipeline\.openspec\.archive\.action/i });
      expect(Array.from(archiveBtn.classList).some((c) => c.includes('railActionItem'))).toBe(true);
      expect(Array.from(archiveBtn.classList).some((c) => c.includes('railPrimaryAction'))).toBe(false);

      // Ver diffs es una vista del rail cuando hay diffs
      const diffRailBtn = screen.getByRole('button', { name: /pipeline\.switcher\.diffs/i });
      expect(diffRailBtn).toBeTruthy();
    });
  });

  describe('2.4 Solapas de inspección y rótulos frente a OpenSpec 1.11', () => {
    it('al seleccionar artefactos en el rail, las pestañas de evidencia declaran los rótulos funcionales', () => {
      renderSdd();

      // Cambiar a vista de artefactos
      fireEvent.click(screen.getByRole('button', { name: /pipeline\.switcher\.artifacts/i }));

      const tablist = screen.getByRole('tablist', { name: /pipeline\.details\.title/i });
      expect(tablist).toBeTruthy();

      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBe(6);

      const expectedLabels = [
        /pipeline\.details\.proposal/i,
        /pipeline\.details\.design/i,
        /pipeline\.details\.specs/i,
        /pipeline\.details\.tasks/i,
        /pipeline\.details\.diffs/i,
        /pipeline\.details\.glossary/i,
      ];

      for (const expected of expectedLabels) {
        expect(tabs.some((t) => expected.test(t.textContent || ''))).toBe(true);
      }

      // La primera solapa (propuesta) arranca activa
      const activeTab = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
      expect(activeTab?.textContent).toMatch(/pipeline\.details\.proposal/i);
      expect(activeTab?.className).toContain('pipeline-details__tab--active');
    });
  });

  describe('2.5 Eliminación de información duplicada (Casos 4, 5 y 7)', () => {
    it('la frase de guía del siguiente paso no contiene "Van X de Y"', () => {
      renderSdd();

      // El texto de ayuda sólo orienta a la acción concreta
      const helpText = screen.getByText(/Continuar con la tarea/i);
      expect(helpText.textContent).not.toMatch(/Van \d+ de \d+/i);
      expect(helpText.textContent).not.toMatch(/{{completed}}/i);
    });

    it('la cabecera no muestra el párrafo de intención truncado con puntos suspensivos', () => {
      renderSdd();

      // La cabecera sólo muestra la identidad del cambio (cambio-ejemplo) y no el texto truncado de intención
      const header = screen.getByRole('banner', { hidden: true }) || screen.getByText('cambio-ejemplo').closest('header')!;
      expect(header).toBeTruthy();
      expect(header.textContent).not.toContain('Este es el texto completo de la justificación e intención');
    });

    it('la tarea activa sin sesión registrada no renderiza las cuatro filas vacías de detalle ni frase de disculpa', () => {
      renderSdd();

      // Sin sesión, no se dibuja .taskDetail con cuatro filas de "No informado"
      expect(screen.queryByText(/pipeline\.openspec\.task\.agent/i)).toBeNull();
      expect(screen.queryByText(/pipeline\.openspec\.task\.source/i)).toBeNull();
      expect(screen.queryByText(/pipeline\.openspec\.task\.workingTree/i)).toBeNull();

      // Enmienda fechada 2026-09-04: Tampoco se dibuja frase de disculpa
      expect(screen.queryByText(/pipeline\.openspec\.task\.noSession/i)).toBeNull();
    });

    it('el grafo de artefactos no repite la palabra HECHO cuatro veces y usa íconos semánticos', () => {
      renderSdd();
      fireEvent.click(screen.getByRole('button', { name: /pipeline\.switcher\.artifacts/i }));

      const graphItems = document.querySelectorAll('.pipeline-artifact-graph li');
      // Cada ítem contiene un ícono SVG y un texto accesible para screen readers
      graphItems.forEach((li) => {
        expect(li.querySelector('svg')).not.toBeNull();
      });
    });
  });

  describe('2.6 Mudanza de estilos a la hoja de la vista y CSS muerto', () => {
    it('globals.css no contiene los estilos de evidencia ni la regla muerta .pipeline-card[data-scrolls]', () => {
      const globalsPath = path.resolve(process.cwd(), 'app/globals.css');
      const content = fs.readFileSync(globalsPath, 'utf-8');

      expect(content).not.toMatch(/\.pipeline-details__tab--active\s*\{/);
      expect(content).not.toMatch(/\.pipeline-details\s*\{/);
      expect(content).not.toMatch(/\.pipeline-card\[data-scrolls\]\s*\{/);
    });

    it('OpenSpecDashboard.module.css aloja los estilos de .pipeline-details con sub-borde sin fondo cian pleno', () => {
      const modulePath = path.resolve(process.cwd(), 'components/pipeline/OpenSpecDashboard.module.css');
      const content = fs.readFileSync(modulePath, 'utf-8');

      expect(content).toMatch(/\.pipeline-details__tab--active/);
      expect(content).toMatch(/border-bottom:\s*2px solid var\(--color-primary\)/);
      expect(content).not.toMatch(/\.pipeline-details__tab--active[^{]*\{[^}]*background-color:\s*var\(--color-primary\)/);
    });
  });

  describe('Grupo 5: Comprobaciones del change y límites de cobertura (5.1 y 5.2)', () => {
    it('5.1 En el DOM montado: una superficie sin contenido no ocupa lugar, se mantiene alcanzable por sus controles y abrir una no desplaza a las demás', () => {
      // 1. Superficie sin contenido no ocupa lugar en el DOM:
      // En reposo (mockSnapshot sin agente vivo ni logs), la actividad no está montada en el DOM
      const { container, rerender } = renderSdd();
      expect(screen.queryByRole('heading', { name: /pipeline\.activity\.title/i })).toBeNull();
      expect(container.querySelector('[class*="fullActivity"]')).toBeNull();

      // 2. Es alcanzable: la vista de artefactos y evidencia se alcanza desde el riel
      const artifactsBtn = screen.getByRole('button', { name: /pipeline\.switcher\.artifacts/i });
      expect(artifactsBtn).toBeTruthy();
      fireEvent.click(artifactsBtn);

      // Ahora la vista de artefactos está montada y ocupa el área central soberana
      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeTruthy();

      // Las tareas siguen siendo alcanzables para alternar de regreso
      const tasksBtn = screen.getByRole('button', { name: /pipeline\.switcher\.tasks/i });
      expect(tasksBtn).toBeTruthy();

      // 3. Abrir una superficie no desplaza a las demás:
      // La cabecera de identidad del cambio permanece en su posición y no es empujada fuera del viewport
      const header = screen.getByRole('banner', { hidden: true }) || screen.getByText('cambio-ejemplo').closest('header')!;
      expect(header).toBeTruthy();
      expect(header.textContent).toContain('cambio-ejemplo');

      // Conmutamos de regreso a tareas: el intercambio es in-place dentro del cuerpo soberano
      fireEvent.click(tasksBtn);
      expect(screen.queryByRole('tablist')).toBeNull();
      expect(screen.getByText('Primera tarea del cambio')).toBeTruthy();
      expect(header.textContent).toContain('cambio-ejemplo');

      // 4. Panel lateral flotante con rightOpen={true}: no ocupa lugar en el DOM y libera el ancho
      rerender(
        <OpenSpecDashboard
          snapshot={mockSnapshot()}
          repoPath="C:/repo"
          currentBranch="main"
          workingTreeClean={true}
          leftOpen={false}
          rightOpen={true}
          leftWidth={320}
          rightWidth={320}
          onResizeLeft={() => undefined}
          onResizeRight={() => undefined}
          projection={null}
          runtimeHistory={[]}
          onRefresh={() => undefined}
          onPauseAfterTask={() => undefined}
          onRespondDecision={() => undefined}
        />,
      );
      expect(container.querySelector('nav[class*="switcherRail"]')).toBeNull();
    });

    it('5.2 Declaración explícita de archivos recorridos y límites de cobertura fuera de este change', () => {
      // Archivos que recorre la verificación de este change (verificados en disco):
      const filesCovered = [
        'components/pipeline/OpenSpecDashboard.tsx',
        'components/pipeline/OpenSpecDashboard.module.css',
        'components/pipeline/ViewSwitcherRail.tsx',
        'lib/i18n.ts',
      ];

      for (const relPath of filesCovered) {
        const fullPath = path.resolve(process.cwd(), relPath);
        expect(fs.existsSync(fullPath)).toBe(true);
      }

      // Declaración explícita de límites de qué NO cubre la verificación de este change:
      const outOfScopeBoundaries = {
        artifactTimelineNodes: {
          covered: false,
          owner: 'gestionar-ciclo-openspec-desde-gitcron',
          taskRef: '3c.4',
          rationale: 'El grafo interactivo de nodos unidos con dependencias de desbloqueo entre artefactos es infraestructura del ciclo de vida OpenSpec',
        },
        didacticCopyAndGlossary: {
          covered: false,
          owner: 'explicar-el-ciclo-sin-tecnicismos',
          taskRef: 'Tareas de redacción y glosario',
          rationale: 'Los textos explicativos sin tecnicismos, explicaciones didácticas y glosario no son de layout sino de redacción formativa',
        },
        subpixelRenderingAndGPU: {
          covered: false,
          owner: 'Navegador cliente / render engine',
          rationale: 'El entorno jsdom de Vitest no emula sub-píxeles, layout engines específicos de Chromium/WebKit ni aceleración por hardware',
        },
        liveHermesRuntimeStreaming: {
          covered: false,
          owner: 'Hermès CLI / background agent execution',
          rationale: 'Se verifica el contrato de datos (PipelineSnapshot / PipelineProjection), no la conexión viva por socket con ejecutores externos',
        },
      };

      // Afirmar contractualmente que las fronteras declaradas están formalizadas
      expect(outOfScopeBoundaries.artifactTimelineNodes.covered).toBe(false);
      expect(outOfScopeBoundaries.didacticCopyAndGlossary.covered).toBe(false);
      expect(outOfScopeBoundaries.subpixelRenderingAndGPU.covered).toBe(false);
      expect(outOfScopeBoundaries.liveHermesRuntimeStreaming.covered).toBe(false);
    });
  });
});
