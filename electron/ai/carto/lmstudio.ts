// electron/ai/carto/lmstudio.ts
//
// Cartografía — Fase 4. Proveedor LOCAL: LM Studio (u otro servidor compatible
// OpenAI) escuchando en http://localhost:1234. SIN API key — es tu máquina.
//
// Privacidad: como la inferencia es local, el contexto del repo NO sale a ningún
// tercero. Es la opción por defecto cuando se prende la IA.
//
// "Servidor no disponible": si LM Studio no está levantado, el fetch falla con
// ECONNREFUSED. Lo traducimos a un mensaje claro y accionable; la vista lo muestra
// y sigue funcionando sin IA (no rompe nada).

import type {
  CartoAINodeRef,
  CartoAIContext,
  CartoAIResponse,
  CartoAIPanoramaContext,
} from '../../../types/carto-ai';
import type { CartoAIProvider } from './provider';
import { chatComplete, toResponse } from './provider';
import { buildExplainPrompts, buildAskPrompts, buildPanoramaPrompts } from './prompts';

// Endpoint compatible OpenAI de LM Studio. Documentado en SECURITY.md (CSP en
// lockstep): aunque la petición sale de main, el origen se declara igual.
const ENDPOINT = 'http://localhost:1234/v1/chat/completions';
const MODELS_ENDPOINT = 'http://localhost:1234/v1/models';
// LM Studio sirve el modelo que tengas cargado; un nombre vacío vale, pero
// mandamos un placeholder estable cuando el usuario no fijó uno.
const DEFAULT_MODEL = 'local-model';

// Ventana de tiempo generosa: un modelo local puede tardar minutos en responder
// (CPU/GPU modesta, primer prompt sin warm-up). El default de 30s del runtime los
// cortaba siempre — ver el feedback de QA. 5 min es tope defensivo contra cuelgues.
const LOCAL_TIMEOUT_MS = 300_000;

const CONN_ERROR =
  'Servidor de IA local no disponible. Abrí LM Studio, cargá un modelo y activá el servidor local (localhost:1234).';

export function createLmStudioProvider(opts?: { model?: string }): CartoAIProvider {
  const model = opts?.model?.trim() || DEFAULT_MODEL;
  const providerTag = `lmstudio:${model}`;

  async function run(system: string, user: string): Promise<CartoAIResponse> {
    const text = await chatComplete({
      endpoint: ENDPOINT,
      headers: {}, // sin auth
      model,
      system,
      user,
      providerLabel: 'LM Studio',
      friendlyConnError: CONN_ERROR,
      timeoutMs: LOCAL_TIMEOUT_MS,
    });
    return toResponse(text, providerTag);
  }

  return {
    id: 'lmstudio',
    label: `LM Studio (local · ${model})`,

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
      // Sondeo barato: pedimos la lista de modelos. Si el servidor no está, el
      // fetch falla y devolvemos el mismo mensaje claro.
      try {
        const res = await fetch(MODELS_ENDPOINT, { method: 'GET' });
        if (!res.ok) throw new Error(`LM Studio respondió ${res.status}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/respondió \d+/.test(msg)) throw err;
        throw new Error(CONN_ERROR);
      }
    },
  };
}
