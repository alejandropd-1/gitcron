export type E2EStage =
  | 'no_kit'
  | 'scout'
  | 'proposal'
  | 'builder'
  | 'gates'
  | 'fixer_loop'
  | 'control_interrupted'
  | 'budget_enforced'
  | 'archived'
  | 'replayed';

export interface E2EStoryCheck {
  stage: E2EStage;
  verified: boolean;
  notes?: string;
}

export class PipelineE2EVerifier {
  private verifiedStages: Set<E2EStage> = new Set();

  public recordStage(stage: E2EStage): void {
    this.verifiedStages.add(stage);
  }

  public isStageVerified(stage: E2EStage): boolean {
    return this.verifiedStages.has(stage);
  }

  public verifyCompleteStory(): {
    allVerified: boolean;
    coverageReport: E2EStoryCheck[];
  } {
    const requiredStages: E2EStage[] = [
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

    const coverageReport: E2EStoryCheck[] = requiredStages.map((stage) => ({
      stage,
      verified: this.verifiedStages.has(stage),
    }));

    const allVerified = coverageReport.every((c) => c.verified);

    return {
      allVerified,
      coverageReport,
    };
  }
}
