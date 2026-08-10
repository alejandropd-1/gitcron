// lib/commit-draft-log.ts
//
// Lo que el modelo va pensando, guardado FUERA de React.
//
// Está afuera a propósito, y el motivo está medido en este mismo panel: el
// temporizador de la espera vivía dentro de `OpenSpecDashboard` y cada 2,8
// segundos re-renderizaba el panel entero durante los 40 segundos de una
// redacción (tarea 4.18). Acá llegan ~8 avisos por segundo. Con el estado en un
// `useState` del panel, eso serían ocho re-renderizados por segundo de todo el
// árbol —la lista de archivos, el selector, el grafo— durante un minuto.
//
// Con el estado afuera, sólo se vuelve a dibujar el componente que se suscribe.
// El resto del panel no se entera de que hay un stream corriendo.
//
// No usa Zustand ni el store de Git por lo mismo: `useGitStore()` sin selector
// re-renderiza la raíz de la aplicación con cualquier `set()`, y este dato
// cambia ocho veces por segundo. Es un caso de libro para un store externo con
// `useSyncExternalStore`.

import type { DraftChunk, DraftChunkEvent, DraftUsage } from '@/types/commit-message-ai';

/**
 * Techo del razonamiento guardado, en caracteres.
 *
 * Medido, una redacción corta produjo 278 tokens de razonamiento —unos 1.100
 * caracteres—, pero un modelo que se traba puede pensar hasta agotar el
 * presupuesto entero. Sin techo, el texto crece sin límite y el nodo del DOM con
 * él. Se recorta lo **más viejo**: lo último es lo que se está mirando.
 */
export const REASONING_LIMIT = 20_000;

export interface DraftLog {
  /** De qué redacción es esto. `null` cuando no hay ninguna. */
  draftId: string | null;
  /** Lo que el modelo viene pensando, recortado al techo. */
  reasoning: string;
  /** La respuesta propiamente dicha, según llega. */
  content: string;
  /** Si el razonamiento se recortó. Se declara: un texto cortado en silencio miente. */
  truncated: boolean;
  /** El motivo del cierre, cuando llegó. */
  finishReason: string | null;
  /** El conteo de tokens. Es el número que explica una espera larga. */
  usage: DraftUsage | null;
  /** Si todavía está llegando algo. */
  streaming: boolean;
  /**
   * Lo que informó el servidor cuando falló a mitad de camino.
   *
   * Se guarda aparte del texto porque no es algo que el modelo haya dicho: es lo
   * que le pasó a la máquina. Mezclarlo con el razonamiento lo haría leer como
   * parte de la respuesta.
   */
  error: string | null;
}

const EMPTY: DraftLog = {
  draftId: null,
  reasoning: '',
  content: '',
  truncated: false,
  finishReason: null,
  usage: null,
  streaming: false,
  error: null,
};

let snapshot: DraftLog = EMPTY;
const listeners = new Set<() => void>();

/**
 * Reemplaza el snapshot y avisa.
 *
 * Siempre un objeto nuevo: `useSyncExternalStore` compara por identidad, y
 * mutar el que ya entregó dejaría la vista sin enterarse.
 */
function commit(next: DraftLog): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

export function subscribeDraftLog(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** La referencia se mantiene mientras nada cambie: es lo que pide React. */
export function getDraftLogSnapshot(): DraftLog {
  return snapshot;
}

/**
 * Arranca una redacción. Limpia lo anterior y fija de cuál es lo que viene.
 *
 * Limpiar acá y no al terminar es deliberado: lo que pensó la última redacción
 * sigue a la vista hasta que empiece otra, y no se borra en el instante en que
 * termina, que es justo cuando se lo quiere leer.
 */
export function startDraftLog(draftId: string): void {
  commit({ ...EMPTY, draftId, streaming: true });
}

/**
 * Aplica lo que llegó.
 *
 * Lo de otra redacción se **descarta**: cancelar y volver a pedir dejaba en
 * vuelo el stream de la corrida muerta, y sin esta guardia su pensamiento se
 * mezclaba con el de la nueva en el mismo panel.
 */
export function appendDraftChunks(event: DraftChunkEvent): void {
  if (event.draftId === null || event.draftId !== snapshot.draftId) return;
  commit(applyChunks(snapshot, event.chunks));
}

/**
 * Aplica una tanda sobre un log. Puro, para poder probarlo con tablas.
 *
 * Separado de `appendDraftChunks` porque la parte que decide qué texto queda es
 * lo que hay que probar, y el estado del módulo no debería hacer falta para eso.
 */
export function applyChunks(log: DraftLog, chunks: readonly DraftChunk[]): DraftLog {
  let { reasoning, content, truncated, finishReason, usage, streaming, error } = log;
  for (const chunk of chunks) {
    if (chunk.kind === 'reasoning') reasoning += chunk.text;
    else if (chunk.kind === 'content') content += chunk.text;
    else if (chunk.kind === 'error') {
      // Falló la máquina, no el modelo: se corta el vivo y se guarda el motivo
      // que dio el servidor, sin reescribirlo.
      error = chunk.detail;
      streaming = false;
    } else {
      // El cierre llega con el motivo, y el conteo puede venir en ese mismo
      // cuadro o en otro aparte: lo que ya se sabe no se pisa con un `null`.
      finishReason = chunk.finishReason ?? finishReason;
      usage = chunk.usage ?? usage;
      streaming = false;
    }
  }
  if (reasoning.length > REASONING_LIMIT) {
    reasoning = reasoning.slice(reasoning.length - REASONING_LIMIT);
    truncated = true;
  }
  return { ...log, reasoning, content, truncated, finishReason, usage, streaming, error };
}

/**
 * Se terminó, con o sin cuadro de cierre.
 *
 * Hace falta aparte porque una redacción puede terminar sin que el cierre
 * llegue: un servidor que corta, una cancelación. Sin esto el panel quedaría
 * diciendo «pensando» para siempre.
 */
export function finishDraftLog(): void {
  if (!snapshot.streaming) return;
  commit({ ...snapshot, streaming: false });
}

/** Deja el log en blanco. Para cuando se cierra el panel. */
export function clearDraftLog(): void {
  if (snapshot === EMPTY) return;
  commit(EMPTY);
}
