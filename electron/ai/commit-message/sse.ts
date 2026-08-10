// electron/ai/commit-message/sse.ts
//
// Lectura del stream de la redacción.
//
// Medido contra LM Studio: una redacción corta produjo **308 cuadros en 6,9
// segundos** —unos 45 por segundo—, de los cuales **278 eran razonamiento** y 28
// contenido. O sea que lo que se ve pensar al modelo es la mayor parte del
// stream, y es justamente lo que Ale quiere ver.
//
// Esos 45 cuadros por segundo son el dato que manda el diseño: cruzarlos de a
// uno por IPC sería el mismo error que ya trabó la máquina con un temporizador
// de 2,8 segundos. Quien consuma esto agrupa antes de mandar.
//
// Puro y aparte para poder probarlo con cuadros grabados, sin servidor.

/** Un pedazo de lo que el modelo va produciendo. */
export type DraftChunk =
  /** El modelo razonando. Es la mayor parte de lo que llega. */
  | { kind: 'reasoning'; text: string }
  /** La respuesta propiamente dicha. */
  | { kind: 'content'; text: string }
  /** El cierre, con el motivo y —si vino— el conteo de tokens. */
  | { kind: 'done'; finishReason: string | null; usage: DraftUsage | null };

export interface DraftUsage {
  promptTokens: number | null;
  completionTokens: number | null;
  /** Cuántos se fueron en pensar. Es el número que explica las esperas largas. */
  reasoningTokens: number | null;
}

function int(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Lee un cuadro del stream. Devuelve `null` si no aporta nada.
 *
 * El razonamiento llega en `reasoning_content` o `reasoning` según el modelo, y
 * se aceptan los dos: cuál manda cada uno no es algo que se pueda fijar acá.
 *
 * El cuadro de `usage` viene con `choices: []`, así que hay que mirarlo antes de
 * dar por sentado que hay un `choices[0]`.
 */
export function parseChatChunk(payload: unknown): DraftChunk | null {
  const frame = payload as {
    choices?: Array<{ delta?: { content?: unknown; reasoning_content?: unknown; reasoning?: unknown }; finish_reason?: unknown }>;
    usage?: { prompt_tokens?: unknown; completion_tokens?: unknown; completion_tokens_details?: { reasoning_tokens?: unknown } };
  };

  const usage = frame?.usage
    ? {
      promptTokens: int(frame.usage.prompt_tokens),
      completionTokens: int(frame.usage.completion_tokens),
      reasoningTokens: int(frame.usage.completion_tokens_details?.reasoning_tokens),
    }
    : null;

  const choice = Array.isArray(frame?.choices) ? frame.choices[0] : undefined;

  // El cierre: llega con `finish_reason`, o en el cuadro de `usage` que no trae
  // ninguna opción.
  if (choice?.finish_reason || (usage && !choice)) {
    return {
      kind: 'done',
      finishReason: typeof choice?.finish_reason === 'string' ? choice.finish_reason : null,
      usage,
    };
  }

  if (!choice?.delta) return null;
  const reasoning = text(choice.delta.reasoning_content) || text(choice.delta.reasoning);
  if (reasoning) return { kind: 'reasoning', text: reasoning };
  const content = text(choice.delta.content);
  return content ? { kind: 'content', text: content } : null;
}

/**
 * Corta un buffer de SSE en cuadros, devolviendo lo que quedó a medias.
 *
 * Un JSON puede llegar partido entre dos lecturas del socket, así que la cola
 * incompleta vuelve para la próxima vez en lugar de descartarse. Una línea que
 * no se entiende se saltea y se cuenta: una redacción no se pierde entera porque
 * un cuadro viniera mal.
 */
export function readSseFrames(buffer: string): { chunks: DraftChunk[]; rest: string; skipped: number } {
  const lines = buffer.split('\n');
  // La última puede estar incompleta: vuelve al buffer.
  const rest = lines.pop() ?? '';
  const chunks: DraftChunk[] = [];
  let skipped = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const data = trimmed.slice(5).trim();
    if (data.length === 0 || data === '[DONE]') continue;
    try {
      const chunk = parseChatChunk(JSON.parse(data));
      if (chunk) chunks.push(chunk);
    } catch {
      skipped += 1;
    }
  }
  return { chunks, rest, skipped };
}

/**
 * Junta los pedazos consecutivos del mismo tipo.
 *
 * A 45 cuadros por segundo, mandar cada uno por IPC repetiría el error que ya
 * costó caro: un `setState` por cuadro re-renderiza el panel decenas de veces
 * por segundo. Concatenar los contiguos deja el mismo texto en una fracción de
 * los mensajes.
 */
export function mergeConsecutive(chunks: DraftChunk[]): DraftChunk[] {
  const merged: DraftChunk[] = [];
  for (const chunk of chunks) {
    const last = merged[merged.length - 1];
    if (last && last.kind === chunk.kind && chunk.kind !== 'done' && last.kind !== 'done') {
      merged[merged.length - 1] = { kind: chunk.kind, text: last.text + chunk.text };
      continue;
    }
    merged.push(chunk);
  }
  return merged;
}
