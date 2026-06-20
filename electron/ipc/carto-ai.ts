// electron/ipc/carto-ai.ts
//
// Cartografía — Fase 4. Bridge IPC de la capa de IA. Mismo patrón que el resto:
// cada canal devuelve `{ success, data?, error? }` y nunca expone secretos (las
// keys viven en el vault de main y jamás cruzan este límite).
//
// Invariante central: la IA NUNCA se dispara sola. Estos handlers sólo corren en
// respuesta a una acción explícita del renderer (el usuario apretó "preguntar" o
// "explicar"). Con la IA apagada o el proveedor caído, devuelven un error claro
// y la vista sigue funcionando sin IA.

import { ipcMain } from 'electron';
import type {
  CartoAINodeRef,
  CartoAIContext,
  CartoAISettings,
  CartoAIProbe,
} from '../../types/carto-ai';
import {
  getCartoAISettings,
  setCartoAISettings,
  getCartoProvider,
} from '../ai/carto';
import { errMsg } from './shared';

type Result<T> = { success: boolean; data?: T; error?: string };

function ok<T>(data: T): Result<T> {
  return { success: true, data };
}
function fail<T>(error: unknown): Result<T> {
  return { success: false, error: errMsg(error) };
}

export function registerCartoAiHandlers(): void {
  // ── Preferencias (opt-in, apagado por defecto) ──
  ipcMain.handle('carto:ai-get-settings', () => {
    try {
      return ok(getCartoAISettings());
    } catch (error) {
      return fail(error);
    }
  });

  ipcMain.handle('carto:ai-set-settings', (_e, patch: Partial<CartoAISettings>) => {
    try {
      return ok(setCartoAISettings(patch ?? {}));
    } catch (error) {
      return fail(error);
    }
  });

  // ── Sondeo de disponibilidad (sin gastar una generación) ──
  ipcMain.handle('carto:ai-probe', async (): Promise<Result<CartoAIProbe>> => {
    const settings = getCartoAISettings();
    if (!settings.enabled) {
      return ok({ available: false, provider: settings.mode === 'online' ? 'openrouter' : 'lmstudio', detail: 'IA desactivada' });
    }
    try {
      const provider = getCartoProvider(settings);
      await provider.probe();
      return ok({ available: true, provider: provider.id });
    } catch (error) {
      const id = settings.mode === 'online' ? 'openrouter' : 'lmstudio';
      return ok({ available: false, provider: id, detail: errMsg(error) });
    }
  });

  // ── Explicar un nodo del grafo ──
  ipcMain.handle('carto:ai-explain', async (_e, node: CartoAINodeRef, context: CartoAIContext) => {
    try {
      if (!node || !node.name) return { success: false, error: 'Nodo inválido' };
      const provider = getCartoProvider();
      const data = await provider.explain(node, context ?? {});
      return ok(data);
    } catch (error) {
      return fail(error);
    }
  });

  // ── Pregunta libre (la "ventanita de preguntas") ──
  ipcMain.handle('carto:ai-ask', async (_e, question: string, context: CartoAIContext) => {
    try {
      if (!question || !question.trim()) return { success: false, error: 'Pregunta vacía' };
      const provider = getCartoProvider();
      const data = await provider.ask(question, context ?? {});
      return ok(data);
    } catch (error) {
      return fail(error);
    }
  });
}
