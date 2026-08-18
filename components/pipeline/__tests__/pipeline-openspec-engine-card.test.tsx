// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { OpenSpecEngineCard } from '../OpenSpecEngineCard';
import type { OpenSpecEngineStatus } from '../../../types/pipeline';

describe('OpenSpecEngineCard (UI Audit Tests & Jerarquía)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renderiza la insignia compacta cuando compact=true', () => {
    render(<OpenSpecEngineCard status={null} isLoading={true} compact={true} />);
    expect(screen.getByText(/OpenSpec: Comprobando runtimes…/i)).toBeDefined();
  });

  it('renderiza la vista primaria inicial comprensible y accionable', () => {
    const dummyStatus: OpenSpecEngineStatus = {
      cli: {
        installed: true,
        runtimeVersion: '1.8.0',
        provenance: 'global',
        displayPath: 'C:\\global\\openspec.cmd',
        supportedRange: { min: '1.5.0', max: '1.8.0' },
        versionClass: 'supported',
        evidenceStatus: 'confirmed',
        diagnostics: [],
      },
      latestAvailable: {
        status: 'online',
        latestVersion: '1.8.0',
        checkedAt: 'now',
        fromCache: false,
        cacheAgeSeconds: 0,
        freshness: 'fresh',
        error: null,
      },
      globalConfig: null,
      installedIntegration: {
        skills: [],
        generatedBy: '1.8.0',
        markersFound: [],
        outputInventory: [],
        evidenceStatus: 'confirmed',
        tools: ['codex', 'agents'],
        targets: ['codex', 'agents'],
        installedWorkflowsByTarget: {},
        missing: null,
        legacy: [],
        customized: [],
        conflicts: null,
      },
      repoState: 'initialized',
      integrationState: 'up-to-date',
    };

    render(<OpenSpecEngineCard status={dummyStatus} compact={false} />);
    expect(screen.getByText(/Listo/i)).toBeDefined();
    expect(screen.getByText(/2 agentes configurados/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Ver diagnóstico avanzado/i })).toBeDefined();
  });

  it('despliega el diagnóstico avanzado al hacer clic en el botón de alternancia', () => {
    const dummyStatus: OpenSpecEngineStatus = {
      cli: {
        installed: true,
        runtimeVersion: '1.8.0',
        provenance: 'global',
        displayPath: 'C:\\global\\openspec.cmd',
        supportedRange: { min: '1.5.0', max: '1.8.0' },
        versionClass: 'supported',
        evidenceStatus: 'confirmed',
        diagnostics: [],
      },
      latestAvailable: null,
      globalConfig: null,
      installedIntegration: null,
      repoState: 'initialized',
      integrationState: 'outdated',
      divergence: {
        isDivergent: true,
        overallStatus: 'divergent',
        reason: {
          kind: 'profile-mismatch',
          globalProfileClass: 'core',
          repoProfileClass: 'custom',
        },
        globalProfileClass: 'core',
        repoProfileClass: 'custom',
      },
    };

    render(<OpenSpecEngineCard status={dummyStatus} compact={false} />);
    
    // Antes de desplegar, la sección avanzada está oculta
    expect(screen.queryByText(/Ruta y Procedencia/i)).toBeNull();

    // Hacer clic en desplegar
    fireEvent.click(screen.getByRole('button', { name: /Ver diagnóstico avanzado/i }));

    // Ahora la información avanzada es visible
    expect(screen.getByText(/Ruta y Procedencia/i)).toBeDefined();
    expect(screen.getByText(/El perfil global \(core\) difiere/i)).toBeDefined();
  });

  it('alterna el texto del botón entre Revisar actualización y Cerrar revisión según isReviewOpen', () => {
    const dummyStatus: OpenSpecEngineStatus = {
      cli: {
        installed: true,
        runtimeVersion: '1.8.0',
        provenance: 'global',
        displayPath: 'C:\\global\\openspec.cmd',
        supportedRange: { min: '1.5.0', max: '1.8.0' },
        versionClass: 'supported',
        evidenceStatus: 'confirmed',
        diagnostics: [],
      },
      latestAvailable: null,
      globalConfig: null,
      installedIntegration: null,
      repoState: 'initialized',
      integrationState: 'outdated',
    };

    const handleReview = vi.fn();

    // 1. Con isReviewOpen=false
    const { rerender } = render(
      <OpenSpecEngineCard
        status={dummyStatus}
        compact={false}
        onOpenReview={handleReview}
        isReviewOpen={false}
      />,
    );

    const openBtn = screen.getByRole('button', { name: /Revisar actualización/i });
    expect(openBtn).toBeDefined();
    fireEvent.click(openBtn);
    expect(handleReview).toHaveBeenCalledTimes(1);

    // 2. Con isReviewOpen=true
    rerender(
      <OpenSpecEngineCard
        status={dummyStatus}
        compact={false}
        onOpenReview={handleReview}
        isReviewOpen={true}
      />,
    );

    const closeBtn = screen.getByRole('button', { name: /Cerrar revisión/i });
    expect(closeBtn).toBeDefined();
    fireEvent.click(closeBtn);
    expect(handleReview).toHaveBeenCalledTimes(2);
  });
});
