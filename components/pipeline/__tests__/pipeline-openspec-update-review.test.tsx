// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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

  it('renderiza la revisión en la columna central con hechos del motor', () => {
    render(
      <OpenSpecUpdateReview
        repoPath="C:\\repo"
        status={mockStatus}
        onBack={vi.fn()}
      />,
    );

    // Banner de seguridad retirado
    expect(screen.queryByText(/Revisión declarativa de sólo lectura/i)).toBeNull();

    // Hechos del motor (al día)
    expect(screen.getByText(/Motor v1\.8\.0 · al día/i)).toBeTruthy();

    // Abrir detalle técnico para ver procedencia y detalles
    const techBtn = screen.getByRole('button', { name: /Detalle técnico/i });
    fireEvent.click(techBtn);
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

    const termToggle = screen.getByRole('button', { name: /Desde la terminal/i });
    fireEvent.click(termToggle);
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

    const techToggle = screen.getByRole('button', { name: /Detalle técnico/i });
    fireEvent.click(techToggle);

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

    const termToggle = screen.getByRole('button', { name: /Desde la terminal/i });
    fireEvent.click(termToggle);

    const copyBtn = screen.getByRole('button', { name: /Copiar comando/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith('openspec update');
  });

  it('muestra aviso de confirmación en main, Cancelar no ejecuta y Actualizar igual ejecuta', async () => {
    const runUpdateMock = vi.fn().mockResolvedValue({ success: true, status: 'completed', filesUpdated: [], errors: [] });
    (window as any).api = {
      pipelineOpenSpec: {
        runUpdate: runUpdateMock,
      },
    };

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
    expect(updateBtn.hasAttribute('disabled')).toBe(false);

    // Al hacer clic, aparece el aviso en el mismo lugar
    fireEvent.click(updateBtn);
    expect(screen.getByText(/Estás en «main»\. La actualización va a escribir directo en esta rama\./)).toBeTruthy();

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    const confirmBtn = screen.getByRole('button', { name: /Actualizar igual/i });
    expect(cancelBtn).toBeTruthy();
    expect(confirmBtn).toBeTruthy();

    // Cancelar no llama al canal y vuelve a la vista normal
    fireEvent.click(cancelBtn);
    expect(runUpdateMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/Estás en «main»/)).toBeNull();

    // Clic de nuevo y confirmar con Actualizar igual
    const updateBtnAgain = screen.getByRole('button', { name: /Actualizar integración/i });
    fireEvent.click(updateBtnAgain);
    const confirmBtnAgain = screen.getByRole('button', { name: /Actualizar igual/i });
    fireEvent.click(confirmBtnAgain);
    expect(runUpdateMock).toHaveBeenCalledTimes(1);
  });

  it('muestra aviso de confirmación con árbol sucio, Cancelar no ejecuta y Actualizar igual ejecuta', async () => {
    const runUpdateMock = vi.fn().mockResolvedValue({ success: true, status: 'completed', filesUpdated: [], errors: [] });
    (window as any).api = {
      pipelineOpenSpec: {
        runUpdate: runUpdateMock,
      },
    };

    render(
      <OpenSpecUpdateReview
        repoPath="C:\\repo"
        status={mockStatus}
        currentBranch="feature/test"
        isClean={false}
        uncommittedCount={4}
        onBack={vi.fn()}
      />,
    );

    const updateBtn = screen.getByRole('button', { name: /Actualizar integración/i });
    expect(updateBtn.hasAttribute('disabled')).toBe(false);

    // Al hacer clic, aparece el aviso con la cantidad de archivos
    fireEvent.click(updateBtn);
    expect(screen.getByText(/Tenés 4 archivos sin confirmar/)).toBeTruthy();

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);
    expect(runUpdateMock).not.toHaveBeenCalled();

    // Confirmar ejecuta
    fireEvent.click(screen.getByRole('button', { name: /Actualizar integración/i }));
    fireEvent.click(screen.getByRole('button', { name: /Actualizar igual/i }));
    expect(runUpdateMock).toHaveBeenCalledTimes(1);
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

  it('ofrece botón Actualizar el motor y alternativa de terminal con comando exacto y copiado', async () => {

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const installGlobalMock = vi.fn().mockResolvedValue({ success: true });
    (window as any).api = {
      pipelineOpenSpec: {
        installGlobal: installGlobalMock,
      },
    };

    const pnpmCommand = 'pnpm add -g @fission-ai/openspec@latest';
    render(
      <OpenSpecUpdateReview
        repoPath="C:\\repo"
        status={statusWithOlderEngine}
        installPlan={{
          globalCommand: pnpmCommand,
          localCommand: null,
          hasManifest: false,
          nodePath: 'C:\\node.exe',
          packageManagerPath: 'C:\\pnpm.cmd',
          detectedManager: 'pnpm',
        }}
        currentBranch="change/test"
        isClean={true}
        onBack={vi.fn()}
      />,
    );

    // Hecho superior con la oferta de actualización del motor host
    expect(screen.getByText(/Motor v1\.5\.0 instalado · v1\.9\.0 disponible en npm/)).toBeTruthy();

    // Botón Actualizar el motor presente arriba en la fila de acciones
    const upgradeEngineBtn = screen.getByRole('button', { name: /Actualizar el motor/i });
    expect(upgradeEngineBtn).toBeTruthy();

    // Abrir comando desde la terminal
    const termToggle = screen.getByRole('button', { name: /Desde la terminal/i });
    fireEvent.click(termToggle);
    expect(screen.getByText('O desde la terminal:')).toBeTruthy();
    expect(screen.getByText(pnpmCommand)).toBeTruthy();

    // Copiar comando
    const copyButtons = screen.getAllByRole('button', { name: /Copiar comando/i });
    expect(copyButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(copyButtons[0]);
    expect(writeTextMock).toHaveBeenCalledWith(pnpmCommand);

    // Clic en Actualizar el motor despliega confirmación
    fireEvent.click(upgradeEngineBtn);
    expect(screen.getByText(/La instalación global modificará el entorno de Node/i)).toBeTruthy();

    const confirmGlobalBtn = screen.getByRole('button', { name: /Confirmar instalación global/i });
    fireEvent.click(confirmGlobalBtn);
    expect(installGlobalMock).toHaveBeenCalledTimes(1);
  });

  it('la revisión renderiza OpenSpecGlobalInstallConfirm al apretar «Actualizar el motor» (Corrección 3)', () => {
    (window as any).api = {
      pipelineOpenSpec: {
        installGlobal: vi.fn(),
      },
    };

    render(
      <OpenSpecUpdateReview
        repoPath="C:\\repo"
        status={statusWithOlderEngine}
        installPlan={{
          globalCommand: 'npm i -g @fission-ai/openspec@latest',
          localCommand: null,
          hasManifest: false,
          nodePath: 'C:\\node.exe',
          packageManagerPath: 'C:\\npm.cmd',
          detectedManager: 'npm',
        }}
        currentBranch="change/test"
        isClean={true}
        onBack={vi.fn()}
      />,
    );

    expect(screen.queryByRole('region', { name: /Confirmar instalación global/i })).toBeNull();
    const upgradeEngineBtn = screen.getByRole('button', { name: /Actualizar el motor/i });
    fireEvent.click(upgradeEngineBtn);

    const confirmRegion = screen.getByRole('region', { name: /Confirmar instalación global/i });
    expect(confirmRegion).toBeDefined();
    expect(within(confirmRegion).getByRole('button', { name: /Confirmar instalación global/i })).toBeDefined();
    expect(within(confirmRegion).getByRole('button', { name: /Cancelar/i })).toBeDefined();
  });

  it('con CLI no instalado, el motivo de bloqueo explica la causa real y no contiene POC', () => {
    const statusNoCli: OpenSpecEngineStatus = {
      ...mockStatus,
      cli: {
        installed: false,
        runtimeVersion: null,
        provenance: 'unknown',
        displayPath: null,
        supportedRange: { min: '1.5.0', max: '1.12.0' },
        versionClass: 'unknown',
        evidenceStatus: 'confirmed',
        diagnostics: [],
      },
      repoState: 'initialized',
      integrationState: 'outdated',
    };

    render(
      <OpenSpecUpdateReview
        repoPath="C:\\repo"
        status={statusNoCli}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getAllByText(/El CLI de OpenSpec no está instalado en el sistema/).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/POC/i)).toBeNull();
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

  it('con instalada 1.13.0 y latest 1.12.0 el botón «Actualizar el motor» NO se renderiza y muestra motor al día', () => {
    const statusNewerThanCache: OpenSpecEngineStatus = {
      ...mockStatus,
      cli: {
        ...mockStatus.cli,
        installed: true,
        runtimeVersion: '1.13.0',
      },
      latestAvailable: {
        ...mockStatus.latestAvailable!,
        latestVersion: '1.12.0',
      },
    };

    render(
      <OpenSpecUpdateReview
        repoPath="C:/repo"
        status={statusNewerThanCache}
        onBack={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /Actualizar el motor/i })).toBeNull();
    expect(screen.getByText(/Motor v1\.13\.0 · al día/)).toBeTruthy();
  });

  it('por omisión los plegables «Desde la terminal» y «Detalle técnico» están cerrados y la matriz/convivencia no se muestran', () => {
    render(
      <OpenSpecUpdateReview
        repoPath="C:/repo"
        status={mockStatus}
        onBack={vi.fn()}
      />,
    );

    // Los botones de plegado están cerrados (aria-expanded="false")
    const terminalBtn = screen.getByRole('button', { name: /Desde la terminal/i });
    const techBtn = screen.getByRole('button', { name: /Detalle técnico/i });
    expect(terminalBtn.getAttribute('aria-expanded')).toBe('false');
    expect(techBtn.getAttribute('aria-expanded')).toBe('false');

    // La matriz y los bloques de convivencia no están en el DOM
    expect(screen.queryByText(/Skills legacy \(\.codex \/ \.agent\)/)).toBeNull();
    expect(screen.queryByText('openspec update')).toBeNull();

    // Pero los dos hechos superiores sí están visibles
    expect(screen.getByText(/Motor v1\.8\.0 · al día/)).toBeTruthy();
    expect(screen.getByText(/Integración de este repositorio/)).toBeTruthy();
  });

  it('con motor desactualizado e integración desactualizada muestra ambos hechos arriba en el resumen', () => {
    render(
      <OpenSpecUpdateReview
        repoPath="C:/repo"
        status={statusWithOlderEngine}
        onBack={vi.fn()}
      />,
    );

    // Hecho 1: motor con versión disponible
    expect(screen.getByText(/Motor v1\.5\.0 instalado · v1\.9\.0 disponible en npm/)).toBeTruthy();

    // Hecho 2: integración desactualizada
    expect(screen.getByText(/Integración de este repositorio/)).toBeTruthy();
    expect(screen.getByText('Actualización de flujos instalados')).toBeTruthy();

    // Acción de actualizar motor presente
    expect(screen.getByRole('button', { name: /Actualizar el motor/i })).toBeTruthy();
  });

  it('alterna el plegable «Desde la terminal» actualizando aria-expanded', () => {
    render(
      <OpenSpecUpdateReview
        repoPath="C:/repo"
        status={mockStatus}
        onBack={vi.fn()}
      />,
    );

    const terminalBtn = screen.getByRole('button', { name: /Desde la terminal/i });
    expect(terminalBtn.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('openspec update')).toBeNull();

    fireEvent.click(terminalBtn);
    expect(terminalBtn.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('openspec update')).toBeTruthy();

    fireEvent.click(terminalBtn);
    expect(terminalBtn.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('openspec update')).toBeNull();
  });
});
