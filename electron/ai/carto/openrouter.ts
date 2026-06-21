// electron/ai/carto/openrouter.ts
//
// Cartografía — Fase 4. Proveedor ONLINE: OpenRouter (router multi-modelo,
// compatible OpenAI). REUTILIZA el vault cifrado del Temporal Agent: la key sale
// de key-store (`getKey('openrouter')`), vive y se usa SÓLO en main, nunca llega
// al renderer ni a logs. El dominio https://openrouter.ai ya está en el CSP, así
// que no se ensancha la superficie de red por sumar esta opción.
//
// Es la misma key y el mismo endpoint que usa el Temporal Agent: el usuario que
// ya cargó su key de OpenRouter no tiene que volver a cargarla.

import type {
  CartoAINodeRef,
  CartoAIContext,
  CartoAIResponse,
  CartoAIPanoramaContext,
} from '../../../types/carto-ai';
import type { CartoAIProvider } from './provider';
import { chatComplete, toResponse } from './provider';
import { buildExplainPrompts, buildAskPrompts, buildPanoramaPrompts } from './prompts';
import { getKey, hasKey } from '../key-store';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.5';
const NO_KEY_ERROR =
  'No hay API key de OpenRouter cargada. Agregala en Ajustes → Temporal Agent para usar la IA online.';
const CONN_ERROR = 'No se pudo contactar a OpenRouter. Revisá tu conexión a internet.';

export function createCartoOpenRouterProvider(opts?: { model?: string }): CartoAIProvider {
  const model = opts?.model?.trim() || DEFAULT_MODEL;
  const providerTag = `openrouter:${model}`;

  async function run(system: string, user: string): Promise<CartoAIResponse> {
    const key = getKey('openrouter');
    if (!key) throw new Error(NO_KEY_ERROR);
    const text = await chatComplete({
      endpoint: ENDPOINT,
      headers: {
        authorization: `Bearer ${key}`,
        'http-referer': 'https://github.com/alejandropd-1/gitcron',
        'x-title': 'GitCron Cartografía',
      },
      model,
      system,
      user,
      providerLabel: 'OpenRouter',
      friendlyConnError: CONN_ERROR,
    });
    return toResponse(text, providerTag);
  }

  return {
    id: 'openrouter',
    label: `OpenRouter (online · ${model})`,

    async explain(node: CartoAINodeRef, context: CartoAIContext) {
      const { system, user } = buildExplainPrompts(node, context);
      return run(system, user);
    },

    async ask(question: string, context: CartoAIContext) {
      const { system, user } = buildAskPrompts(question, context);
      return run(system, user);
    },

    async panorama(context: CartoAIPanoramaContext) {
      const { system, user } = buildPanoramaPrompts(context);
      return run(system, user);
    },

    async probe() {
      // No gastamos una request: alcanza con saber si hay key. El error de red
      // real aparecerá recién al generar (y se muestra claro igual).
      if (!hasKey('openrouter')) throw new Error(NO_KEY_ERROR);
    },
  };
}
