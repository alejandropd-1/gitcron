/**
 * Espera a que `dist/main.js` esté parcheado antes de dejar arrancar Electron.
 *
 * Por qué existe: esbuild le saca el prefijo a `node:sqlite` y un script
 * `onSuccess` de tsup reescribe el bundle DESPUÉS de compilar (ver
 * `tsup.config.ts`). Entre esas dos cosas hay una ventana en la que el archivo
 * en disco dice `require("sqlite")`, que Electron no resuelve: revienta con
 * "Cannot find module 'sqlite'".
 *
 * Compilar una vez antes de `concurrently` no alcanzaba, porque el `--watch`
 * hace su propia compilación inicial y vuelve a dejar el archivo sin parchear
 * justo mientras Electron está por leerlo. Ésa era la ventana que quedaba
 * abierta.
 *
 * Acá se espera al contenido real del archivo, no a un puerto ni a un tiempo
 * fijo: es la única señal que responde la pregunta que importa.
 */
import { readFileSync } from 'node:fs';

const TARGET = 'dist/main.js';
const NEEDLE = 'require("node:sqlite")';
const BROKEN = 'require("sqlite")';
const TIMEOUT_MS = 60_000;
const POLL_MS = 120;

const startedAt = Date.now();

function check() {
  let source;
  try {
    source = readFileSync(TARGET, 'utf8');
  } catch {
    // Todavía no existe: la primera compilación sigue corriendo.
    return schedule();
  }

  if (source.includes(NEEDLE)) process.exit(0);

  // Presente pero sin parchear: es exactamente la ventana de la carrera.
  if (source.includes(BROKEN)) return schedule();

  // No requiere sqlite de ninguna forma; nada que esperar.
  process.exit(0);
}

function schedule() {
  if (Date.now() - startedAt > TIMEOUT_MS) {
    console.error(
      `[wait-for-patched-main] ${TARGET} sigue sin parchear tras ${TIMEOUT_MS / 1000}s.\n` +
      'Arrancar Electron ahora fallaría con "Cannot find module \'sqlite\'".',
    );
    process.exit(1);
  }
  setTimeout(check, POLL_MS);
}

check();
