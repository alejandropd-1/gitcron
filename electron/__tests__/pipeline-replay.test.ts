import { describe, expect, it } from 'vitest';
import { REJECTED_SNAPSHOT, RUNNING_SNAPSHOT } from '../../components/pipeline/__fixtures__/pipeline-fixtures';
import { PipelineReplayEngine } from '../pipeline/replay/pipeline-replay-engine';
import type { ReplayFrame } from '../pipeline/replay/pipeline-replay-types';

describe('PipelineReplayEngine — Read-Only Replay (Fase 07 Tanda 1)', () => {
  const frames: ReplayFrame[] = [
    {
      frameIndex: 0,
      timestamp: 1000,
      eventLabel: 'Run started',
      snapshot: RUNNING_SNAPSHOT,
    },
    {
      frameIndex: 1,
      timestamp: 2000,
      eventLabel: 'Audit rejected',
      snapshot: REJECTED_SNAPSHOT,
    },
  ];

  it('navigates frame by frame chronologically', () => {
    const replay = new PipelineReplayEngine(frames);
    expect(replay.totalFrames()).toBe(2);

    const initial = replay.getCurrentFrame();
    expect(initial?.eventLabel).toBe('Run started');

    const next = replay.nextFrame();
    expect(next?.eventLabel).toBe('Audit rejected');
    expect(next?.snapshot.decisions.length).toBeGreaterThan(0);

    const atEnd = replay.nextFrame();
    expect(atEnd).toBeNull();
  });

  it('allows seeking directly to a specific frame', () => {
    const replay = new PipelineReplayEngine(frames);
    const frame = replay.seekToFrame(1);
    expect(frame?.timestamp).toBe(2000);
    expect(replay.getCurrentFrame()?.frameIndex).toBe(1);
  });

  it('jumps to next decision milestone', () => {
    const replay = new PipelineReplayEngine(frames);
    const milestone = replay.jumpToNextDecision();
    expect(milestone?.frameIndex).toBe(1);
    expect(milestone?.snapshot.decisions.length).toBeGreaterThan(0);
  });
});
