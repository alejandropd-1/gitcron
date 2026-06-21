// electron/ipc/carto.ts
//
// Cartografía — Fase 2. Handler IPC de SOLO LECTURA `carto:scan-tree`.
//
// Camina el working dir del repo activo y devuelve el árbol de archivos ya
// armado (estructura serializable). Invariantes de Cartografía:
//   · sólo lectura de filesystem — nunca escribe en el repo,
//   · cero red, cero invocación de Git (no toca lógica de Git),
//   · todo el cómputo vive acá, en el proceso main, no en el renderer.
//
// La transformación rutas→árbol es una función pura testeable (lib/carto-tree).

import { ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import {
  buildFileTree,
  countFiles,
  countDirs,
  type CartoTreeNode,
} from '../../lib/carto-tree';
import { scanRepoFilePaths } from '../carto/repo-files';
import { errMsg } from './shared';

/** Resultado serializable de un escaneo del árbol del repo activo. */
export interface CartoScanResult {
  /** Nodos raíz del árbol (carpetas primero, luego archivos). */
  root: CartoTreeNode[];
  fileCount: number;
  dirCount: number;
  /** `true` si se alcanzó el tope de entradas y el árbol quedó parcial. */
  truncated: boolean;
  /** Momento del escaneo (epoch ms), para mostrar "última actualización". */
  scannedAt: number;
}

export function registerCartoHandlers(): void {
  ipcMain.handle('carto:scan-tree', async (_event, repoPath: string): Promise<{
    success: boolean;
    data?: CartoScanResult;
    error?: string;
  }> => {
    try {
      if (!repoPath || typeof repoPath !== 'string') {
        return { success: false, error: 'Ruta de repositorio inválida' };
      }
      const root = path.resolve(repoPath);
      let stat: fs.Stats;
      try {
        stat = await fs.promises.stat(root);
      } catch {
        return { success: false, error: `La carpeta ya no existe: ${repoPath}` };
      }
      if (!stat.isDirectory()) {
        return { success: false, error: `No es una carpeta: ${repoPath}` };
      }

      const { paths, truncated } = await scanRepoFilePaths(root);

      const tree = buildFileTree(paths);
      return {
        success: true,
        data: {
          root: tree,
          fileCount: countFiles(tree),
          dirCount: countDirs(tree),
          truncated,
          scannedAt: Date.now(),
        },
      };
    } catch (error: unknown) {
      return { success: false, error: errMsg(error) };
    }
  });
}
