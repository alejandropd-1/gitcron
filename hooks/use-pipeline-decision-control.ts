'use client';

// Envío compartido de la respuesta a una decisión del pipeline.
//
// Los dos consumidores (el dashboard de PipelineWorkspace y el inspector del
// panel derecho) deben validar las mismas precondiciones —repo válido, sesión
// activa y capacidad respond-decision— y emitir el mismo contrato IPC con
// sessionId y nonce. Vivir en un solo lugar evita un segundo protocolo y que
// una superficie responda donde la otra se niega.

import { useCallback, useState } from 'react';
import type { RuntimeProjection } from '@/types/pipeline';

export function usePipelineDecisionControl(
  repoPath: string | null,
  projection: RuntimeProjection | null,
) {
  const [controlNotice, setControlNotice] = useState<string | null>(null);

  const respondDecision = useCallback((decisionId: string, optionId: string) => {
    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!repoPath || !api?.pipelineControl?.respondDecision) return;
    if (!projection?.active) {
      setControlNotice('pipeline.control.noSession');
      return;
    }
    if (!projection.controlCapabilities.includes('respond-decision')) {
      setControlNotice('pipeline.control.respondUnsupported');
      return;
    }
    setControlNotice(null);
    void api.pipelineControl.respondDecision({
      repoPath,
      sessionId: projection.sessionId,
      decisionId,
      optionId,
      nonce: `nonce-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    });
  }, [repoPath, projection]);

  return { respondDecision, controlNotice, setControlNotice };
}
