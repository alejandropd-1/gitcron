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

function cleanJsonString(str: string): string {
  // Strip trailing commas from objects and arrays
  return str.replace(/,\s*([\]}])/g, '$1');
}

function normalizeBranch(b: any): SpeculativeBranch | null {
  if (!b || typeof b !== 'object') return null;

  const id = b.id != null ? String(b.id) : (b.id_especulativa != null ? String(b.id_especulativa) : `branch-${Math.random().toString(36).slice(2, 9)}`);
  
  // Resilient messages
  let message = b.message != null ? String(b.message) : '';
  if (!message && b.mensaje != null) {
    message = String(b.mensaje);
  }
  if (!message) {
    message = b.name || b.nombre || b.title || b.titulo || b.branchName || b.nombreRama || b.nombre_rama || 'Speculative Branch';
  }
  message = String(message).slice(0, 100);

  // Resilient rationale
  let rationale = b.rationale != null ? String(b.rationale) : '';
  if (!rationale) {
    rationale = b.justificacion || b.explicacion || b.justificación || b.explicación || b.razon || b.razón || '';
  }
  rationale = String(rationale);

  // Resilient type
  let type = b.type || b.tipo;
  if (typeof type === 'string') {
    type = type.toLowerCase().trim();
    if (type === 'mejora' || type === 'improvement' || type === 'mejora de código' || type === 'mejora_codigo') {
      type = 'improvement';
    } else if (type === 'innovacion' || type === 'innovación' || type === 'breakthrough' || type === 'descubrimiento' || type === 'discovery') {
      type = 'breakthrough';
    } else if (type === 'tendencia' || type === 'trend' || type === 'evolucion' || type === 'evolución' || type === 'evolution') {
      type = 'trend';
    } else {
      type = 'improvement';
    }
  } else {
    type = 'improvement';
  }

  // Resilient confidence
  let confidence = b.confidence !== undefined ? b.confidence : b.confianza;
  if (typeof confidence === 'string') {
    if (confidence.endsWith('%')) {
      confidence = parseFloat(confidence) / 100;
    } else {
      confidence = parseFloat(confidence);
    }
  }
  if (typeof confidence !== 'number' || isNaN(confidence)) {
    confidence = 0.5;
  }
  confidence = Math.max(0, Math.min(1, confidence));

  // Resilient reasoning
  const reasoning = b.reasoning || b.razonamiento || b.explicacion_detallada || b.explicación_detallada || b.pensamiento;

  // Resilient agentPrompt
  const agentPrompt = b.agentPrompt || b.promptAgente || b.prompt_agente || b.instrucciones || b.instruccionesAgente;

  return {
    id,
    message,
    rationale,
    type: type as 'improvement' | 'breakthrough' | 'trend',
    confidence,
    reasoning: reasoning ? String(reasoning) : undefined,
    agentPrompt: agentPrompt ? String(agentPrompt) : undefined,
    predictionIndex: b.predictionIndex != null ? Number(b.predictionIndex) : undefined
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

function extractJson(text: string): string | null {
  const trimmed = text.trim();
  
  // Try parsing the text directly first
  try {
    JSON.parse(cleanJsonString(trimmed));
    return trimmed;
  } catch {}

  // Look for any markdown code blocks
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const content = match[1].trim();
    try {
      JSON.parse(cleanJsonString(content));
      return content;
    } catch {}
  }

  // Resilient regex for finding json objects containing branches or similar keys
  const branchesMatch = text.match(/\{[\s\S]*(?:"branches"|"ramas"|"ideas"|"predictions")\s*:\s*\[[\s\S]*\][\s\S]*\}/i);
  if (branchesMatch) {
    try {
      const candidate = cleanJsonString(branchesMatch[0]);
      JSON.parse(candidate);
      return branchesMatch[0];
    } catch {}
  }

  // Find the first { or [ and the last } or ]
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');

  // Try extracting between first brace and last brace
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1);
    try {
      JSON.parse(cleanJsonString(candidate));
      return candidate;
    } catch {}
  }

  // Try extracting between first bracket and last bracket
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const candidate = text.slice(firstBracket, lastBracket + 1);
    try {
      JSON.parse(cleanJsonString(candidate));
      return candidate;
    } catch {}
  }

  // Stack-based search for the first valid JSON object or array
  // This is highly robust if there is garbage text before/after.
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '{' || char === '[') {
      const closingChar = char === '{' ? '}' : ']';
      let depth = 1;
      for (let j = i + 1; j < text.length; j++) {
        if (text[j] === char) {
          depth++;
        } else if (text[j] === closingChar) {
          depth--;
          if (depth === 0) {
            const candidate = text.slice(i, j + 1);
            try {
              JSON.parse(cleanJsonString(candidate));
              return candidate;
            } catch {}
          }
        }
      }
    }
  }

  return null;
}

function isBranch(b: unknown): b is SpeculativeBranch {
  const x = b as Record<string, unknown>;
  return (
    !!x &&
    (typeof x.id === 'string' || typeof x.id === 'number') &&
    (typeof x.message === 'string' || typeof x.mensaje === 'string') &&
    (typeof x.rationale === 'string' || typeof x.justificacion === 'string' || typeof x.explicacion === 'string') &&
    (x.type === 'improvement' || x.type === 'breakthrough' || x.type === 'trend' || x.tipo === 'mejora' || x.tipo === 'innovación' || x.tipo === 'tendencia') &&
    (typeof x.confidence === 'number' || typeof x.confianza === 'number')
  );
}
