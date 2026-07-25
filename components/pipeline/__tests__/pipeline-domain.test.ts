import { describe, expect, it } from 'vitest';
import {
  CHANGE_STATIONS,
  formatElapsed,
  sortDecisionsByHumanNeed,
  type DecisionRequest,
} from '../pipeline-domain';
import { FIXTURES } from '../__fixtures__/pipeline-fixtures';

function decision(id: string, risk: DecisionRequest['risk']): DecisionRequest {
  return {
    decisionId: id,
    kind: 'clarification',
    title: 'decisión de prueba',
    why: null,
    options: [],
    risk,
    riskProvenance: null,
    evidenceRefs: [],
    technicalContext: null,
    provenance: 'runtime',
    evidenceStatus: 'unknown',
  };
}

describe('sortDecisionsByHumanNeed', () => {
  it('puts high risk first: the inbox is not a feed', () => {
    const sorted = sortDecisionsByHumanNeed([
      decision('low', 'low'),
      decision('high', 'high'),
      decision('medium', 'medium'),
    ]);
    expect(sorted.map((d) => d.decisionId)).toEqual(['high', 'medium', 'low']);
  });

  it('never sinks an unassessed risk below a known-low one', () => {
    // "Sin evaluar" no es "inofensivo": no puede caer al fondo.
    const sorted = sortDecisionsByHumanNeed([decision('low', 'low'), decision('unknown', 'unknown')]);
    expect(sorted[0].decisionId).toBe('unknown');
  });

  it('does not mutate the input array', () => {
    const input = [decision('low', 'low'), decision('high', 'high')];
    sortDecisionsByHumanNeed(input);
    expect(input.map((d) => d.decisionId)).toEqual(['low', 'high']);
  });
});

describe('formatElapsed', () => {
  it('returns null instead of a fake zero when there is no duration', () => {
    expect(formatElapsed(null)).toBeNull();
    expect(formatElapsed(Number.NaN)).toBeNull();
    expect(formatElapsed(-1)).toBeNull();
  });

  it('formats minutes and seconds', () => {
    expect(formatElapsed(8 * 60_000 + 12_000)).toBe('8:12');
    expect(formatElapsed(5_000)).toBe('0:05');
  });

  it('switches to hours:minutes past an hour', () => {
    expect(formatElapsed(2 * 3_600_000 + 7 * 60_000)).toBe('2:07');
  });
});

describe('fixtures', () => {
  it('keeps every change station covered in the running fixture', () => {
    const ids = FIXTURES.running.stations.map((station) => station.id);
    expect(ids).toEqual([...CHANGE_STATIONS]);
  });

  it('models a local provider as unpriced, never as a zero cost', () => {
    const { now } = FIXTURES.localUnpriced;
    expect(now.costUsd).toBeNull();
    expect(now.costBasis).toBe('local_unpriced');
  });

  it('sends the rejected run back to the fixer', () => {
    const byId = new Map(FIXTURES.rejected.stations.map((s) => [s.id, s.state]));
    expect(byId.get('auditor')).toBe('rejected');
    expect(byId.get('fixer')).toBe('current');
    expect(byId.get('merge')).toBe('possible');
  });

  it('marks approval and merge as human gates', () => {
    const humanGates = FIXTURES.running.stations.filter((s) => s.humanGate).map((s) => s.id);
    expect(humanGates).toEqual(['approval', 'merge']);
  });

  it('never exposes an F05 control as usable in F04', () => {
    const executable = FIXTURES.rejected.decisions
      .flatMap((d) => d.options)
      .filter((option) => option.availability === 'informational');
    // Las informativas son de navegación; ninguna ejecuta un approval.
    expect(executable.every((option) => option.consequence === null)).toBe(true);
  });
});
