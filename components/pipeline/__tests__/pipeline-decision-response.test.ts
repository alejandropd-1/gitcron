import { describe, expect, it, vi } from 'vitest';
import { REJECTED_SNAPSHOT } from '../__fixtures__/pipeline-fixtures';

describe('Pipeline Decision Response & Cancel Run (Tanda 4)', () => {
  it('enables options with pending-f05 availability when onRespondOption callback is provided', () => {
    const decision = REJECTED_SNAPSHOT.decisions[0];
    expect(decision).toBeDefined();

    const optionWithPendingF05 = decision.options.find((o) => o.availability === 'pending-f05');
    expect(optionWithPendingF05).toBeDefined();

    const onRespond = vi.fn();
    onRespond(decision.decisionId, optionWithPendingF05!.id);

    expect(onRespond).toHaveBeenCalledWith(decision.decisionId, optionWithPendingF05!.id);
  });
});
