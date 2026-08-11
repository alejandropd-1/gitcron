import { describe, expect, it } from 'vitest';
import { useGitStore, type GitFile } from '../git-store';

/**
 * Protege el requisito de `idle-render-isolation`: el store no notifica cuando
 * un updater recibe un patch que no altera ningún campo. Es la defensa contra el
 * re-render ocioso del latido, que llama a `updateRepoByPath` cada 2 s y, sin
 * este guard, reconstruía `openRepos` y notificaba a los suscriptores aunque el
 * árbol no hubiera cambiado.
 *
 * Se prueba a nivel de `useGitStore.getState()`/`.subscribe()` (Zustand vanilla),
 * sin render de React: el contrato que importa es que el store no emita una
 * referencia nueva de `openRepos` sin delta.
 */

function armarRepositorioActivo() {
  // Resetea el store a un estado conocido: un repositorio activo con datos
  // representativos (primitivos, arrays y objetos, que cubren la igualdad por
  // referencia que usa el guard).
  useGitStore.setState({
    openRepos: [
      {
        path: 'C:/repo',
        name: 'repo',
        currentBranch: 'main',
        branches: ['main'],
        remoteBranches: [],
        commits: [],
        modifiedFiles: [],
        stashes: [],
        tags: [],
        submodules: [],
        remotes: [],
        branchTracking: {},
        worktrees: [],
        pullRequests: [],
        commitMessage: '',
        selectedCommit: null,
        selectedFile: null,
        currentDiff: '',
        graphShowAllBranches: false,
        graphMode: 'classic',
        cartographyExpandedRoles: [],
        inCartography: false,
        isLoading: false,
        error: null,
        success: null,
        lastFetchError: null,
        mergeInProgress: false,
        rebaseInProgress: false,
      },
    ],
    activeRepoIdx: 0,
  });
}

function contarNotificaciones(accion: () => void): number {
  let conteo = 0;
  const unsuscribir = useGitStore.subscribe(() => { conteo += 1; });
  accion();
  unsuscribir();
  return conteo;
}

describe('updateRepoByPath · no notifica sin delta', () => {
  it('no notifica cuando el patch repite los valores vigentes', () => {
    armarRepositorioActivo();
    // Patch con los mismos valores que ya viven en el repo.
    const notificaciones = contarNotificaciones(() => {
      useGitStore.getState().updateRepoByPath('C:/repo', {
        currentBranch: 'main',
        modifiedFiles: [],
        mergeInProgress: false,
      });
    });
    expect(notificaciones).toBe(0);
  });

  it('no notifica tras 10 llamadas consecutivas con el mismo patch sin delta', () => {
    armarRepositorioActivo();
    const notificaciones = contarNotificaciones(() => {
      for (let i = 0; i < 10; i++) {
        useGitStore.getState().updateRepoByPath('C:/repo', { currentBranch: 'main' });
      }
    });
    // Baseline antes del fix: 10/10. Después: 0/10.
    expect(notificaciones).toBe(0);
  });

  it('sí notifica cuando el patch cambia un campo', () => {
    armarRepositorioActivo();
    const notificaciones = contarNotificaciones(() => {
      useGitStore.getState().updateRepoByPath('C:/repo', { currentBranch: 'feature/x' });
    });
    expect(notificaciones).toBe(1);
    expect(useGitStore.getState().openRepos[0].currentBranch).toBe('feature/x');
  });

  it('sí notifica cuando el patch cambia un array por uno de contenido distinto', () => {
    armarRepositorioActivo();
    const nuevosArchivos: GitFile[] = [
      { path: 'a.ts', status: 'modified', staged: false },
    ];
    const notificaciones = contarNotificaciones(() => {
      useGitStore.getState().updateRepoByPath('C:/repo', { modifiedFiles: nuevosArchivos });
    });
    expect(notificaciones).toBe(1);
  });

  it('no notifica cuando modifiedFiles es una ref nueva con el mismo contenido', () => {
    armarRepositorioActivo();
    // Caso del latido: gitStatus siempre devuelve un array nuevo. El guard
    // compara por contenido y silencia si no hay delta.
    const mismo: GitFile[] = [
      { path: 'a.ts', status: 'modified', staged: false },
    ];
    useGitStore.setState({
      openRepos: [{ ...useGitStore.getState().openRepos[0], modifiedFiles: [...mismo] }],
    });
    const notificaciones = contarNotificaciones(() => {
      useGitStore.getState().updateRepoByPath('C:/repo', { modifiedFiles: [...mismo] });
    });
    expect(notificaciones).toBe(0);
  });

  it('no notifica cuando la ruta no coincide con ningún repo', () => {
    armarRepositorioActivo();
    const notificaciones = contarNotificaciones(() => {
      useGitStore.getState().updateRepoByPath('C:/otro', { currentBranch: 'main' });
    });
    expect(notificaciones).toBe(0);
  });
});

describe('updateRepoByPath · conflicted y oldPath se comparan (regresión)', () => {
  // Estos tests protegen la condición 2: el comparador cubre los cinco campos de
  // GitFile, incluidos los opcionales. Si alguien "simplifica" a tres campos,
  // estos tests fallan — y con razón, porque estaría silenciando un cambio real.

  it('sí notifica cuando un archivo pasa a conflicto sin cambiar path/status/staged', () => {
    armarRepositorioActivo();
    const archivo: GitFile = { path: 'a.ts', status: 'modified', staged: false };
    useGitStore.setState({
      openRepos: [{ ...useGitStore.getState().openRepos[0], modifiedFiles: [archivo] }],
    });
    // El nuevo array tiene el mismo path, status y staged — sólo conflicted cambia.
    const enConflicto: GitFile = { ...archivo, conflicted: true };
    const notificaciones = contarNotificaciones(() => {
      useGitStore.getState().updateRepoByPath('C:/repo', { modifiedFiles: [enConflicto] });
    });
    expect(notificaciones).toBe(1);
    expect(useGitStore.getState().openRepos[0].modifiedFiles[0].conflicted).toBe(true);
  });

  it('sí notifica cuando un archivo renombrado cambia oldPath', () => {
    armarRepositorioActivo();
    const archivo: GitFile = { path: 'b.ts', status: 'renamed', staged: false, oldPath: 'a.ts' };
    useGitStore.setState({
      openRepos: [{ ...useGitStore.getState().openRepos[0], modifiedFiles: [archivo] }],
    });
    const renombrado: GitFile = { ...archivo, oldPath: 'c.ts' };
    const notificaciones = contarNotificaciones(() => {
      useGitStore.getState().updateRepoByPath('C:/repo', { modifiedFiles: [renombrado] });
    });
    expect(notificaciones).toBe(1);
  });
});

describe('updateActiveRepo · no notifica sin delta', () => {
  it('no notifica cuando el patch repite los valores vigentes', () => {
    armarRepositorioActivo();
    const notificaciones = contarNotificaciones(() => {
      useGitStore.getState().updateActiveRepo({ currentBranch: 'main', modifiedFiles: [] });
    });
    expect(notificaciones).toBe(0);
  });

  it('sí notifica cuando el patch cambia un campo', () => {
    armarRepositorioActivo();
    const notificaciones = contarNotificaciones(() => {
      useGitStore.getState().updateActiveRepo({ mergeInProgress: true });
    });
    expect(notificaciones).toBe(1);
    expect(useGitStore.getState().openRepos[0].mergeInProgress).toBe(true);
  });
});
