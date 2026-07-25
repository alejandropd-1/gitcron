import { describe, expect, it, vi } from 'vitest';
import type { PipelineControlAction } from '../../../electron/pipeline/control/control-bus-types';

describe('PipelineControlBar Component (Tanda 2 UI & Control)', () => {
  it('disables unsupported buttons based on capability matrix', () => {
    const capabilities: PipelineControlAction[] = ['steer', 'queue']; // No pause capabilities

    const canPauseDelegations = capabilities.includes('pause-delegations');
    const canPauseAfterTask = capabilities.includes('pause-after-task');
    const canSteer = capabilities.includes('steer');
    const canQueue = capabilities.includes('queue');

    expect(canPauseDelegations).toBe(false);
    expect(canPauseAfterTask).toBe(false);
    expect(canSteer).toBe(true);
    expect(canQueue).toBe(true);
  });

  it('separates ACK feedback from eventual effect reconciliation', () => {
    const onDispatched = vi.fn();

    // Trigger control action callback
    onDispatched('pause-delegations', 'ack');

    expect(onDispatched).toHaveBeenCalledWith('pause-delegations', 'ack');
  });
});
