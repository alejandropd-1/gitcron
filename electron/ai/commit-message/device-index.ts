// electron/ai/commit-message/device-index.ts
//
// En qué máquina vive cada modelo.
//
// Importa porque la inferencia puede correr en otra computadora sin que nada lo
// diga: con LM Link, `localhost:1234` resuelve contra el equipo enlazado de
// forma transparente. Medido en la máquina de Ale, 13 de sus 16 modelos viven en
// la PC con la placa y 3 en la notebook; los 25–47 segundos que se midieron de
// redacción ya corrían del otro lado sin que la pantalla lo dijera.
//
// **El dato no está en la API HTTP.** Comprobado: las dos copias del mismo
// modelo llegan idénticas byte a byte y no hay endpoint de dispositivos.
//
// La primera versión lo sacaba del CLI `lms` y **se retiró**: medido, dos
// invocaciones costaban 1,7 s, 9,2 s y 37,8 s en corridas seguidas —se degrada—
// y era parte de lo que trababa la máquina de Ale.
//
// Esta versión usa el WebSocket del propio servidor. Medido: **42 ms**, sin
// procesos, con el mismo resultado (13 remotos / 3 locales). Entre 40 y 900
// veces más barato que el CLI.
//
// Sin credenciales: comprobado que el handshake pasa con `clientPasskey` vacío.

import type { LocalModel } from '../../../types/commit-message-ai';

/** Techo duro. A 42 ms medidos, un segundo ya es diez veces el caso peor visto. */
export const DEVICE_INDEX_TIMEOUT_MS = 4_000;

/**
 * El canal del servidor que responde `listDownloadedModels`.
 *
 * Comprobado que es `system` y no otro: `llm` y `diagnostics` contestan
 * `rpcEndpointUnknown` para ese mismo pedido.
 */
export function deviceEndpoint(baseUrl: string): string {
  const limpio = baseUrl.replace(/\/+$/, '');
  return `${limpio.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')}/system`;
}

/** Clave del modelo → identificadores de las máquinas donde vive. */
export type DeviceIndex = Map<string, string[]>;

type RawEntry = { modelKey?: unknown; deviceIdentifier?: unknown };

/**
 * Arma el índice a partir de la respuesta cruda. Puro, para probarlo con tablas.
 *
 * `deviceIdentifier` nulo significa **esta máquina**, y se representa con la
 * cadena vacía para que la lista de un modelo pueda llevar las dos cosas: hay
 * modelos que están en las dos máquinas, y eso es información —explica por qué
 * el catálogo HTTP los devuelve repetidos—, no un duplicado a descartar.
 */
export function buildDeviceIndex(payload: unknown): DeviceIndex {
  const index: DeviceIndex = new Map();
  if (!Array.isArray(payload)) return index;
  for (const entry of payload as RawEntry[]) {
    const key = typeof entry?.modelKey === 'string' ? entry.modelKey.trim() : '';
    if (!key) continue;
    const id = typeof entry?.deviceIdentifier === 'string' && entry.deviceIdentifier.trim().length > 0
      ? entry.deviceIdentifier.trim()
      : '';
    const previos = index.get(key) ?? [];
    if (!previos.includes(id)) index.set(key, [...previos, id]);
  }
  return index;
}

/**
 * Aplica el índice al catálogo. Puro.
 *
 * Un modelo que el índice no menciona queda con la lista vacía, que significa
 * «no se sabe» y **no** «es local»: no saber no es lo mismo que saber que no.
 */
export function mergeDeviceInfo(models: LocalModel[], index: DeviceIndex): LocalModel[] {
  if (index.size === 0) return models;
  return models.map((model) => ({ ...model, devices: index.get(model.id) ?? [] }));
}

/**
 * Pide el índice por WebSocket.
 *
 * Devuelve un índice vacío ante cualquier problema —servidor caído, canal
 * distinto, respuesta inesperada—: sin el dato la vista no afirma nada, que es
 * el mismo criterio que rige toda la evidencia de este proyecto.
 */
export function fetchDeviceIndex(
  baseUrl: string,
  timeoutMs: number = DEVICE_INDEX_TIMEOUT_MS,
): Promise<DeviceIndex> {
  return new Promise((resolve) => {
    let socket: WebSocket;
    try {
      socket = new WebSocket(deviceEndpoint(baseUrl));
    } catch {
      resolve(new Map());
      return;
    }
    // Una sola resolución: `onerror` puede llegar después de `onclose`, y sin
    // esta guardia la promesa se resolvería dos veces.
    let listo = false;
    const terminar = (index: DeviceIndex) => {
      if (listo) return;
      listo = true;
      clearTimeout(reloj);
      try { socket.close(); } catch { /* ya cerrado */ }
      resolve(index);
    };
    const reloj = setTimeout(() => terminar(new Map()), timeoutMs);

    socket.onopen = () => socket.send(JSON.stringify({
      authVersion: 1,
      clientIdentifier: 'gitcron',
      // Vacío a propósito: comprobado que el servidor local lo acepta así. Leer
      // la clave del disco sería manipular una credencial sin necesitarla.
      clientPasskey: '',
    }));

    socket.onmessage = (evento) => {
      let mensaje: { success?: unknown; type?: unknown; result?: unknown };
      try {
        mensaje = JSON.parse(String(evento.data));
      } catch {
        return terminar(new Map());
      }
      if (mensaje.success === true) {
        socket.send(JSON.stringify({ type: 'rpcCall', endpoint: 'listDownloadedModels', callId: 1 }));
        return;
      }
      if (mensaje.success === false) return terminar(new Map());
      if (mensaje.type === 'rpcResult') return terminar(buildDeviceIndex(mensaje.result));
      if (mensaje.type === 'rpcError' || mensaje.type === 'communicationWarning') {
        return terminar(new Map());
      }
    };

    socket.onerror = () => terminar(new Map());
    socket.onclose = () => terminar(new Map());
  });
}
