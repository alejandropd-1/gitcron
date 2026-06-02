// electron/ai/providers/claude.ts
// Claude provider adapter (cloud family). Runs in MAIN.
// The request is built and fired here — never in the renderer — so the
// renderer's CSP stays fully locked (see AI_PIPELINE.md, "CSP refinement").

import type {
  AIPredictionProvider,
  PredictionResult,
  SpeculativeBranch,
} from '../../../types/temporal-agent';
import { fetchWithTimeout, type AssembledPrompts } from '../provider-runtime';
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

/** The skill instructs JSON-only output. Parse defensively; bad output → []. */
function parseBranches(text: string): SpeculativeBranch[] {
  const jsonStr = extractJson(text);
  if (!jsonStr) return [];

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
      return [];
    }

    const valid: SpeculativeBranch[] = [];
    rawBranches.forEach((b) => {
      const norm = normalizeBranch(b);
      if (norm) valid.push(norm);
    });
    return valid;
  } catch {
    return [];
  }
}
