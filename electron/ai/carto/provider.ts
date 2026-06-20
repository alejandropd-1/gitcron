// electron/ai/carto/provider.ts
//
// Cartografía — Fase 4. Interfaz común de proveedor de IA + helper de chat
// compartido. Corre SIEMPRE en el proceso main: acá se arma y dispara la petición,
// nunca en el renderer, así la CSP del renderer permanece cerrada (misma doctrina
// que electron/ai/providers/*).
//
// La interfaz es deliberadamente chica: explain(node, ctx) y ask(question, ctx).
// Los dos métodos devuelven texto plano ({@link CartoAIResponse}) — sin parseo de
// JSON especulativo como en el Temporal Agent, porque acá la salida es prosa para
// leer, no estructura para renderizar.

import type {
  CartoAINodeRef,
  CartoAIContext,
  CartoAIResponse,
  CartoAIProviderId,
} from '../../../types/carto-ai';
import { fetchWithTimeout } from '../provider-runtime';

/** Contrato común que implementan el proveedor local y el online. */
export interface CartoAIProvider {
  id: CartoAIProviderId;
  /** Etiqueta legible + procedencia (incluye el modelo cuando se conoce). */
  label: string;
  /** Explica un símbolo del grafo, anclado en sus relaciones reales. */
  explain(node: CartoAINodeRef, context: CartoAIContext): Promise<CartoAIResponse>;
  /** Responde una pregunta libre, con el contexto disponible como anclaje. */
  ask(question: string, context: CartoAIContext): Promise<CartoAIResponse>;
  /**
   * Sondea disponibilidad SIN gastar una generación (servidor local levantado,
   * key presente, etc.). Lanza con un mensaje claro si no está disponible.
   */
  probe(): Promise<void>;
}

/** Forma OpenAI de chat/completions, común a LM Studio y OpenRouter. */
interface ChatChoice {
  message?: { content?: string };
  finish_reason?: string;
}

/**
 * Una llamada de chat-completions compatible OpenAI. Reutilizada por el adapter
 * local y el online (única diferencia: endpoint, headers y modelo). Reusa el
 * `fetchWithTimeout` de la infra del Temporal Agent (no se duplica).
 *
 * `friendlyConnError`: cuando el fetch falla por conexión (servidor local caído),
 * lo convertimos a un mensaje claro provisto por el adapter en vez de un stack
 * de red críptico — así la vista puede mostrar "servidor local no disponible".
 */
export async function chatComplete(opts: {
  endpoint: string;
  headers: Record<string, string>;
  model: string;
  system: string;
  user: string;
  providerLabel: string;
  friendlyConnError: string;
  maxTokens?: number;
  /**
   * Presupuesto de tiempo del request. Los modelos LOCALES (CPU/GPU modesta)
   * pueden tardar mucho más que un proveedor online, así que el adapter local
   * pasa una ventana generosa; sin esto, el default de 30s los cortaba siempre.
   */
  timeoutMs?: number;
}): Promise<string> {
  let res: Response;
  try {
    res = await fetchWithTimeout(opts.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...opts.headers },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: opts.maxTokens ?? 1024,
        temperature: 0.4,
        messages: [
          { role: 'system', content: opts.system },
          { role: 'user', content: opts.user },
        ],
      }),
    }, opts.timeoutMs);
  } catch (err) {
    // Errores de conexión (ECONNREFUSED, DNS, host inalcanzable) → mensaje claro.
    // Los timeouts/cancelaciones del propio fetchWithTimeout ya vienen con texto
    // legible: los re-lanzamos tal cual.
    const msg = err instanceof Error ? err.message : String(err);
    if (/tardó demasiado|cancelad/i.test(msg)) throw err;
    throw new Error(opts.friendlyConnError);
  }

  if (!res.ok) {
    // Sólo el status — nunca el cuerpo, que podría arrastrar la key en algún proveedor.
    throw new Error(`${opts.providerLabel}: la petición falló (${res.status})`);
  }

  const data = (await res.json()) as { choices?: ChatChoice[] };
  const choice = data.choices?.[0];
  const text = (choice?.message?.content ?? '').trim();
  if (!text) {
    if (choice?.finish_reason === 'length') {
      throw new Error(`${opts.providerLabel}: respuesta cortada (max_tokens muy bajo)`);
    }
    throw new Error(`${opts.providerLabel}: respuesta vacía del modelo`);
  }
  return text;
}

/** Helper: empaqueta texto del modelo en la respuesta serializable de la vista. */
export function toResponse(text: string, provider: string): CartoAIResponse {
  return { text, provider, generatedAt: new Date().toISOString() };
}
