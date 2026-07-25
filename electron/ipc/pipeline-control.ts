import { ipcMain } from 'electron';
import type { PipelineControlBus } from '../pipeline/control/control-bus';
import type {
  CancelRunControlPayload,
  InterruptControlPayload,
  KillProcessControlPayload,
  PauseControlPayload,
  QueueControlPayload,
  RespondDecisionControlPayload,
  SteerControlPayload,
} from '../pipeline/control/control-bus-types';

export function registerPipelineControlHandlers(bus: PipelineControlBus): void {
  ipcMain.handle('pipeline:control:pause', async (_event, payload: PauseControlPayload) => {
    return bus.dispatchPause(payload);
  });

  ipcMain.handle('pipeline:control:steer', async (_event, payload: SteerControlPayload) => {
    return bus.dispatchSteer(payload);
  });

  ipcMain.handle('pipeline:control:queue', async (_event, payload: QueueControlPayload) => {
    return bus.dispatchQueue(payload);
  });

  ipcMain.handle('pipeline:control:interrupt', async (_event, payload: InterruptControlPayload) => {
    return bus.dispatchInterrupt(payload);
  });

  ipcMain.handle('pipeline:control:kill-process', async (_event, payload: KillProcessControlPayload) => {
    return bus.dispatchKillProcess(payload);
  });

  ipcMain.handle('pipeline:control:cancel', async (_event, payload: CancelRunControlPayload) => {
    return bus.dispatchCancelRun(payload);
  });

  ipcMain.handle('pipeline:control:respond-decision', async (_event, payload: RespondDecisionControlPayload) => {
    return bus.dispatchRespondDecision(payload);
  });
}
