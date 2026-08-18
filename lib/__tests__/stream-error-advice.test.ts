import { describe, expect, it } from 'vitest';
import { adviceKeyForStreamError } from '../stream-error-advice';

/**
 * Traducir el motivo del servidor a algo accionable.
 *
 * Los mensajes de esta tabla son los reales: salieron del registro de LM Studio
 * en la notebook de Ale, no están inventados.
 */

describe('lo que se reconoce', () => {
  it('la placa que se cae, tal como lo escribió LM Studio', () => {
    // El caso medido: prompt de 4.199 tokens, iGPU Intel Iris Xe.
    expect(adviceKeyForStreamError('decode() failed: vk::Device::getFenceStatus: ErrorDeviceLost'))
      .toBe('aiAdviceDeviceLost');
  });

  it('el mismo error envuelto en el JSON del motor', () => {
    expect(adviceKeyForStreamError(
      'Engine protocol predict stream returned an error: {"code":500,"message":"decode() failed: vk::Device::getFenceStatus: ErrorDeviceLost","type":"server_error"}',
    )).toBe('aiAdviceDeviceLost');
  });

  it('quedarse sin memoria', () => {
    expect(adviceKeyForStreamError('failed to allocate buffer: out of memory')).toBe('aiAdviceOutOfMemory');
  });

  it('el vínculo con la otra máquina', () => {
    // Ya visto con LM Link cuando la PC de casa se suspende.
    expect(adviceKeyForStreamError('Failed to load LLM: LM Link connection closed'))
      .toBe('aiAdviceConnection');
  });

  it('el prompt que no entra', () => {
    expect(adviceKeyForStreamError('the request exceeds context length')).toBe('aiAdviceContext');
  });

  it('el modelo que no es de chat o responde 400', () => {
    expect(adviceKeyForStreamError('Selected model is an embedding model')).toBe('aiAdviceNotChatModel');
    expect(adviceKeyForStreamError('the server responded with HTTP 400')).toBe('aiAdviceNotChatModel');
    expect(adviceKeyForStreamError('not a chat model')).toBe('aiAdviceNotChatModel');
    expect(adviceKeyForStreamError('This model does not support chat completions')).toBe('aiAdviceNotChatModel');
    expect(adviceKeyForStreamError('{"code": 400, "message": "invalid request"}')).toBe('aiAdviceNotChatModel');
    expect(adviceKeyForStreamError('El servidor local respondió 400.')).toBe('aiAdviceNotChatModel');
  });
});

describe('lo que no se reconoce', () => {
  it('no se inventa un consejo', () => {
    // Mandar a hacer algo que no tiene nada que ver es peor que mostrar sólo el
    // motivo técnico: la persona pierde el tiempo en la pista equivocada.
    expect(adviceKeyForStreamError('algo raro que nunca vimos')).toBeNull();
  });

  it('cadenas que contienen 400 o embedding en otro contexto no disparan consejo', () => {
    expect(adviceKeyForStreamError('timeout after 400ms')).toBeNull();
    expect(adviceKeyForStreamError('buffer size exceeded: 400 bytes allocated')).toBeNull();
    expect(adviceKeyForStreamError('process took 400 seconds to respond')).toBeNull();
    expect(adviceKeyForStreamError('failed to compute embedding vector in database')).toBeNull();
    expect(adviceKeyForStreamError('embedding dimension mismatch in local index')).toBeNull();
    expect(adviceKeyForStreamError('the model failed to load: embedding cache corrupt')).toBeNull();
    expect(adviceKeyForStreamError('model file format not supported by this build')).toBeNull();
    expect(adviceKeyForStreamError('model weights could not generate checksum')).toBeNull();
    expect(adviceKeyForStreamError('could not load model: embedding index missing')).toBeNull();
  });

  it('un motivo vacío no dice nada', () => {
    expect(adviceKeyForStreamError('')).toBeNull();
    expect(adviceKeyForStreamError('   ')).toBeNull();
  });
});
