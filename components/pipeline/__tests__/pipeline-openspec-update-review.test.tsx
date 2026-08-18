// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { OpenSpecUpdateReview } from '../OpenSpecUpdateReview';
import type { OpenSpecEngineStatus } from '@/types/pipeline';

describe('OpenSpecUpdateReview (Fase 6: Revisión sin mutación en columna central)', () => {
  const mockStatus: OpenSpecEngineStatus = {
    cli: {
      installed: true,
      runtimeVersion: '1.8.0',
      provenance: 'global',
      displayPath: 'C:\\Users\\user\\AppData\\Roaming\\npm\\openspec.cmd',
      supportedRange: { min: '1.5.0', max: '1.8.0' },
      versionClass: 'supported',
      evidenceStatus: 'confirmed',
      diagnostics: [],
    },
    latestAvailable: {
      status: 'online',
      latestVersion: '1.8.0',
      checkedAt: new Date().toISOString(),
      fromCache: false,
      cacheAgeSeconds: 0,
      freshness: 'fresh',
      error: null,
    },
    globalConfig: null,
    installedIntegration: {
      skills: [
        {
          name: 'openspec-propose',
          path: 'C:\\repo\\.codex\\skills\\openspec-propose',
          origin: 'legacy-codex',
          isOfficial: true,
        },
        {
          name: 'openspec-apply-change',
          path: 'C:\\repo\\.claude\\skills\\openspec-apply-change',
          origin: 'official-other',
          isOfficial: true,
        },
        {
          name: 'accessibility',
          path: 'C:\\repo\\.agents\\skills\\accessibility',
          origin: 'custom-agents',
          isOfficial: false,
        },
      ],
      generatedBy: '1.8.0',
      markersFound: [],
      outputInventory: [
        {
          id: 'output-agents',
          targetName: 'Agents Multi-Agent',
          kind: 'repo-local',
          displayPath: '.agents/skills/openspec-*',
          descriptionKey: 'pipeline.openspec.engine.output.agentsDesc',
          blocked: false,
          presenceState: 'present',
        },
      ],
      evidenceStatus: 'confirmed',
      tools: ['agents', 'codex', 'claude'],
      targets: ['agents', 'codex', 'claude'],
      presentToolDirectories: ['agents', 'codex', 'claude'],
      installedWorkflowsByTarget: {},
      missing: null,
      legacy: ['codex'],
      customized: ['accessibility'],
      conflicts: null,
    },
    repoState: 'initialized',
    integrationState: 'outdated',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renderiza la revisión en la columna central con el banner de sólo lectura y hechos', () => {
    render(
      <OpenSpecUpdateReview
        repoPath="C:\\repo"
        status={mockStatus}
        onBack={vi.fn()}
      />,
    );

    // Banner de seguridad
    expect(screen.getByText('Revisión declarativa de sólo lectura')).toBeTruthy();
    expect(screen.getAllByText(/Esta revisión no modifica ningún archivo/).length).toBeGreaterThanOrEqual(1);

    // Hechos del motor
    expect(screen.getAllByText('v1.8.0').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Global (PATH)')).toBeTruthy();
  });

  it('muestra el comando sugerido exacto no traducido con botón de copiado', () => {
    render(
      <OpenSpecUpdateReview
        repoPath="C:\\repo"
        status={mockStatus}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText('openspec update')).toBeTruthy();
  });

  it('no renderiza botón Ver el repositorio y llama a onBack con el botón Cerrar de abajo', () => {
    const handleBack = vi.fn();
    render(
      <OpenSpecUpdateReview
        repoPath="C:\\repo"
        status={mockStatus}
        onBack={handleBack}
      />,
    );

    // No existe botón "Ver el repositorio" ni "Volver"
    expect(screen.queryByRole('button', { name: /Ver el repositorio/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Volver/i })).toBeNull();

    // Botón Cerrar del pie
    const closeBtn = screen.getByRole('button', { name: /Cerrar/i });
    fireEvent.click(closeBtn);
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('renderiza las cuatro categorías de convivencia (legacy, new, official other, custom)', () => {
    render(
      <OpenSpecUpdateReview
        repoPath="C:\\repo"
        status={mockStatus}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText(/Skills legacy \(\.codex \/ \.agent\)/)).toBeTruthy();
    expect(screen.getByText(/Skills oficiales en \.agents/)).toBeTruthy();
    expect(screen.getByText(/Skills oficiales en otras herramientas/)).toBeTruthy();
    expect(screen.getByText(/Personalizados preexistentes en \.agents/)).toBeTruthy();

    expect(screen.getByText('openspec-propose')).toBeTruthy();
    expect(screen.getByText('openspec-apply-change')).toBeTruthy();
    expect(screen.getByText('accessibility')).toBeTruthy();
  });

  it('copia el comando oficial al portapapeles al hacer clic', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <OpenSpecUpdateReview
        repoPath="C:\\repo"
        status={mockStatus}
        onBack={vi.fn()}
      />,
    );

    const copyBtn = screen.getByRole('button', { name: /Copiar comando/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith('openspec update');
  });
});
