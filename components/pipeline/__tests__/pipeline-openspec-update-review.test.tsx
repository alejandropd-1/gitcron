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

  it('deshabilita el botón de ejecución si la rama actual es main', () => {
    render(
      <OpenSpecUpdateReview
        repoPath="C:\\repo"
        status={mockStatus}
        currentBranch="main"
        isClean={true}
        onBack={vi.fn()}
      />,
    );

    const updateBtn = screen.getByRole('button', { name: /Actualizar integración/i });
    expect(updateBtn.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/Bloqueado: no se permite actualizar en la rama principal \(main\)/)).toBeTruthy();
  });

  it('deshabilita el botón de ejecución si el árbol de trabajo está sucio', () => {
    render(
      <OpenSpecUpdateReview
        repoPath="C:\\repo"
        status={mockStatus}
        currentBranch="feature/test"
        isClean={false}
        onBack={vi.fn()}
      />,
    );

    const updateBtn = screen.getByRole('button', { name: /Actualizar integración/i });
    expect(updateBtn.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/Bloqueado: el árbol de trabajo tiene cambios pendientes no confirmados/)).toBeTruthy();
  });

  it('muestra la opción condicional de --force cuando hay skills legacy', () => {
    render(
      <OpenSpecUpdateReview
        repoPath="C:\\repo"
        status={mockStatus}
        currentBranch="change/test"
        isClean={true}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText(/Limpieza de configuración legacy \(--force\)/i)).toBeTruthy();
    expect(screen.getByText('C:\\repo\\.codex\\skills\\openspec-propose')).toBeTruthy();
  });

  it('muestra la guía de actualización del motor en el host con el comando exacto y botón de copiado', async () => {
    const statusWithOlderEngine: OpenSpecEngineStatus = {
      ...mockStatus,
      cli: {
        ...mockStatus.cli,
        runtimeVersion: '1.5.0',
      },
      latestAvailable: {
        status: 'online',
        latestVersion: '1.9.0',
        checkedAt: new Date().toISOString(),
        fromCache: false,
        cacheAgeSeconds: 0,
        freshness: 'fresh',
        error: null,
      },
    };

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(
      <OpenSpecUpdateReview
        repoPath="C:\\repo"
        status={statusWithOlderEngine}
        currentBranch="change/test"
        isClean={true}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText('Actualización del motor en el sistema host')).toBeTruthy();
    expect(screen.getByText('npm i -g @fission-ai/openspec@latest')).toBeTruthy();

    const copyButtons = screen.getAllByRole('button', { name: /Copiar comando/i });
    expect(copyButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(copyButtons[0]);
    expect(writeTextMock).toHaveBeenCalled();
  });

  it('ejecuta la actualización end-to-end con estado de carga, reporte de archivos y botón de preparar commit (Hallazgo 5)', async () => {
    let resolveRunUpdate!: (val: any) => void;
    const runUpdatePromise = new Promise((resolve) => {
      resolveRunUpdate = resolve;
    });

    const runUpdateMock = vi.fn().mockReturnValue(runUpdatePromise);
    (window as any).api = {
      pipelineOpenSpec: {
        runUpdate: runUpdateMock,
      },
    };

    const handlePrepareCommit = vi.fn();
    const handleUpdateCompleted = vi.fn();

    render(
      <OpenSpecUpdateReview
        repoPath="C:/repo"
        status={mockStatus}
        currentBranch="change/actualizar-openspec"
        isClean={true}
        onBack={vi.fn()}
        onPrepareCommit={handlePrepareCommit}
        onUpdateCompleted={handleUpdateCompleted}
      />,
    );

    // 1. Botón ejecutar actualización está habilitado
    const updateBtn = screen.getByRole('button', { name: /Actualizar integración del repositorio/i });
    expect(updateBtn.hasAttribute('disabled')).toBe(false);

    // 2. Hacer clic en ejecutar
    fireEvent.click(updateBtn);
    expect(runUpdateMock).toHaveBeenCalledWith('C:/repo', undefined, false);

    // 3. Verifica estado de carga durante la ejecución
    expect(screen.getByText(/Actualizando integración…/i)).toBeTruthy();

    // 4. Resolver la promesa exitosamente
    await React.act(async () => {
      resolveRunUpdate({
        success: true,
        status: 'completed',
        filesUpdated: [
          '.agents/skills/openspec-propose/SKILL.md',
          '.agents/skills/openspec-apply-change/SKILL.md',
        ],
        errors: [],
      });
    });

    // 5. Render de la lista de archivos actualizados y título de éxito
    expect(screen.getByText('Integración actualizada')).toBeTruthy();
    expect(screen.getByText('2 archivos actualizados')).toBeTruthy();
    expect(screen.getByText('.agents/skills/openspec-propose/SKILL.md')).toBeTruthy();
    expect(screen.getByText('.agents/skills/openspec-apply-change/SKILL.md')).toBeTruthy();
    expect(handleUpdateCompleted).toHaveBeenCalled();

    // 6. Botón «Preparar commit» presente y funcional
    const prepareBtn = screen.getByRole('button', { name: /Preparar commit/i });
    expect(prepareBtn).toBeTruthy();
    fireEvent.click(prepareBtn);
    expect(handlePrepareCommit).toHaveBeenCalledTimes(1);
  });
});
