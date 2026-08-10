import { describe, expect, it } from 'vitest';
import { buildDeviceIndex, deviceEndpoint, mergeDeviceInfo } from '../ai/commit-message/device-index';
import type { LocalModel } from '../../types/commit-message-ai';

/**
 * En qué máquina vive cada modelo.
 *
 * El dato no está en la API HTTP —comprobado: las dos copias del mismo modelo
 * llegan idénticas byte a byte— sino en el WebSocket del propio servidor.
 * Medido: 42 ms, contra 1,7–37,8 s del CLI que se retiró por costoso.
 */

const modelo = (id: string): LocalModel => ({
  id,
  displayName: id,
  kind: 'llm',
  loaded: false,
  loadedContextLength: null,
  loadedInstanceId: null,
  maxContextLength: 262144,
  sizeBytes: null,
  params: null,
  quantization: null,
  reasoningDefault: null,
  reasoningCanBeOff: false,
  devices: [],
});

describe('el endpoint del canal', () => {
  it('pasa de http a ws sobre el mismo host y puerto', () => {
    // Comprobado que el canal es `system`: `llm` y `diagnostics` contestan
    // `rpcEndpointUnknown` para `listDownloadedModels`.
    expect(deviceEndpoint('http://localhost:1234')).toBe('ws://localhost:1234/system');
    expect(deviceEndpoint('https://ale-casanew:1234/')).toBe('wss://ale-casanew:1234/system');
  });
});

describe('el índice de dispositivos', () => {
  /** Forma real de `listDownloadedModels`, recortada de la respuesta medida. */
  const CRUDO = [
    { modelKey: 'google/gemma-4-26b-a4b-qat', deviceIdentifier: null },
    { modelKey: 'google/gemma-4-26b-a4b-qat', deviceIdentifier: '4f814c48de176d603d6e0efb16617c71' },
    { modelKey: 'google/gemma-4-12b', deviceIdentifier: '4f814c48de176d603d6e0efb16617c71' },
    { modelKey: 'google/gemma-4-e4b', deviceIdentifier: null },
  ];

  it('el identificador nulo es esta máquina', () => {
    const index = buildDeviceIndex(CRUDO);
    expect(index.get('google/gemma-4-e4b')).toEqual(['']);
    expect(index.get('google/gemma-4-12b')).toEqual(['4f814c48de176d603d6e0efb16617c71']);
  });

  it('un modelo en las dos máquinas lleva las dos', () => {
    // Es información, no un duplicado a descartar: explica por qué el catálogo
    // HTTP devuelve ese modelo repetido.
    expect(buildDeviceIndex(CRUDO).get('google/gemma-4-26b-a4b-qat'))
      .toEqual(['', '4f814c48de176d603d6e0efb16617c71']);
  });

  it('sobrevive a una forma inesperada sin afirmar nada', () => {
    expect(buildDeviceIndex(null).size).toBe(0);
    expect(buildDeviceIndex([{ deviceIdentifier: 'x' }]).size).toBe(0);
    expect(buildDeviceIndex([{ modelKey: '   ' }]).size).toBe(0);
  });
});

describe('aplicar el índice al catálogo', () => {
  it('completa cada modelo con sus máquinas', () => {
    const index = buildDeviceIndex([{ modelKey: 'a', deviceIdentifier: 'pc' }]);
    expect(mergeDeviceInfo([modelo('a')], index)[0].devices).toEqual(['pc']);
  });

  it('un modelo que el índice no menciona queda sin dispositivo, no local', () => {
    // No saber no es lo mismo que saber que no: la lista vacía significa que no
    // se pudo averiguar, y la vista no afirma nada.
    const index = buildDeviceIndex([{ modelKey: 'a', deviceIdentifier: 'pc' }]);
    expect(mergeDeviceInfo([modelo('b')], index)[0].devices).toEqual([]);
  });

  it('sin índice devuelve el catálogo intacto', () => {
    // El servidor caído o un canal distinto no pueden romper el catálogo: la
    // función principal es elegir un modelo, no saber dónde vive.
    const models = [modelo('a')];
    expect(mergeDeviceInfo(models, new Map())).toBe(models);
  });
});
