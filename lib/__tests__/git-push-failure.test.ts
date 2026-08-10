import { describe, expect, it } from 'vitest';
import { recognizePushFailure } from '../git-push-failure';

/**
 * Reconocer qué falló al empujar.
 *
 * Las entradas de estas tablas son la salida **real** de Git, capturada
 * provocando cada fallo en repositorios descartables. No son paráfrasis, y eso
 * es el punto: al capturarlas aparecieron dos cosas que nadie habría adivinado
 * escribiendo los patrones de memoria.
 */

/** El que recibió Ale al apretar PUSH. Textual, con sus saltos de línea. */
const VINCULO_CON_OTRO_NOMBRE = `fatal: The upstream branch of your current branch does not match
the name of your current branch.  To push to the upstream branch
on the remote, use

    git push origin HEAD:change/name-task-in-commit-message

To push to the branch of the same name on the remote, use

    git push origin HEAD

To choose either option permanently, see push.default in 'git help config'.

To avoid automatically configuring an upstream branch when its name
won't match the local branch, see option 'simple' of branch.autoSetupMerge
in 'git help config'.`;

const SIN_UPSTREAM = `fatal: The current branch main has no upstream branch.
To push the current branch and set the remote as upstream, use

    git push --set-upstream origin main

To have this happen automatically for branches without a tracking
upstream, see 'push.autoSetupRemote' in 'git help config'.`;

const SIN_REMOTO = `fatal: No configured push destination.
Either specify the URL from the command-line or configure a remote repository using

    git remote add <name> <url>

and then push using the remote name

    git push <name>`;

const ATRASADO = `To C:\\Users\\apdel\\AppData\\Local\\Temp\\gitfail\\remoto.git
 ! [rejected]        main -> main (fetch first)
error: failed to push some refs to 'C:\\Users\\apdel\\AppData\\Local\\Temp\\gitfail\\remoto.git'
hint: Updates were rejected because the remote contains work that you do not
hint: have locally. This is usually caused by another repository pushing to
hint: the same ref. If you want to integrate the remote changes, use
hint: 'git pull' before pushing again.
hint: See the 'Note about fast-forwards' in 'git push --help' for details.`;

const INALCANZABLE = `fatal: unable to access 'https://no-existe-este-host-12345.invalid/repo.git/': `
  + 'Could not resolve host: no-existe-este-host-12345.invalid';

describe('los cinco fallos capturados', () => {
  it('reconoce el vínculo con otro nombre y dice hacia dónde apunta', () => {
    // Nombrar la rama del remoto es lo que convierte una explicación genérica en
    // una útil: «apunta a X» dice qué pasó de verdad.
    expect(recognizePushFailure(VINCULO_CON_OTRO_NOMBRE)).toEqual({
      kind: 'upstream-name-mismatch',
      remoteBranch: 'change/name-task-in-commit-message',
    });
  });

  it('reconoce que la rama nunca se publicó, y la nombra', () => {
    expect(recognizePushFailure(SIN_UPSTREAM)).toEqual({ kind: 'no-upstream', branch: 'main' });
  });

  it('distingue «sin ningún remoto» de «sin upstream»', () => {
    // No estaba previsto: apareció al intentar reproducir el otro sin haber
    // agregado el remoto todavía. Piden respuestas distintas —agregar el remoto
    // contra reapuntar el vínculo—, así que colapsarlos sería un consejo falso.
    expect(recognizePushFailure(SIN_REMOTO)).toEqual({ kind: 'no-remote' });
  });

  it('reconoce el rechazo por estar atrasado, que no empieza con «fatal»', () => {
    // Empieza con `error:` y trae la ruta del remoto adentro. Un patrón que sólo
    // mire `fatal:` lo deja afuera en silencio.
    expect(recognizePushFailure(ATRASADO)).toEqual({ kind: 'behind-remote' });
  });

  it('reconoce el remoto inalcanzable y extrae el host', () => {
    // Es el que Ale supuso que tenía; vale distinguirlo porque es el único donde
    // la respuesta es mirar la red.
    expect(recognizePushFailure(INALCANZABLE)).toEqual({
      kind: 'unreachable',
      host: 'no-existe-este-host-12345.invalid',
    });
  });
});

describe('lo que no se reconoce', () => {
  it('es un resultado explícito, no un hueco', () => {
    // «No lo reconozco» significa «mostrá el texto de Git tal como vino», y hay
    // que poder distinguirlo de «no pasó nada».
    expect(recognizePushFailure('fatal: algo que nadie previó')).toEqual({ kind: 'unknown' });
    expect(recognizePushFailure('')).toEqual({ kind: 'unknown' });
    expect(recognizePushFailure('   ')).toEqual({ kind: 'unknown' });
  });

  it('no confunde un mensaje de éxito con un fallo', () => {
    expect(recognizePushFailure('Everything up-to-date')).toEqual({ kind: 'unknown' });
  });
});

describe('lo que se extrae, sin inventarlo', () => {
  it('sin la sugerencia de Git, la rama del remoto queda en nulo', () => {
    // Recortado a propósito: si el mensaje no la trae, no se adivina.
    expect(recognizePushFailure('fatal: The upstream branch of your current branch does not match'))
      .toEqual({ kind: 'upstream-name-mismatch', remoteBranch: null });
  });

  it('un remoto inalcanzable sin nombre de host tampoco lo inventa', () => {
    expect(recognizePushFailure("fatal: unable to access 'https://ejemplo/repo.git/': Connection timed out"))
      .toEqual({ kind: 'unreachable', host: null });
  });
});
