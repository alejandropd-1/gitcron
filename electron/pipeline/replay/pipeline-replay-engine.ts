import type { ReplayFrame } from './pipeline-replay-types';
import type { PipelineSnapshot } from '../../../components/pipeline/pipeline-view-state';

export class PipelineReplayEngine {
  private frames: ReplayFrame[] = [];
  private currentFrameIndex: number = 0;

  constructor(frames: ReplayFrame[] = []) {
    this.frames = [...frames].sort((a, b) => a.timestamp - b.timestamp);
    // Recalcular índices correlativos
    this.frames.forEach((frame, idx) => {
      frame.frameIndex = idx;
    });
  }

  public totalFrames(): number {
    return this.frames.length;
  }

  public getCurrentFrame(): ReplayFrame | null {
    if (this.frames.length === 0) return null;
    return this.frames[this.currentFrameIndex] ?? null;
  }

  public getCurrentSnapshot(): PipelineSnapshot | null {
    return this.getCurrentFrame()?.snapshot ?? null;
  }

  public seekToFrame(index: number): ReplayFrame | null {
    if (index < 0 || index >= this.frames.length) return null;
    this.currentFrameIndex = index;
    return this.getCurrentFrame();
  }

  public nextFrame(): ReplayFrame | null {
    if (this.currentFrameIndex + 1 < this.frames.length) {
      this.currentFrameIndex += 1;
      return this.getCurrentFrame();
    }
    return null; // Fin del replay
  }

  public previousFrame(): ReplayFrame | null {
    if (this.currentFrameIndex - 1 >= 0) {
      this.currentFrameIndex -= 1;
      return this.getCurrentFrame();
    }
    return null;
  }

  /**
   * Salta al próximo hito donde cambie la estación del ChangePath.
   */
  public jumpToNextStation(): ReplayFrame | null {
    const current = this.getCurrentFrame();
    if (!current) return null;

    const currentStation = current.snapshot.stations.find((s: { state: string }) => s.state === 'active')?.id;

    for (let i = this.currentFrameIndex + 1; i < this.frames.length; i++) {
      const frame = this.frames[i];
      const station = frame.snapshot.stations.find((s: { state: string }) => s.state === 'active')?.id;
      if (station && station !== currentStation) {
        this.currentFrameIndex = i;
        return frame;
      }
    }
    return null;
  }

  /**
   * Salta al próximo hito donde exista una decisión pendiente.
   */
  public jumpToNextDecision(): ReplayFrame | null {
    for (let i = this.currentFrameIndex + 1; i < this.frames.length; i++) {
      const frame = this.frames[i];
      if (frame.snapshot.decisions.length > 0) {
        this.currentFrameIndex = i;
        return frame;
      }
    }
    return null;
  }
}
