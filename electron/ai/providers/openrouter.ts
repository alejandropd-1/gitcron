// electron/ai/providers/openrouter.ts
// OpenRouter provider adapter (cloud family, OpenAI-compatible). Runs in MAIN.
//
// OpenRouter is a ROUTER: one API key + one endpoint gives access to Claude,
// GPT, Gemini, Llama, etc. So this single adapter effectively covers the three
// cloud providers. The user picks the underlying model via `model`.
//
// Request/response is the OpenAI chat-completions shape. Key from the main-only
// vault; never logged, never sent to the renderer.

import type {
  AIPredictionProvider,
  PredictionResult,
  SpeculativeBranch,
} from '../../../types/temporal-agent';
import type { AssembledPrompts } from '../predict';
import { getKey } from '../key-store';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
// Sensible default; the user can override in Settings. Any OpenRouter model id.
const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.5';

export function createOpenRouterProvider(opts?: { model?: string }): AIPredictionProvider {
  const model = opts?.model ?? DEFAULT_MODEL;

  return {
    id: 'openrouter',
    label: 'OpenRouter (multi-model)',
    kind: 'cloud',

    async predictTimelines(prompts: AssembledPrompts): Promise<PredictionResult> {
      const key = getKey('openrouter');
      if (!key) throw new Error('No OpenRouter API key stored');

      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${key}`,
          // Optional attribution headers OpenRouter recommends:
          'http-referer': 'https://github.com/alejandropd-1/gitcron',
          'x-title': 'GitCron Temporal Agent',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          messages: [
            { role: 'system', content: prompts.systemPrompt },
            { role: 'user', content: prompts.userPrompt },
          ],
        }),
      });

      if (!res.ok) {
        // Status only — never echo the key or full error body that might carry it.
        throw new Error(`OpenRouter request failed (${res.status})`);
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = data.choices?.[0]?.message?.content ?? '';

      return {
        branches: parseBranches(text),
        provider: `openrouter:${model}`,
        generatedAt: new Date().toISOString(),
      };
    },
  };
}

/** Skill mandates JSON-only output. Parse defensively; bad output → []. */
function parseBranches(text: string): SpeculativeBranch[] {
  const cleaned = text.replace(/```json|```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as { branches?: unknown };
    if (!parsed || !Array.isArray(parsed.branches)) return [];
    return parsed.branches.filter(isBranch);
  } catch {
    return [];
  }
}

function isBranch(b: unknown): b is SpeculativeBranch {
  const x = b as Record<string, unknown>;
  return (
    !!x &&
    typeof x.id === 'string' &&
    typeof x.message === 'string' &&
    typeof x.rationale === 'string' &&
    (x.type === 'improvement' || x.type === 'breakthrough' || x.type === 'trend') &&
    typeof x.confidence === 'number'
  );
}
