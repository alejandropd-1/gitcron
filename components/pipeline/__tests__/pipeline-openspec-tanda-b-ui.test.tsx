// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { OpenSpecEngineCard } from '../OpenSpecEngineCard';
import { OpenSpecUpdateReview } from '../OpenSpecUpdateReview';
import type { OpenSpecEngineStatus } from '../../../types/pipeline';

afterEach(() => {
  cleanup();
  delete (window as unknown as { api?: unknown }).api;
});

function makeStatus(overrides?: Partial<OpenSpecEngineStatus>): OpenSpecEngineStatus {
  return {
    cli: {
      installed: true,
      runtimeVersion: '1.13.2',
      provenance: 'global',
      displayPath: 'C:\\global\\openspec.cmd',
      supportedRange: { min: '1.5.0', max: '1.13.2' },
      versionClass: 'supported',
      evidenceStatus: 'confirmed',
      diagnostics: [],
    },
    latestAvailable: {
      status: 'online',
      latestVersion: '1.13.2',
      checkedAt: 'now',
      fromCache: false,
      cacheAgeSeconds: 0,
      freshness: 'fresh',
      error: null,
    },
    globalConfig: null,
    installedIntegration: {
      skills: [],
      generatedBy: '1.13.2',
      markersFound: [],
      outputInventory: [],
      evidenceStatus: 'confirmed',
      tools: ['antigravity', 'claude', 'codex'],
      targets: ['antigravity', 'claude', 'codex'],
      configuredTools: ['antigravity', 'claude', 'codex'],
      presentToolDirectories: ['antigravity', 'claude', 'codex', 'zcode'],
      configuredAgentsCount: 3,
      totalPresentAgentsCount: 4,
      configuredCount: 3,
      totalPresentCount: 4,
      installedWorkflowsByTarget: {
        antigravity: ['apply', 'archive', 'explore', 'propose', 'sync', 'update'],
        claude: ['apply', 'archive', 'explore', 'propose', 'sync', 'update'],
        codex: ['apply', 'archive', 'explore', 'propose', 'sync', 'update'],
      },
      missing: null,
      legacy: [],
      customized: [],
      conflicts: null,
    },
    repoState: 'initialized',
    integrationState: 'up-to-date',
    pendingTools: ['zcode'],
    toolReport: {
      source: 'engine',
      engineVersion: '1.13.2',
      tools: [
        {
          id: 'antigravity',
          label: 'Antigravity',
          skillsDir: '.agents',
          available: true,
          configured: true,
          needsUpdate: false,
          generatedBy: '1.13.2',
        },
        {
          id: 'zcode',
          label: 'Zcode',
          skillsDir: '.zcode',
          available: true,
          configured: false,
          needsUpdate: false,
          generatedBy: null,
        },
      ],
      profileSyncNeeded: [],
    },
    ...overrides,
  };
}

describe('Tarea 4.2: UI - OpenSpecEngineCard & OpenSpecUpdateReview', () => {
  it('Tarjeta: muestra pendiente como «Falta configurar: <nombre>» con acción Configurar y SIN botón Actualizar', () => {
    const status = makeStatus();
    render(<OpenSpecEngineCard status={status} compact={false} repoPath="/test/repo" />);

    // Muestra «Falta configurar: Zcode»
    expect(screen.getByText(/Falta configurar: zcode/i)).toBeDefined();

    // Botón «Configurar» presente para la pendiente
    const configureBtn = screen.getByRole('button', { name: /Configurar/i });
    expect(configureBtn).toBeDefined();

    // NO hay botón «Actualizar» provocado por la herramienta pendiente
    // (con integrationState: up-to-date y CLI al día, no hay botón Actualizar)
    const updateButtons = screen.queryAllByRole('button', { name: /^Actualizar$/i });
    expect(updateButtons).toHaveLength(0);
  });

  it('Tarjeta: con source "engine", NO muestra aviso de respaldo', () => {
    const status = makeStatus({
      toolReport: {
        source: 'engine',
        engineVersion: '1.13.2',
        tools: [],
        profileSyncNeeded: [],
      },
    });
    render(<OpenSpecEngineCard status={status} compact={false} repoPath="/test/repo" />);

    // No debe mostrar ningún texto de aviso de respaldo
    expect(screen.queryByText(/lista propia de herramientas de GitCron/i)).toBeNull();
    expect(screen.queryByText(/package-not-found/i)).toBeNull();
  });

  it('Tarjeta: con source "gitcron-fallback", muestra aviso en criollo sin ids internos', () => {
    const status = makeStatus({
      toolReport: {
        source: 'gitcron-fallback',
        engineVersion: null,
        fallbackReason: 'package-not-found',
        tools: [],
        profileSyncNeeded: [],
      },
    });
    render(<OpenSpecEngineCard status={status} compact={false} repoPath="/test/repo" />);

    // Aviso visible
    expect(screen.getByText(/lista propia de herramientas de GitCron/i)).toBeDefined();
    // Explica el motivo en criollo sin id crudo
    expect(screen.getByText(/no se encontró el paquete de OpenSpec en el sistema ni en el repositorio/i)).toBeDefined();
    expect(screen.queryByText(/package-not-found/i)).toBeNull();
  });

  it('Revisión: con herramienta pendiente y source fallback, muestra aviso y pendiente sin botón Actualizar', () => {
    const status = makeStatus({
      toolReport: {
        source: 'gitcron-fallback',
        engineVersion: null,
        fallbackReason: 'version-mismatch',
        tools: [
          {
            id: 'zcode',
            label: 'Zcode',
            skillsDir: '.zcode',
            available: true,
            configured: false,
            needsUpdate: false,
            generatedBy: null,
          },
        ],
        profileSyncNeeded: [],
      },
    });

    render(
      <OpenSpecUpdateReview
        status={status}
        repoPath="/test/repo"
        onBack={() => {}}
      />,
    );

    // Aviso de respaldo presente
    expect(screen.getAllByText(/lista propia de herramientas de GitCron/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/la versión del paquete no coincide con la versión del motor/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/version-mismatch/i)).toBeNull();

    // El botón principal dice «Todo al día» y está deshabilitado
    const mainActionBtn = screen.getByRole('button', { name: /Todo al día/i });
    expect(mainActionBtn).toBeDefined();
    expect((mainActionBtn as HTMLButtonElement).disabled).toBe(true);

    // No hay botón «Actualizar»
    expect(screen.queryByRole('button', { name: /^Actualizar$/i })).toBeNull();
  });

  it('Tarjeta: init devuelve success:false con openspec-cli-not-found -> muestra error traducido y botón re-habilitado para reintentar', async () => {
    const initMock = vi.fn().mockResolvedValue({
      success: false,
      error: 'openspec-cli-not-found',
      needsTool: false,
    });
    (window as unknown as { api: unknown }).api = { pipelineInitOpenSpec: initMock };

    const status = makeStatus();
    render(<OpenSpecEngineCard status={status} compact={false} repoPath="/test/repo" />);

    const configureBtn = screen.getByRole('button', { name: /Configurar/i });
    expect((configureBtn as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(configureBtn);

    // Aparece el error traducido en criollo
    expect(await screen.findByText(/No se encontró el ejecutable de OpenSpec en el sistema/i)).toBeDefined();
    // El botón vuelve a estar habilitado para reintentar
    expect((configureBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('Tarjeta: init rechaza -> muestra error con detalle y botón re-habilitado para reintentar', async () => {
    const initMock = vi.fn().mockRejectedValue(new Error('Fallo de conexión'));
    (window as unknown as { api: unknown }).api = { pipelineInitOpenSpec: initMock };

    const status = makeStatus();
    render(<OpenSpecEngineCard status={status} compact={false} repoPath="/test/repo" />);

    const configureBtn = screen.getByRole('button', { name: /Configurar/i });
    expect((configureBtn as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(configureBtn);

    // Aparece el error con el detalle
    expect(await screen.findByText(/No se pudo configurar la herramienta: Fallo de conexión/i)).toBeDefined();
    // El botón vuelve a estar habilitado para reintentar
    expect((configureBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('Tarjeta: init devuelve invalid-tool-id -> traduce el código conocido y permite reintentar con éxito', async () => {
    const initMock = vi
      .fn()
      .mockResolvedValueOnce({
        success: false,
        error: 'invalid-tool-id',
        needsTool: false,
      })
      .mockResolvedValueOnce({
        success: true,
        needsTool: false,
      });
    (window as unknown as { api: unknown }).api = { pipelineInitOpenSpec: initMock };

    const status = makeStatus();
    render(<OpenSpecEngineCard status={status} compact={false} repoPath="/test/repo" />);

    const configureBtn = screen.getByRole('button', { name: /Configurar/i });
    fireEvent.click(configureBtn);

    expect(await screen.findByText(/Identificador de herramienta no reconocido o no válido/i)).toBeDefined();
    expect((configureBtn as HTMLButtonElement).disabled).toBe(false);

    // Reintentar con éxito limpia el error previo
    fireEvent.click(configureBtn);
    expect(await screen.findByText(/Falta configurar: zcode/i)).toBeDefined();
    expect(screen.queryByText(/Identificador de herramienta no reconocido o no válido/i)).toBeNull();
  });
});
