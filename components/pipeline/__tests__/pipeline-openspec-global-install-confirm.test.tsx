// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenSpecGlobalInstallConfirm } from '../OpenSpecGlobalInstallConfirm';
import type { OpenSpecEngineStatus } from '@/types/pipeline';

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

describe('OpenSpecGlobalInstallConfirm (Corrección 3)', () => {
  afterEach(cleanup);

  it('caso 1: confirmar llama al canal pipelineOpenSpec.installGlobal una sola vez sin targetVersion', async () => {
    const installGlobalMock = vi.fn().mockResolvedValue({ success: true, mode: 'global' });
    (window as any).api = {
      pipelineOpenSpec: {
        installGlobal: installGlobalMock,
      },
    };
    const onInstalledMock = vi.fn();
    const onCancelMock = vi.fn();

    render(
      <OpenSpecGlobalInstallConfirm
        command="npm i -g @fission-ai/openspec@latest"
        nodePath="/usr/bin/node"
        packageManagerPath="/usr/bin/npm"
        repoPath="C:\\repo"
        onCancel={onCancelMock}
        onInstalled={onInstalledMock}
      />,
    );

    const confirmBtn = screen.getByRole('button', {
      name: 'pipeline.openspec.engine.install.confirmGlobalAction',
    });
    fireEvent.click(confirmBtn);

    await vi.waitFor(() => {
      expect(installGlobalMock).toHaveBeenCalledTimes(1);
    });
    expect(installGlobalMock).toHaveBeenCalledWith({ repoPath: expect.stringContaining('repo') });
    expect(installGlobalMock.mock.calls[0][0]).not.toHaveProperty('targetVersion');
    expect(onInstalledMock).toHaveBeenCalledTimes(1);
    expect(onCancelMock).not.toHaveBeenCalled();
  });

  it('caso 2: cancelar no llama al canal y ejecuta onCancel', async () => {
    const installGlobalMock = vi.fn();
    (window as any).api = {
      pipelineOpenSpec: {
        installGlobal: installGlobalMock,
      },
    };
    const onCancelMock = vi.fn();
    const onInstalledMock = vi.fn();

    render(
      <OpenSpecGlobalInstallConfirm
        command="npm i -g @fission-ai/openspec@latest"
        onCancel={onCancelMock}
        onInstalled={onInstalledMock}
      />,
    );

    const cancelBtn = screen.getByRole('button', {
      name: 'pipeline.openspec.engine.install.cancelGlobalAction',
    });
    fireEvent.click(cancelBtn);

    expect(installGlobalMock).not.toHaveBeenCalled();
    expect(onCancelMock).toHaveBeenCalledTimes(1);
    expect(onInstalledMock).not.toHaveBeenCalled();
  });

  it('caso 3: error devuelto por installGlobal se muestra al usuario', async () => {
    const installGlobalMock = vi.fn().mockResolvedValue({
      success: false,
      code: 'permission-denied',
      error: 'EACCES: permission denied',
    });
    (window as any).api = {
      pipelineOpenSpec: {
        installGlobal: installGlobalMock,
      },
    };
    const onInstalledMock = vi.fn();
    const onCancelMock = vi.fn();

    render(
      <OpenSpecGlobalInstallConfirm
        command="npm i -g @fission-ai/openspec@latest"
        onCancel={onCancelMock}
        onInstalled={onInstalledMock}
      />,
    );

    const confirmBtn = screen.getByRole('button', {
      name: 'pipeline.openspec.engine.install.confirmGlobalAction',
    });
    fireEvent.click(confirmBtn);

    expect(await screen.findByRole('alert')).toBeDefined();
    expect(await screen.findByText('pipeline.openspec.engine.install.error.permissionDenied')).toBeDefined();
    expect(installGlobalMock).toHaveBeenCalledTimes(1);
    expect(onInstalledMock).not.toHaveBeenCalled();
  });

  it('caso 4: éxito con engineStatus sano muestra mensaje de éxito y Cerrar, sin botón Volver a', async () => {
    const healthyEngineStatus = {
      cli: { installed: true, runtimeVersion: '1.13.0' },
      doctor: { ok: true, data: {} },
      globalConfig: { profileState: 'read' },
    } as unknown as OpenSpecEngineStatus;

    const installGlobalMock = vi.fn().mockResolvedValue({
      success: true,
      mode: 'global',
      engineStatus: healthyEngineStatus,
    });
    (window as any).api = {
      pipelineOpenSpec: {
        installGlobal: installGlobalMock,
      },
    };

    render(
      <OpenSpecGlobalInstallConfirm
        repoPath="C:\\repo"
        installedVersion="1.12.0"
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'pipeline.openspec.engine.install.confirmGlobalAction' }));

    const statusP = await screen.findByRole('status');
    expect(statusP.textContent).toContain('pipeline.openspec.engine.afterInstall.ok:{"version":"1.13.0"}');
    expect(screen.getByRole('button', { name: 'common.close' })).toBeDefined();
    expect(screen.queryByRole('button', { name: /rollback|Volver/i })).toBeNull();
  });

  it('caso 5: éxito con runtimeVersion null e installedVersion ofrece Volver a vX.Y.Z y hace segunda llamada con targetVersion', async () => {
    const brokenEngineStatus = {
      cli: { installed: true, runtimeVersion: null },
      globalConfig: { profileState: 'read' },
    } as unknown as OpenSpecEngineStatus;

    const installGlobalMock = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        mode: 'global',
        engineStatus: brokenEngineStatus,
      })
      .mockResolvedValueOnce({
        success: true,
        mode: 'global',
        engineStatus: {
          cli: { installed: true, runtimeVersion: '1.12.0' },
          doctor: { ok: true, data: {} },
          globalConfig: { profileState: 'read' },
        },
      });

    (window as any).api = {
      pipelineOpenSpec: {
        installGlobal: installGlobalMock,
      },
    };
    const onInstalledMock = vi.fn();

    render(
      <OpenSpecGlobalInstallConfirm
        repoPath="C:\\repo"
        installedVersion="1.12.0"
        onCancel={vi.fn()}
        onInstalled={onInstalledMock}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'pipeline.openspec.engine.install.confirmGlobalAction' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('pipeline.openspec.engine.afterInstall.broken');
    expect(alert.textContent).toContain('pipeline.openspec.engine.afterInstall.versionUnreadable');

    const rollbackBtn = screen.getByRole('button', {
      name: 'pipeline.openspec.engine.afterInstall.rollback:{"version":"1.12.0"}',
    });
    expect(rollbackBtn).toBeDefined();

    fireEvent.click(rollbackBtn);

    await vi.waitFor(() => {
      expect(installGlobalMock).toHaveBeenCalledTimes(2);
    });
    expect(installGlobalMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        repoPath: expect.stringContaining('repo'),
        targetVersion: '1.12.0',
      }),
    );
    expect(onInstalledMock).toHaveBeenCalledTimes(2);
  });

  it('caso 6: éxito con motor roto pero sin installedVersion no ofrece botón Volver a', async () => {
    const brokenEngineStatus = {
      cli: { installed: true, runtimeVersion: null },
    } as unknown as OpenSpecEngineStatus;

    const installGlobalMock = vi.fn().mockResolvedValue({
      success: true,
      mode: 'global',
      engineStatus: brokenEngineStatus,
    });
    (window as any).api = {
      pipelineOpenSpec: {
        installGlobal: installGlobalMock,
      },
    };

    render(
      <OpenSpecGlobalInstallConfirm
        repoPath="C:\\repo"
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'pipeline.openspec.engine.install.confirmGlobalAction' }));

    expect(await screen.findByRole('alert')).toBeDefined();
    expect(screen.queryByRole('button', { name: /rollback|Volver/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'common.close' })).toBeDefined();
  });

  it('caso 7: éxito sin engineStatus muestra no se pudo verificar y con installedVersion muestra Volver a', async () => {
    const installGlobalMock = vi.fn().mockResolvedValue({
      success: true,
      mode: 'global',
      engineStatus: null,
    });
    (window as any).api = {
      pipelineOpenSpec: {
        installGlobal: installGlobalMock,
      },
    };

    render(
      <OpenSpecGlobalInstallConfirm
        repoPath="C:\\repo"
        installedVersion="1.12.0"
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'pipeline.openspec.engine.install.confirmGlobalAction' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('pipeline.openspec.engine.afterInstall.unverified');

    const rollbackBtn = screen.getByRole('button', {
      name: 'pipeline.openspec.engine.afterInstall.rollback:{"version":"1.12.0"}',
    });
    expect(rollbackBtn).toBeDefined();
  });

  it('caso 8: pulsar Cerrar en fase done ejecuta onCancel una sola vez', async () => {
    const installGlobalMock = vi.fn().mockResolvedValue({
      success: true,
      mode: 'global',
      engineStatus: {
        cli: { installed: true, runtimeVersion: '1.13.0' },
        doctor: { ok: true, data: {} },
        globalConfig: { profileState: 'read' },
      },
    });
    (window as any).api = {
      pipelineOpenSpec: {
        installGlobal: installGlobalMock,
      },
    };
    const onCancelMock = vi.fn();

    render(
      <OpenSpecGlobalInstallConfirm
        repoPath="C:\\repo"
        onCancel={onCancelMock}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'pipeline.openspec.engine.install.confirmGlobalAction' }));

    const closeBtn = await screen.findByRole('button', { name: 'common.close' });
    fireEvent.click(closeBtn);

    expect(onCancelMock).toHaveBeenCalledTimes(1);
  });

  it('caso 9: con packageManagerName «pnpm» se muestra «pnpm: ruta»; sin la prop se muestra «npm: ruta»', () => {
    const { rerender } = render(
      <OpenSpecGlobalInstallConfirm
        packageManagerPath={'C:\\Program Files\\pnpm\\pnpm.cmd'}
        packageManagerName="pnpm"
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('pnpm: C:\\Program Files\\pnpm\\pnpm.cmd')).toBeDefined();

    rerender(
      <OpenSpecGlobalInstallConfirm
        packageManagerPath={'C:\\Program Files\\nodejs\\npm.cmd'}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('npm: C:\\Program Files\\nodejs\\npm.cmd')).toBeDefined();
  });
});
