import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRepoIgnoreFilter, isGitStateRel } from '../ipc/watchers';

type IpcHandler = (_event: unknown, ...args: unknown[]) => Promise<unknown>;

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, IpcHandler>(),
  watchers: [] as Array<{
    close: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
  }>,
  watch: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: IpcHandler) => mocks.handlers.set(channel, handler)),
  },
}));

vi.mock('chokidar', () => ({
  default: { watch: mocks.watch },
}));

describe('repository watcher lifecycle', () => {
  beforeEach(() => {
    mocks.handlers.clear();
    mocks.watch.mockReset();
    mocks.watch.mockImplementation(() => {
      const watcher = {
        close: vi.fn(async () => undefined),
        on: vi.fn(),
      };
      watcher.on.mockReturnValue(watcher);
      mocks.watchers.push(watcher);
      return watcher;
    });
  });

  afterEach(async () => {
    const { closeAllRepoWatchers } = await import('../ipc/watchers');
    await closeAllRepoWatchers();
    mocks.watchers.length = 0;
  });

  it('serializes unwatch and a quick re-watch of the same repository', async () => {
    const { registerWatcherHandlers } = await import('../ipc/watchers');
    registerWatcherHandlers(() => null);
    const watch = mocks.handlers.get('repo:watch');
    const unwatch = mocks.handlers.get('repo:unwatch');
    if (!watch || !unwatch) throw new Error('watcher handlers were not registered');

    const repoPath = 'C:/work/repo';
    await watch(null, repoPath);
    expect(mocks.watch).toHaveBeenCalledTimes(1);

    let finishClose: () => void = () => undefined;
    const closeGate = new Promise<void>((resolve) => {
      finishClose = resolve;
    });
    mocks.watchers[0].close.mockImplementation(() => closeGate);

    const closing = unwatch(null, repoPath);
    const reopening = watch(null, repoPath);
    await Promise.resolve();
    expect(mocks.watch).toHaveBeenCalledTimes(1);

    finishClose();
    await closing;
    await reopening;
    expect(mocks.watch).toHaveBeenCalledTimes(2);
  });
});

// La regla de qué se observa dentro de `.git/` es una lista blanca. Estos tests
// ejercen las funciones EXPORTADAS (no una copia): son las mismas que usa el
// observador en producción, así que lo que midió el harness (tarea 2.2) es lo
// que vale acá. Un camino "no ignorado" es el que emitiría `repo:fs-change`.
describe('filtro de observación de .git/ (whitelist de caminos de estado)', () => {
  const gitDir = 'C:/repo/.git';
  const ignored = createRepoIgnoreFilter(gitDir);

  it('deja pasar los caminos que declaran estado y atraviesa refs hacia refs/heads', () => {
    // archivos concretos de estado -> observados
    expect(ignored('C:/repo/.git/index')).toBe(false);
    expect(ignored('C:/repo/.git/HEAD')).toBe(false);
    expect(ignored('C:/repo/.git/MERGE_HEAD')).toBe(false);
    // el dir .git y la ruta hacia refs/heads se atraviesan (false) para llegar a
    // su contenido; sin esto chokidar nunca descendería.
    expect(ignored('C:/repo/.git')).toBe(false);
    expect(ignored('C:/repo/.git/refs')).toBe(false);
    expect(ignored('C:/repo/.git/refs/heads')).toBe(false);
    expect(ignored('C:/repo/.git/refs/heads/main')).toBe(false);
    // un rebase en curso
    expect(ignored('C:/repo/.git/rebase-merge')).toBe(false);
    expect(ignored('C:/repo/.git/rebase-merge/done')).toBe(false);
  });

  it('ignora el resto de .git/ (objects, logs, locks, config, refs/remotes) y el árbol excluido', () => {
    // escrituras internas frecuentes que no cambian lo que la app muestra
    expect(ignored('C:/repo/.git/objects/ab/cdef123456')).toBe(true);
    expect(ignored('C:/repo/.git/logs/HEAD')).toBe(true);
    expect(ignored('C:/repo/.git/index.lock')).toBe(true);
    expect(ignored('C:/repo/.git/COMMIT_EDITMSG')).toBe(true);
    expect(ignored('C:/repo/.git/config')).toBe(true);
    // refs/remotes y refs/tags se podan (no son ramas locales)
    expect(ignored('C:/repo/.git/refs/remotes/origin/main')).toBe(true);
    expect(ignored('C:/repo/.git/refs/tags/v1')).toBe(true);
    // árbol de trabajo: directorios excluidos siguen excluidos
    expect(ignored('C:/repo/node_modules/pkg/index.js')).toBe(true);
    expect(ignored('C:/repo/.next/build.js')).toBe(true);
    // archivo común del árbol de trabajo -> observado
    expect(ignored('C:/repo/app/page.tsx')).toBe(false);
  });

  it('normaliza separadores de Windows', () => {
    expect(ignored(String.raw`C:\repo\.git\index`)).toBe(false);
    expect(ignored(String.raw`C:\repo\.git\objects\ab\cdef`)).toBe(true);
    expect(ignored(String.raw`C:\repo\.git\refs\heads\main`)).toBe(false);
  });

  it('isGitStateRel cubre sólo la lista cerrada', () => {
    for (const rel of ['index', 'HEAD', 'MERGE_HEAD']) expect(isGitStateRel(rel)).toBe(true);
    expect(isGitStateRel('refs/heads/main')).toBe(true);
    expect(isGitStateRel('rebase-merge/foo')).toBe(true);
    expect(isGitStateRel('objects/ab/cd')).toBe(false);
    expect(isGitStateRel('logs/HEAD')).toBe(false);
    expect(isGitStateRel('config')).toBe(false);
  });
});

describe('agrupado de ráfagas dentro de .git/', () => {
  it('una ráfaga de escrituras emite un solo repo:fs-change (ventana de 250 ms)', async () => {
    vi.useFakeTimers();
    try {
      const send = vi.fn();
      const { registerWatcherHandlers } = await import('../ipc/watchers');
      registerWatcherHandlers(() => ({ webContents: { send } }) as never);
      const watch = mocks.handlers.get('repo:watch');
      if (!watch) throw new Error('repo:watch no registrado');

      await watch(null, 'C:/repo');
      const watcher = mocks.watchers[mocks.watchers.length - 1];
      const changeCall = watcher.on.mock.calls.find((call) => call[0] === 'change');
      if (!changeCall) throw new Error('handler change no registrado');
      const emit = changeCall[1] as () => void;

      // seis escrituras rápidas en .git/index durante un rebase, p. ej.
      for (let i = 0; i < 6; i++) emit();
      expect(send).not.toHaveBeenCalled(); // aún dentro de la ventana

      await vi.advanceTimersByTimeAsync(249);
      expect(send).not.toHaveBeenCalled(); // no corrió la ventana

      await vi.advanceTimersByTimeAsync(2);
      expect(send).toHaveBeenCalledTimes(1);
      // El aviso lleva `gitState`: dice si lo agrupado tocó `.git/`. El renderer
    // no relee lo mismo en los dos casos —un cambio del árbol se resuelve con
    // `git status`, uno de `.git/` exige releer ramas y log—, y sin ese dato la
    // rama nueva tardaba en aparecer y la borrada no se iba hasta refrescar a
    // mano. Acá los caminos son del árbol, así que `gitState` es `false`.
    expect(send).toHaveBeenCalledWith('repo:fs-change', { repoPath: 'C:/repo', gitState: false });
    } finally {
      vi.useRealTimers();
    }
  });
});
