// electron/ai/commit-message/chunk-pump.ts
//
// La ventana de agrupado entre el stream y el IPC.
//
// El proveedor ya junta los cuadros contiguos del mismo tipo dentro de cada
// lectura del socket (`mergeConsecutive`), pero eso no alcanza: una lectura
// puede traer un solo cuadro, y medido son unos **45 por segundo**. Mandar cada
// aviso apenas llega dejaría 45 mensajes de IPC por segundo, y del otro lado 45
// re-renderizados: es exactamente el error que ya trabó la máquina de Ale con un
// temporizador de 2,8 segundos re-renderizando el panel entero.
//
// Lo que hace esto es acumular durante una ventana y emitir una sola vez por
// ventana. Con 120 ms son ~8 mensajes por segundo en vez de 45, y el texto que
// llega es el mismo: nada se descarta, sólo se junta.
//
// Puro respecto del IPC —no sabe qué es una ventana ni un `WebContents`— para
// poder probarlo con temporizadores falsos y sin servidor.

import { mergeConsecutive, type DraftChunk } from './sse';

/**
 * Cuánto se acumula antes de avisar.
 *
 * 120 ms es el punto donde el texto todavía se lee como si fuera en vivo y el
 * IPC baja de 45 mensajes por segundo a unos 8. No se midió cuál es el número
 * óptimo: se eligió por los 45 cuadros/s medidos y por el techo de lo que un ojo
 * distingue como continuo.
 */
export const CHUNK_WINDOW_MS = 120;

export interface ChunkPump {
  /** Acumula lo que llegó. No emite: eso lo decide la ventana. */
  push(chunks: DraftChunk[]): void;
  /** Emite lo pendiente ya mismo. Para el final del stream, que no puede esperar. */
  flush(): void;
  /** Corta sin emitir. Para cuando se canceló y lo pendiente ya no le importa a nadie. */
  stop(): void;
}

/**
 * Junta lo que llega y lo emite de a tandas.
 *
 * `emit` nunca recibe una lista vacía: un aviso sin nada adentro obliga a quien
 * escucha a distinguir «llegó algo» de «no llegó nada», y no aporta.
 */
export function createChunkPump(
  emit: (chunks: DraftChunk[]) => void,
  windowMs: number = CHUNK_WINDOW_MS,
): ChunkPump {
  let pending: DraftChunk[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const emitPending = () => {
    timer = null;
    if (pending.length === 0) return;
    // Se junta recién acá, sobre todo lo de la ventana: juntar en cada `push`
    // haría el mismo trabajo varias veces y no cambiaría el resultado.
    const merged = mergeConsecutive(pending);
    pending = [];
    emit(merged);
  };

  return {
    push(chunks) {
      if (stopped || chunks.length === 0) return;
      pending.push(...chunks);
      // El temporizador se arma con el primer pedazo de la ventana y no se
      // reinicia con los siguientes: reiniciarlo sería un antirrebote, y con
      // cuadros llegando cada 22 ms no emitiría nunca hasta el final.
      if (timer === null) timer = setTimeout(emitPending, windowMs);
    },
    flush() {
      if (stopped) return;
      if (timer !== null) clearTimeout(timer);
      emitPending();
    },
    stop() {
      stopped = true;
      pending = [];
      if (timer !== null) clearTimeout(timer);
      timer = null;
    },
  };
}
