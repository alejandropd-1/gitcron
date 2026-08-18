// lib/stream-error-advice.ts
//
// Qué pasó, en castellano, y qué hacer al respecto.
//
// El motivo crudo del servidor es exacto y sirve para buscar el problema, pero
// no le dice a nadie qué hacer: «decode() failed: vk::Device::getFenceStatus:
// ErrorDeviceLost» es correcto y es ilegible. Ale lo marcó viéndolo en pantalla,
// y tiene razón: un aviso que sólo entiende quien escribió el código obliga a
// preguntar, y preguntar cuesta una vuelta.
//
// Los dos textos conviven. El técnico NO se reemplaza —es la única pista con la
// que se puede buscar en el registro de LM Studio o en un foro— y el coloquial
// va arriba porque es el que dice qué hacer ahora.
//
// Puro y por tabla, para poder probarlo con los mensajes reales que se vieron.

/** Qué se reconoce, y con qué frase se explica. El orden manda: gana el primero. */
const PATRONES: ReadonlyArray<{ test: RegExp; key: string }> = [
  // Medido en la notebook de Ale: la iGPU Intel Iris Xe se cayó procesando un
  // prompt de 4.199 tokens. Es el caso más frecuente en una máquina sin GPU
  // dedicada, y el que tiene la salida más concreta.
  { test: /ErrorDeviceLost|device lost|getFenceStatus|vk::/i, key: 'aiAdviceDeviceLost' },
  // Sin memoria para el modelo o para el contexto pedido.
  { test: /out of memory|insufficient memory|OutOfDeviceMemory|failed to allocate|ErrorOutOfDevice/i, key: 'aiAdviceOutOfMemory' },
  // El vínculo con la otra máquina se cortó: pasa con LM Link cuando la PC de
  // casa se suspende o se va la red.
  { test: /connection closed|LM Link|ECONNRESET|socket hang up|network/i, key: 'aiAdviceConnection' },
  // El prompt no entra en el contexto con el que se cargó el modelo.
  { test: /context length|exceeds context|too many tokens|context window/i, key: 'aiAdviceContext' },
  // El modelo elegido no soporta chat completions (ej. modelo de embeddings o error 400).
  { test: /respondió 400|status 400|code 400|HTTP 400|\b400\b|embedding|cannot generate|not a chat model|unsupported model/i, key: 'aiAdviceNotChatModel' },
];

/**
 * La clave de la explicación coloquial, o `null` si no se reconoce el error.
 *
 * `null` es una respuesta válida y deliberada: inventar un consejo para un error
 * que no se entiende es peor que mostrar sólo el motivo técnico, porque manda a
 * hacer algo que puede no tener nada que ver. Ante lo desconocido, se dice lo
 * que el servidor dijo y nada más.
 */
export function adviceKeyForStreamError(detail: string): string | null {
  if (typeof detail !== 'string' || detail.trim().length === 0) return null;
  return PATRONES.find((patron) => patron.test.test(detail))?.key ?? null;
}
