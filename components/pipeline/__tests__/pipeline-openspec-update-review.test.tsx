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
    delete (window as any).api;
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

    // Diagnóstico avanzado abierto por omisión en la revisión (Tanda 8.23 b)
    expect(screen.getByRole('button', { name: /Ocultar diagnóstico avanzado/i })).toBeTruthy();
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

    const updateBtn = screen.getByRole('button', { name: /^Actualizar$/i });
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
    const updateBtnAgain = screen.getByRole('button', { name: /^Actualizar$/i });
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

    const updateBtn = screen.getByRole('button', { name: /^Actualizar$/i });
    expect(updateBtn.hasAttribute('disabled')).toBe(false);

    // Al hacer clic, aparece el aviso con la cantidad de archivos
    fireEvent.click(updateBtn);
    expect(screen.getByText(/Tenés 4 archivos sin confirmar/)).toBeTruthy();

    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);
    expect(runUpdateMock).not.toHaveBeenCalled();

    // Confirmar ejecuta
    fireEvent.click(screen.getByRole('button', { name: /^Actualizar$/i }));
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

  it('ofrece botón Actualizar, la línea de plan menciona actualizar el motor a v1.9.0 y el comando está dentro de «Desde la terminal»', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

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

    // Botón Actualizar presente
    const updateBtn = screen.getByRole('button', { name: /^Actualizar$/i });
    expect(updateBtn).toBeTruthy();

    // La línea de plan menciona actualizar el motor a v1.9.0
    expect(screen.getByText(/actualizar el motor en toda la máquina a v1\.9\.0/i)).toBeTruthy();

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
  });

  it('al apretar «Actualizar» con motor desactualizado se llama a installGlobal y la fila del motor queda en listo', async () => {
    const installGlobalMock = vi.fn().mockResolvedValue({
      success: true,
      engineStatus: {
        cli: { installed: true, runtimeVersion: '1.9.0' },
        doctor: { data: {} },
        globalConfig: { profileState: 'ready' },
      },
    });
    const runUpdateMock = vi.fn().mockResolvedValue({
      success: true,
      filesUpdated: [],
    });
    (window as any).api = {
      pipelineOpenSpec: {
        installGlobal: installGlobalMock,
        runUpdate: runUpdateMock,
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

    const updateBtn = screen.getByRole('button', { name: /^Actualizar$/i });
    fireEvent.click(updateBtn);

    await screen.findByText(/Motor v1\.9\.0 instalado y respondiendo\./i);
    expect(installGlobalMock).toHaveBeenCalledTimes(1);
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

    // 1. Botón Actualizar está habilitado
    const updateBtn = screen.getByRole('button', { name: /^Actualizar$/i });
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
          'a.md',
          'b.md',
        ],
        errors: [],
      });
    });

    // 5. Render de la lista de archivos actualizados y título de éxito
    expect(await screen.findByText(/Integración actualizada/i)).toBeTruthy();
    expect(screen.getByText(/2 archivos actualizados/i)).toBeTruthy();
    expect(screen.getByText(/Listo: integración al día/i)).toBeTruthy();
    expect(handleUpdateCompleted).toHaveBeenCalled();

    // 6. Botón «Preparar commit» presente y funcional
    const prepareBtn = screen.getByRole('button', { name: /Preparar commit/i });
    expect(prepareBtn).toBeTruthy();
    fireEvent.click(prepareBtn);
    expect(handlePrepareCommit).toHaveBeenCalledTimes(1);

    // 7. Al abrir «Detalle técnico» se ven a.md y b.md bajo «Archivos tocados por la última actualización»
    const techToggle = screen.getByRole('button', { name: /Detalle técnico/i });
    fireEvent.click(techToggle);
    expect(screen.getByText('Archivos tocados por la última actualización')).toBeTruthy();
    expect(screen.getByText('a.md')).toBeTruthy();
    expect(screen.getByText('b.md')).toBeTruthy();
  });

  it('con motor al día e integración al día ("none") el botón dice «Todo al día» y está deshabilitado', () => {
    const statusUpToDate: OpenSpecEngineStatus = {
      ...mockStatus,
      installedIntegration: {
        ...mockStatus.installedIntegration!,
        skills: [
          { name: 'openspec-propose', path: 'C:/repo/.codex/skills/openspec-propose', origin: 'legacy-codex', isOfficial: true },
          { name: 'openspec-apply-change', path: 'C:/repo/.codex/skills/openspec-apply-change', origin: 'legacy-codex', isOfficial: true },
        ],
        generatedBy: '1.8.0',
        markersFound: [],
        outputInventory: [],
      },
    };

    render(
      <OpenSpecUpdateReview
        repoPath="C:/repo"
        status={statusUpToDate}
        updatePlan={{ requiredAction: 'none', reason: null, items: [], blockers: [] } as any}
        onBack={vi.fn()}
      />,
    );

    const btn = screen.getByRole('button', { name: 'Todo al día' });
    expect(btn.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/Motor v1\.8\.0 · al día/)).toBeTruthy();
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

  it('con motor desactualizado e integración desactualizada muestra ambos hechos arriba en el resumen y la línea de plan', () => {
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

    // Línea de plan
    expect(
      screen.getByText(/Va a: .*actualizar el motor en toda la máquina a v1\.9\.0.*actualizar la integración de este repositorio/i)
    ).toBeTruthy();
  });

  it('con action "blocked" el botón «Actualizar» está deshabilitado y se ve el motivo', () => {
    render(
      <OpenSpecUpdateReview
        repoPath="C:/repo"
        status={mockStatus}
        updatePlan={{
          requiredAction: 'blocked',
          reason: 'Bloqueado por conflicto grave',
          items: [],
          blockers: ['conflict'],
        } as any}
        onBack={vi.fn()}
      />,
    );

    const updateBtn = screen.getByRole('button', { name: /^Actualizar$/i });
    expect(updateBtn.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/Bloqueado por conflicto grave/i)).toBeTruthy();
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

  it('con status sano y snapshot con herramientas, la sección «Motor y agentes» muestra la tarjeta y la lista de herramientas', () => {
    const mockSnapshot = {
      openSpec: {
        openSpecPresent: true,
        openSpecTools: [
          { toolId: 'claude', label: 'Claude Code', directory: '.claude', configured: true },
          { toolId: 'cursor', label: 'Cursor IDE', directory: '.cursor', configured: false },
        ],
      },
    } as any;

    render(
      <OpenSpecUpdateReview
        repoPath="C:/repo"
        status={mockStatus}
        snapshot={mockSnapshot}
        onBack={vi.fn()}
      />,
    );

    const engineSection = screen.getByRole('region', { name: /Motor y agentes/i });
    expect(engineSection).toBeTruthy();
    // Contiene el título único de la sección
    expect(within(engineSection).getByRole('heading', { level: 3, name: /Motor y agentes/i })).toBeTruthy();
    expect(within(engineSection).queryByRole('heading', { level: 3, name: /Tarjeta de Diagnóstico del Motor OpenSpec/i })).toBeNull();

    // Contiene la lista de herramientas
    expect(within(engineSection).getByText('Claude Code')).toBeTruthy();
    expect(within(engineSection).getByText('Cursor IDE')).toBeTruthy();
  });

  it('«Detalle técnico» desplegado NO contiene una segunda tarjeta (el aria-label de la tarjeta aparece una sola vez)', () => {
    render(
      <OpenSpecUpdateReview
        repoPath="C:/repo"
        status={mockStatus}
        onBack={vi.fn()}
      />,
    );

    // Abrir Detalle técnico
    const techBtn = screen.getByRole('button', { name: /Detalle técnico/i });
    fireEvent.click(techBtn);
    expect(techBtn.getAttribute('aria-expanded')).toBe('true');

    // La sección de motor aparece una sola vez en todo el documento
    const cardRegions = screen.getAllByRole('region', { name: /Motor y agentes/i });
    expect(cardRegions).toHaveLength(1);
  });

  it('(a) con motor 1.12.0 y latest 1.13.0 y versionAnalysis simulado con notas reales, muestra encabezado «Qué trae la v1.13.0», resumen y veredicto', async () => {
    const rawText = `## What's New in v1.13.0

Archive and the delta parser stop quietly changing or dropping what you wrote, and apply now tells you when a change has no specs.

### New

- **Apply flags a change with no delta specs** - \`openspec instructions apply\` used to report a change as ready whenever its tasks existed, even with no spec deltas at all, which is the state \`openspec validate\` rejects. It now warns in both text and \`--json\`, and names both ways out: write the specs, or declare \`skip_specs: true\`.

### Improved

- **Explore finds your existing specs** - Generated guidance never named \`openspec list --specs\`, so an agent asked to read the current specs enumerated in-flight changes instead and reported the step done against the wrong thing. Explore now lists the spec inventory beside the change list, and reads a capability with the store-aware command.
- **Init and update name the workflows your profile left out** - A \`/opsx:\` command that was never installed used to read as a broken setup. Both commands now say which workflows are missing and how to add them.
- **Propose reads project context before planning** - Context is loaded from the selected project or store root before any planning decision. In a directory with no OpenSpec root, propose stops without writing and offers to initialize rather than creating one silently.

**Full Changelog**: https://github.com/Fission-AI/OpenSpec/compare/v1.12.0...v1.13.0`;

    const versionAnalysisMock = vi.fn().mockResolvedValue({
      measured: {
        installedVersion: '1.12.0',
        availableVersion: '1.13.0',
        isUpgradeAvailable: true,
        versionClass: 'supported',
        behindCycle: false,
        targetVersion: '1.13.0',
        supportedRange: { min: '1.5.0' },
        changelog: {
          source: 'GitHub Releases (fission-ai/openspec)',
          sourceUrl: 'https://github.com/Fission-AI/OpenSpec/releases/tag/v1.13.0',
          fetched: true,
          rawText,
          error: null,
        },
        consumedSurfaces: [
          { surface: 'status', description: 'Status checks', verdict: 'compatible', evidence: 'sin cambios' },
        ],
        breakingChangesDetected: false,
        strategyProposal: null,
      },
      redaction: {
        provider: 'lmstudio:local-model',
        status: 'offline',
        text: '',
        error: null,
      },
    });

    (window as any).api = {
      ...((window as any).api ?? {}),
      pipelineOpenSpec: {
        ...((window as any).api?.pipelineOpenSpec ?? {}),
        versionAnalysis: versionAnalysisMock,
      },
    };

    const upgradeStatus: OpenSpecEngineStatus = {
      ...mockStatus,
      cli: {
        ...mockStatus.cli!,
        runtimeVersion: '1.12.0',
      },
      latestAvailable: {
        ...mockStatus.latestAvailable!,
        latestVersion: '1.13.0',
      },
    };

    render(
      <OpenSpecUpdateReview
        repoPath={'C:\\repo'}
        status={upgradeStatus}
        onBack={vi.fn()}
      />,
    );

    expect(versionAnalysisMock).toHaveBeenCalledTimes(1);
    expect(versionAnalysisMock).toHaveBeenCalledWith('C:\\repo');

    expect(await screen.findByRole('heading', { level: 3, name: 'Qué trae la v1.13.0' })).toBeTruthy();
    expect(screen.getByText(/Archive and the delta parser stop quietly/i)).toBeTruthy();
    expect(screen.getByText('No toca lo que GitCron usa')).toBeTruthy();
  });

  it('(b) con motor al día (sin upgrade), versionAnalysis NO se llama y NO existe «Qué trae la v»', () => {
    const versionAnalysisMock = vi.fn();
    (window as any).api = {
      ...((window as any).api ?? {}),
      pipelineOpenSpec: {
        ...((window as any).api?.pipelineOpenSpec ?? {}),
        versionAnalysis: versionAnalysisMock,
      },
    };

    render(
      <OpenSpecUpdateReview
        repoPath="C:\\repo"
        status={mockStatus}
        onBack={vi.fn()}
      />,
    );

    expect(versionAnalysisMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/Qué trae la v/i)).toBeNull();
  });

  it('(c) mientras la promesa de versionAnalysis no resuelve, el botón «Actualizar» existe y está habilitado', () => {
    const pendingPromise = new Promise(() => {});
    const versionAnalysisMock = vi.fn().mockReturnValue(pendingPromise);

    (window as any).api = {
      ...((window as any).api ?? {}),
      pipelineOpenSpec: {
        ...((window as any).api?.pipelineOpenSpec ?? {}),
        versionAnalysis: versionAnalysisMock,
      },
    };

    const upgradeStatus: OpenSpecEngineStatus = {
      ...mockStatus,
      cli: {
        ...mockStatus.cli!,
        runtimeVersion: '1.12.0',
      },
      latestAvailable: {
        ...mockStatus.latestAvailable!,
        latestVersion: '1.13.0',
      },
    };

    render(
      <OpenSpecUpdateReview
        repoPath="C:\\repo"
        status={upgradeStatus}
        onBack={vi.fn()}
      />,
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    expect(updateBtn).toBeTruthy();
    expect(updateBtn.hasAttribute('disabled')).toBe(false);

    expect(screen.getByText('Buscando las notas de la versión…')).toBeTruthy();
  });

  it('la sección «Motor y agentes» muestra «Perfil de Workflows Global» sin pulsar nada (defaultAdvancedOpen activo)', () => {
    render(
      <OpenSpecUpdateReview
        repoPath="C:/repo"
        status={mockStatus}
        onBack={vi.fn()}
      />,
    );

    const engineSection = screen.getByRole('region', { name: /Motor y agentes/i });
    expect(engineSection).toBeTruthy();
    expect(within(engineSection).getByText('Perfil de Workflows Global')).toBeTruthy();
  });

  it('renderiza el inventario de outputs usando OpenSpecOutputsList con path en code y badges en una sola línea', () => {
    const statusWithOutputs: OpenSpecEngineStatus = {
      ...mockStatus,
      installedIntegration: {
        ...mockStatus.installedIntegration!,
        outputInventory: [
          {
            id: 'output-1',
            targetName: 'Cursor Rules',
            kind: 'repo-local',
            displayPath: '.cursor/rules/openspec-*',
            descriptionKey: 'pipeline.openspec.engine.output.cursorRulesDesc',
            blocked: false,
            presenceState: 'present',
          },
        ],
      },
    };

    render(
      <OpenSpecUpdateReview
        repoPath="C:/repo"
        status={statusWithOutputs}
        onBack={vi.fn()}
      />,
    );

    const techBtn = screen.getByRole('button', { name: /Detalle técnico/i });
    fireEvent.click(techBtn);

    const titles = screen.getAllByText(/Outputs Administrables/i);
    expect(titles.length).toBeGreaterThanOrEqual(1);
    expect(titles[0].tagName.toLowerCase()).toBe('h3');

    const codePaths = screen.getAllByText('.cursor/rules/openspec-*');
    expect(codePaths.length).toBeGreaterThanOrEqual(1);
    expect(codePaths[0].tagName.toLowerCase()).toBe('code');

    expect(screen.getAllByText(/Local del repo/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Presente/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renderiza título único de sección MOTOR Y AGENTES con badge y botón de refrescar en la misma fila, sin duplicar Motor OpenSpec', () => {
    const readyStatus: OpenSpecEngineStatus = {
      ...mockStatus,
      cli: {
        ...mockStatus.cli,
        runtimeVersion: '1.12.0',
      },
      repoState: 'initialized',
      integrationState: 'up-to-date',
    };

    render(
      <OpenSpecUpdateReview
        repoPath="C:/repo"
        status={readyStatus}
        onBack={vi.fn()}
      />,
    );

    // 1. Título único de la sección "Motor y agentes" como h3
    const sectionHeadings = screen.getAllByRole('heading', { level: 3, name: /motor y agentes/i });
    expect(sectionHeadings.length).toBe(1);

    // 2. NO existe encabezado "Motor OpenSpec"
    const duplicateCardTitle = screen.queryByRole('heading', { level: 3, name: /motor openspec/i });
    expect(duplicateCardTitle).toBeNull();

    // 3. Fila del título contiene el badge de estado y el botón de refrescar
    const refreshBtn = screen.getByRole('button', { name: /releer estado/i });
    expect(refreshBtn).toBeTruthy();

    const titleContainer = sectionHeadings[0].closest('header');
    expect(titleContainer).toBeTruthy();
    if (titleContainer) {
      expect(within(titleContainer).getByText(/listo/i)).toBeTruthy();
      expect(within(titleContainer).getByRole('button', { name: /releer estado/i })).toBe(refreshBtn);
    }
  });
});
