import { beforeEach, describe, expect, it } from 'vitest';
import { resetRepoQueues, withRepoLock } from '../git/repo-queue';

/**
 * Dos operaciones de Git sobre el mismo índice a la vez producen
 * `Unable to create index.lock: File exists`. Estas pruebas fijan que no puedan
 * solaparse, y —tanto o más importante— que un fallo no deje la cola trabada:
 * eso congelaría todas las operaciones de ese repositorio.
 */
describe('cola de operaciones por repositorio', () => {
  beforeEach(resetRepoQueues);

  function tracked(log: string[], name: string, ms = 0) {
    return async () => {
      log.push(`${name}:start`);
      await new Promise((resolve) => setTimeout(resolve, ms));
      log.push(`${name}:end`);
      return name;
    };
  }

  it('no solapa dos operaciones sobre el mismo repositorio', async () => {
    const log: string[] = [];
    const first = withRepoLock('C:/repo', tracked(log, 'a', 20));
    const second = withRepoLock('C:/repo', tracked(log, 'b'));

    await expect(Promise.all([first, second])).resolves.toEqual(['a', 'b']);
    expect(log).toEqual(['a:start', 'a:end', 'b:start', 'b:end']);
  });

  it('trata como el mismo repositorio a rutas equivalentes', async () => {
    const log: string[] = [];
    // Mismo índice escrito de tres formas: sin normalizar quedarían en colas
    // distintas y volverían a chocar.
    const calls = [
      withRepoLock('C:/repo', tracked(log, 'a', 15)),
      withRepoLock('C:\\repo', tracked(log, 'b')),
      withRepoLock('c:\\repo', tracked(log, 'c')),
    ];
    await Promise.all(calls);
    expect(log).toEqual(['a:start', 'a:end', 'b:start', 'b:end', 'c:start', 'c:end']);
  });

  it('deja correr en paralelo repositorios distintos', async () => {
    const log: string[] = [];
    await Promise.all([
      withRepoLock('C:/uno', tracked(log, 'uno', 20)),
      withRepoLock('C:/dos', tracked(log, 'dos')),
    ]);
    // El segundo repositorio no espera al primero: son índices distintos.
    expect(log.indexOf('dos:end')).toBeLessThan(log.indexOf('uno:end'));
  });

  it('un fallo no traba la cola ni contamina a la siguiente', async () => {
    const log: string[] = [];
    const failing = withRepoLock('C:/repo', async () => { throw new Error('boom'); });
    await expect(failing).rejects.toThrow('boom');

    await expect(withRepoLock('C:/repo', tracked(log, 'despues'))).resolves.toBe('despues');
    expect(log).toEqual(['despues:start', 'despues:end']);
  });

  it('propaga el error al llamador, sin tragárselo', async () => {
    await expect(withRepoLock('C:/repo', async () => { throw new Error('real'); }))
      .rejects.toThrow('real');
  });
});
