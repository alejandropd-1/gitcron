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
});

describe('lo que no se reconoce', () => {
  it('no se inventa un consejo', () => {
    // Mandar a hacer algo que no tiene nada que ver es peor que mostrar sólo el
    // motivo técnico: la persona pierde el tiempo en la pista equivocada.
    expect(adviceKeyForStreamError('algo raro que nunca vimos')).toBeNull();
  });

  it('un motivo vacío no dice nada', () => {
    expect(adviceKeyForStreamError('')).toBeNull();
    expect(adviceKeyForStreamError('   ')).toBeNull();
  });
});
