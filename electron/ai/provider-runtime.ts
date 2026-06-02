export interface AssembledPrompts {
  systemPrompt: string;
  userPrompt: string;
  input: import('../../types/temporal-agent').PredictionInput;
}

/** Default budget for a single provider call before we give up. */
const PREDICTION_TIMEOUT_MS = 30_000;

/** Module-level reference to the active prediction's AbortController, if any. */
let activeAbortController: AbortController | null = null;

/** True when the current abort was triggered by the Cancel button (not timeout). */
let cancelledByUser = false;

/** Cancel the in-flight prediction (called from IPC). Safe to call if idle. */
export function cancelActivePrediction(): void {
  cancelledByUser = true;
  activeAbortController?.abort();
  activeAbortController = null;
}

/**
 * fetch() with a hard timeout via AbortController. If the provider hangs, we
 * abort at `timeoutMs` and throw a soft, user-facing message instead of leaving
 * the UI waiting forever. Re-throws other errors untouched.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = PREDICTION_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  activeAbortController = controller;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      if (cancelledByUser) {
        cancelledByUser = false;
        throw new Error('Predicción cancelada por el usuario.');
      }
      throw new Error(`La predicción tardó demasiado (más de ${Math.round(timeoutMs / 1000)}s) y se canceló. Probá de nuevo.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
    if (activeAbortController === controller) {
      activeAbortController = null;
    }
  }
}
