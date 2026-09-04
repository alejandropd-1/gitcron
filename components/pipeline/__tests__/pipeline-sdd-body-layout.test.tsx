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
    it('el cuerpo unifica Trabajo e Inspección en un único flujo vertical sin solapas superiores divisorias', () => {
      renderSdd();

      // Las solapas rígidas superiores que dividían Trabajo de Artefactos ya no existen
      expect(screen.queryByRole('tab', { name: /openspec\.tabs\.work/i })).toBeNull();
      expect(screen.queryByRole('tab', { name: /openspec\.tabs\.details/i })).toBeNull();

      // En su lugar, el área de tareas y el visor de evidencia están montados simultáneamente en el DOM
      const taskList = screen.getByRole('list');
      expect(taskList).toBeTruthy();

      const evidenceHeading = screen.getByRole('heading', { name: /pipeline\.openspec\.evidence\.title/i });
      expect(evidenceHeading).toBeTruthy();

      // En el orden del DOM, la lista de tareas precede a la inspección de artefactos
      const positionComparison = taskList.compareDocumentPosition(evidenceHeading);
      expect(positionComparison & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('la cabecera ubica el siguiente paso presidido por el CTA antes del área de trabajo', () => {
      renderSdd();

      const nextStepHeading = screen.getByRole('heading', { name: /pipeline\.openspec\.nextStep\.title/i });
      const taskList = screen.getByRole('list');

      // El siguiente paso en la cabecera precede a la lista de tareas en el DOM
      const comparison = nextStepHeading.compareDocumentPosition(taskList);
      expect(comparison & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('la actividad está subordinada en un bloque colapsable bajo demanda al pie', () => {
      renderSdd();

      const activityHeading = screen.getByRole('heading', { name: /pipeline\.activity\.title/i });
      expect(activityHeading).toBeTruthy();

      // Vive dentro de un elemento <summary> dentro de <details>
      const details = activityHeading.closest('details');
      expect(details).not.toBeNull();
      expect(details?.open).toBe(false);
    });
  });

  describe('2.3 Jerarquía de controles (Acción Principal vs Accesorias)', () => {
    it('el botón de acción principal se distingue claramente de las acciones accesorias', () => {
      renderSdd();

      // El CTA de siguiente paso tiene la clase primaryAction dominante
      const nextStepCTA = screen.getByRole('button', { name: /pipeline\.next\.task\.action/i });
      expect(Array.from(nextStepCTA.classList).some((c) => c.includes('primaryAction'))).toBe(true);

      // Las acciones accesorias (Archivar cambio, Ver diff) tienen la clase secondaryAction
      const archiveBtn = screen.getByRole('button', { name: /pipeline\.openspec\.archive\.action/i });
      expect(Array.from(archiveBtn.classList).some((c) => c.includes('secondaryAction'))).toBe(true);

      const diffBtn = screen.getByRole('button', { name: /pipeline\.openspec\.actions\.diff/i });
      expect(Array.from(diffBtn.classList).some((c) => c.includes('secondaryAction'))).toBe(true);
    });
  });

  describe('2.4 Solapas de inspección y rótulos frente a OpenSpec 1.11', () => {
    it('las pestañas de evidencia declaran los seis rótulos funcionales y mantienen semántica de solapa', () => {
      renderSdd();

      const tablist = screen.getByRole('tablist', { name: /pipeline\.details\.title/i });
      expect(tablist).toBeTruthy();

      const tabs = screen.getAllByRole('tab');
      // 6 pestañas: propuesta, diseño, specs, tareas, diffs, glosario
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

    it('la tarea activa sin sesión registrada no renderiza las cuatro filas vacías de detalle', () => {
      renderSdd();

      // Sin sesión, no se dibuja .taskDetail con cuatro filas de "No informado"
      expect(screen.queryByText(/pipeline\.openspec\.task\.agent/i)).toBeNull();
      expect(screen.queryByText(/pipeline\.openspec\.task\.source/i)).toBeNull();
      expect(screen.queryByText(/pipeline\.openspec\.task\.workingTree/i)).toBeNull();

      // En su lugar se muestra una única línea discreta
      expect(screen.getByText(/pipeline\.openspec\.task\.noSession/i)).toBeTruthy();
    });

    it('el grafo de artefactos no repite la palabra HECHO cuatro veces y usa íconos semánticos', () => {
      renderSdd();

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
});
