/**
 * Redactar el asunto de un commit con un modelo local.
 *
 * El tipo de un commit —`feat`, `fix`, `chore`— es el único dato que ninguna
 * fuente del repositorio contiene: no está en el diff, ni en las rutas, ni en la
 * rama, ni en las tareas. Medido, un modelo local lo acierta; también medido, la
 * calidad depende fuerte de cuál sea, así que elegirlo es de la persona.
 */

/**
 * Un modelo tal como lo reporta el servidor local.
 *
 * Sale de la API **nativa** `/api/v1/models`, no de la compatible con OpenAI:
 * `/v1/models` sólo devuelve identificadores, y todo lo que hace falta para
 * elegir con criterio —tamaño, cuantización, contexto real, si razona— vive sólo
 * en la nativa.
 */
export interface LocalModel {
  id: string;
  /** Cómo lo llama LM Studio. Más legible que la clave. */
  displayName: string;
  /** `llm` o `embeddings`. Los de embeddings no redactan nada. */
  kind: string;
  /** Si hay una instancia en memoria. */
  loaded: boolean;
  /**
   * Con cuánto contexto está cargado ahora mismo. `null` si no está cargado.
   *
   * No es `maxContextLength`, y la diferencia importa: medido, un modelo con
   * máximo 131072 quedó cargado con 65536. El presupuesto real es éste.
   */
  loadedContextLength: number | null;
  /** Lo que el modelo soporta como techo. No es lo que tiene disponible. */
  maxContextLength: number | null;
  /**
   * Cuánto ocupa. Medido contra la estimación del CLI: `size_bytes` de
   * gemma-4-12b son 7.556.574.286, o sea los mismos 7,04 GiB que declaraba
   * `lms load --estimate-only`. Sirve para declarar el costo sin un proceso
   * aparte.
   */
  sizeBytes: number | null;
  /** `12B`, `26B-A4B`. Tal como lo dice el servidor. */
  params: string | null;
  /** `Q4_K_M`, `Q4_0`. */
  quantization: string | null;
  /**
   * Si el modelo razona antes de contestar, y si se puede apagar.
   *
   * Es la explicación del modo de fallo más caro que se midió: un modelo con
   * razonamiento gasta el presupuesto de tokens pensando y devuelve contenido
   * vacío. Declararlo permite avisar antes en vez de que parezca roto.
   */
  reasoningDefault: string | null;
  reasoningCanBeOff: boolean;
  /**
   * Identificador de la instancia cargada, o `null` si no lo está.
   *
   * `POST /api/v1/models/unload` lo pide, y es lo único con lo que se puede
   * liberar la VRAM. Sin esto, cargar un modelo tras otro los apila: Ale terminó
   * con dos de 7 GB tomados a la vez sin haber pedido ninguno de los dos dos
   * veces.
   */
  loadedInstanceId: string | null;
}

/** Lo que devuelve cargar un modelo. */
export interface LoadOutcome {
  model: string;
  contextLength: number | null;
  loadTimeSeconds: number | null;
}

/**
 * Resultado de pedirle un asunto al modelo.
 *
 * `no-answer` existe aparte de un mensaje vacío porque es lo que efectivamente
 * pasa: los modelos con razonamiento se comen el presupuesto de tokens pensando
 * y devuelven `finish_reason: 'length'` con el contenido en blanco. Medido:
 * qwen3.5-9b hizo eso en los tres commits de la prueba con techo 3.000, y recién
 * contestó con 8.000. Mostrarlo como «el modelo devolvió un mensaje vacío» haría
 * pensar que la función está rota cuando lo que falta es presupuesto.
 */
/**
 * Contestó, pero sin la forma pedida.
 *
 * Es distinto de «no contestó»: hay texto, y puede ser una buena descripción a
 * la que sólo le falta el prefijo convencional. No se impone en el campo —eso
 * obligaría a corregirlo a mano— pero se muestra, porque tirarlo y decir que no
 * contestó es mentir sobre lo que pasó.
 */
export type CommitDraftResult =
  | { status: 'drafted'; subject: string; model: string }
  | { status: 'no-answer'; reason: 'budget' | 'empty'; model: string }
  | { status: 'malformed'; subject: string; model: string }
  | { status: 'unavailable'; detail: string };
