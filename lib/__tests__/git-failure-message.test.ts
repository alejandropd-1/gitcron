import { describe, expect, it } from 'vitest';
import { describePushFailure } from '../git-failure-message';

/**
 * Qué se le muestra a una persona cuando un push falla.
 *
 * Lo que se protege acá no es la traducción sino tres decisiones: que el texto
 * de Git nunca se pierda, que no se ofrezca una acción que no resuelve nada, y
 * que no se nombre un dato que el mensaje no traía.
 */

const VINCULO = `fatal: The upstream branch of your current branch does not match
the name of your current branch.  To push to the upstream branch
on the remote, use

    git push origin HEAD:change/name-task-in-commit-message`;

const ATRASADO = ` ! [rejected]        main -> main (fetch first)
error: failed to push some refs to 'origin'
hint: Updates were rejected because the remote contains work that you do not
hint: have locally.`;

describe('la explicación', () => {
  it('nombra la rama del remoto cuando el mensaje la trae', () => {
    const mensaje = describePushFailure(VINCULO);
    expect(mensaje.key).toBe('git.pushFailure.upstreamMismatch');
    expect(mensaje.params).toEqual({ remoteBranch: 'change/name-task-in-commit-message' });
  });

  it('no nombra lo que el mensaje no traía', () => {
    // «Apunta a otra rama» sin poder decir a cuál es media explicación, pero
    // inventar el nombre sería peor.
    const mensaje = describePushFailure('fatal: The upstream branch of your current branch does not match');
    expect(mensaje.params).toEqual({});
  });

  it('un fallo desconocido usa la clave genérica', () => {
    expect(describePushFailure('fatal: algo nuevo').key).toBe('git.pushFailure.unknown');
  });
});

describe('el texto de Git', () => {
  it('se conserva siempre, reconocido o no', () => {
    // Cuando la explicación acierta el original sobra; cuando falla es lo único
    // que permite entender qué pasó, y lo que se pega al pedir ayuda afuera.
    expect(describePushFailure(VINCULO).raw).toBe(VINCULO);
    expect(describePushFailure('cualquier cosa').raw).toBe('cualquier cosa');
  });
});

describe('la salida ofrecida', () => {
  it('el vínculo desalineado ofrece reapuntarlo', () => {
    expect(describePushFailure(VINCULO).remedy).toEqual({ kind: 'repoint-upstream' });
  });

  it('estar atrasado ofrece traer primero', () => {
    expect(describePushFailure(ATRASADO).remedy).toEqual({ kind: 'pull-first' });
  });

  it('sin remoto no ofrece ninguna: falta una dirección que sólo la persona tiene', () => {
    expect(describePushFailure('fatal: No configured push destination.').remedy).toBeNull();
  });

  it('el remoto inalcanzable tampoco: la respuesta es mirar la red', () => {
    const mensaje = describePushFailure(
      "fatal: unable to access 'https://x/y.git/': Could not resolve host: servidor.invalid",
    );
    expect(mensaje.remedy).toBeNull();
    expect(mensaje.params).toEqual({ host: 'servidor.invalid' });
  });

  it('un fallo desconocido nunca ofrece una acción', () => {
    // Un botón que no resuelve nada es peor que ninguno.
    expect(describePushFailure('fatal: algo nuevo').remedy).toBeNull();
  });
});
