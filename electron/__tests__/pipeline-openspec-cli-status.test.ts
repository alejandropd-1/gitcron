import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests del wrapper `statusOpenSpecChangeWithCli`. No spawnean el CLI real: se
 * intercepta `execFile` para devolver un stdout controlado, igual que los
 * demás wrappers del módulo se prueban indirectamente desde el reader.
 *
 * Lo que se cubre acá es el mapeo del JSON del CLI a los tipos propios y la
 * degradación a `{ available: false }` cuando no se puede leer el grafo.
 */

const execFileMock = vi.fn();

vi.mock('node:child_process', () => ({
  execFile: (...args: unknown[]) => execFileMock(...args),
}));

// Se importa después del mock para que el promisify interno tome el falso.
const { statusOpenSpecChangeWithCli } = await import('../pipeline/openspec-cli');

describe('statusOpenSpecChangeWithCli', () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mapea el JSON del CLI al grafo propio', async () => {
    // El CLI llama a `status` con `missingDeps` sólo en los bloqueados.
    execFileMock.mockImplementation((_cmd, _args, _opts, callback: (e: unknown, r: { stdout: string; stderr: string }) => void) => {
      callback(null, {
        stdout: JSON.stringify({
          artifacts: [
            { id: 'proposal', status: 'done' },
            { id: 'design', status: 'ready' },
            { id: 'specs', status: 'ready' },
            { id: 'tasks', status: 'blocked', missingDeps: ['design', 'specs'] },
          ],
          applyRequires: ['tasks'],
          isComplete: false,
        }),
        stderr: '',
      });
    });

    const result = await statusOpenSpecChangeWithCli('C:/repo', 'mi-cambio');

    expect(result.available).toBe(true);
    expect(result.isComplete).toBe(false);
    expect(result.applyRequires).toEqual(['tasks']);
    expect(result.artifacts).toEqual([
      { id: 'proposal', state: 'done', missingDeps: [] },
      { id: 'design', state: 'ready', missingDeps: [] },
      { id: 'specs', state: 'ready', missingDeps: [] },
      { id: 'tasks', state: 'blocked', missingDeps: ['design', 'specs'] },
    ]);
  });

  it('rechaza el changeId inválido sin tocar el CLI', async () => {
    const result = await statusOpenSpecChangeWithCli('C:/repo', '../fuera');
    expect(result.available).toBe(false);
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it('devuelve unavailable cuando el CLI falla, sin lanzar', async () => {
    // Un fallo del binario (ENOENT, timeout) llega como error. No saber si el
    // grafo existe no es lo mismo que saber que está vacío.
    execFileMock.mockImplementation((_cmd, _args, _opts, callback: (e: unknown) => void) => {
      callback(new Error('spawn ENOENT'));
    });

    const result = await statusOpenSpecChangeWithCli('C:/repo', 'mi-cambio');

    expect(result.available).toBe(false);
    expect(result.artifacts).toEqual([]);
    expect(result.applyRequires).toEqual([]);
    expect(result.isComplete).toBe(false);
  });

  it('devuelve unavailable cuando la salida no es JSON válido', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, callback: (e: unknown, r: { stdout: string; stderr: string }) => void) => {
      callback(null, { stdout: 'no es json', stderr: '' });
    });

    const result = await statusOpenSpecChangeWithCli('C:/repo', 'mi-cambio');
    expect(result.available).toBe(false);
  });

  it('descarta artefactos con estado desconocido sin romper el resto del grafo', async () => {
    // Una versión futura del CLI podría sumar estados. Un artefacto que no
    // encaja se omite en vez de tirar todo el mapeo.
    execFileMock.mockImplementation((_cmd, _args, _opts, callback: (e: unknown, r: { stdout: string; stderr: string }) => void) => {
      callback(null, {
        stdout: JSON.stringify({
          artifacts: [
            { id: 'proposal', status: 'done' },
            { id: 'coso', status: 'half-done' },
            { id: 'tasks', status: 'blocked', missingDeps: ['proposal'] },
          ],
          applyRequires: ['tasks'],
          isComplete: false,
        }),
        stderr: '',
      });
    });

    const result = await statusOpenSpecChangeWithCli('C:/repo', 'mi-cambio');

    expect(result.available).toBe(true);
    expect(result.artifacts.map((a) => a.id)).toEqual(['proposal', 'tasks']);
  });
});
