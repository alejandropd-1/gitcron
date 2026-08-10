import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChunkPump, CHUNK_WINDOW_MS } from '../ai/commit-message/chunk-pump';
import type { DraftChunk } from '../../types/commit-message-ai';

/**
 * La ventana de agrupado entre el stream y el IPC.
 *
 * Lo que se prueba acá es el número que justifica que exista: medido, el stream
 * produce ~45 cuadros por segundo, y mandarlos de a uno serían 45 mensajes de
 * IPC y 45 re-renderizados por segundo. Con la ventana quedan ~8, y el texto
 * tiene que llegar entero igual.
 */

const razona = (text: string): DraftChunk => ({ kind: 'reasoning', text });
const escribe = (text: string): DraftChunk => ({ kind: 'content', text });
const cierra: DraftChunk = { kind: 'done', finishReason: 'stop', usage: null };

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('la ventana de agrupado', () => {
  it('no avisa nada hasta que la ventana vence', () => {
    const emitidos: DraftChunk[][] = [];
    const pump = createChunkPump((chunks) => emitidos.push(chunks));

    pump.push([razona('a ver')]);
    vi.advanceTimersByTime(CHUNK_WINDOW_MS - 1);

    // Todavía no: avisar apenas llega es exactamente lo que hay que evitar.
    expect(emitidos).toEqual([]);
  });

  it('junta en un solo aviso todo lo de la ventana', () => {
    const emitidos: DraftChunk[][] = [];
    const pump = createChunkPump((chunks) => emitidos.push(chunks));

    pump.push([razona('a ')]);
    pump.push([razona('ver ')]);
    pump.push([razona('el diff')]);
    vi.advanceTimersByTime(CHUNK_WINDOW_MS);

    // Un aviso, con el texto entero: nada se pierde por juntarlo.
    expect(emitidos).toEqual([[razona('a ver el diff')]]);
  });

  it('baja 45 cuadros por segundo a 8 avisos, sin perder una letra', () => {
    // El caso medido, tal cual: 45 cuadros en un segundo.
    const emitidos: DraftChunk[][] = [];
    const pump = createChunkPump((chunks) => emitidos.push(chunks));

    for (let i = 0; i < 45; i += 1) {
      pump.push([razona('x')]);
      vi.advanceTimersByTime(1000 / 45);
    }
    pump.flush();

    expect(emitidos.length).toBeLessThanOrEqual(9);
    expect(emitidos.flat().map((chunk) => (chunk.kind === 'reasoning' ? chunk.text : '')).join(''))
      .toBe('x'.repeat(45));
  });

  it('el temporizador no se reinicia con cada pedazo', () => {
    // Si fuera un antirrebote, con cuadros cada 22 ms no emitiría NUNCA hasta el
    // final, y la espera volvería a ser una pantalla quieta.
    const emitidos: DraftChunk[][] = [];
    const pump = createChunkPump((chunks) => emitidos.push(chunks));

    for (let i = 0; i < 20; i += 1) {
      pump.push([razona('.')]);
      vi.advanceTimersByTime(22);
    }

    expect(emitidos.length).toBeGreaterThan(0);
  });

  it('no separa lo que es del mismo tipo pero junta el cierre aparte', () => {
    const emitidos: DraftChunk[][] = [];
    const pump = createChunkPump((chunks) => emitidos.push(chunks));

    pump.push([razona('pensé'), escribe('feat'), escribe('(x): y'), cierra]);
    vi.advanceTimersByTime(CHUNK_WINDOW_MS);

    expect(emitidos).toEqual([[razona('pensé'), escribe('feat(x): y'), cierra]]);
  });
});

describe('el final del stream', () => {
  it('vaciar emite lo pendiente sin esperar la ventana', () => {
    const emitidos: DraftChunk[][] = [];
    const pump = createChunkPump((chunks) => emitidos.push(chunks));

    // El cierre —con su motivo y su conteo de tokens— casi siempre cae dentro de
    // una ventana que todavía no venció. Sin vaciar, se perdería.
    pump.push([cierra]);
    pump.flush();

    expect(emitidos).toEqual([[cierra]]);
  });

  it('vaciar sin nada pendiente no emite una lista vacía', () => {
    const emitidos: DraftChunk[][] = [];
    const pump = createChunkPump((chunks) => emitidos.push(chunks));

    pump.flush();

    // Un aviso sin nada adentro obliga a quien escucha a distinguir «llegó algo»
    // de «no llegó nada», y no aporta.
    expect(emitidos).toEqual([]);
  });

  it('cortar descarta lo pendiente y no avisa más', () => {
    const emitidos: DraftChunk[][] = [];
    const pump = createChunkPump((chunks) => emitidos.push(chunks));

    pump.push([razona('lo que sea')]);
    pump.stop();
    vi.advanceTimersByTime(CHUNK_WINDOW_MS * 5);
    pump.push([razona('más')]);
    pump.flush();

    // Se canceló: lo pendiente ya no le importa a nadie.
    expect(emitidos).toEqual([]);
  });
});
