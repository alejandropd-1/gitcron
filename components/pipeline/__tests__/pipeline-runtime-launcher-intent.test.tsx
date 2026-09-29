// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RuntimeDiscoveryEntry } from '@/types/pipeline';
import { PipelineRuntimeLauncher } from '../PipelineRuntimeLauncher';

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

const DISCOVERY_FIXTURE: RuntimeDiscoveryEntry[] = [
  {
    runtime: 'claude',
    adapterId: 'adapter-claude',
    installed: true,
    runtimeVersion: '1.0.0',
    launchable: true,
    evidenceStatus: 'verified',
    startAvailability: 'available',
    startConstraints: ['edita archivos y corre comandos con Read, Grep, Glob, Edit, Write, Bash'],
    startModifiesRepo: true,
    startRunsCommands: true,
    diagnostics: [],
  },
  {
    runtime: 'codex',
    adapterId: 'adapter-codex',
    installed: true,
    runtimeVersion: '0.143.0',
    launchable: true,
    evidenceStatus: 'verified',
    startAvailability: 'available',
    startConstraints: ['workspace-write sandbox'],
    startModifiesRepo: true,
    startRunsCommands: true,
    diagnostics: [],
  },
];

describe('PipelineRuntimeLauncher — capacidades unificadas y confirmación explícita', { timeout: 15_000 }, () => {
  const startSpy = vi.fn().mockResolvedValue({ success: true, data: { sessionId: 'sess-test' } });
  const discoverSpy = vi.fn().mockResolvedValue({ success: true, data: DISCOVERY_FIXTURE });

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        pipelineRuntime: {
          discover: discoverSpy,
          start: startSpy,
          stop: vi.fn(),
        },
      },
    });
  });

  afterEach(() => {
    cleanup();
    delete (window as { api?: unknown }).api;
  });

  it('montaje con Codex para escribir una propuesta: disponible sin alternativa forzada y exige confirmación que nombra archivos y comandos', async () => {
    render(
      <PipelineRuntimeLauncher
        repoPath="C:/repo-test"
        projection={null}
        intent="write-artifact"
        changeId="change-abc"
        taskId="task-xyz"
        initialInstruction="Escribir la propuesta para change-abc"
      />,
    );

    // Espera a que resuelva el discovery inicial
    await vi.waitFor(() => expect(screen.getByRole('combobox')).toBeDefined());

    const select = screen.getByRole('combobox') as HTMLSelectElement;

    // Cambiar a Codex para la intención write-artifact
    await act(async () => {
      fireEvent.change(select, { target: { value: 'codex' } });
    });

    // Codex ahora admite workspace-write: NO muestra alerta de indisponibilidad ni fuerza alternativa
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: /pipeline\.launcher\.intent\.useAlternative/ })).toBeNull();

    // Muestra la confirmación previa que nombra archivos y comandos
    const confirmCheckbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(confirmCheckbox).toBeDefined();
    expect(screen.getByText('pipeline.launcher.confirmWrite')).toBeDefined();

    // El botón de inicio está deshabilitado mientras no se confirme
    const startButton = screen.getByRole('button', { name: 'pipeline.launcher.start' }) as HTMLButtonElement;
    expect(startButton.disabled).toBe(true);

    // Confirmar que la IA modificará archivos y correrá comandos
    fireEvent.click(confirmCheckbox);
    expect(startButton.disabled).toBe(false);

    // Iniciar la sesión con Codex
    await act(async () => {
      fireEvent.click(startButton);
    });

    // El contrato enviado a start conserva el cambio y la tarea destino y la instrucción original con runtime codex
    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(startSpy).toHaveBeenCalledWith({
      repoPath: 'C:/repo-test',
      runtime: 'codex',
      instruction: 'Escribir la propuesta para change-abc',
      changeId: 'change-abc',
      taskId: 'task-xyz',
    });
  });

  it('«implementar una tarea» con Claude está disponible para correr pruebas sin aviso de degradación', async () => {
    render(
      <PipelineRuntimeLauncher
        repoPath="C:/repo-test"
        projection={null}
        intent="implement-task"
        changeId="change-implement"
        taskId="task-1.2"
        initialInstruction="Implementar la tarea 1.2"
      />,
    );

    await vi.waitFor(() => expect(screen.getByRole('combobox')).toBeDefined());

    // Con Claude y Bash habilitado: no hay aviso de pruebas ausentes ni alert
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();

    // Exige confirmación explícita
    const confirmCheckbox = screen.getByRole('checkbox') as HTMLInputElement;
    const startButton = screen.getByRole('button', { name: 'pipeline.launcher.start' }) as HTMLButtonElement;
    expect(startButton.disabled).toBe(true);

    fireEvent.click(confirmCheckbox);
    expect(startButton.disabled).toBe(false);

    await act(async () => {
      fireEvent.click(startButton);
    });

    expect(startSpy).toHaveBeenCalledWith({
      repoPath: 'C:/repo-test',
      runtime: 'claude',
      instruction: 'Implementar la tarea 1.2',
      changeId: 'change-implement',
      taskId: 'task-1.2',
    });
  });
});
