// electron/ai/providers/openrouter.ts
// OpenRouter provider adapter (cloud family, OpenAI-compatible). Runs in MAIN.
//
// OpenRouter is a ROUTER: one API key + one endpoint gives access to Claude,
// GPT, Gemini, Llama, etc. So this single adapter effectively covers the three
// cloud providers. The user picks the underlying model via `model`.
//
// Migrado a la capa unificada de `text-client.ts` (Tarea 9b.8).
// Request/response is the OpenAI chat-completions shape. Key from the main-only
// vault; never logged, never sent to the renderer.

import type {
  AIPredictionProvider,
  PredictionResult,
  SpeculativeBranch,
} from '../../../types/temporal-agent';
import type { AssembledPrompts } from '../provider-runtime';
import { cleanJsonString, extractJson, normalizeBranch } from '../provider-parsing';
import { getKey } from '../key-store';
import { completeText, createOpenRouterConfig } from '../text-client';

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

      const config = createOpenRouterConfig({
        apiKey: key,
        appName: 'GitCron Temporal Agent',
      });

      const { text, finishReason } = await completeText(config, {
        model,
        system: prompts.systemPrompt,
        user: prompts.userPrompt,
        maxTokens: 4096,
      });

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

