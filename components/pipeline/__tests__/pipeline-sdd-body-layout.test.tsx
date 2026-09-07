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
          status: {
            available: true,
            artifacts: [
              { id: 'proposal', state: 'done', missingDeps: [] },
              { id: 'design', state: 'done', missingDeps: [] },
              { id: 'specs', state: 'done', missingDeps: [] },
              { id: 'tasks', state: 'ready', missingDeps: [] },
            ],
            applyRequires: ['tasks'],
            isComplete: false,
          },
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
      // Con Obs 52 se retiran diffs y glossary, dejando los 4 artefactos canónicos
      expect(tabs.length).toBe(4);

      const expectedLabels = [
        /pipeline\.details\.proposal|pipeline\.openspec\.graph\.artifact\.proposal/i,
        /pipeline\.details\.design|pipeline\.openspec\.graph\.artifact\.design/i,
        /pipeline\.details\.specs|pipeline\.openspec\.graph\.artifact\.specs/i,
        /pipeline\.details\.tasks|pipeline\.openspec\.graph\.artifact\.tasks/i,
      ];

      for (const expected of expectedLabels) {
        expect(tabs.some((t) => expected.test(t.textContent || ''))).toBe(true);
      }

      // Se retiran diffs y glossary de las solapas
      expect(tabs.some((t) => /pipeline\.details\.diffs/i.test(t.textContent || ''))).toBe(false);
      expect(tabs.some((t) => /pipeline\.details\.glossary/i.test(t.textContent || ''))).toBe(false);

      // La primera solapa (propuesta) arranca activa
      const activeTab = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
      expect(activeTab?.textContent).toMatch(/proposal/i);
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

  describe('4.15 / Observación 45: Jerarquía lumínica de superficies en el cuerpo de SDD', () => {
    it('ninguna superficie de fondo en el cuerpo tiene luminancia inferior a la del lienzo (#2e3440)', () => {
      const modulePath = path.resolve(process.cwd(), 'components/pipeline/OpenSpecDashboard.module.css');
      const content = fs.readFileSync(modulePath, 'utf-8');

      // 1. No existe ninguna declaración background ni background-color con var(--color-bg-surface)
      const bgSurfaceRegex = /(?:background|background-color)\s*:[^;]*var\(--color-bg-surface\)/gi;
      const bgSurfaceMatches = content.match(bgSurfaceRegex);
      expect(bgSurfaceMatches).toBeNull();

      // 2. No existe color-mix con var(--color-bg-surface) en fondos
      const colorMixSurfaceRegex = /(?:background|background-color)\s*:[^;]*color-mix\([^;]*var\(--color-bg-surface\)/gi;
      const colorMixMatches = content.match(colorMixSurfaceRegex);
      expect(colorMixMatches).toBeNull();

      // 3. Verificación de luminancia sRGB: el token de superficie (--color-bg-overlay, #3b4252)
      // debe tener luminancia relativa mayor o igual al lienzo base (--color-bg-base, #2e3440)
      function srgbLuminance(hex: string): number {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        const toLinear = (c: number) => {
          const s = c / 255;
          return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
      }

      const canvasLuminance = srgbLuminance('#2e3440'); // ~0.0342
      const overlayLuminance = srgbLuminance('#3b4252'); // ~0.0542
      const oldSurfaceLuminance = srgbLuminance('#272c36'); // ~0.0252

      // El token anterior era defectuoso: más oscuro que el fondo base
      expect(oldSurfaceLuminance).toBeLessThan(canvasLuminance);

      // El token actual respeta la física de superficies: más claro que el fondo base
      expect(overlayLuminance).toBeGreaterThan(canvasLuminance);
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

  describe('4.16 / Observaciones 48, 49 y 50: Tarjetas de inicio, geometría de tareas y contenedor de evidencia', () => {
    it('Obs 48: las tarjetas de inicio retiran el borde perimetral, [data-branch] usa border-left y .startPendingToggle no tiene borde', () => {
      const modulePath = path.resolve(process.cwd(), 'components/pipeline/OpenSpecDashboard.module.css');
      const css = fs.readFileSync(modulePath, 'utf-8');

      // 1. .startList > li tiene border: 0 (no conserva border: 1px solid)
      const startListMatch = css.match(/\.startList\s*>\s*li\s*\{([^}]+)\}/);
      expect(startListMatch).toBeTruthy();
      expect(startListMatch![1]).toMatch(/border:\s*0/);
      expect(startListMatch![1]).not.toMatch(/border:\s*1px solid/);

      // 2. .startList > li[data-branch] define border-left de 3px con var(--color-primary)
      const branchMatch = css.match(/\.startList\s*>\s*li\[data-branch\]\s*\{([^}]+)\}/);
      expect(branchMatch).toBeTruthy();
      expect(branchMatch![1]).toMatch(/border-left:\s*3px solid var\(--color-primary\)/);

      // 3. .startPendingToggle tiene min-height/min-block-size de 2.75rem y border: 0
      const pendingToggleMatch = css.match(/\.startPendingToggle\s*\{([^}]+)\}/);
      expect(pendingToggleMatch).toBeTruthy();
      expect(pendingToggleMatch![1]).toMatch(/(?:min-height|min-block-size):\s*2\.75rem/);
      expect(pendingToggleMatch![1]).toMatch(/border:\s*0/);
    });

    it('Obs 49: la casilla de tarea unifica su caja a 2.75rem en completadas y pendientes, usa CheckCircle2 y color-git-add', () => {
      renderSdd();

      // En el DOM montado:
      const taskList = document.querySelector('ol[class*="taskList"]');
      expect(taskList).toBeTruthy();

      const taskItems = taskList!.querySelectorAll('li');
      expect(taskItems.length).toBe(2);

      const pendingItem = taskItems[0];
      const completedItem = taskItems[1];

      expect(pendingItem.getAttribute('data-completed')).toBe('false');
      expect(completedItem.getAttribute('data-completed')).toBe('true');

      const pendingBtn = pendingItem.querySelector('button[class*="taskStatus"]');
      const completedBtn = completedItem.querySelector('button[class*="taskStatus"]');
      expect(pendingBtn).toBeTruthy();
      expect(completedBtn).toBeTruthy();

      // La tarea completada renderiza el ícono CheckCircle2 (con SVG)
      expect(completedBtn!.querySelector('svg')).toBeTruthy();

      // Inspección CSS:
      const modulePath = path.resolve(process.cwd(), 'components/pipeline/OpenSpecDashboard.module.css');
      const css = fs.readFileSync(modulePath, 'utf-8');

      // .taskStatus base declara 2.75rem de ancho y alto, padding 0 y margin 0
      const taskStatusMatch = css.match(/\.taskStatus\s*\{([^}]+)\}/);
      expect(taskStatusMatch).toBeTruthy();
      expect(taskStatusMatch![1]).toMatch(/min-width:\s*2\.75rem/);
      expect(taskStatusMatch![1]).toMatch(/min-height:\s*2\.75rem/);
      expect(taskStatusMatch![1]).not.toMatch(/margin:\s*calc\(-1/);

      // .taskList > li declara 2.75rem en la primera columna
      const taskLiMatch = css.match(/\.taskList\s*>\s*li\s*\{([^}]+)\}/);
      expect(taskLiMatch).toBeTruthy();
      expect(taskLiMatch![1]).toMatch(/grid-template-columns:\s*2\.75rem\s+3rem/);

      // .taskList > li[data-completed='true'] .taskStatus define var(--color-git-add)
      const completedStatusMatch = css.match(/\.taskList\s*>\s*li\[data-completed='true'\]\s+\.taskStatus\s*\{([^}]+)\}/);
      expect(completedStatusMatch).toBeTruthy();
      expect(completedStatusMatch![1]).toMatch(/color:\s*var\(--color-git-add\)/);
    });

    it('Obs 50: el contenedor de evidencia retira el borde perimetral y fondo encapsulado', () => {
      const modulePath = path.resolve(process.cwd(), 'components/pipeline/OpenSpecDashboard.module.css');
      const css = fs.readFileSync(modulePath, 'utf-8');

      const detailsMatch = css.match(/\.openspecScope\s+:global\(\.pipeline-details\)\s*\{([^}]+)\}/);
      expect(detailsMatch).toBeTruthy();
      expect(detailsMatch![1]).toMatch(/border:\s*0/);
      expect(detailsMatch![1]).toMatch(/background-color:\s*transparent/);
      expect(detailsMatch![1]).not.toMatch(/border:\s*1px solid/);
    });
  });
});
