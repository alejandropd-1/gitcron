import { randomUUID } from 'crypto';
import type {
  CancelRunControlPayload,
  InterruptControlPayload,
  KillProcessControlPayload,
  PauseControlPayload,
  PipelineAuditLogEntry,
  PipelineControlAction,
  PipelineControlErrorCode,
  PipelineControlResult,
  QueueControlPayload,
  RespondDecisionControlPayload,
  SteerControlPayload,
} from './control-bus-types';
import { PipelineControlAuditor } from './control-audit';

export type SessionControlInfo = {
  sessionId: string;
  repoPath: string;
  runtime: string;
  active: boolean;
  capabilities: Set<PipelineControlAction>;
};

/**
 * Command Bus principal de Main Process (F05).
 *
 * Despacha comandos tipados, validados y session-scoped.
 * Garantiza idempotencia, previene spoofing y registra auditoría append-only.
 */
export class PipelineControlBus {
  private activeSessions = new Map<string, SessionControlInfo>();
  private consumedNonces = new Set<string>();
  private auditor: PipelineControlAuditor;

  constructor(auditor = new PipelineControlAuditor()) {
    this.auditor = auditor;
  }

  /** Registra una sesión activa para un repo y sus capacidades permitidas. */
  public registerSession(info: {
    sessionId: string;
    repoPath: string;
    runtime: string;
    capabilities: PipelineControlAction[];
  }): void {
    this.activeSessions.set(info.sessionId, {
      sessionId: info.sessionId,
      repoPath: info.repoPath,
      runtime: info.runtime,
      active: true,
      capabilities: new Set(info.capabilities),
    });
  }

  /** Marca una sesión como finalizada/inactiva. */
  public unregisterSession(sessionId: string): void {
    const info = this.activeSessions.get(sessionId);
    if (info) {
      info.active = false;
    }
  }

  /** Valida guardas de seguridad base para cualquier comando. */
  private validateBaseRequest(
    repoPath: unknown,
    sessionId: unknown,
    nonce: unknown,
    action: PipelineControlAction
  ): { valid: true; session: SessionControlInfo } | { valid: false; error: PipelineControlErrorCode; message: string } {
    if (typeof repoPath !== 'string' || repoPath.trim().length === 0) {
      return { valid: false, error: 'INVALID_REPO', message: 'Ruta de repositorio no válida' };
    }

    if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
      return { valid: false, error: 'UNAUTHORIZED_TARGET', message: 'Identificador de sesión requerido' };
    }

    if (typeof nonce !== 'string' || nonce.trim().length === 0) {
      return { valid: false, error: 'REPLAY_REJECTED', message: 'Nonce no proporcionado' };
    }

    if (this.consumedNonces.has(nonce)) {
      return { valid: false, error: 'REPLAY_REJECTED', message: 'Comando duplicado (nonce consumido)' };
    }

    const session = this.activeSessions.get(sessionId);
    if (!session || session.repoPath !== repoPath) {
      return { valid: false, error: 'UNAUTHORIZED_TARGET', message: 'La sesión no pertenece al repositorio activo' };
    }

    if (!session.active) {
      return { valid: false, error: 'STALE_SESSION', message: 'La sesión especificada ya no está activa' };
    }

    if (!session.capabilities.has(action)) {
      return { valid: false, error: 'CAPABILITY_UNSUPPORTED', message: `El runtime ${session.runtime} no soporta la acción ${action}` };
    }

    return { valid: true, session };
  }

  private recordAudit(
    commandId: string,
    action: PipelineControlAction,
    repoPath: string,
    sessionId: string,
    nonce: string,
    humanReason: string | undefined,
    acknowledged: boolean,
    resultStatus: 'acknowledged' | 'rejected' | 'failed',
    errorCode?: PipelineControlErrorCode
  ): void {
    const entry: PipelineAuditLogEntry = {
      commandId,
      timestamp: new Date().toISOString(),
      action,
      repoPath,
      sessionId,
      nonce,
      humanReason,
      acknowledged,
      resultStatus,
      errorCode,
    };
    this.auditor.record(entry);
  }

  public async dispatchPause(payload: PauseControlPayload): Promise<PipelineControlResult> {
    const commandId = randomUUID();
    const action: PipelineControlAction = payload.mode === 'delegations' ? 'pause-delegations' : 'pause-after-task';
    const validation = this.validateBaseRequest(payload.repoPath, payload.sessionId, payload.nonce, action);

    if (!validation.valid) {
      this.recordAudit(commandId, action, payload.repoPath ?? '', payload.sessionId ?? '', payload.nonce ?? '', payload.humanReason, false, 'rejected', validation.error);
      return {
        success: false,
        commandId,
        action,
        acknowledged: false,
        timestamp: new Date().toISOString(),
        error: { code: validation.error, message: validation.message },
      };
    }

    this.consumedNonces.add(payload.nonce);
    this.recordAudit(commandId, action, payload.repoPath, payload.sessionId, payload.nonce, payload.humanReason, true, 'acknowledged');

    return {
      success: true,
      commandId,
      action,
      acknowledged: true,
      timestamp: new Date().toISOString(),
    };
  }

  public async dispatchSteer(payload: SteerControlPayload): Promise<PipelineControlResult> {
    const commandId = randomUUID();
    const action: PipelineControlAction = 'steer';
    const validation = this.validateBaseRequest(payload.repoPath, payload.sessionId, payload.nonce, action);

    if (!validation.valid) {
      this.recordAudit(commandId, action, payload.repoPath ?? '', payload.sessionId ?? '', payload.nonce ?? '', payload.humanReason, false, 'rejected', validation.error);
      return {
        success: false,
        commandId,
        action,
        acknowledged: false,
        timestamp: new Date().toISOString(),
        error: { code: validation.error, message: validation.message },
      };
    }

    if (typeof payload.instruction !== 'string' || payload.instruction.trim().length === 0) {
      this.recordAudit(commandId, action, payload.repoPath, payload.sessionId, payload.nonce, payload.humanReason, false, 'failed', 'DISPATCH_ERROR');
      return {
        success: false,
        commandId,
        action,
        acknowledged: false,
        timestamp: new Date().toISOString(),
        error: { code: 'DISPATCH_ERROR', message: 'Instrucción de dirección vacía' },
      };
    }

    this.consumedNonces.add(payload.nonce);
    this.recordAudit(commandId, action, payload.repoPath, payload.sessionId, payload.nonce, payload.humanReason, true, 'acknowledged');

    return {
      success: true,
      commandId,
      action,
      acknowledged: true,
      timestamp: new Date().toISOString(),
    };
  }

  public async dispatchQueue(payload: QueueControlPayload): Promise<PipelineControlResult> {
    const commandId = randomUUID();
    const action: PipelineControlAction = 'queue';
    const validation = this.validateBaseRequest(payload.repoPath, payload.sessionId, payload.nonce, action);

    if (!validation.valid) {
      this.recordAudit(commandId, action, payload.repoPath ?? '', payload.sessionId ?? '', payload.nonce ?? '', payload.humanReason, false, 'rejected', validation.error);
      return {
        success: false,
        commandId,
        action,
        acknowledged: false,
        timestamp: new Date().toISOString(),
        error: { code: validation.error, message: validation.message },
      };
    }

    this.consumedNonces.add(payload.nonce);
    this.recordAudit(commandId, action, payload.repoPath, payload.sessionId, payload.nonce, payload.humanReason, true, 'acknowledged');

    return {
      success: true,
      commandId,
      action,
      acknowledged: true,
      timestamp: new Date().toISOString(),
    };
  }

  public async dispatchInterrupt(payload: InterruptControlPayload): Promise<PipelineControlResult> {
    const commandId = randomUUID();
    const action: PipelineControlAction = payload.target === 'turn' ? 'interrupt-turn' : 'interrupt-subagent';
    const validation = this.validateBaseRequest(payload.repoPath, payload.sessionId, payload.nonce, action);

    if (!validation.valid) {
      this.recordAudit(commandId, action, payload.repoPath ?? '', payload.sessionId ?? '', payload.nonce ?? '', payload.humanReason, false, 'rejected', validation.error);
      return {
        success: false,
        commandId,
        action,
        acknowledged: false,
        timestamp: new Date().toISOString(),
        error: { code: validation.error, message: validation.message },
      };
    }

    this.consumedNonces.add(payload.nonce);
    this.recordAudit(commandId, action, payload.repoPath, payload.sessionId, payload.nonce, payload.humanReason, true, 'acknowledged');

    return {
      success: true,
      commandId,
      action,
      acknowledged: true,
      timestamp: new Date().toISOString(),
    };
  }

  public async dispatchKillProcess(payload: KillProcessControlPayload): Promise<PipelineControlResult> {
    const commandId = randomUUID();
    const action: PipelineControlAction = 'kill-process';
    const validation = this.validateBaseRequest(payload.repoPath, payload.sessionId, payload.nonce, action);

    if (!validation.valid) {
      this.recordAudit(commandId, action, payload.repoPath ?? '', payload.sessionId ?? '', payload.nonce ?? '', payload.humanReason, false, 'rejected', validation.error);
      return {
        success: false,
        commandId,
        action,
        acknowledged: false,
        timestamp: new Date().toISOString(),
        error: { code: validation.error, message: validation.message },
      };
    }

    this.consumedNonces.add(payload.nonce);
    this.recordAudit(commandId, action, payload.repoPath, payload.sessionId, payload.nonce, payload.humanReason, true, 'acknowledged');

    return {
      success: true,
      commandId,
      action,
      acknowledged: true,
      timestamp: new Date().toISOString(),
    };
  }

  public async dispatchCancelRun(payload: CancelRunControlPayload): Promise<PipelineControlResult> {
    const commandId = randomUUID();
    const action: PipelineControlAction = 'cancel-run';
    const validation = this.validateBaseRequest(payload.repoPath, payload.sessionId, payload.nonce, action);

    if (!validation.valid) {
      this.recordAudit(commandId, action, payload.repoPath ?? '', payload.sessionId ?? '', payload.nonce ?? '', payload.humanReason, false, 'rejected', validation.error);
      return {
        success: false,
        commandId,
        action,
        acknowledged: false,
        timestamp: new Date().toISOString(),
        error: { code: validation.error, message: validation.message },
      };
    }

    this.consumedNonces.add(payload.nonce);
    this.recordAudit(commandId, action, payload.repoPath, payload.sessionId, payload.nonce, payload.humanReason, true, 'acknowledged');

    return {
      success: true,
      commandId,
      action,
      acknowledged: true,
      timestamp: new Date().toISOString(),
    };
  }

  public async dispatchRespondDecision(payload: RespondDecisionControlPayload): Promise<PipelineControlResult> {
    const commandId = randomUUID();
    const action: PipelineControlAction = 'respond-decision';
    const validation = this.validateBaseRequest(payload.repoPath, payload.sessionId, payload.nonce, action);

    if (!validation.valid) {
      this.recordAudit(commandId, action, payload.repoPath ?? '', payload.sessionId ?? '', payload.nonce ?? '', payload.humanReason, false, 'rejected', validation.error);
      return {
        success: false,
        commandId,
        action,
        acknowledged: false,
        timestamp: new Date().toISOString(),
        error: { code: validation.error, message: validation.message },
      };
    }

    this.consumedNonces.add(payload.nonce);
    this.recordAudit(commandId, action, payload.repoPath, payload.sessionId, payload.nonce, payload.humanReason, true, 'acknowledged');

    return {
      success: true,
      commandId,
      action,
      acknowledged: true,
      timestamp: new Date().toISOString(),
    };
  }
}
