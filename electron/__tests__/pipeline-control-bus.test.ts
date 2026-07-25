import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PipelineControlBus } from '../pipeline/control/control-bus';
import { PipelineControlAuditor } from '../pipeline/control/control-audit';

describe('PipelineControlBus — Command Bus & Security (F05 TANDA 1)', () => {
  let tmpRepoDir: string;
  let auditor: PipelineControlAuditor;
  let bus: PipelineControlBus;

  beforeEach(() => {
    tmpRepoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pipeline-control-test-'));
    auditor = new PipelineControlAuditor();
    bus = new PipelineControlBus(auditor);
  });

  it('dispatches valid commands for registered active sessions', async () => {
    bus.registerSession({
      sessionId: 'sess-1',
      repoPath: tmpRepoDir,
      runtime: 'claude',
      capabilities: ['pause-delegations', 'steer', 'queue', 'interrupt-turn', 'cancel-run'],
    });

    const pauseResult = await bus.dispatchPause({
      repoPath: tmpRepoDir,
      sessionId: 'sess-1',
      mode: 'delegations',
      nonce: 'nonce-1',
    });

    expect(pauseResult.success).toBe(true);
    expect(pauseResult.acknowledged).toBe(true);
    expect(pauseResult.action).toBe('pause-delegations');

    const steerResult = await bus.dispatchSteer({
      repoPath: tmpRepoDir,
      sessionId: 'sess-1',
      instruction: 'Revisar la configuración',
      nonce: 'nonce-2',
    });

    expect(steerResult.success).toBe(true);
    expect(steerResult.action).toBe('steer');
  });

  it('rejects target spoofing (cross-repo mismatch)', async () => {
    const otherRepoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'other-repo-'));
    bus.registerSession({
      sessionId: 'sess-1',
      repoPath: tmpRepoDir,
      runtime: 'claude',
      capabilities: ['pause-delegations'],
    });

    const result = await bus.dispatchPause({
      repoPath: otherRepoDir, // Mismatched repo!
      sessionId: 'sess-1',
      mode: 'delegations',
      nonce: 'nonce-spoof',
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('UNAUTHORIZED_TARGET');
  });

  it('rejects command replay (duplicate nonce)', async () => {
    bus.registerSession({
      sessionId: 'sess-1',
      repoPath: tmpRepoDir,
      runtime: 'claude',
      capabilities: ['pause-delegations'],
    });

    const firstCall = await bus.dispatchPause({
      repoPath: tmpRepoDir,
      sessionId: 'sess-1',
      mode: 'delegations',
      nonce: 'nonce-replay-1',
    });
    expect(firstCall.success).toBe(true);

    // Replay same nonce
    const secondCall = await bus.dispatchPause({
      repoPath: tmpRepoDir,
      sessionId: 'sess-1',
      mode: 'delegations',
      nonce: 'nonce-replay-1',
    });
    expect(secondCall.success).toBe(false);
    expect(secondCall.error?.code).toBe('REPLAY_REJECTED');
  });

  it('rejects stale sessions after unregister or end', async () => {
    bus.registerSession({
      sessionId: 'sess-1',
      repoPath: tmpRepoDir,
      runtime: 'claude',
      capabilities: ['pause-delegations'],
    });

    bus.unregisterSession('sess-1');

    const result = await bus.dispatchPause({
      repoPath: tmpRepoDir,
      sessionId: 'sess-1',
      mode: 'delegations',
      nonce: 'nonce-stale',
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('STALE_SESSION');
  });

  it('rejects unsupported capabilities for the specified runtime', async () => {
    bus.registerSession({
      sessionId: 'sess-1',
      repoPath: tmpRepoDir,
      runtime: 'codex',
      capabilities: ['queue'], // No pause capability!
    });

    const result = await bus.dispatchPause({
      repoPath: tmpRepoDir,
      sessionId: 'sess-1',
      mode: 'delegations',
      nonce: 'nonce-unsupported',
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('CAPABILITY_UNSUPPORTED');
  });

  it('records audit log entries for both successful and rejected commands', async () => {
    bus.registerSession({
      sessionId: 'sess-1',
      repoPath: tmpRepoDir,
      runtime: 'claude',
      capabilities: ['queue'],
    });

    await bus.dispatchQueue({
      repoPath: tmpRepoDir,
      sessionId: 'sess-1',
      instruction: 'Añadir test',
      nonce: 'nonce-audit-1',
    });

    await bus.dispatchPause({
      repoPath: tmpRepoDir,
      sessionId: 'sess-1',
      mode: 'delegations',
      nonce: 'nonce-audit-2',
    });

    const entries = auditor.readEntries(tmpRepoDir);
    expect(entries.length).toBe(2);
    expect(entries[0].action).toBe('queue');
    expect(entries[0].acknowledged).toBe(true);
    expect(entries[1].action).toBe('pause-delegations');
    expect(entries[1].acknowledged).toBe(false);
    expect(entries[1].errorCode).toBe('CAPABILITY_UNSUPPORTED');
  });
});
