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
import { fetchWithTimeout, type AssembledPrompts } from '../provider-runtime';
import { cleanJsonString, extractJson, normalizeBranch } from '../provider-parsing';
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
          max_tokens: 4096,
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
    const cleaned = cleanJsonString(jsonStr);
    const parsed = JSON.parse(cleaned) as { branches?: unknown; ramas?: unknown };
    if (!parsed) return [];

    let rawBranches: any[] = [];
    if (Array.isArray(parsed)) {
      rawBranches = parsed;
    } else if (parsed && Array.isArray(parsed.branches)) {
      rawBranches = parsed.branches;
    } else if (parsed && Array.isArray((parsed as any).ramas)) {
      rawBranches = (parsed as any).ramas;
    } else {
      console.log('[temporal-agent] parseBranches: no branches/ramas array found in JSON structure');
      return [];
    }

    const valid: SpeculativeBranch[] = [];
    rawBranches.forEach((b, i) => {
      const norm = normalizeBranch(b);
      if (norm) {
        valid.push(norm);
      } else {
        console.log(`[temporal-agent] dropped/failed normalization for branch[${i}]:`, JSON.stringify(b).slice(0, 200));
      }
    });

    console.log(`[temporal-agent] parseBranches: normalized ${valid.length} of ${rawBranches.length} branches`);
    return valid;
  } catch (e) {
    console.log('[temporal-agent] parseBranches: JSON parse failed —', e instanceof Error ? e.message : e);
    return [];
  }
}

