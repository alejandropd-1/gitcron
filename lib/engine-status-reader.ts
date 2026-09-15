import type { OpenSpecEngineStatus } from '@/types/pipeline';
import { isOpenSpecEngineStatusIncomplete } from '@/components/pipeline/pipeline-domain';

export type EngineStatusResultCallback = (status: OpenSpecEngineStatus | null) => void;

export interface EngineStatusReaderOptions {
  retryDelaysMs?: number[];
  isIncomplete?: (s: OpenSpecEngineStatus | null) => boolean;
  wait?: (ms: number) => Promise<void>;
}

export interface EngineStatusReader {
  read(
    repoPath: string,
    onResult?: EngineStatusResultCallback,
  ): Promise<OpenSpecEngineStatus | null>;
}

interface InFlightEntry {
  promise: Promise<OpenSpecEngineStatus | null>;
  latest: OpenSpecEngineStatus | null | undefined;
  listeners: Set<EngineStatusResultCallback>;
}

/**
 * Fábrica pura para leer el estado del motor OpenSpec deduplicando lecturas
 * concurrentes en vuelo para el mismo repositorio y reintentando lecturas incompletas.
 * Emite inmediatamente cada resultado disponible a los listeners y resuelve la promesa
 * con el resultado final.
 */
export function createEngineStatusReader(
  fetchStatus: (repoPath: string) => Promise<OpenSpecEngineStatus | null>,
  options?: EngineStatusReaderOptions,
): EngineStatusReader {
  const inFlight = new Map<string, InFlightEntry>();
  const retryDelaysMs = options?.retryDelaysMs ?? [4000, 10000];
  const isIncomplete = options?.isIncomplete ?? isOpenSpecEngineStatusIncomplete;
  const waitFn =
    options?.wait ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));

  async function execute(entry: InFlightEntry, repoPath: string): Promise<OpenSpecEngineStatus | null> {
    let result = await fetchStatus(repoPath);
    entry.latest = result;
    for (const listener of Array.from(entry.listeners)) {
      listener(result);
    }

    for (let i = 0; i < retryDelaysMs.length; i++) {
      if (!isIncomplete(result)) {
        break;
      }
      await waitFn(retryDelaysMs[i]);
      result = await fetchStatus(repoPath);
      entry.latest = result;
      for (const listener of Array.from(entry.listeners)) {
        listener(result);
      }
    }

    return result;
  }

  return {
    read(
      repoPath: string,
      onResult?: EngineStatusResultCallback,
    ): Promise<OpenSpecEngineStatus | null> {
      const existing = inFlight.get(repoPath);
      if (existing) {
        if (onResult) {
          existing.listeners.add(onResult);
          if (existing.latest !== undefined) {
            onResult(existing.latest);
          }
        }
        return existing.promise;
      }

      const listeners = new Set<EngineStatusResultCallback>();
      if (onResult) {
        listeners.add(onResult);
      }

      const entry: InFlightEntry = {
        promise: Promise.resolve(null),
        latest: undefined,
        listeners,
      };

      entry.promise = execute(entry, repoPath).finally(() => {
        inFlight.delete(repoPath);
      });

      inFlight.set(repoPath, entry);
      return entry.promise;
    },
  };
}

let defaultReader: EngineStatusReader | null = null;
let lastApi: unknown = null;

/**
 * Lector único para el entorno renderer, construido de forma perezosa.
 */
export function readEngineStatus(
  repoPath: string,
  onResult?: EngineStatusResultCallback,
): Promise<OpenSpecEngineStatus | null> {
  const api = typeof window !== 'undefined' ? window.api?.pipelineOpenSpec?.getEngineStatus : undefined;
  if (!api) {
    return Promise.resolve(null);
  }
  if (!defaultReader || lastApi !== api) {
    lastApi = api;
    const getEngineStatus = api;
    defaultReader = createEngineStatusReader((rp) => getEngineStatus(rp));
  }
  return defaultReader.read(repoPath, onResult);
}

/**
 * Utilidad de prueba para reiniciar el lector global predeterminado.
 */
export function _resetDefaultEngineStatusReader(): void {
  defaultReader = null;
  lastApi = null;
}
