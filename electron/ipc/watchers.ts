// electron/ipc/watchers.ts
// File-system watchers: observa un repositorio para que el renderer refresque
// sin un git manual. Además del árbol de trabajo, observa por lista blanca los
// caminos de `.git/` que declaran un cambio de estado (index, HEAD, MERGE_HEAD,
// rebase-*, refs/heads/): así preparar archivos, cambiar de rama o iniciar un
// merge/rebase desde fuera de la app producen un evento en lugar de esperar al
// latido de respaldo. El resto de `.git/` (objects/, logs/, *.lock) sigue
// ignorado: Git escribe ahí con muchísima frecuencia y casi nada cambia lo que
// la aplicación muestra.

import path from 'node:path';
import { BrowserWindow, ipcMain } from 'electron';
import chokidar, { FSWatcher } from 'chokidar';
import { errMsg } from './shared';
import { authorizedRepoStore } from './authorized-repos';

const repoWatchers = new Map<string, FSWatcher>();
const watcherOperations = new Map<string, Promise<void>>();

// Directorios del árbol de trabajo que no declaran nada que la app muestre.
const IGNORED_TREE_PATTERNS = [
  /(^|[/\\])node_modules([/\\]|$)/,
  /(^|[/\\])\.next([/\\]|$)/,
  /(^|[/\\])dist([/\\]|$)/,
  /(^|[/\\])release([/\\]|$)/,
  /(^|[/\\])out([/\\]|$)/,
];

// Archivos concretos bajo `.git/` que declaran un cambio de estado.
const GIT_STATE_FILES = ['index', 'HEAD', 'MERGE_HEAD'];

/**
 * ¿Un camino relativo a `.git/` (sin el prefijo) declara un cambio de estado del
 * repositorio? Lista cerrada: cubre preparado, rama vigente, merge en curso,
 * rebase en curso y movimiento de ramas locales. Exportado para pruebas.
 */
export function isGitStateRel(rel: string): boolean {
  if (GIT_STATE_FILES.includes(rel)) return true;
  if (rel === 'rebase-merge' || rel.startsWith('rebase-merge/')) return true;
  if (rel === 'rebase-apply' || rel.startsWith('rebase-apply/')) return true;
  // refs se atraviesa para llegar a refs/heads; refs/remotes y refs/tags se podan.
  if (rel === 'refs' || rel === 'refs/heads' || rel.startsWith('refs/heads/')) return true;
  return false;
}

/**
 * Filtro `ignored` de chokidar para un repositorio: observa el árbol de trabajo
 * (salvo los directorios ignorados) y, dentro de `.git/`, sólo los caminos de
 * estado. Exportado para que pruebas y el observador usen exactamente la misma
 * regla.
 */
/** Si un camino observado cae dentro del `.git/` de ese repositorio. */
export function isGitPath(repoPath: string, testPath: string): boolean {
  const gitDirN = `${repoPath.replace(/\\/g, '/')}/.git`;
  const norm = testPath.replace(/\\/g, '/');
  return norm === gitDirN || norm.startsWith(`${gitDirN}/`);
}

export function createRepoIgnoreFilter(gitDir: string): (testPath: string) => boolean {
  const gitDirN = gitDir.replace(/\\/g, '/');
  return (testPath: string): boolean => {
    if (IGNORED_TREE_PATTERNS.some((re) => re.test(testPath))) return true;
    const norm = testPath.replace(/\\/g, '/');
    // Fuera de `.git/`: árbol de trabajo, se observa.
    if (norm !== gitDirN && !norm.startsWith(gitDirN + '/')) return false;
    if (norm === gitDirN) return false; // el dir `.git` en sí: atravesarlo
    const rel = norm.slice(gitDirN.length + 1);
    return !isGitStateRel(rel);
  };
}

function enqueueWatcherOperation<T>(targetPath: string, operation: () => Promise<T> | T): Promise<T> {
  const previous = watcherOperations.get(targetPath) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(operation);
  const settled = next.then(() => undefined, () => undefined);
  watcherOperations.set(targetPath, settled);
  void settled.finally(() => {
    if (watcherOperations.get(targetPath) === settled) watcherOperations.delete(targetPath);
  });
  return next;
}

export function registerWatcherHandlers(
  getMainWindow: () => BrowserWindow | null,
  onRepoChanged?: (repoPath: string) => void,
): void {
  ipcMain.handle('repo:watch', (_event, targetPath: string) => (
    enqueueWatcherOperation(targetPath, () => {
      if (!targetPath || typeof targetPath !== 'string') {
        return { success: false, error: 'Ruta de repositorio inválida' };
      }
      if (!authorizedRepoStore.isAuthorized(targetPath)) {
        return { success: false, error: `Repositorio no autorizado o no abierto: ${targetPath}` };
      }
      if (repoWatchers.has(targetPath)) return { success: true };
      try {
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        const watcher = chokidar.watch(targetPath, {
          ignored: createRepoIgnoreFilter(path.join(targetPath, '.git')),
          ignoreInitial: true,
          persistent: true,
          awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
        });
        // Si algo de lo agrupado tocó `.git/`. El renderer lo necesita porque
        // no relee lo mismo en los dos casos: un cambio del árbol se resuelve
        // con `git status`, pero cambiar de rama, borrar una o confirmar desde
        // afuera exige releer también las ramas y el log.
        //
        // Ale lo encontró validando: creó una rama desde la terminal y tardó en
        // aparecer; al borrarla tuvo que refrescar a mano. El evento llegaba —la
        // whitelist funciona— pero del otro lado sólo se releía el árbol.
        let touchedGitDir = false;
        const emit = (changedPath?: string) => {
          if (typeof changedPath === 'string' && isGitPath(targetPath, changedPath)) {
            touchedGitDir = true;
          }
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            const gitState = touchedGitDir;
            touchedGitDir = false;
            getMainWindow()?.webContents.send('repo:fs-change', { repoPath: targetPath, gitState });
            onRepoChanged?.(targetPath);
          }, 250);
        };
        watcher.on('add', emit).on('change', emit).on('unlink', emit)
               .on('addDir', emit).on('unlinkDir', emit);
        repoWatchers.set(targetPath, watcher);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: errMsg(error) };
      }
    })
  ));

  ipcMain.handle('repo:unwatch', (_event, targetPath: string) => (
    enqueueWatcherOperation(targetPath, async () => {
      const watcher = repoWatchers.get(targetPath);
      if (watcher) {
        await watcher.close();
        repoWatchers.delete(targetPath);
      }
      return { success: true };
    })
  ));
}

/** Devuelve la lista de rutas de repositorios abiertos/observados activamente. */
export function getOpenRepoPaths(): string[] {
  return Array.from(repoWatchers.keys());
}

/** Close every active watcher. Called from app 'before-quit'. */
export async function closeAllRepoWatchers(): Promise<void> {
  await Promise.allSettled([...watcherOperations.values()]);
  for (const [, watcher] of repoWatchers) {
    await watcher.close().catch(() => {});
  }
  repoWatchers.clear();
  watcherOperations.clear();
}
