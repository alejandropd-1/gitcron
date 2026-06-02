import type { SpeculativeBranch } from '../../types/temporal-agent';

export function cleanJsonString(str: string): string {
  return str.replace(/,\s*([\]}])/g, '$1');
}

export function normalizeBranch(b: any): SpeculativeBranch | null {
  if (!b || typeof b !== 'object') return null;

  const id = b.id != null ? String(b.id) : (b.id_especulativa != null ? String(b.id_especulativa) : `branch-${Math.random().toString(36).slice(2, 9)}`);

  let message = b.message != null ? String(b.message) : '';
  if (!message && b.mensaje != null) {
    message = String(b.mensaje);
  }
  if (!message) {
    message = b.name || b.nombre || b.title || b.titulo || b.branchName || b.nombreRama || b.nombre_rama || 'Speculative Branch';
  }
  message = String(message).slice(0, 100);

  let rationale = b.rationale != null ? String(b.rationale) : '';
  if (!rationale) {
    rationale = b.justificacion || b.explicacion || b.justificación || b.explicación || b.razon || b.razón || '';
  }
  rationale = String(rationale);

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

  const reasoning = b.reasoning || b.razonamiento || b.explicacion_detallada || b.explicación_detallada || b.pensamiento;
  const agentPrompt = b.agentPrompt || b.promptAgente || b.prompt_agente || b.instrucciones || b.instruccionesAgente;

  return {
    id,
    message,
    rationale,
    type: type as 'improvement' | 'breakthrough' | 'trend',
    confidence,
    reasoning: reasoning ? String(reasoning) : undefined,
    agentPrompt: agentPrompt ? String(agentPrompt) : undefined,
    predictionIndex: b.predictionIndex != null ? Number(b.predictionIndex) : undefined,
  };
}

export function extractJson(text: string): string | null {
  const trimmed = text.trim();

  try {
    JSON.parse(cleanJsonString(trimmed));
    return trimmed;
  } catch {}

  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const content = match[1].trim();
    try {
      JSON.parse(cleanJsonString(content));
      return content;
    } catch {}
  }

  const branchesMatch = text.match(/\{[\s\S]*(?:"branches"|"ramas"|"ideas"|"predictions")\s*:\s*\[[\s\S]*\][\s\S]*\}/i);
  if (branchesMatch) {
    try {
      const candidate = cleanJsonString(branchesMatch[0]);
      JSON.parse(candidate);
      return branchesMatch[0];
    } catch {}
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1);
    try {
      JSON.parse(cleanJsonString(candidate));
      return candidate;
    } catch {}
  }

  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const candidate = text.slice(firstBracket, lastBracket + 1);
    try {
      JSON.parse(cleanJsonString(candidate));
      return candidate;
    } catch {}
  }

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
