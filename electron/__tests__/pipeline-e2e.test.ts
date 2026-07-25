import { describe, expect, it } from 'vitest';
import { PipelineE2EVerifier, type E2EStage } from '../pipeline/e2e/pipeline-e2e-verifier';

describe('PipelineE2EVerifier — 10 Full Story Stages (Fase 08 Tanda 4)', () => {
  it('verifies coverage of all 10 pipeline lifecycle story stages', () => {
    const verifier = new PipelineE2EVerifier();

    const stages: E2EStage[] = [
      'no_kit',
      'scout',
      'proposal',
      'builder',
      'gates',
      'fixer_loop',
      'control_interrupted',
      'budget_enforced',
      'archived',
      'replayed',
    ];

    stages.forEach((s) => verifier.recordStage(s));

    const result = verifier.verifyCompleteStory();
    expect(result.allVerified).toBe(true);
    expect(result.coverageReport.length).toBe(10);
  });

  it('detects incomplete story coverage when stages are missing', () => {
    const verifier = new PipelineE2EVerifier();
    verifier.recordStage('no_kit');
    verifier.recordStage('scout');

    const result = verifier.verifyCompleteStory();
    expect(result.allVerified).toBe(false);
    expect(result.coverageReport.filter((c) => c.verified).length).toBe(2);
  });
});
