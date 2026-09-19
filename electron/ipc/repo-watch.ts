// electron/ipc/repo-watch.ts
// Observador de repositorio con un único handle recursivo en la raíz (fs.watch).
// Sustituye el uso de chokidar en Windows para evitar abrir un handle por directorio,
// permitiendo que otros programas renombren o muevan carpetas mientras GitCron observa.

import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';

export interface RepoWatcherOptions {
  ignored?: (testPath: string) => boolean;
  stabilityThreshold?: number;
}

export interface RepoWatcher {
  close(): Promise<void>;
  on(event: string, handler: (...args: any[]) => void): this;
  off(event: string, handler: (...args: any[]) => void): this;
  removeListener(event: string, handler: (...args: any[]) => void): this;
}

/**
 * Crea un observador de archivos sobre la raíz de un repositorio usando `fs.watch` recursivo.
 * Aplica filtro de exclusión (createRepoIgnoreFilter), estabilización de escrituras por archivo
 * (debounce de 200 ms por defecto) y expone la interfaz estándar de eventos y close().
 */
export function createRepoWatcher(
  root: string,
  options: RepoWatcherOptions = {},
): RepoWatcher {
  const {
    ignored,
    stabilityThreshold = 200,
  } = options;

  const emitter = new EventEmitter();
  // Evitar que errores no capturados terminen el proceso si no hay listener registrado
  emitter.on('error', () => {});

  let isClosed = false;
  let rearmAttempted = false;
  let fsWatcher: fs.FSWatcher | null = null;
  const pendingTimers = new Map<string, NodeJS.Timeout>();
  const lastEventTypes = new Map<string, string>();

  function cleanupTimers(): void {
    for (const timer of pendingTimers.values()) {
      clearTimeout(timer);
    }
    pendingTimers.clear();
    lastEventTypes.clear();
  }

  function handleFsEvent(eventType: string, filename: string | Buffer | null): void {
    if (isClosed) return;

    let filenameStr = '';
    if (typeof filename === 'string') {
      filenameStr = filename;
    } else if (Buffer.isBuffer(filename)) {
      filenameStr = filename.toString('utf-8');
    }

    const fullPath = filenameStr ? path.resolve(root, filenameStr) : root;

    // Dentro de `.git/`, los directorios (`.git`, `.git/refs`, `.git/refs/heads`)
    // sólo estaban no-ignorados en el filtro para que chokidar pudiera descender.
    // Los eventos sobre esos directorios en sí no son cambios de estado de Git.
    const gitDirN = `${root.replace(/\\/g, '/')}/.git`;
    const norm = fullPath.replace(/\\/g, '/');
    if (norm === gitDirN || norm === `${gitDirN}/refs` || norm === `${gitDirN}/refs/heads`) {
      return;
    }

    if (ignored && ignored(fullPath)) {
      return;
    }

    lastEventTypes.set(fullPath, eventType);
    const existingTimer = pendingTimers.get(fullPath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      pendingTimers.delete(fullPath);
      const lastType = lastEventTypes.get(fullPath);
      lastEventTypes.delete(fullPath);

      if (isClosed) return;

      let eventName: 'change' | 'add' | 'unlink' | 'addDir' | 'unlinkDir' = 'change';
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          eventName = 'addDir';
        } else {
          eventName = lastType === 'change' ? 'change' : 'add';
        }
      } catch {
        if (fs.existsSync(fullPath)) {
          eventName = lastType === 'change' ? 'change' : 'add';
        } else {
          eventName = 'unlink';
        }
      }

      emitter.emit(eventName, fullPath);
      emitter.emit('all', eventName, fullPath);
    }, stabilityThreshold);

    pendingTimers.set(fullPath, timer);
  }

  function startWatch(): void {
    try {
      fsWatcher = fs.watch(
        root,
        { recursive: true, persistent: true },
        (eventType, filename) => handleFsEvent(eventType, filename),
      );

      fsWatcher.on('error', (error) => {
        if (isClosed) return;
        console.warn(`[repo-watch] Watcher error on ${root}:`, error);
        if (!rearmAttempted) {
          rearmAttempted = true;
          try {
            fsWatcher?.close();
          } catch {}
          try {
            startWatch();
          } catch (rearmError) {
            console.warn(`[repo-watch] Re-arming watcher failed for ${root}:`, rearmError);
            emitter.emit('error', rearmError);
          }
        } else {
          emitter.emit('error', error);
        }
      });
    } catch (err) {
      if (!rearmAttempted) {
        rearmAttempted = true;
        try {
          fsWatcher = fs.watch(
            root,
            { recursive: true, persistent: true },
            (eventType, filename) => handleFsEvent(eventType, filename),
          );
        } catch (retryErr) {
          console.warn(`[repo-watch] Initial watch failed for ${root}:`, retryErr);
          throw retryErr;
        }
      } else {
        throw err;
      }
    }
  }

  startWatch();

  return {
    async close(): Promise<void> {
      isClosed = true;
      cleanupTimers();
      if (fsWatcher) {
        try {
          fsWatcher.close();
        } catch {}
        fsWatcher = null;
      }
      emitter.removeAllListeners();
    },
    on(event: string, handler: (...args: any[]) => void) {
      emitter.on(event, handler);
      return this;
    },
    off(event: string, handler: (...args: any[]) => void) {
      emitter.off(event, handler);
      return this;
    },
    removeListener(event: string, handler: (...args: any[]) => void) {
      emitter.removeListener(event, handler);
      return this;
    },
  };
}
