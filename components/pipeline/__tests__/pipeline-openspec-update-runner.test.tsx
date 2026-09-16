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
        engine={{ installed: '1.12.0', latest: '1.13.0' }}
        integration={true}
        disabledReason="Bloqueado por rama protegida"
      />
    );
    const btn = screen.getByRole('button', { name: 'Actualizar' });
    expect(btn.hasAttribute('disabled')).toBe(true);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Bloqueado por rama protegida');
  });

  it('3) engine + integration sin warnings → clic ejecuta installGlobal UNA vez con { repoPath } y después runUpdate UNA vez con (repoPath, plan, false), en ese orden (comprobá el orden con mock.invocationCallOrder), ambas filas terminan "listo", se ve «Listo: motor v1.13.0 · integración al día», onEngineInstalled y onIntegrationUpdated una vez cada uno', async () => {
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
    (window as any).api = {
      pipelineOpenSpec: {
        installGlobal: installGlobalMock,
        runUpdate: runUpdateMock,
      },
    };

    const onEngineInstalled = vi.fn();
    const onIntegrationUpdated = vi.fn();
    const mockPlan = { files: [] } as any;

    render(
      <OpenSpecUpdateRunner
        repoPath="/mock/repo"
        engine={{ installed: '1.12.0', latest: '1.13.0' }}
        integration={true}
        updatePlan={mockPlan}
        onEngineInstalled={onEngineInstalled}
        onIntegrationUpdated={onIntegrationUpdated}
      />
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

    await screen.findByText('Listo: motor v1.13.0 · integración al día');

    expect(installGlobalMock).toHaveBeenCalledTimes(1);
    expect(installGlobalMock).toHaveBeenCalledWith({ repoPath: '/mock/repo' });
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
        engine={{ installed: '1.12.0', latest: '1.13.0' }}
        integration={false}
        warnings={{ mainBranch: 'main', dirtyCount: 3 }}
      />
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

    expect(screen.queryByText(/Estás en «main»/i)).toBeNull();
    await waitFor(() => {
      expect(installGlobalMock).toHaveBeenCalledTimes(1);
    });
    expect(installGlobalMock).toHaveBeenCalledWith({ repoPath: '/mock/repo' });
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
        engine={{ installed: '1.12.0', latest: '1.13.0' }}
        integration={true}
      />
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

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
        engine={{ installed: null, latest: '1.13.0' }}
        integration={true}
      />
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

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
        engine={{ installed: '1.12.0', latest: '1.13.0' }}
        integration={true}
      />
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

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
        engine={{ installed: '1.12.0', latest: '1.13.0' }}
        integration={true}
      />
    );

    const updateBtn = screen.getByRole('button', { name: 'Actualizar' });
    fireEvent.click(updateBtn);

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
});
