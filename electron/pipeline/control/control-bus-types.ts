/**
 * Tipos y contratos para el Command Bus de Control Supervisado (F05).
 *
 * El bus vive exclusivamente en Main. Ningún canal IPC ni el Renderer pueden
 * enviar argv, PIDs, shells ni cadenas de comando crudas.
 */

// La unión canónica vive en `types/pipeline/projection.ts`: el renderer también
// la necesita, y `types/` no puede importar desde `electron/`.
import type { PipelineControlAction } from '../../../types/pipeline/projection';

export type { PipelineControlAction };

export type PipelineControlErrorCode =
  | 'INVALID_REPO'
  | 'UNAUTHORIZED_TARGET'
  | 'REPLAY_REJECTED'
  | 'STALE_SESSION'
  | 'CAPABILITY_UNSUPPORTED'
  | 'DIGEST_MISMATCH'
  | 'DISPATCH_ERROR';

export type BaseControlRequest = {
  repoPath: string;
  sessionId: string;
  nonce: string;
  humanReason?: string;
};

export type PauseControlPayload = BaseControlRequest & {
  mode: 'delegations' | 'after-task';
};

export type SteerControlPayload = BaseControlRequest & {
  instruction: string;
};

export type QueueControlPayload = BaseControlRequest & {
  instruction: string;
};

export type InterruptControlPayload = BaseControlRequest & {
  target: 'turn' | 'subagent';
  subagentId?: string;
};

export type KillProcessControlPayload = BaseControlRequest & {
  processId: string;
};

export type CancelRunControlPayload = BaseControlRequest;

export type RespondDecisionControlPayload = BaseControlRequest & {
  decisionId: string;
  optionId: string;
  expectedDigest?: string;
};

export type PipelineControlResult = {
  success: boolean;
  commandId: string;
  action: PipelineControlAction;
  acknowledged: boolean;
  timestamp: string;
  error?: {
    code: PipelineControlErrorCode;
    message: string;
  };
};

export type PipelineAuditLogEntry = {
  commandId: string;
  timestamp: string;
  action: PipelineControlAction;
  repoPath: string;
  sessionId: string;
  nonce: string;
  humanReason?: string;
  acknowledged: boolean;
  resultStatus: 'acknowledged' | 'rejected' | 'failed';
  errorCode?: PipelineControlErrorCode;
};
