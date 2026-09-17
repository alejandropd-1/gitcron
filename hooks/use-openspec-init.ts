'use client';

import { useCallback, useState } from 'react';

export function useOpenSpecInit(repoPath: string | null | undefined) {
  const [initBusy, setInitBusy] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [initNeedsTool, setInitNeedsTool] = useState(false);

  const runOpenSpecInit = useCallback(
    (toolIds?: string[]): Promise<void> => {
      const api = typeof window !== 'undefined' ? (window as unknown as { api?: typeof window.api }).api : null;
      if (!api?.pipelineInitOpenSpec || !repoPath) return Promise.resolve();
      setInitBusy(true);
      setInitError(null);
      const selectedToolIds = toolIds && toolIds.length > 0 ? toolIds : undefined;
      return api.pipelineInitOpenSpec(repoPath, selectedToolIds)
        .then((result) => {
          if (result?.success) {
            setInitNeedsTool(false);
            return;
          }
          if (result?.needsTool) {
            setInitNeedsTool(true);
            return;
          }
          setInitError(result?.error ?? 'Error desconocido al inicializar OpenSpec');
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          setInitError(message || 'Error desconocido al inicializar OpenSpec');
        })
        .finally(() => {
          setInitBusy(false);
        });
    },
    [repoPath],
  );

  return {
    runOpenSpecInit,
    initBusy,
    initError,
    initNeedsTool,
  };
}
