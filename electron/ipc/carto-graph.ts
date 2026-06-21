// electron/ipc/carto-graph.ts
//
// Cartografía — Fase 3. Bridge IPC de SOLO LECTURA hacia el motor CodeGraph
// embebido (electron/carto/graph-engine). Mismo patrón que el resto de handlers:
// cada canal devuelve `{ success, data?, error? }` y nunca expone la forma cruda
// del motor — sólo el contrato normalizado (lib/carto-types).
//
// Invariantes: cero red (el motor es local), cómputo en main, sin tocar Git.
//
// Eventos push al renderer (para no bloquearlo durante el indexado/refresco):
//   · `carto:graph-progress` { repoPath, status } — avance del indexado.
//   · `carto:graph-updated`  { repoPath }          — el watch re-sincronizó.

import { BrowserWindow, ipcMain } from 'electron';
import {
  ensureGraph,
  getGraphStatus,
  searchGraph,
  graphCallers,
  graphCallees,
  graphImpact,
  graphFileRelations,
  graphFileSymbols,
  graphSnapshot,
} from '../carto/graph-engine';
import { errMsg } from './shared';

type Result<T> = { success: boolean; data?: T; error?: string };

function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

function fail<T>(error: unknown): Result<T> {
  return { success: false, error: errMsg(error) };
}

export function registerCartoGraphHandlers(getMainWindow: () => BrowserWindow | null): void {
  const send = (channel: string, payload: unknown) => {
    getMainWindow()?.webContents.send(channel, payload);
  };

  // Abre/indexa el repo (no bloquea: arranca en background) y conecta los
  // notificadores de progreso y de re-sync hacia el renderer.
  ipcMain.handle('carto:graph-ensure', (_e, repoPath: string) => {
    try {
      const status = ensureGraph(repoPath, {
        onProgress: (s) => send('carto:graph-progress', { repoPath, status: s }),
        onUpdated: () => send('carto:graph-updated', { repoPath }),
      });
      return ok(status);
    } catch (error) {
      return fail(error);
    }
  });

  ipcMain.handle('carto:graph-status', (_e, repoPath: string) => {
    try {
      return ok(getGraphStatus(repoPath));
    } catch (error) {
      return fail(error);
    }
  });

  ipcMain.handle('carto:graph-search', (_e, repoPath: string, query: string, limit?: number) => {
    try {
      return ok(searchGraph(repoPath, query, limit));
    } catch (error) {
      return fail(error);
    }
  });

  ipcMain.handle('carto:graph-callers', (_e, repoPath: string, nodeId: string) => {
    try {
      return ok(graphCallers(repoPath, nodeId));
    } catch (error) {
      return fail(error);
    }
  });

  ipcMain.handle('carto:graph-callees', (_e, repoPath: string, nodeId: string) => {
    try {
      return ok(graphCallees(repoPath, nodeId));
    } catch (error) {
      return fail(error);
    }
  });

  ipcMain.handle('carto:graph-impact', (_e, repoPath: string, nodeId: string) => {
    try {
      return ok(graphImpact(repoPath, nodeId));
    } catch (error) {
      return fail(error);
    }
  });

  ipcMain.handle('carto:graph-file-relations', (_e, repoPath: string, filePath: string) => {
    try {
      return ok(graphFileRelations(repoPath, filePath));
    } catch (error) {
      return fail(error);
    }
  });

  // Símbolos de un archivo (para el selector de nodos del panel de detalle).
  ipcMain.handle('carto:graph-file-symbols', (_e, repoPath: string, filePath: string) => {
    try {
      return ok(graphFileSymbols(repoPath, filePath));
    } catch (error) {
      return fail(error);
    }
  });

  // Foto global normalizada para la lente Grafo semántico (archivos + relaciones).
  ipcMain.handle('carto:graph-snapshot', (_e, repoPath: string) => {
    try {
      return ok(graphSnapshot(repoPath));
    } catch (error) {
      return fail(error);
    }
  });
}
