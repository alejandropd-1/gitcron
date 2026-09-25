// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenSpecUpdateRunner } from '../OpenSpecUpdateRunner';
import { usePipelineStore } from '@/lib/pipeline-store';
import { useGitStore } from '@/lib/git-store';

describe('OpenSpecUpdateRunner (Tarea 8.22 b2 primera mitad)', () => {
  beforeEach(() => {
    usePipelineStore.getState().reset();
    useGitStore.getState().setSuccess(null);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('1) sin engine ni integration → botón «Todo al día» deshabilitado', () => {
    render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={null}
        integration={false}
      />
    );
    const btn = screen.getByRole('button', { name: 'Todo al día' });
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('2) con disabledReason → «Actualizar» deshabilitado y el motivo visible', () => {
    render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: '1.12.0', latest: '1.13.0', provenance: 'global' }}
        integration={true}
        disabledReason="Bloqueado por rama protegida"
      />
    );
    const btn = screen.getByRole('button', { name: 'Actualizar' });
    expect(btn.hasAttribute('disabled')).toBe(true);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Bloqueado por rama protegida');
  });

  it('3) engine + integration sin warnings → clic ejecuta installGlobal UNA vez con { repoPath, targetVersion } y después runUpdate UNA vez con (repoPath, plan, false), en ese orden (comprobá el orden con mock.invocationCallOrder), ambas filas terminan "listo", se ve «Listo: motor v1.13.0 · integración al día», onEngineInstalled y onIntegrationUpdated una vez cada uno', async () => {
    const installGlobalMock = vi.fn().mockResolvedValue({
      success: true,
      engineStatus: {
        cli: { installed: true, runtimeVersion: '1.13.0' },
        doctor: { data: {} },
        globalConfig: { profileState: 'ready' },
      },
    });
    const runUpdateMock = vi.fn().mockResolvedValue({
      success: true,
      filesUpdated: ['package.json', '.openspec/config.yaml'],
    });
    const getInstallPlanMock = vi.fn().mockResolvedValue({
      detectedManager: 'npm',
      packageManagerPath: '/usr/local/bin/npm',
      nodePath: '/usr/local/bin/node',
      globalCommand: 'npm install -g @fission-ai/openspec@1.13.0',
      hasManifest: false,
    });
    (window as any).api = {
      pipelineOpenSpec: {
        installGlobal: installGlobalMock,
        runUpdate: runUpdateMock,
        getInstallPlan: getInstallPlanMock,
      },
    };

    const onEngineInstalled = vi.fn();
    const onIntegrationUpdated = vi.fn();
    const mockPlan = { files: [] } as any;

    render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: '1.12.0', latest: '1.13.0', provenance: 'global' }}
        integration={true}
        updatePlan={mockPlan}
        onEngineInstalled={onEngineInstalled}
        onIntegrationUpdated={onIntegrationUpdated}
      />
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

    const confirmBtn = screen.getByRole('button', { name: 'Confirmar instalación global' });
    fireEvent.click(confirmBtn);

    await screen.findByText('Listo: motor v1.13.0 · integración al día');

    expect(installGlobalMock).toHaveBeenCalledTimes(1);
    expect(installGlobalMock).toHaveBeenCalledWith({ repoPath: '/mock/repo', targetVersion: '1.13.0' });
    expect(runUpdateMock).toHaveBeenCalledTimes(1);
    expect(runUpdateMock).toHaveBeenCalledWith('/mock/repo', undefined, false);
    expect(useGitStore.getState().success).toContain('OpenSpec actualizado');

    expect(installGlobalMock.mock.invocationCallOrder[0]).toBeLessThan(
      runUpdateMock.mock.invocationCallOrder[0]
    );

    expect(onEngineInstalled).toHaveBeenCalledTimes(1);
    expect(onIntegrationUpdated).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Motor v1\.13\.0 instalado y respondiendo\./i)).toBeTruthy();
    expect(screen.getByText(/Integración actualizada · 2 archivos actualizados/i)).toBeTruthy();
  });

  it('4) sólo integration con warnings { mainBranch: "main", dirtyCount: 3 } → el clic NO ejecuta nada y muestra la caja; «Cancelar» la cierra sin ejecutar; «Actualizar igual» ejecuta runUpdate', async () => {
    const runUpdateMock = vi.fn().mockResolvedValue({
      success: true,
      filesUpdated: ['file1.ts'],
    });
    (window as any).api = {
      pipelineOpenSpec: {
        runUpdate: runUpdateMock,
      },
    };

    render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={null}
        integration={true}
        warnings={{ mainBranch: 'main', dirtyCount: 3 }}
      />
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

    expect(runUpdateMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Estás en «main»/i)).toBeTruthy();
    expect(screen.getByText(/Tenés 3 archivos sin confirmar/i)).toBeTruthy();

    const cancelBtn = screen.getByRole('button', { name: 'Cancelar' });
    fireEvent.click(cancelBtn);

    expect(screen.queryByText(/Estás en «main»/i)).toBeNull();
    expect(runUpdateMock).not.toHaveBeenCalled();

    const updateBtnAgain = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtnAgain);

    const updateAnywayBtn = screen.getByRole('button', { name: 'Actualizar igual' });
    fireEvent.click(updateAnywayBtn);

    await waitFor(() => {
      expect(runUpdateMock).toHaveBeenCalledTimes(1);
    });
    expect(runUpdateMock).toHaveBeenCalledWith('/mock/repo', undefined, false);
  });

  it('5) sólo engine con warnings → no muestra la caja (los avisos son de la integración) y ejecuta installGlobal directo', async () => {
    const installGlobalMock = vi.fn().mockResolvedValue({
      success: true,
      engineStatus: {
        cli: { installed: true, runtimeVersion: '1.13.0' },
        doctor: { data: {} },
        globalConfig: { profileState: 'ready' },
      },
    });
    (window as any).api = {
      pipelineOpenSpec: {
        installGlobal: installGlobalMock,
      },
    };

    render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: '1.12.0', latest: '1.13.0', provenance: 'global' }}
        integration={false}
        warnings={{ mainBranch: 'main', dirtyCount: 3 }}
      />
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

    expect(screen.queryByText(/Estás en «main»/i)).toBeNull();
    const confirmBtn = screen.getByRole('button', { name: 'Confirmar instalación global' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(installGlobalMock).toHaveBeenCalledTimes(1);
    });
    expect(installGlobalMock).toHaveBeenCalledWith({ repoPath: '/mock/repo', targetVersion: '1.13.0' });
  });

  it('6) engine cuyo resultado trae engineStatus con runtimeVersion null → fila motor "falló" con «la versión no se puede leer», runUpdate NO se llama, se ve «No se actualizó la integración…» y el botón «Volver a v1.12.0»; el clic llama a installGlobal por segunda vez con targetVersion "1.12.0"', async () => {
    const installGlobalMock = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        engineStatus: {
          cli: { installed: true, runtimeVersion: null },
          doctor: null,
          globalConfig: null,
        },
      })
      .mockResolvedValueOnce({
        success: true,
        engineStatus: {
          cli: { installed: true, runtimeVersion: '1.12.0' },
          doctor: { data: {} },
          globalConfig: { profileState: 'ready' },
        },
      });

    const runUpdateMock = vi.fn();
    (window as any).api = {
      pipelineOpenSpec: {
        installGlobal: installGlobalMock,
        runUpdate: runUpdateMock,
      },
    };

    render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: '1.12.0', latest: '1.13.0', provenance: 'global' }}
        integration={true}
      />
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

    const confirmBtn = screen.getByRole('button', { name: 'Confirmar instalación global' });
    fireEvent.click(confirmBtn);

    await screen.findByText(/la versión no se puede leer/i);
    expect(runUpdateMock).not.toHaveBeenCalled();
    expect(
      screen.getByText('No se actualizó la integración porque el motor no responde')
    ).toBeTruthy();

    const rollbackBtn = screen.getByRole('button', { name: 'Volver a v1.12.0' });
    fireEvent.click(rollbackBtn);

    await waitFor(() => {
      expect(installGlobalMock).toHaveBeenCalledTimes(2);
    });
    expect(installGlobalMock.mock.calls[1][0]).toEqual({
      repoPath: '/mock/repo',
      targetVersion: '1.12.0',
    });

    await screen.findByText(/Motor v1\.12\.0 instalado y respondiendo\./i);
    expect(screen.queryByRole('button', { name: 'Volver a v1.12.0' })).toBeNull();
  });

  it('7) engine con installed null y motor roto → NO hay botón «Volver a»', async () => {
    const installGlobalMock = vi.fn().mockResolvedValue({
      success: true,
      engineStatus: {
        cli: { installed: true, runtimeVersion: null },
        doctor: null,
        globalConfig: null,
      },
    });
    (window as any).api = {
      pipelineOpenSpec: {
        installGlobal: installGlobalMock,
      },
    };

    render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: null, latest: '1.13.0', provenance: 'global' }}
        integration={true}
      />
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

    const confirmBtn = screen.getByRole('button', { name: 'Confirmar instalación global' });
    fireEvent.click(confirmBtn);

    await screen.findByText(/la versión no se puede leer/i);
    expect(screen.queryByRole('button', { name: /Volver a/i })).toBeNull();
  });

  it('8) installGlobal con success false → fila "falló" con el error y runUpdate NO se llama', async () => {
    const installGlobalMock = vi.fn().mockResolvedValue({
      success: false,
      error: 'Permiso denegado al escribir en npm global',
    });
    const runUpdateMock = vi.fn();
    (window as any).api = {
      pipelineOpenSpec: {
        installGlobal: installGlobalMock,
        runUpdate: runUpdateMock,
      },
    };

    const beforeToken = usePipelineStore.getState().engineChangeToken;

    render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: '1.12.0', latest: '1.13.0', provenance: 'global' }}
        integration={true}
      />
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

    const confirmBtn = screen.getByRole('button', { name: 'Confirmar instalación global' });
    fireEvent.click(confirmBtn);

    await screen.findByText('Permiso denegado al escribir en npm global');
    expect(runUpdateMock).not.toHaveBeenCalled();
    expect(usePipelineStore.getState().engineChangeToken).toBe(beforeToken);
  });

  it('9) runUpdate con success false y errors ["x"] → fila integración "falló" con «x» y el banner de fallo; notifyEngineChanged igual se llamó', async () => {
    const runUpdateMock = vi.fn().mockResolvedValue({
      success: false,
      errors: ['x'],
    });
    (window as any).api = {
      pipelineOpenSpec: {
        runUpdate: runUpdateMock,
      },
    };

    const beforeToken = usePipelineStore.getState().engineChangeToken;

    render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={null}
        integration={true}
      />
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

    await screen.findByText('x');
    expect(
      screen.getByText('La actualización no terminó bien; mirá el paso marcado')
    ).toBeTruthy();
    expect(usePipelineStore.getState().engineChangeToken).toBe(beforeToken + 1);
  });

  it('10) (a) tras una corrida exitosa, volver a renderizar con engine={null} e integration={false} (rerender) mantiene el banner «Listo» y NO muestra «Todo al día»', async () => {
    const installGlobalMock = vi.fn().mockResolvedValue({
      success: true,
      engineStatus: {
        cli: { installed: true, runtimeVersion: '1.13.0' },
        doctor: { data: {} },
        globalConfig: { profileState: 'ready' },
      },
    });
    const runUpdateMock = vi.fn().mockResolvedValue({
      success: true,
      filesUpdated: ['package.json'],
    });
    (window as any).api = {
      pipelineOpenSpec: {
        installGlobal: installGlobalMock,
        runUpdate: runUpdateMock,
      },
    };

    const { rerender } = render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: '1.12.0', latest: '1.13.0', provenance: 'global' }}
        integration={true}
      />
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

    const confirmBtn = screen.getByRole('button', { name: 'Confirmar instalación global' });
    fireEvent.click(confirmBtn);

    await screen.findByText('Listo: motor v1.13.0 · integración al día');

    // Rerender con engine={null} e integration={false}
    rerender(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={null}
        integration={false}
      />
    );

    expect(screen.getByText('Listo: motor v1.13.0 · integración al día')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Todo al día' })).toBeNull();
  });

  it('11) (c) runUpdate con errors ["global-config-changed"] muestra «El plan de actualización quedó viejo» conservando el código entre paréntesis (8.22 e)', async () => {
    const runUpdateMock = vi.fn().mockResolvedValue({
      success: false,
      errors: ['global-config-changed'],
    });
    (window as any).api = {
      pipelineOpenSpec: {
        runUpdate: runUpdateMock,
      },
    };

    render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={null}
        integration={true}
      />
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

    const staleMsg = await screen.findByText(/El plan de actualización quedó viejo/i);
    expect(staleMsg.textContent).toContain('global-config-changed');
  });

  it('12) sólo integración: runUpdate se llama SIEMPRE con undefined como plan (8.22 e) y toastDone se emite con el resumen correspondiente', async () => {
    const runUpdateMock = vi.fn().mockResolvedValue({
      success: true,
      filesUpdated: ['spec.md'],
    });
    (window as any).api = {
      pipelineOpenSpec: {
        runUpdate: runUpdateMock,
      },
    };
    const mockPlan = { files: ['spec.md'] } as any;

    render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={null}
        integration={true}
        updatePlan={mockPlan}
      />
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

    await screen.findByText('Listo: integración al día');
    expect(runUpdateMock).toHaveBeenCalledWith('/mock/repo', undefined, false);
    expect(useGitStore.getState().success).toBe('OpenSpec actualizado: integración al día');
  });

  it('13) con motor nuevo, repo inicializado e integration=false: el plan anuncia ambos pasos, tras el éxito del motor se llama runUpdate y el paso de integración pasa a done (8.22 c)', async () => {
    const installGlobalMock = vi.fn().mockResolvedValue({
      success: true,
      engineStatus: {
        cli: { installed: true, runtimeVersion: '1.13.1' },
        doctor: { data: {} },
        globalConfig: { profileState: 'ready' },
      },
    });
    const runUpdateMock = vi.fn().mockResolvedValue({
      success: true,
      filesUpdated: ['package.json'],
    });
    (window as any).api = {
      pipelineOpenSpec: {
        installGlobal: installGlobalMock,
        runUpdate: runUpdateMock,
      },
    };

    const onEngineInstalled = vi.fn();
    const onIntegrationUpdated = vi.fn();

    render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: '1.13.0', latest: '1.13.1', provenance: 'global' }}
        repoInitialized={true}
        integration={false}
        onEngineInstalled={onEngineInstalled}
        onIntegrationUpdated={onIntegrationUpdated}
      />
    );

    // Antes del clic, la línea «Va a: …» anuncia los dos pasos
    expect(
      screen.getByText('Va a: actualizar el motor en toda la máquina a v1.13.1 · actualizar la integración de este repositorio')
    ).toBeTruthy();

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

    const confirmBtn = screen.getByRole('button', { name: 'Confirmar instalación global' });
    fireEvent.click(confirmBtn);

    await screen.findByText('Listo: motor v1.13.1 · integración al día');

    expect(installGlobalMock).toHaveBeenCalledTimes(1);
    expect(installGlobalMock).toHaveBeenCalledWith({ repoPath: '/mock/repo', targetVersion: '1.13.1' });
    expect(runUpdateMock).toHaveBeenCalledTimes(1);
    expect(runUpdateMock).toHaveBeenCalledWith('/mock/repo', undefined, false);

    expect(installGlobalMock.mock.invocationCallOrder[0]).toBeLessThan(
      runUpdateMock.mock.invocationCallOrder[0]
    );

    expect(onEngineInstalled).toHaveBeenCalledTimes(1);
    expect(onIntegrationUpdated).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Motor v1\.13\.1 instalado y respondiendo\./i)).toBeTruthy();
    expect(screen.getByText(/Integración actualizada · 1 archivos actualizados/i)).toBeTruthy();
  });

  it('14) con motor nuevo y repo no inicializado: no se llama runUpdate y no se muestra el paso de integración (8.22 c)', async () => {
    const installGlobalMock = vi.fn().mockResolvedValue({
      success: true,
      engineStatus: {
        cli: { installed: true, runtimeVersion: '1.13.1' },
        doctor: { data: {} },
        globalConfig: { profileState: 'ready' },
      },
    });
    const runUpdateMock = vi.fn();
    (window as any).api = {
      pipelineOpenSpec: {
        installGlobal: installGlobalMock,
        runUpdate: runUpdateMock,
      },
    };

    render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: '1.13.0', latest: '1.13.1', provenance: 'global' }}
        repoInitialized={false}
        integration={false}
      />
    );

    // Antes del clic, la línea sólo anuncia el motor
    expect(
      screen.getByText('Va a: actualizar el motor en toda la máquina a v1.13.1')
    ).toBeTruthy();
    expect(
      screen.queryByText(/Actualizar la integración de este repositorio/i)
    ).toBeNull();

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

    const confirmBtn = screen.getByRole('button', { name: 'Confirmar instalación global' });
    fireEvent.click(confirmBtn);

    await screen.findByText(/Motor v1\.13\.1 instalado y respondiendo\./i);

    expect(installGlobalMock).toHaveBeenCalledTimes(1);
    expect(runUpdateMock).not.toHaveBeenCalled();
    expect(
      screen.queryByText(/Actualizar la integración de este repositorio/i)
    ).toBeNull();
  });

  it('15) con blocked: no se llama a runUpdate ni installGlobal y se muestra el motivo (8.22 c)', () => {
    const installGlobalMock = vi.fn();
    const runUpdateMock = vi.fn();
    (window as any).api = {
      pipelineOpenSpec: {
        installGlobal: installGlobalMock,
        runUpdate: runUpdateMock,
      },
    };

    render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: '1.13.0', latest: '1.13.1', provenance: 'global' }}
        repoInitialized={true}
        integration={false}
        disabledReason="Bloqueado por repositorio sucio"
      />
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    expect(updateBtn.hasAttribute('disabled')).toBe(true);

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Bloqueado por repositorio sucio');

    fireEvent.click(updateBtn);
    expect(installGlobalMock).not.toHaveBeenCalled();
    expect(runUpdateMock).not.toHaveBeenCalled();
  });

  it('16) 3.1: el texto del plan cambia según la procedencia: local vs global', () => {
    const { rerender } = render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: '1.12.0', latest: '1.13.0', provenance: 'local' }}
        integration={false}
      />
    );
    expect(
      screen.getByText('Va a: actualizar el motor de este repositorio a v1.13.0')
    ).toBeTruthy();
    expect(screen.queryByText(/actualizar el motor en toda la máquina/i)).toBeNull();

    rerender(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: '1.12.0', latest: '1.13.0', provenance: 'global' }}
        integration={false}
      />
    );
    expect(
      screen.getByText('Va a: actualizar el motor en toda la máquina a v1.13.0')
    ).toBeTruthy();
    expect(screen.queryByText(/actualizar el motor de este repositorio/i)).toBeNull();
  });

  it('17) 3.2: con procedencia local, clic en Actualizar llama a installLocal con { repoPath, targetVersion } y NUNCA a installGlobal', async () => {
    const installLocalMock = vi.fn().mockResolvedValue({
      success: true,
      engineStatus: {
        cli: { installed: true, runtimeVersion: '1.13.0', provenance: 'local' },
        doctor: { data: {} },
        globalConfig: { profileState: 'ready' },
      },
    });
    const installGlobalMock = vi.fn();
    (window as any).api = {
      pipelineOpenSpec: {
        installLocal: installLocalMock,
        installGlobal: installGlobalMock,
      },
    };

    render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: '1.12.0', latest: '1.13.0', provenance: 'local' }}
        integration={false}
      />
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

    await screen.findByText(/Motor v1\.13\.0 instalado y respondiendo\./i);
    expect(installLocalMock).toHaveBeenCalledTimes(1);
    expect(installLocalMock).toHaveBeenCalledWith({
      repoPath: '/mock/repo',
      targetVersion: '1.13.0',
    });
    expect(installGlobalMock).not.toHaveBeenCalled();
  });

  it('18) 3.3: con procedencia managed o unknown, el motor se declara no disponible, el botón queda deshabilitado y no ejecuta nada', () => {
    const installLocalMock = vi.fn();
    const installGlobalMock = vi.fn();
    const runUpdateMock = vi.fn();
    (window as any).api = {
      pipelineOpenSpec: {
        installLocal: installLocalMock,
        installGlobal: installGlobalMock,
        runUpdate: runUpdateMock,
      },
    };

    const { rerender } = render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: '1.12.0', latest: '1.13.0', provenance: 'managed' }}
        integration={true}
      />
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    expect(updateBtn.hasAttribute('disabled')).toBe(true);

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain(
      'No se puede actualizar el motor desde acá: lo administra otra herramienta'
    );
    expect(alert.textContent).not.toContain('managed');
    expect(alert.textContent).not.toContain('unknown');

    fireEvent.click(updateBtn);
    expect(installLocalMock).not.toHaveBeenCalled();
    expect(installGlobalMock).not.toHaveBeenCalled();
    expect(runUpdateMock).not.toHaveBeenCalled();

    // Rerender with 'unknown' provenance
    rerender(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: '1.12.0', latest: '1.13.0', provenance: 'unknown' }}
        integration={true}
      />
    );

    const updateBtnUnknown = screen.getByRole('button', { name: 'Actualizar' });
    expect(updateBtnUnknown.hasAttribute('disabled')).toBe(true);
    const alertUnknown = screen.getByRole('alert');
    expect(alertUnknown.textContent).toContain(
      'No se puede actualizar el motor desde acá: GitCron no pudo saber si es la copia de este repositorio o la del sistema'
    );
    expect(alertUnknown.textContent).not.toContain('unknown');
    expect(alertUnknown.textContent).not.toContain('managed');
    fireEvent.click(updateBtnUnknown);
    expect(installLocalMock).not.toHaveBeenCalled();
    expect(installGlobalMock).not.toHaveBeenCalled();
    expect(runUpdateMock).not.toHaveBeenCalled();
  });

  it('19) 3.4: caso OdontoPau: instalación local exitosa pero responde 1.5.0 local con pedida 1.13.2 → falla con version-mismatch, runUpdate NO se llama, no hay cartel Listo', async () => {
    const installLocalMock = vi.fn().mockResolvedValue({
      success: true,
      engineStatus: {
        cli: { installed: true, runtimeVersion: '1.5.0', provenance: 'local' },
        doctor: { data: {} },
        globalConfig: { profileState: 'ready' },
      },
    });
    const runUpdateMock = vi.fn();
    (window as any).api = {
      pipelineOpenSpec: {
        installLocal: installLocalMock,
        runUpdate: runUpdateMock,
      },
    };

    render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: '1.5.0', latest: '1.13.2', provenance: 'local' }}
        integration={true}
      />
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

    await screen.findByText(/El motor responde v1\.5\.0 pero se pidió v1\.13\.2 \(local del repositorio\)/i);

    expect(runUpdateMock).not.toHaveBeenCalled();
    expect(
      screen.getByText('No se actualizó la integración porque el motor no quedó en la versión pedida')
    ).toBeTruthy();
    expect(
      screen.queryByText('No se actualizó la integración porque el motor no responde')
    ).toBeNull();
    expect(screen.queryByText(/Listo: motor/i)).toBeNull();
    expect(useGitStore.getState().success).toBeNull();
  });

  it('20) 3.5: volver a la versión anterior vuelve por el mismo canal: local tras fallo llama a installLocal y no a installGlobal', async () => {
    const installLocalMock = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        engineStatus: {
          cli: { installed: true, runtimeVersion: '1.5.0', provenance: 'local' },
          doctor: { data: {} },
          globalConfig: { profileState: 'ready' },
        },
      })
      .mockResolvedValueOnce({
        success: true,
        engineStatus: {
          cli: { installed: true, runtimeVersion: '1.5.0', provenance: 'local' },
          doctor: { data: {} },
          globalConfig: { profileState: 'ready' },
        },
      });

    const installGlobalMock = vi.fn();
    (window as any).api = {
      pipelineOpenSpec: {
        installLocal: installLocalMock,
        installGlobal: installGlobalMock,
      },
    };

    render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: '1.5.0', latest: '1.13.2', provenance: 'local' }}
        integration={false}
      />
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

    await screen.findByText(/El motor responde v1\.5\.0 pero se pidió v1\.13\.2 \(local del repositorio\)/i);

    const rollbackBtn = screen.getByRole('button', { name: 'Volver a v1.5.0' });
    fireEvent.click(rollbackBtn);

    await waitFor(() => {
      expect(installLocalMock).toHaveBeenCalledTimes(2);
    });
    expect(installLocalMock.mock.calls[1][0]).toEqual({
      repoPath: '/mock/repo',
      targetVersion: '1.5.0',
    });
    expect(installGlobalMock).not.toHaveBeenCalled();

    await screen.findByText(/Motor v1\.5\.0 instalado y respondiendo\./i);
  });

  it('20b) 3.5: handleRollback usa siempre ranEngine y no props mutadas: tras mismatch rerender con engine.installed="1.13.1" y provenance="global" sigue llamando installLocal con "1.5.0"', async () => {
    const installLocalMock = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        engineStatus: {
          cli: { installed: true, runtimeVersion: '1.5.0', provenance: 'local' },
          doctor: { data: {} },
          globalConfig: { profileState: 'ready' },
        },
      })
      .mockResolvedValueOnce({
        success: true,
        engineStatus: {
          cli: { installed: true, runtimeVersion: '1.5.0', provenance: 'local' },
          doctor: { data: {} },
          globalConfig: { profileState: 'ready' },
        },
      });

    const installGlobalMock = vi.fn();
    (window as any).api = {
      pipelineOpenSpec: {
        installLocal: installLocalMock,
        installGlobal: installGlobalMock,
      },
    };

    const { rerender } = render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: '1.5.0', latest: '1.13.2', provenance: 'local' }}
        integration={false}
      />
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

    await screen.findByText(/El motor responde v1\.5\.0 pero se pidió v1\.13\.2 \(local del repositorio\)/i);

    // Se mutan las props en un rerender externo:
    rerender(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: '1.13.1', latest: '1.13.2', provenance: 'global' }}
        integration={false}
      />
    );

    // El botón debe seguir ofreciendo volver a la versión capturada al correr (1.5.0) y no a 1.13.1
    const rollbackBtn = screen.getByRole('button', { name: 'Volver a v1.5.0' });
    expect(screen.queryByRole('button', { name: 'Volver a v1.13.1' })).toBeNull();
    fireEvent.click(rollbackBtn);

    await waitFor(() => {
      expect(installLocalMock).toHaveBeenCalledTimes(2);
    });
    // Llamó al canal local original con targetVersion: '1.5.0', no al canal global ni con '1.13.1'
    expect(installLocalMock.mock.calls[1][0]).toEqual({
      repoPath: '/mock/repo',
      targetVersion: '1.5.0',
    });
    expect(installGlobalMock).not.toHaveBeenCalled();
  });

  it('21) 4.1: con procedencia global: confirmación previa con datos del canal, cancelar con 0 llamadas, confirmar con 1 llamada; warnings aparecen antes', async () => {
    const installGlobalMock = vi.fn().mockResolvedValue({
      success: true,
      engineStatus: {
        cli: { installed: true, runtimeVersion: '1.13.0', provenance: 'global' },
        doctor: { data: {} },
        globalConfig: { profileState: 'ready' },
      },
    });
    const runUpdateMock = vi.fn().mockResolvedValue({
      success: true,
      filesUpdated: ['package.json'],
    });
    const getInstallPlanMock = vi.fn().mockImplementation((payload) => {
      const ver = (typeof payload === 'object' && payload?.targetVersion) ? payload.targetVersion : 'latest';
      return Promise.resolve({
        detectedManager: 'npm',
        packageManagerPath: '/usr/local/bin/npm',
        nodePath: '/usr/local/bin/node',
        globalCommand: `npm install -g @fission-ai/openspec@${ver}`,
        hasManifest: false,
      });
    });
    (window as any).api = {
      pipelineOpenSpec: {
        installGlobal: installGlobalMock,
        runUpdate: runUpdateMock,
        getInstallPlan: getInstallPlanMock,
      },
    };

    const { rerender } = render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: '1.12.0', latest: '1.13.0', provenance: 'global' }}
        integration={true}
        openRepoPaths={['/mock/repo1', '/mock/repo2']}
      />
    );

    await waitFor(() => {
      expect(getInstallPlanMock).toHaveBeenCalledWith({
        repoPath: '/mock/repo',
        targetVersion: '1.13.0',
      });
    });

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

    // No debe haber llamado todavía a installGlobal
    expect(installGlobalMock).not.toHaveBeenCalled();

    // Muestra la confirmación global con comando específico y NO @latest
    await screen.findByText(/npm install -g @fission-ai\/openspec@1\.13\.0/);
    expect(screen.queryByText(/@latest/)).toBeNull();
    expect(screen.getByText(/\/mock\/repo1, \/mock\/repo2/)).toBeTruthy();

    // Cancelar no ejecuta y restaura el botón
    const cancelBtn = screen.getByRole('button', { name: 'Cancelar' });
    fireEvent.click(cancelBtn);

    expect(installGlobalMock).not.toHaveBeenCalled();
    expect(screen.queryByText(/npm install -g/)).toBeNull();
    const restoredUpdateBtn = screen.getByRole('button', { name: 'Actualizar' });
    expect(restoredUpdateBtn).toBeTruthy();

    // Volver a abrir y confirmar
    fireEvent.click(restoredUpdateBtn);
    const confirmBtn = await screen.findByRole('button', { name: 'Confirmar instalación global' });
    fireEvent.click(confirmBtn);

    await screen.findByText('Listo: motor v1.13.0 · integración al día');
    expect(installGlobalMock).toHaveBeenCalledTimes(1);
    expect(installGlobalMock).toHaveBeenCalledWith({
      repoPath: '/mock/repo',
      targetVersion: '1.13.0',
    });
    expect(runUpdateMock).toHaveBeenCalledTimes(1);

    // Caso con warnings: la advertencia de main/dirty aparece antes
    installGlobalMock.mockClear();
    rerender(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: '1.12.0', latest: '1.13.0', provenance: 'global' }}
        integration={true}
        warnings={{ mainBranch: 'main', dirtyCount: 2 }}
      />
    );

    const updateBtnWithWarnings = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtnWithWarnings);

    // Primero advertencias
    expect(screen.getByText(/Estás en «main»/i)).toBeTruthy();
    expect(installGlobalMock).not.toHaveBeenCalled();

    // Confirmar advertencias lleva a confirmación global
    const updateAnywayBtn = screen.getByRole('button', { name: 'Actualizar igual' });
    fireEvent.click(updateAnywayBtn);

    const confirmGlobalBtn = await screen.findByRole('button', { name: 'Confirmar instalación global' });
    expect(installGlobalMock).not.toHaveBeenCalled();

    fireEvent.click(confirmGlobalBtn);
    await waitFor(() => {
      expect(installGlobalMock).toHaveBeenCalledTimes(1);
    });
  });

  it('22) 4.2: con procedencia local: no aparece confirmación global y ejecuta installLocal directo', async () => {
    const installLocalMock = vi.fn().mockResolvedValue({
      success: true,
      engineStatus: {
        cli: { installed: true, runtimeVersion: '1.13.0', provenance: 'local' },
        doctor: { data: {} },
        globalConfig: { profileState: 'ready' },
      },
    });
    (window as any).api = {
      pipelineOpenSpec: {
        installLocal: installLocalMock,
      },
    };

    render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: '1.12.0', latest: '1.13.0', provenance: 'local' }}
        integration={false}
      />
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

    // No aparece la confirmación global
    expect(screen.queryByRole('button', { name: 'Confirmar instalación global' })).toBeNull();
    await waitFor(() => {
      expect(installLocalMock).toHaveBeenCalledTimes(1);
    });
    expect(installLocalMock).toHaveBeenCalledWith({
      repoPath: '/mock/repo',
      targetVersion: '1.13.0',
    });
  });

  it('23) 4.1: si el pedido de getInstallPlan está pendiente, la confirmación no contiene @latest y muestra resolución pendiente', async () => {
    const installGlobalMock = vi.fn().mockResolvedValue({ success: true });
    const getInstallPlanMock = vi.fn().mockReturnValue(new Promise(() => {}));
    (window as any).api = {
      pipelineOpenSpec: {
        installGlobal: installGlobalMock,
        getInstallPlan: getInstallPlanMock,
      },
    };

    render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: '1.12.0', latest: '1.13.0', provenance: 'global' }}
        integration={true}
        openRepoPaths={['/mock/repo1']}
      />
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

    // Debe mostrar la confirmación global sin comando resuelto
    expect(screen.getByRole('button', { name: 'Confirmar instalación global' })).toBeTruthy();
    expect(screen.queryByText(/@latest/)).toBeNull();
    expect(
      screen.getByText('El comando se resolverá automáticamente según el gestor detectado (pnpm, npm, yarn o bun).')
    ).toBeTruthy();
  });

  it('24) 4.1: si el pedido de getInstallPlan falla, la confirmación no contiene @latest y muestra resolución pendiente', async () => {
    const installGlobalMock = vi.fn().mockResolvedValue({ success: true });
    const getInstallPlanMock = vi.fn().mockRejectedValue(new Error('Plan resolution error'));
    (window as any).api = {
      pipelineOpenSpec: {
        installGlobal: installGlobalMock,
        getInstallPlan: getInstallPlanMock,
      },
    };

    render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: '1.12.0', latest: '1.13.0', provenance: 'global' }}
        integration={true}
        openRepoPaths={['/mock/repo1']}
      />
    );

    await waitFor(() => {
      expect(getInstallPlanMock).toHaveBeenCalled();
    });

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

    // Debe mostrar la confirmación global sin comando resuelto
    expect(screen.getByRole('button', { name: 'Confirmar instalación global' })).toBeTruthy();
    expect(screen.queryByText(/@latest/)).toBeNull();
    expect(
      screen.getByText('El comando se resolverá automáticamente según el gestor detectado (pnpm, npm, yarn o bun).')
    ).toBeTruthy();
  });
});
