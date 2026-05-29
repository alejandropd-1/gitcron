// electron/ai/providers/index.ts
// Provider registry + dispatcher (brief §6.1). The active provider is a user
// preference; swapping it is a setting change, not a refactor.
//
// Two families:
//   - cloud  (claude, openai, gemini): HTTPS endpoint + API key.
//   - local  (opencode): configurable endpoint, auth OPTIONAL. The interface
//     must not assume a key exists — designing only for cloud breaks OpenCode.

import type {
  AIPredictionProvider,
  PredictionResult,
} from '../../../types/temporal-agent';
import type { AssembledPrompts } from '../predict';
import { createClaudeProvider } from './claude';
import { createOpenRouterProvider } from './openrouter';

export type ProviderId = AIPredictionProvider['id'];

/** A uniform stub so unimplemented providers fail the same clear way. */
function stub(id: ProviderId, label: string, kind: 'cloud' | 'local'): AIPredictionProvider {
  return {
    id,
    label,
    kind,
    async predictTimelines(_prompts: AssembledPrompts): Promise<PredictionResult> {
      throw new Error(`Provider "${id}" is not implemented yet`);
    },
  };
}

// OpenCode note: local/gateway. `kind: 'local'`. When implemented, it reads a
// user-configured endpoint and treats auth as optional (may have no key).
const registry: Record<ProviderId, () => AIPredictionProvider> = {
  openrouter: () => createOpenRouterProvider(),
  claude: () => createClaudeProvider(),
  openai: () => stub('openai', 'OpenAI', 'cloud'),
  gemini: () => stub('gemini', 'Google Gemini', 'cloud'),
  opencode: () => stub('opencode', 'OpenCode (local/gateway)', 'local'),
};

export function getProvider(id: ProviderId): AIPredictionProvider {
  const make = registry[id];
  if (!make) throw new Error(`Unknown provider: ${id}`);
  return make();
}

export function listProviders(): Array<Pick<AIPredictionProvider, 'id' | 'label' | 'kind'>> {
  return (Object.keys(registry) as ProviderId[]).map((id) => {
    const p = registry[id]();
    return { id: p.id, label: p.label, kind: p.kind };
  });
}
