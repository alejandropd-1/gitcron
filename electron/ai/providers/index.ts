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
import type { AssembledPrompts } from '../provider-runtime';
import { createClaudeProvider } from './claude';
import { createOpenRouterProvider } from './openrouter';

export type ProviderId = AIPredictionProvider['id'];

// Nota de unificación (Tarea 9b.6):
// Se retiran los stubs que lanzaban "not implemented yet" (openai, gemini, opencode):
// - opencode es un runtime de agente interactivo con herramientas y ACP (PipelineRuntime),
//   no una llamada a modelo de texto.
// - openai y gemini se consumen a través de OpenRouter (enrutador multi-modelo con una sola key),
//   sin planes de implementar clientes REST nativos directos.
/** Runtime options for building a provider (e.g. user-chosen model id). */
export type ProviderOpts = { model?: string };

const registry: Partial<Record<ProviderId, (opts?: ProviderOpts) => AIPredictionProvider>> = {
  openrouter: (opts) => createOpenRouterProvider({ model: opts?.model }),
  claude: (opts) => createClaudeProvider({ model: opts?.model }),
};

export function getProvider(id: ProviderId, opts?: ProviderOpts): AIPredictionProvider {
  const make = registry[id];
  if (!make) throw new Error(`Unknown provider: ${id}`);
  return make(opts);
}
