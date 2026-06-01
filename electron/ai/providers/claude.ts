// electron/ai/providers/claude.ts
// Claude provider adapter (cloud family). Runs in MAIN.
// The request is built and fired here — never in the renderer — so the
// renderer's CSP stays fully locked (see AI_PIPELINE.md, "CSP refinement").

import type {
  AIPredictionProvider,
  PredictionResult,
  SpeculativeBranch,
} from '../../../types/temporal-agent';
import { fetchWithTimeout, type AssembledPrompts } from '../predict';
import { getKey } from '../key-store';

// Model is configurable; verify the exact id for your account before shipping.
const DEFAULT_MODEL = 'claude-sonnet-4-5';
const ENDPOINT = 'https://api.anthropic.com/v1/messages';

export function createClaudeProvider(opts?: { model?: string }): AIPredictionProvider {
  const model = opts?.model ?? DEFAULT_MODEL;

  return {
    id: 'claude',
    label: 'Claude (Anthropic)',
    kind: 'cloud',

    async predictTimelines(prompts: AssembledPrompts): Promise<PredictionResult> {
      const key = getKey('claude');
      if (!key) throw new Error('No Claude API key stored');

      const { systemPrompt, userPrompt } = prompts;

      const res = await fetchWithTimeout(ENDPOINT, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      if (!res.ok) {
        // Never surface the key; the status is enough for the renderer.
        throw new Error(`Claude request failed (${res.status})`);
      }

      const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
      const text = (data.content ?? [])
        .filter((b) => b.type === 'text' && b.text)
        .map((b) => b.text as string)
        .join('\n');

      return {
        branches: parseBranches(text),
        provider: 'claude',
        generatedAt: new Date().toISOString(),
      };
    },
  };
}

/** The skill instructs JSON-only output. Parse defensively; bad output → []. */
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
