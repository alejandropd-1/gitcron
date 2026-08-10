// electron/ai/commit-message/device-names.ts
//
// El nombre legible de cada máquina: «Ale-CasaNew» en vez de «4f814c48…».
//
// El WebSocket del servidor da el mapeo modelo → identificador en 42 ms, pero
// **no traduce el identificador a un nombre**: se barrieron cinco canales y
// treinta nombres de RPC y ninguno existe. Eso sólo lo tiene el CLI.
//
// Volver al CLI acá no repite el error anterior. Aquella versión lo invocaba en
// **cada lectura del catálogo** y corría dos comandos, `link status` y `ls`;
// medido, el par costaba 1,7 s, 9,2 s y 37,8 s en corridas seguidas, y el caro
// era `ls`. Acá se corre **sólo `link status`** —medido: 300 a 700 ms— y **una
// sola vez**, porque el nombre de una máquina no cambia. Después sale de disco.

import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** `lms` es un `.exe`: `execFile` lo resuelve sin shell. */
const LMS = 'lms';

/** Techo duro. Medido en 300–700 ms; diez segundos es margen, no expectativa. */
const RESOLVE_TIMEOUT_MS = 10_000;

/**
 * Identificador → nombre. La cadena vacía es esta máquina, igual que en el
 * índice de dispositivos.
 */
export type DeviceNames = Record<string, string>;

type RawStatus = {
  deviceName?: unknown;
  peers?: Array<{ deviceIdentifier?: unknown; deviceName?: unknown }>;
};

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Lee la salida de `lms link status --json`. Puro, para probarlo con tablas.
 *
 * Los enlaces se leen de `peers`; el nombre de esta máquina, de `deviceName` de
 * la raíz, y se guarda bajo la clave vacía.
 */
export function parseDeviceNames(payload: unknown): DeviceNames {
  const raw = payload as RawStatus;
  const names: DeviceNames = {};
  const propio = text(raw?.deviceName);
  if (propio) names[''] = propio;
  for (const peer of Array.isArray(raw?.peers) ? raw.peers : []) {
    const id = text(peer?.deviceIdentifier);
    const nombre = text(peer?.deviceName);
    if (id && nombre) names[id] = nombre;
  }
  return names;
}

/**
 * Resuelve los nombres invocando el CLI. Devuelve `{}` ante cualquier problema.
 *
 * Sin `lms` instalado, con LM Link apagado o con el CLI hablándole a otra
 * instancia, no se afirma nada: la vista muestra el identificador recortado, que
 * es peor de leer pero verdadero.
 */
export async function resolveDeviceNames(): Promise<DeviceNames> {
  try {
    const { stdout } = await execFileAsync(LMS, ['link', 'status', '--json'], {
      timeout: RESOLVE_TIMEOUT_MS,
      windowsHide: true,
    });
    return parseDeviceNames(JSON.parse(stdout));
  } catch {
    return {};
  }
}

/**
 * Los nombres, de disco si ya se resolvieron alguna vez.
 *
 * Persistir importa: sin esto se paga el proceso una vez por arranque de la
 * aplicación, y el dato es de los más estables que hay —el nombre de una
 * computadora—.
 */
export async function readCachedDeviceNames(cachePath: string): Promise<DeviceNames | null> {
  try {
    const crudo = JSON.parse(await readFile(cachePath, 'utf8'));
    return crudo && typeof crudo === 'object' ? crudo as DeviceNames : null;
  } catch {
    return null;
  }
}

export async function writeCachedDeviceNames(cachePath: string, names: DeviceNames): Promise<void> {
  try {
    await writeFile(cachePath, JSON.stringify(names, null, 2), 'utf8');
  } catch {
    // Sin caché se vuelve a resolver la próxima vez. No es motivo de error.
  }
}
