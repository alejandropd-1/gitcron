import type { BrowserWindow } from 'electron';
import { ipcMain } from 'electron';
import { PipelineService } from '../pipeline/pipeline-service';
import { errMsg } from './shared';

function validRepoPath(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 32_768;
}

export function registerPipelineHandlers(
  getMainWindow: () => BrowserWindow | null,
  service = new PipelineService(),
): (repoPath: string) => void {
  const subscriptions = new Map<string, Set<number>>();

  const removeSubscription = (repoPath: string, senderId: number) => {
    const senders = subscriptions.get(repoPath);
    senders?.delete(senderId);
    if (senders?.size === 0) subscriptions.delete(repoPath);
  };

  const refresh = async (repoPath: unknown) => {
    if (!validRepoPath(repoPath)) return { success: false, error: 'Ruta de repositorio inválida' };
    try {
      return { success: true, data: await service.refresh(repoPath) };
    } catch (error) {
      return { success: false, error: errMsg(error) };
    }
  };

  ipcMain.handle('pipeline:get-snapshot', (_event, repoPath: unknown) => refresh(repoPath));
  ipcMain.handle('pipeline:subscribe', async (event, repoPath: unknown) => {
    if (!validRepoPath(repoPath)) return { success: false, error: 'Ruta de repositorio inválida' };
    const result = await refresh(repoPath);
    if (result.success) {
      const senders = subscriptions.get(repoPath) ?? new Set<number>();
      senders.add(event.sender.id);
      subscriptions.set(repoPath, senders);
      event.sender.once('destroyed', () => removeSubscription(repoPath, event.sender.id));
    }
    return result;
  });
  ipcMain.handle('pipeline:unsubscribe', (event, repoPath: unknown) => {
    if (!validRepoPath(repoPath)) return { success: false, error: 'Ruta de repositorio inválida' };
    removeSubscription(repoPath, event.sender.id);
    return { success: true };
  });

  return (repoPath: string) => {
    if ((subscriptions.get(repoPath)?.size ?? 0) === 0) return;
    void refresh(repoPath).then((result) => {
      if (result.success) getMainWindow()?.webContents.send('pipeline:snapshot-updated', { repoPath, snapshot: result.data });
    });
  };
}
