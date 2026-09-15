import { describe, expect, it } from 'vitest';
import {
  formatElapsed,
  getOpenSpecEngineUpgrade,
  isOpenSpecEngineStatusIncomplete,
  assessOpenSpecEngineAfterInstall,
  sortDecisionsByHumanNeed,
  type DecisionRequest,
} from '../pipeline-domain';
import type { OpenSpecEngineStatus } from '@/types/pipeline';
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
  // El costo cero de un proveedor local es ausencia de precio, no un descuento.
  it('models a local provider as unpriced, never as a zero cost', () => {
    const { economy } = FIXTURES.localUnpriced;
    expect(economy.costUsd).toBeNull();
    expect(economy.costBasis).toBe('local_unpriced');
  });

  it('never exposes an F05 control as usable in F04', () => {
    const executable = FIXTURES.rejected.decisions
      .flatMap((d) => d.options)
      .filter((option) => option.availability === 'informational');
    // Las informativas son de navegación; ninguna ejecuta un approval.
    expect(executable.every((option) => option.consequence === null)).toBe(true);
  });
});

describe('getOpenSpecEngineUpgrade', () => {
  it('instalada 1.12.0 y latest 1.13.0 → objeto con { installed, latest } y sin beyondTested', () => {
    const status = {
      cli: { installed: true, runtimeVersion: '1.12.0' },
      latestAvailable: { latestVersion: '1.13.0' },
    } as unknown as OpenSpecEngineStatus;

    const result = getOpenSpecEngineUpgrade(status);
    expect(result).toEqual({
      installed: '1.12.0',
      latest: '1.13.0',
    });
    expect(result).not.toHaveProperty('beyondTested');
  });

  it('instalada 1.13.0 y latest 1.12.0 → null (defecto de la línea 402 cubierto)', () => {
    const status = {
      cli: { installed: true, runtimeVersion: '1.13.0' },
      latestAvailable: { latestVersion: '1.12.0' },
    } as unknown as OpenSpecEngineStatus;

    expect(getOpenSpecEngineUpgrade(status)).toBeNull();
  });

  it('latest 1.9.0 e instalada 1.5.0 → objeto con { installed, latest }', () => {
    const status = {
      cli: { installed: true, runtimeVersion: '1.5.0' },
      latestAvailable: { latestVersion: '1.9.0' },
    } as unknown as OpenSpecEngineStatus;

    const result = getOpenSpecEngineUpgrade(status);
    expect(result).toEqual({
      installed: '1.5.0',
      latest: '1.9.0',
    });
  });

  it('cli.installed false → null', () => {
    const status = {
      cli: { installed: false, runtimeVersion: '1.12.0' },
      latestAvailable: { latestVersion: '1.13.0' },
    } as unknown as OpenSpecEngineStatus;

    expect(getOpenSpecEngineUpgrade(status)).toBeNull();
  });

  it('latestAvailable null → null', () => {
    const status = {
      cli: { installed: true, runtimeVersion: '1.12.0' },
      latestAvailable: null,
    } as unknown as OpenSpecEngineStatus;

    expect(getOpenSpecEngineUpgrade(status)).toBeNull();
  });
});

describe('isOpenSpecEngineStatusIncomplete', () => {
  it('installed true + runtimeVersion null → true', () => {
    const status = {
      cli: { installed: true, runtimeVersion: null },
      globalConfig: null,
    } as unknown as OpenSpecEngineStatus;
    expect(isOpenSpecEngineStatusIncomplete(status)).toBe(true);
  });

  it("globalConfig.profileState 'failed' → true", () => {
    const status = {
      cli: { installed: true, runtimeVersion: '1.12.0' },
      globalConfig: { profileState: 'failed' },
    } as unknown as OpenSpecEngineStatus;
    expect(isOpenSpecEngineStatusIncomplete(status)).toBe(true);
  });

  it('todo leído → false', () => {
    const status = {
      cli: { installed: true, runtimeVersion: '1.12.0' },
      globalConfig: { profileState: 'read' },
    } as unknown as OpenSpecEngineStatus;
    expect(isOpenSpecEngineStatusIncomplete(status)).toBe(false);
  });

  it('null o undefined → false', () => {
    expect(isOpenSpecEngineStatusIncomplete(null)).toBe(false);
    expect(isOpenSpecEngineStatusIncomplete(undefined)).toBe(false);
  });
});

describe('assessOpenSpecEngineAfterInstall', () => {
  it('status null o undefined → verdict: unverified sin motivos', () => {
    expect(assessOpenSpecEngineAfterInstall(null)).toEqual({
      verdict: 'unverified',
      reasonKeys: [],
    });
    expect(assessOpenSpecEngineAfterInstall(undefined)).toEqual({
      verdict: 'unverified',
      reasonKeys: [],
    });
  });

  it('motor sano → verdict: ok sin motivos', () => {
    const healthyStatus = {
      cli: { installed: true, runtimeVersion: '1.13.0' },
      doctor: { ok: true, data: { version: '1.13.0' } },
      globalConfig: { profileState: 'read' },
    } as unknown as OpenSpecEngineStatus;

    expect(assessOpenSpecEngineAfterInstall(healthyStatus)).toEqual({
      verdict: 'ok',
      reasonKeys: [],
    });
  });

  it('cli.installed false → verdict: broken con notFound', () => {
    const notInstalledStatus = {
      cli: { installed: false, runtimeVersion: null },
    } as unknown as OpenSpecEngineStatus;

    expect(assessOpenSpecEngineAfterInstall(notInstalledStatus)).toEqual({
      verdict: 'broken',
      reasonKeys: ['pipeline.openspec.engine.afterInstall.notFound'],
    });
  });

  it('cli.installed true y runtimeVersion null → verdict: broken con versionUnreadable', () => {
    const unreadableStatus = {
      cli: { installed: true, runtimeVersion: null },
    } as unknown as OpenSpecEngineStatus;

    expect(assessOpenSpecEngineAfterInstall(unreadableStatus)).toEqual({
      verdict: 'broken',
      reasonKeys: ['pipeline.openspec.engine.afterInstall.versionUnreadable'],
    });
  });

  it('doctor.data null → verdict: broken con doctorUnparsable', () => {
    const doctorUnparsableStatus = {
      cli: { installed: true, runtimeVersion: '1.13.0' },
      doctor: { ok: false, data: null },
      globalConfig: { profileState: 'read' },
    } as unknown as OpenSpecEngineStatus;

    expect(assessOpenSpecEngineAfterInstall(doctorUnparsableStatus)).toEqual({
      verdict: 'broken',
      reasonKeys: ['pipeline.openspec.engine.afterInstall.doctorUnparsable'],
    });
  });

  it("globalConfig.profileState 'failed' → verdict: broken con configUnreadable", () => {
    const failedConfigStatus = {
      cli: { installed: true, runtimeVersion: '1.13.0' },
      doctor: { ok: true, data: {} },
      globalConfig: { profileState: 'failed' },
    } as unknown as OpenSpecEngineStatus;

    expect(assessOpenSpecEngineAfterInstall(failedConfigStatus)).toEqual({
      verdict: 'broken',
      reasonKeys: ['pipeline.openspec.engine.afterInstall.configUnreadable'],
    });
  });

  it('dos motivos a la vez → verdict: broken con las dos claves en orden', () => {
    const multiFailureStatus = {
      cli: { installed: true, runtimeVersion: null },
      doctor: { ok: false, data: null },
      globalConfig: { profileState: 'read' },
    } as unknown as OpenSpecEngineStatus;

    expect(assessOpenSpecEngineAfterInstall(multiFailureStatus)).toEqual({
      verdict: 'broken',
      reasonKeys: [
        'pipeline.openspec.engine.afterInstall.versionUnreadable',
        'pipeline.openspec.engine.afterInstall.doctorUnparsable',
      ],
    });
  });
});
