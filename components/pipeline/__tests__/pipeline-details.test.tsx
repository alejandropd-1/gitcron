// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RUNNING_SNAPSHOT } from '../__fixtures__/pipeline-fixtures';
import { PipelineDetails } from '../PipelineDetails';

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

afterEach(cleanup);

describe('Pipeline details', () => {
  // La propuesta ya no viaja en un campo propio del snapshot: llega dentro de
  // los artefactos del cambio seleccionado, que es lo que lee el panel.
  it('carries the selected change artifacts and the diffs', () => {
    const selected = RUNNING_SNAPSHOT.openSpec?.activeChanges[0];
    expect(selected?.artifacts?.proposal).toBeTruthy();
    expect(RUNNING_SNAPSHOT.diffs).toBeDefined();
    expect(RUNNING_SNAPSHOT.diffs?.length).toBeGreaterThan(0);
  });

  it('ensures diffs preserve agent and task provenance correlation without dummy fallback', () => {
    const diffs = RUNNING_SNAPSHOT.diffs ?? [];
    const withAgent = diffs.find((d) => d.agentId !== null);
    const withoutAgent = diffs.find((d) => d.agentId === null);

    expect(withAgent?.agentId).toBe('orch-1');
    expect(withAgent?.taskId).toBe('setup-workspace');

    // Honesty rule: missing provenance is explicitly null, never empty string or false ID
    expect(withoutAgent?.agentId).toBeNull();
    expect(withoutAgent?.taskId).toBeNull();
  });

  it('la pestaña activa de detalles se aloja en OpenSpecDashboard.module.css y no en globals.css', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const globalsPath = path.resolve(process.cwd(), 'app/globals.css');
    const globalsContent = fs.readFileSync(globalsPath, 'utf-8');
    const modulePath = path.resolve(process.cwd(), 'components/pipeline/OpenSpecDashboard.module.css');
    const moduleContent = fs.readFileSync(modulePath, 'utf-8');

    // Comprueba que ya no esté en globals.css (mudado a la hoja de la vista)
    expect(globalsContent).not.toMatch(/\.pipeline-details__tab--active\s*\{/);

    // Comprueba que en el module CSS esté declarado exactamente una vez (usando :global para encapsulación)
    const matches = moduleContent.match(/(?::global\()?\s*\.pipeline-details__tab--active\s*\)?\s*\{/g);
    expect(matches?.length).toBe(1);

    // Comprueba que no tenga la regla contradictoria agresiva con fondo cian pleno
    expect(moduleContent).not.toMatch(/\.pipeline-details__tab--active[^{]*\{[^}]*background-color:\s*var\(--color-primary\)/);
  });

  it('Obs 62: en el DOM montado, «Propuesta» y «Especificaciones» muestran contenidos DISTINTOS y Especificaciones no reproduce la propuesta', () => {
    const testChange = {
      changeId: 'cambio-prueba',
      intent: 'Intención resumida del cambio',
      status: 'in-progress' as const,
      artifacts: {
        proposal: '# Propuesta del cambio\n\nTexto exclusivo de la propuesta del cambio que no debe figurar en especificaciones.',
        specs: [
          {
            capability: 'capacidad-autenticacion',
            content: '### Requirement: Autenticación por token\n\nEspecificación exclusiva por capacidad que no debe figurar en propuesta.',
            sourceRef: 'specs/capacidad-autenticacion/spec.md',
          },
        ],
        design: '# Diseño de la arquitectura',
        tasks: '- [ ] 1.1 Primera tarea',
      },
    };

    // 1. Solapa «Propuesta»
    const { rerender } = render(
      <PipelineDetails
        snapshot={RUNNING_SNAPSHOT}
        selectedChange={testChange as any}
        tab="proposal"
      />,
    );

    const proposalPanel = document.querySelector('#panel-proposal');
    expect(proposalPanel).toBeTruthy();
    expect(proposalPanel?.textContent).toContain('Texto exclusivo de la propuesta del cambio');
    expect(proposalPanel?.textContent).not.toContain('capacidad-autenticacion');
    expect(proposalPanel?.textContent).not.toContain('Especificación exclusiva por capacidad');

    // 2. Solapa «Especificaciones»: muestra deltaSpecs estructuradas, no el documento completo ni la propuesta
    rerender(
      <PipelineDetails
        snapshot={RUNNING_SNAPSHOT}
        selectedChange={testChange as any}
        tab="specs"
      />,
    );

    const specsPanel = document.querySelector('#panel-specs');
    expect(specsPanel).toBeTruthy();
    expect(specsPanel?.textContent).toContain('capacidad-autenticacion');
    expect(specsPanel?.textContent).toContain('Especificación exclusiva por capacidad');
    expect(specsPanel?.textContent).not.toContain('Texto exclusivo de la propuesta del cambio');

    // 3. Solapa «Especificaciones» cuando no hay especificaciones definidas
    const emptySpecsChange = {
      ...testChange,
      artifacts: {
        ...testChange.artifacts,
        specs: [],
      },
    };

    rerender(
      <PipelineDetails
        snapshot={RUNNING_SNAPSHOT}
        selectedChange={emptySpecsChange as any}
        tab="specs"
      />,
    );

    const emptySpecsPanel = document.querySelector('#panel-specs');
    expect(emptySpecsPanel?.textContent).toContain('pipeline.details.noSpecs');
  });
});
