import * as fs from 'node:fs';

/**
 * Borrado de un directorio temporal de test, con reintento.
 *
 * En Windows, `simple-git` y `node:sqlite` dejan handles abiertos unos
 * milisegundos después de que el proceso hijo salió o la conexión se cerró. Un
 * `fs.rmSync` inmediato choca contra ese handle y tira
 * `EBUSY: resource busy or locked`, que hace fallar el `afterEach` de un test
 * que ya había pasado. Corriendo aislado nunca se ve; bajo la carga paralela de
 * la suite completa, sí.
 *
 * `maxRetries`/`retryDelay` existen en Node exactamente para esto: reintentan
 * ante `EBUSY`, `EMFILE`, `ENFILE`, `ENOTEMPTY` y `EPERM`. No se enmascara
 * ningún fallo del test —esto corre después de las aserciones—, sólo se deja de
 * depender de que el sistema operativo haya soltado el handle a tiempo.
 */
export function removeTempDir(target: string): void {
  fs.rmSync(target, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
