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
  CartoAIPanoramaContext,
} from '../../../types/carto-ai';
import { completeText, type TextClientConfig } from '../text-client';

/** Contrato común que implementan el proveedor local y el online. */
export interface CartoAIProvider {
  id: CartoAIProviderId;
  /** Etiqueta legible + procedencia (incluye el modelo cuando se conoce). */
  label: string;
  /** Explica un símbolo del grafo, anclado en sus relaciones reales. */
  explain(node: CartoAINodeRef, context: CartoAIContext): Promise<CartoAIResponse>;
  /** Responde una pregunta libre, con el contexto disponible como anclaje. */
  ask(question: string, context: CartoAIContext): Promise<CartoAIResponse>;
  /** Genera orientación top-down para la lente Panorama, anclada en grupos. */
  panorama(context: CartoAIPanoramaContext): Promise<CartoAIResponse>;
  /**
   * Sondea disponibilidad SIN gastar una generación (servidor local levantado,
   * key presente, etc.). Lanza con un mensaje claro si no está disponible.
   */
  probe(): Promise<void>;
}

/**
 * Llamada de chat-completions compatible OpenAI para Cartografía.
 * Delega en el cliente unificado de texto (Grupo 9b).
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
  timeoutMs?: number;
}): Promise<string> {
  const config: TextClientConfig = {
    baseUrl: opts.endpoint,
    headers: opts.headers,
    providerLabel: opts.providerLabel,
    friendlyConnError: opts.friendlyConnError,
    defaultTimeoutMs: opts.timeoutMs,
  };

  const res = await completeText(config, {
    model: opts.model,
    system: opts.system,
    user: opts.user,
    maxTokens: opts.maxTokens,
    timeoutMs: opts.timeoutMs,
  });

  if (!res.text) {
    if (res.finishReason === 'length') {
      throw new Error(`${opts.providerLabel}: respuesta cortada (max_tokens muy bajo)`);
    }
    throw new Error(`${opts.providerLabel}: respuesta vacía del modelo`);
  }

  return res.text;
}

/** Helper: empaqueta texto del modelo en la respuesta serializable de la vista. */
export function toResponse(text: string, provider: string): CartoAIResponse {
  return { text, provider, generatedAt: new Date().toISOString() };
}
