// electron/ai/commit-message/local-provider.ts
//
// Proveedor local para redactar el asunto de un commit. Hermano del de
// Cartografía (`electron/ai/carto/lmstudio.ts`), con una diferencia deliberada:
// el endpoint es configurable.
//
// El de Cartografía tiene `http://localhost:1234` escrito en el código. Alcanza
// mientras el modelo corre en la misma máquina; no alcanza en el caso real de
// Ale, que trabaja desde una notebook contra la PC donde está la placa. Depender
// de un reenvío de puerto que no se declara en ningún lado es de las cosas que
// después fallan sin explicación.
//
// Privacidad: acá viaja el **diff del repositorio**. Es más sensible que el
// contexto que manda Cartografía, y es el argumento fuerte para que la opción
// local sea la primera: el código no sale a ningún tercero.

import type { CommitDraftResult, LoadOutcome, LocalModel } from '../../../types/commit-message-ai';
import { fetchDeviceIndex, mergeDeviceInfo } from './device-index';

/** Piso de contexto. Por debajo, el diff de una tanda no entra. */
export const MIN_CONTEXT_LENGTH = 32_768;

/** Lo que se pide al cargar. Medido: entra holgado en 12 GB de VRAM. */
export const PREFERRED_CONTEXT_LENGTH = 65_536;

/** Que la clave exista en el catálogo, antes de mandarla a ningún lado. */
export function isKnownModel(modelKey: string, catalog: readonly LocalModel[]): boolean {
  return catalog.some((model) => model.id === modelKey);
}

/** Si el contexto con el que está cargado alcanza para trabajar. */
export function hasEnoughContext(model: LocalModel, minimum: number = MIN_CONTEXT_LENGTH): boolean {
  return model.loaded && (model.loadedContextLength ?? 0) >= minimum;
}

/** Servidor local por omisión. LM Studio escucha acá salvo que se lo cambie. */
export const DEFAULT_LOCAL_BASE_URL = 'http://localhost:1234';

/**
 * Ventana generosa para redactar: medido, un 12B tarda 25–57 s y un 9B con
 * razonamiento llegó a 98 s. Los 15 minutos son tope defensivo contra un
 * cuelgue, no una expectativa.
 *
 * Estaba declarado y **no se usaba en ninguna parte**: ninguna petición tenía
 * techo, así que un servidor colgado dejaba a GitCron esperando para siempre. Y
 * el mensaje de error hablaba de un timeout que no existía.
 */
export const LOCAL_TIMEOUT_MS = 900_000;

/**
 * Techo para leer el catálogo. Corto a propósito: es una lista de dieciséis
 * entradas y se pide antes de cada acción.
 *
 * Generoso igual —medido, LM Studio tardó **28 segundos** en responder esa misma
 * lista mientras cargaba un modelo—, pero acotado: si el servidor está así de
 * saturado, es mejor decirlo que quedarse esperando.
 */
export const CATALOG_TIMEOUT_MS = 45_000;

/** Techo para cargar. Medido: 8,8 a 11 s para un 12B; el resto es margen. */
export const LOAD_TIMEOUT_MS = 300_000;

/**
 * Combina el techo de tiempo con la cancelación de quien llama.
 *
 * Las dos cosas tienen que convivir: sin techo un cuelgue es eterno, y sin la
 * señal de quien llama el botón de cancelar no corta nada.
 */
function withTimeout(timeoutMs: number, signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

const CONN_ERROR =
  'Servidor de IA local no disponible. Abrí LM Studio, cargá un modelo y activá el servidor local.';

/**
 * Catálogo de modelos, leído de la API **nativa** de LM Studio y no de la
 * compatible con OpenAI.
 *
 * `/v1/models` sólo devuelve identificadores. `/api/v1/models` agrega todo lo que
 * hace falta para elegir con criterio: nombre legible, tamaño, cuantización,
 * parámetros, el contexto real de la instancia cargada y si el modelo razona.
 *
 * Se usa la `v1` nativa y no la `v0`: la `v0` trae el estado y los contextos,
 * pero no el tamaño ni las capacidades, y el tamaño es lo que permite declarar
 * el costo antes de cargar sin invocar ningún proceso aparte.
 */
export function modelsEndpoint(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/api/v1/models`;
}

export function chatEndpoint(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/v1/chat/completions`;
}

/**
 * Cargar un modelo también es HTTP.
 *
 * La primera versión salía por el CLI (`lms load -c`) porque se buscó el
 * endpoint en `/api/v0/load`, que no existe. Está en `/api/v1/models/load` y
 * acepta `{ model, context_length }`: medido, cargó gemma-4-12b con 65.536 en 11
 * segundos. Por HTTP no hay proceso, ni códigos de color que limpiar, ni
 * dependencia de que `lms` esté instalado — y funciona contra la máquina remota
 * igual que el resto, que es el caso real.
 */
export function loadEndpoint(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/api/v1/models/load`;
}

/** Forma cruda de una entrada del catálogo, sin confiar en que venga completa. */
type RawModel = {
  key?: unknown;
  display_name?: unknown;
  type?: unknown;
  max_context_length?: unknown;
  size_bytes?: unknown;
  params_string?: unknown;
  quantization?: { name?: unknown };
  loaded_instances?: Array<{ id?: unknown; config?: { context_length?: unknown } }>;
  capabilities?: { reasoning?: { default?: unknown; allowed_options?: unknown } };
};

function positiveInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Lee el catálogo. Puro y aparte para poder probarlo con tablas.
 *
 * Una entrada sin clave se descarta: no hay con qué pedirla. Los de embeddings
 * se conservan con su `kind` y los filtra quien elige, para que la vista pueda
 * explicar por qué no sirven en vez de esconderlos.
 */
export function parseModelCatalog(payload: unknown): LocalModel[] {
  const data = (payload as { models?: unknown })?.models;
  if (!Array.isArray(data)) return [];
  /**
   * Por clave, y no una lista: **el mismo modelo aparece una vez por
   * dispositivo**.
   *
   * Con LM Link, un modelo que está en la notebook y en la PC llega dos veces
   * con la misma clave. Medido en el catálogo de Ale: 16 entradas para 14
   * modelos, con `gemma-4-26b-a4b-qat` y el de embeddings repetidos. Sin unirlos
   * el desplegable los muestra dos veces y React protesta por claves duplicadas.
   *
   * Gana la entrada cargada: si una copia está en memoria, ése es el estado que
   * importa, y elegir la otra mostraría «en disco» sobre un modelo disponible.
   */
  const byId = new Map<string, LocalModel>();
  for (const entry of data as RawModel[]) {
    const id = text(entry?.key);
    if (!id) continue;
    const instance = Array.isArray(entry?.loaded_instances) ? entry.loaded_instances[0] : undefined;
    const allowed = entry?.capabilities?.reasoning?.allowed_options;
    const previous = byId.get(id);
    if (previous?.loaded && !instance) continue;
    byId.set(id, {
      id,
      displayName: text(entry?.display_name) ?? id,
      kind: text(entry?.type) ?? 'unknown',
      loaded: Boolean(instance),
      // El contexto real es el de la instancia cargada. En disco no hay ninguno:
      // el que se use lo decide la carga, no este catálogo.
      loadedContextLength: instance ? positiveInt(instance.config?.context_length) : null,
      maxContextLength: positiveInt(entry?.max_context_length),
      sizeBytes: positiveInt(entry?.size_bytes),
      params: text(entry?.params_string),
      quantization: text(entry?.quantization?.name),
      reasoningDefault: text(entry?.capabilities?.reasoning?.default),
      reasoningCanBeOff: Array.isArray(allowed) && allowed.includes('off'),
      // El catálogo HTTP no dice en qué máquina vive: eso llega aparte.
      devices: previous?.devices ?? [],
      // El catálogo HTTP no dice en qué máquina vive; se completa aparte cuando
      // se puede saber. Vacío es «no se sabe», no «es local».
      loadedInstanceId: instance ? text(instance.id) : null,
    });
  }
  return [...byId.values()];
}

/**
 * El motivo que da el servidor, sin el JSON alrededor.
 *
 * LM Studio contesta `{"error":{"type":"…","message":"…"}}`, y volcarlo crudo en
 * la pantalla puso llaves y comillas en el aviso —Ale lo marcó—. Lo que importa
 * es el mensaje: «Failed to load LLM: LM Link connection closed» dice qué pasó;
 * el envoltorio no agrega nada.
 *
 * Puro, para probarlo con tablas. Si no se entiende la forma, devuelve `null` y
 * quien llama pone su propio motivo: inventar uno sería peor.
 */
export function serverErrorMessage(raw: string): string | null {
  try {
    const message = (JSON.parse(raw) as { error?: { message?: unknown } })?.error?.message;
    return typeof message === 'string' && message.trim().length > 0 ? message.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Cuánto sobrevive un modelo sin que nadie lo use. Media hora.
 *
 * Que LM Studio lo desaloje solo es mejor que descargarlo al terminar cada
 * redacción: dos mensajes seguidos reusan el modelo cargado y no pagan los 11
 * segundos de recarga, y si no se usa más la VRAM se libera sin que nadie haga
 * nada. Ale preguntó por esto viendo dos modelos de 7 GB apilados.
 *
 * El nombre del parámetro se comprobó contra el servidor: `ttl_seconds` pasa la
 * validación de claves —`ttl`, `unload_after` y un nombre inventado la fallan
 * por nombre—, lo que confirma que es el que la API entiende.
 */
export const DEFAULT_TTL_SECONDS = 1_800;

/** Carga un modelo con el contexto pedido. Medido: 11 s para un 12B. */
export async function loadLocalModel(
  baseUrl: string,
  model: string,
  contextLength: number,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
  /**
   * Cancelación de quien llama. La carga era literalmente incancelable: el botón
   * aparecía durante los 11 segundos y no cortaba nada.
   */
  signal?: AbortSignal,
): Promise<LoadOutcome> {
  const res = await fetch(loadEndpoint(baseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, context_length: contextLength, ttl_seconds: ttlSeconds }),
    signal: withTimeout(LOAD_TIMEOUT_MS, signal),
  });
  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    throw new Error(serverErrorMessage(raw) ?? `El servidor local respondió ${res.status}.`);
  }
  const payload = await res.json() as { instance_id?: unknown; load_time_seconds?: unknown };
  return {
    model: text(payload?.instance_id) ?? model,
    contextLength,
    loadTimeSeconds: typeof payload?.load_time_seconds === 'number' ? payload.load_time_seconds : null,
  };
}

/**
 * Lee la respuesta del modelo. Puro, por el mismo motivo.
 *
 * Distingue tres cosas que la API devuelve parecido: un asunto, «no contestó»
 * —contenido vacío, casi siempre porque el razonamiento agotó el presupuesto— y
 * una forma que no se entiende.
 */
export function parseDraftResponse(payload: unknown, model: string): CommitDraftResult {
  const choice = (payload as { choices?: Array<{ message?: { content?: unknown }; finish_reason?: unknown }> })
    ?.choices?.[0];
  if (!choice) return { status: 'unavailable', detail: 'El servidor no devolvió ninguna respuesta.' };
  const content = typeof choice.message?.content === 'string' ? choice.message.content : '';
  const subject = normalizeSubject(content);
  if (subject) return { status: 'drafted', subject, model };
  return {
    status: 'no-answer',
    reason: choice.finish_reason === 'length' ? 'budget' : 'empty',
    model,
  };
}

/**
 * El asunto, de una sola línea.
 *
 * Un modelo puede envolver la respuesta en un bloque de código o agregar una
 * explicación después. Se toma la primera línea con contenido y se le quitan las
 * comillas o el cercado: imponer en el campo tres párrafos de prosa sería peor
 * que no sugerir nada.
 */
export function normalizeSubject(raw: string): string | null {
  const line = raw
    .split(/\r?\n/)
    .map((part) => part.trim())
    .find((part) => part.length > 0 && !part.startsWith('```'));
  if (!line) return null;
  const cleaned = line.replace(/^["'`]+|["'`]+$/g, '').trim();
  return cleaned.length > 0 ? cleaned : null;
}

/** Traduce un fallo de red al motivo accionable, sin tapar el resto. */
function unavailable(error: unknown): CommitDraftResult {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof Error && error.name === 'AbortError') {
    return { status: 'unavailable', detail: 'La redacción tardó demasiado y se canceló.' };
  }
  return { status: 'unavailable', detail: /fetch failed|ECONNREFUSED/i.test(message) ? CONN_ERROR : message };
}

export interface DraftRequest {
  baseUrl?: string;
  model: string;
  system: string;
  user: string;
  /**
   * Techo de tokens. No puede ser una constante del código: medido, 3.000
   * alcanza para gemma-4-12b y no para qwen3.5-9b, que recién contesta con 8.000
   * —y tarda el doble—. Es un parámetro por modelo.
   */
  maxTokens: number;
  signal?: AbortSignal;
}

/**
 * El catálogo, sólo por HTTP. Barato y sin procesos.
 *
 * Es el que usan las validaciones —comprobar que la clave elegida existe antes
 * de redactar o cargar—, que corren en cada acción y no necesitan saber en qué
 * máquina vive nada.
 */
export async function fetchModelCatalog(baseUrl: string = DEFAULT_LOCAL_BASE_URL): Promise<LocalModel[]> {
  const res = await fetch(modelsEndpoint(baseUrl), { method: 'GET', signal: withTimeout(CATALOG_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`El servidor local respondió ${res.status}.`);
  const models = parseModelCatalog(await res.json());
  // En qué máquina vive cada uno llega por otra vía: no está en el HTTP.
  // Medido: 42 ms por WebSocket, contra 1,7–37,8 s del CLI que se retiró. Si
  // falla, cada modelo queda sin dispositivo y la vista no afirma nada.
  return mergeDeviceInfo(models, await fetchDeviceIndex(baseUrl));
}

/**
 * Descarga una instancia y libera su VRAM.
 *
 * Existe porque cargar un modelo tras otro los **apila**: Ale terminó con dos de
 * 7 GB tomados a la vez sin haber pedido ninguno dos veces. El endpoint pide el
 * `instance_id`, que viene en el catálogo.
 */
export async function unloadLocalModel(baseUrl: string, instanceId: string): Promise<void> {
  const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/v1/models/unload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instance_id: instanceId }),
    signal: withTimeout(CATALOG_TIMEOUT_MS),
  });
  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    throw new Error(serverErrorMessage(raw) ?? `El servidor local respondió ${res.status}.`);
  }
}

export async function draftCommitSubject(request: DraftRequest): Promise<CommitDraftResult> {
  const { baseUrl = DEFAULT_LOCAL_BASE_URL, model, system, user, maxTokens, signal } = request;
  try {
    const res = await fetch(chatEndpoint(baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Sin auth: es la máquina de quien lo usa.
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        // Bajo a propósito: un asunto de commit no se beneficia de variar entre
        // llamadas, y sí se beneficia de ser predecible.
        temperature: 0.2,
        max_tokens: maxTokens,
      }),
      signal,
    });
    if (!res.ok) return { status: 'unavailable', detail: `El servidor local respondió ${res.status}.` };
    return parseDraftResponse(await res.json(), model);
  } catch (error) {
    return unavailable(error);
  }
}
