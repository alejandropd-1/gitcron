/**
 * Qué falló al empujar, dicho en un tipo y no en un párrafo en inglés.
 *
 * Existe por lo que le pasó a Ale: apretó PUSH y recibió ocho líneas de Git
 * nombrando `push.default` y `branch.autoSetupMerge`. Su primera reacción fue
 * preguntar si era un problema de conexión — cuando el texto no se entiende, se
 * adivina la causa equivocada, y en Git adivinar mal lleva a tocar el historial.
 *
 * Puro sobre el texto: se prueba con tablas contra la salida **real** de Git,
 * capturada provocando cada fallo y guardada en el change. Ninguno de estos
 * patrones se escribió de memoria, y eso importa: al capturarlos aparecieron dos
 * cosas que nadie habría adivinado —«sin ningún remoto» es un caso aparte de
 * «sin upstream», y el rechazo por estar atrasado empieza con `error:` y no con
 * `fatal:`—.
 *
 * El reconocimiento por texto ya existía en `electron/ipc/git-sync.ts` para un
 * solo caso. Esto no inventa el mecanismo: completa la cobertura y la saca del
 * proceso principal para poder probarla.
 */

export type PushFailure =
  /**
   * La rama se renombró y el vínculo quedó apuntando al nombre anterior.
   *
   * `remoteBranch` es hacia dónde apunta hoy, extraído del propio mensaje. Es lo
   * que permite decir «apunta a X» en vez de una explicación genérica.
   */
  | { kind: 'upstream-name-mismatch'; remoteBranch: string | null }
  /** La rama nunca se publicó. Es el único que GitCron ya resolvía. */
  | { kind: 'no-upstream'; branch: string | null }
  /** No hay ningún remoto configurado. Distinto del anterior: falta el remoto. */
  | { kind: 'no-remote' }
  /** El remoto tiene trabajo que acá no está. Hay que traerlo antes. */
  | { kind: 'behind-remote' }
  /** No se llegó al servidor. El único donde la respuesta es mirar la red. */
  | { kind: 'unreachable'; host: string | null }
  /**
   * No se reconoció.
   *
   * Es un resultado explícito y no un hueco, porque es la respuesta más
   * frecuente y la que hay que poder distinguir: significa «mostrá el texto de
   * Git tal como vino», no «no pasó nada».
   */
  | { kind: 'unknown' };

/** Lo que se extrae sin inventar: si el grupo no está, es `null`. */
function group(text: string, pattern: RegExp): string | null {
  const found = pattern.exec(text)?.[1]?.trim();
  return found && found.length > 0 ? found : null;
}

/**
 * Reconoce un fallo de `git push` a partir de su texto.
 *
 * El orden no es casual: se prueba de lo más específico a lo más general. «Sin
 * upstream» y «sin ningún remoto» comparten vocabulario, y el rechazo por estar
 * atrasado convive con la ruta del remoto dentro del mismo mensaje.
 *
 * Ante la duda devuelve `unknown`. Una explicación equivocada sobre Git es peor
 * que ninguna: lleva a ejecutar la acción que no corresponde sobre el historial.
 */
export function recognizePushFailure(raw: string): PushFailure {
  const text = (raw ?? '').trim();
  if (text.length === 0) return { kind: 'unknown' };

  // El vínculo apunta a otro nombre. El destino sale de la propia sugerencia de
  // Git, que nombra la rama del remoto en `git push origin HEAD:<nombre>`.
  if (/upstream branch of your current branch does not match/i.test(text)) {
    return {
      kind: 'upstream-name-mismatch',
      remoteBranch: group(text, /git push \S+ HEAD:(\S+)/),
    };
  }

  // Sin upstream: la rama nunca se publicó. Git nombra la rama en el mensaje.
  if (/has no upstream branch/i.test(text)) {
    return { kind: 'no-upstream', branch: group(text, /current branch (\S+) has no upstream/i) };
  }

  // Sin ningún remoto. Aparece antes que el anterior en el tiempo, pero se
  // prueba después porque su texto es inconfundible y no se solapa.
  if (/No configured push destination/i.test(text)) return { kind: 'no-remote' };

  // Rechazado por estar atrasado. Ojo: empieza con `error:`, no con `fatal:`.
  if (/\[rejected\]/.test(text) && /fetch first|non-fast-forward/i.test(text)) {
    return { kind: 'behind-remote' };
  }
  if (/Updates were rejected because the remote contains work/i.test(text)) {
    return { kind: 'behind-remote' };
  }

  // No se llegó al servidor.
  if (/Could not resolve host|unable to access|Connection (timed out|refused)/i.test(text)) {
    return { kind: 'unreachable', host: group(text, /Could not resolve host:\s*(\S+?)\.?$/im) };
  }

  return { kind: 'unknown' };
}
