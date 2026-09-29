'use client';

// Envío compartido de la respuesta a una decisión del pipeline.
//
// Los dos consumidores (el dashboard de PipelineWorkspace y el inspector del
// panel derecho) deben validar las mismas precondiciones —repo válido, sesión
// activa y capacidad respond-decision— y emitir el mismo contrato IPC con
// sessionId y nonce. Vivir en un solo lugar evita un segundo protocolo y que
// una superficie responda donde la otra se niega.
//
// La decisión sigue pendiente hasta que la proyección la dé resuelta:
// el ACK del control-bus no la aplica.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RuntimeProjection } from '@/types/pipeline';

export function usePipelineDecisionControl(
  repoPath: string | null,
  projection: RuntimeProjection | null,
) {
  const [controlNotice, setControlNotice] = useState<string | null>(null);
  const [sendingDecisions, setSendingDecisions] = useState<Record<string, boolean>>({});

  const currentRepoRef = useRef<string | null>(repoPath);
  const sendingRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    currentRepoRef.current = repoPath;
    sendingRef.current = {};
  }, [repoPath]);

  const [lastRepo, setLastRepo] = useState(repoPath);
  if (lastRepo !== repoPath) {
    setLastRepo(repoPath);
    setSendingDecisions({});
    setControlNotice(null);
  }

  const respondDecision = useCallback(
    async (
      decisionId: string,
      optionId: string,
      availability?: string,
    ): Promise<boolean> => {
      // Las opciones informativas no se envían a ningún ejecutor
      if (availability === 'informational') {
        return false;
      }

      const api = typeof window !== 'undefined' ? window.api : undefined;
      if (!repoPath || !api?.pipelineControl?.respondDecision) return false;

      // Protección de doble clic: si ya se está enviando esta decisión, no vuelve a enviar
      if (sendingRef.current[decisionId] || sendingDecisions[decisionId]) {
        return false;
      }

      if (!projection?.active) {
        setControlNotice('pipeline.control.noSession');
        return false;
      }
      if (!projection.controlCapabilities.includes('respond-decision')) {
        setControlNotice('pipeline.control.respondUnsupported');
        return false;
      }

      const targetRepo = repoPath;
      const targetSessionId = projection.sessionId;
      const nonce = `nonce-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      sendingRef.current[decisionId] = true;
      setSendingDecisions((prev) => ({ ...prev, [decisionId]: true }));
      setControlNotice(null);

      try {
        const response = await api.pipelineControl.respondDecision({
          repoPath: targetRepo,
          sessionId: targetSessionId,
          decisionId,
          optionId,
          nonce,
        });

        // Una respuesta que llega después de cambiar de repositorio no toca el estado del repo nuevo
        if (currentRepoRef.current !== targetRepo) {
          return false;
        }

        const success = (response as { success?: boolean } | null)?.success === true;
        if (!success) {
          delete sendingRef.current[decisionId];
          setSendingDecisions((prev) => {
            if (!prev[decisionId]) return prev;
            const next = { ...prev };
            delete next[decisionId];
            return next;
          });
          setControlNotice('pipeline.decision.error');
          return false;
        }

        // ACK recibido de Main. La decisión permanece pendiente y sus botones deshabilitados
        // hasta que la proyección la declare resuelta (el ACK del control-bus no la aplica).
        // Por eso NO se rehabilitan botones tras un acuse: sendingRef y sendingDecisions
        // conservan el estado de envío hasta que cambie el repo o la proyección la remueva.
        return true;
      } catch {
        if (currentRepoRef.current !== targetRepo) {
          return false;
        }

        delete sendingRef.current[decisionId];
        setSendingDecisions((prev) => {
          if (!prev[decisionId]) return prev;
          const next = { ...prev };
          delete next[decisionId];
          return next;
        });

        setControlNotice('pipeline.decision.error');
        return false;
      }
    },
    [repoPath, projection, sendingDecisions],
  );

  return {
    respondDecision,
    controlNotice,
    setControlNotice,
    sendingDecisions,
    isDecisionSending: (id: string) => Boolean(sendingDecisions[id]),
  };
}
