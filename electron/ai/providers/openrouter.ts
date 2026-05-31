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
import { fetchWithTimeout, type AssembledPrompts } from '../predict';
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

      const res = await fetchWithTimeout(ENDPOINT, {
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
          max_tokens: 2048,
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
        choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      };
      const choice = data.choices?.[0];
      const text = choice?.message?.content ?? '';
      const finishReason = choice?.finish_reason;

      if (!text && finishReason === 'length') {
        throw new Error('Model response truncated (max_tokens too low)');
      }

      return {
        branches: parseBranches(text),
        provider: `openrouter:${model}`,
        generatedAt: new Date().toISOString(),
      };
    },
  };
}

function parseBranches(text: string): SpeculativeBranch[] {
  console.log('[temporal-agent] AI raw response length:', text.length);
  console.log('[temporal-agent] AI raw preview:', text.slice(0, 500));

  const jsonStr = extractJson(text);
  if (!jsonStr) {
    console.log('[temporal-agent] parseBranches: no JSON object found in response');
    return [];
  }

  try {
    const parsed = JSON.parse(jsonStr) as { branches?: unknown };
    if (!parsed || !Array.isArray(parsed.branches)) {
      console.log('[temporal-agent] parseBranches: no branches array. Keys:', Object.keys(parsed ?? {}));
      return [];
    }
    const valid = parsed.branches.filter(isBranch);
    const dropped = parsed.branches.length - valid.length;
    console.log(`[temporal-agent] parseBranches: ${valid.length} valid, ${dropped} dropped of ${parsed.branches.length}`);
    if (dropped > 0) {
      parsed.branches.forEach((b, i) => {
        if (!isBranch(b)) {
          console.log(`[temporal-agent] dropped branch[${i}]:`, JSON.stringify(b).slice(0, 200));
        }
      });
    }
    return valid;
  } catch (e) {
    console.log('[temporal-agent] parseBranches: JSON parse failed —', e instanceof Error ? e.message : e);
    return [];
  }
}

function extractJson(text: string): string | null {
  const stripped = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try {
    JSON.parse(stripped);
    return stripped;
  } catch { /* fall through */ }

  const match = stripped.match(/\{[\s\S]*"branches"\s*:\s*\[[\s\S]*\][\s\S]*\}/);
  if (match) {
    try {
      JSON.parse(match[0]);
      return match[0];
    } catch { /* fall through */ }
  }

  const braceStart = stripped.indexOf('{');
  const braceEnd = stripped.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    const candidate = stripped.slice(braceStart, braceEnd + 1);
    try {
      JSON.parse(candidate);
      return candidate;
    } catch { /* fall through */ }
  }

  return null;
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
