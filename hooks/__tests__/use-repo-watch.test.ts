// @vitest-environment jsdom
import { createElement } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Store falso: el cuerpo de `useRepoLoader` sólo lee selectores, así que alcanza
 * con la ruta del repositorio y setters que no hagan nada.
 */
const { storeState } = vi.hoisted(() => ({
  storeState: new Proxy(
    // `openRepos` va explícito porque `refreshLog` lo recorre; el resto son
    // setters, que el Proxy resuelve como funciones sin efecto.
    { repoPath: 'C:/repo', openRepos: [] } as Record<string, unknown>,
    { get: (target, key) => (key in target ? target[key as string] : () => undefined) },
  ),
}));

vi.mock('@/lib/git-store', () => ({
  useGitStore: Object.assign(
    (selector?: (state: unknown) => unknown) => (selector ? selector(storeState) : storeState),
    { getState: () => storeState },
  ),
}));

import { useRepoLoader, useRepoWatch } from '../use-repo-loader';

type Listener = (repoPath: string) => void;

let fsListeners: Listener[] = [];
let commitListeners: Listener[] = [];
let api: Record<string, ReturnType<typeof vi.fn>>;
let intervalSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers();
  fsListeners = [];
  commitListeners = [];
  api = {
    repoWatch: vi.fn(async () => ({ success: true })),
    repoUnwatch: vi.fn(async () => ({ success: true })),
    onRepoFsChange: vi.fn((listener: Listener) => {
      fsListeners.push(listener);
      return () => { fsListeners = fsListeners.filter((entry) => entry !== listener); };
    }),
    onRepoCommitsChanged: vi.fn((listener: Listener) => {
      commitListeners.push(listener);
      return () => { commitListeners = commitListeners.filter((entry) => entry !== listener); };
    }),
    gitStatus: vi.fn(async () => ({ success: true, data: [] })),
    gitLog: vi.fn(async () => ({ success: true, data: [] })),
    gitBranches: vi.fn(async () => ({ success: true, data: [] })),
  };
  (window as unknown as { api: unknown }).api = api;
  intervalSpy = vi.spyOn(window, 'setInterval');
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete (window as unknown as { api?: unknown }).api;
});

/** Consumidor típico: pide las funciones de refresco y nada más. */
function Consumer() {
  useRepoLoader();
  return null;
}

function Watcher() {
  useRepoWatch();
  return null;
}

describe('useRepoLoader · obtener las funciones no observa', () => {
  it('does not subscribe or start timers for any number of consumers', () => {
    render(createElement('div', null,
      createElement(Consumer), createElement(Consumer), createElement(Consumer),
    ));

    expect(api.onRepoFsChange).not.toHaveBeenCalled();
    expect(api.onRepoCommitsChanged).not.toHaveBeenCalled();
    expect(api.repoWatch).not.toHaveBeenCalled();
    expect(intervalSpy).not.toHaveBeenCalled();
  });
});

describe('useRepoWatch · observación única', () => {
  it('creates exactly one subscription per event and one timer', () => {
    render(createElement('div', null,
      createElement(Watcher), createElement(Consumer), createElement(Consumer),
    ));

    expect(api.repoWatch).toHaveBeenCalledTimes(1);
    expect(fsListeners).toHaveLength(1);
    expect(commitListeners).toHaveLength(1);
    expect(intervalSpy).toHaveBeenCalledTimes(1);
  });

  it('rereads the working tree once per filesystem change', async () => {
    render(createElement('div', null,
      createElement(Watcher), createElement(Consumer), createElement(Consumer),
    ));

    await act(async () => {
      for (const listener of fsListeners) listener('C:/repo');
      // El refresco está debounced 150 ms en el renderer.
      vi.advanceTimersByTime(200);
    });

    expect(api.gitStatus).toHaveBeenCalledTimes(1);
  });

  it('rereads log, status and branches once when the app commits', async () => {
    render(createElement('div', null, createElement(Watcher), createElement(Consumer)));

    await act(async () => {
      for (const listener of commitListeners) listener('C:/repo');
    });

    expect(api.gitLog).toHaveBeenCalledTimes(1);
    expect(api.gitStatus).toHaveBeenCalledTimes(1);
    expect(api.gitBranches).toHaveBeenCalledTimes(1);
  });

  it('cleans up its timer, listeners and watch on unmount', async () => {
    const clearSpy = vi.spyOn(window, 'clearInterval');
    const { unmount } = render(createElement(Watcher));

    unmount();

    expect(clearSpy).toHaveBeenCalled();
    expect(fsListeners).toHaveLength(0);
    expect(commitListeners).toHaveLength(0);
    expect(api.repoUnwatch).toHaveBeenCalledWith('C:/repo');
  });

  it('does not run a pending debounced refresh after unmounting', async () => {
    const { unmount } = render(createElement(Watcher));

    // Cambio observado y desmontaje antes de que venza el debounce.
    for (const listener of fsListeners) listener('C:/repo');
    unmount();
    await act(async () => { vi.advanceTimersByTime(500); });

    expect(api.gitStatus).not.toHaveBeenCalled();
  });
});

// Guardia del latido (tarea 3.x): `refreshStatusIfChanged` sólo puede SALTEAR una
// relectura; nunca descarta un evento. Ante ambigüedad (primera vez, sin firma, o
// force) se lee. El path disparado por un evento de fs no pasa por acá.
describe('useRepoLoader · guardia del latido (refreshStatusIfChanged)', () => {
  let guard: (p?: string, opts?: { force?: boolean }) => Promise<void> = async () => undefined;
  let GuardConsumer: () => null;
  // Firma mutable: el test la cambia entre llamadas para simular index que
  // cambia o no.
  let sig: { mtimeMs: number; size: number; ino: number } | null;

  beforeEach(() => {
    sig = { mtimeMs: 1000, size: 50, ino: 7 };
    api.gitIndexSignature = vi.fn(async () => ({ success: true, data: sig }));
    GuardConsumer = function GuardConsumer() {
      const { refreshStatusIfChanged } = useRepoLoader();
      guard = refreshStatusIfChanged;
      return null;
    };
  });

  it('lee la primera vez, saltea si el index no cambió, lee si cambió y force siempre lee', async () => {
    render(createElement(GuardConsumer));
    (api.gitStatus as ReturnType<typeof vi.fn>).mockClear();

    // 1) primera vez: no hay firma previa -> lee
    await act(async () => { await guard('C:/repo'); });
    expect(api.gitStatus).toHaveBeenCalledTimes(1);

    // 2) sin cambios -> saltea
    await act(async () => { await guard('C:/repo'); });
    expect(api.gitStatus).toHaveBeenCalledTimes(1);

    // 3) cambió el index -> lee
    sig = { mtimeMs: 2000, size: 51, ino: 7 };
    await act(async () => { await guard('C:/repo'); });
    expect(api.gitStatus).toHaveBeenCalledTimes(2);

    // 4) force aunque no cambie -> lee (nunca descarta)
    await act(async () => { await guard('C:/repo', { force: true }); });
    expect(api.gitStatus).toHaveBeenCalledTimes(3);

    // 5) sin firma -> ante la duda, lee
    sig = null;
    await act(async () => { await guard('C:/repo'); });
    expect(api.gitStatus).toHaveBeenCalledTimes(4);
  });
});

// Cadencia adaptativa (tarea 4.x): un único intervalo; quieto lee cada ~10 s,
// activo (tras un evento) con frecuencia ~2 s. Sin firma -> la guardia siempre
// lee, así esto aísla la cadencia del comportamiento de la guardia.
describe('useRepoWatch · cadencia adaptativa del latido', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    api.gitIndexSignature = vi.fn(async () => ({ success: true, data: null }));
  });

  it('quieto lee cada ~10 s; un evento lo devuelve al escalón activo (más frecuente)', async () => {
    render(createElement('div', null, createElement(Watcher), createElement(Consumer)));

    // ventana A: 8 s sin eventos => quieto => a lo sumo 1 lectura
    (api.gitStatus as ReturnType<typeof vi.fn>).mockClear();
    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
    const quietReads = (api.gitStatus as ReturnType<typeof vi.fn>).mock.calls.length;

    // un evento devuelve al escalón activo
    for (const listener of fsListeners) listener('C:/repo');
    await act(async () => { await vi.advanceTimersByTimeAsync(200); }); // flush del debounce del fs-change
    (api.gitStatus as ReturnType<typeof vi.fn>).mockClear();

    // ventana B: 8 s tras el evento => activo => varias lecturas
    await act(async () => { await vi.advanceTimersByTimeAsync(8000); });
    const activeReads = (api.gitStatus as ReturnType<typeof vi.fn>).mock.calls.length;

    expect(quietReads).toBeLessThanOrEqual(1);
    expect(activeReads).toBeGreaterThanOrEqual(2);
    expect(activeReads).toBeGreaterThan(quietReads);
  });
});
