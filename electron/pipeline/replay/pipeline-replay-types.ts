import type { PipelineSnapshot } from '../../../components/pipeline/pipeline-view-state';

export type PlaybackState = 'playing' | 'paused' | 'stopped';

export interface ReplayFrame {
  frameIndex: number;
  timestamp: number;
  eventLabel: string;
  snapshot: PipelineSnapshot;
}

export interface ReplayOptions {
  speed?: 1 | 2 | 5 | 10;
}
