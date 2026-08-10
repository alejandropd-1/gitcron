import { recognizePushFailure, type PushFailure } from './git-push-failure';

/**
 * Cómo se le cuenta a una persona que un push falló.
 *
 * Puro: entra el texto de Git, sale qué clave de idioma usar, con qué datos, y
 * si hay una salida que la aplicación puede ofrecer. Traducir acá mismo ataría
 * este módulo al idioma y lo haría imposible de probar con tablas.
 *
 * Lo que **no** hace: reemplazar el texto de Git. Cuando la explicación acierta
 * el original sobra, y cuando falla —y va a fallar, porque los mensajes de Git
 * cambian entre versiones y con el idioma del sistema— es lo único que permite
 * entender qué pasó de verdad, y lo que hace falta pegar para pedir ayuda.
 */

/** Qué puede hacer la aplicación al respecto. La ejecuta la persona, no ella. */
export type FailureRemedy =
  /** Publicar la rama con su nombre actual y reapuntar el vínculo. */
  | { kind: 'repoint-upstream' }
  /** Traer lo que el remoto tiene antes de volver a empujar. */
  | { kind: 'pull-first' }
  /** No hay nada que la aplicación pueda hacer por su cuenta. */
  | null;

export interface FailureMessage {
  /** Clave de idioma de la explicación. */
  key: string;
  /** Datos que la explicación nombra. Sólo los que el mensaje traía. */
  params: Record<string, string>;
  remedy: FailureRemedy;
  /** El texto de Git, siempre. Nunca se pierde. */
  raw: string;
}

const BASE = 'git.pushFailure';

/**
 * Traduce un fallo reconocido a lo que la vista necesita.
 *
 * Un fallo sin reconocer devuelve la clave genérica y ninguna acción: mostrar el
 * texto crudo es exactamente lo correcto ahí, y ofrecer un botón que no resuelve
 * nada sería peor que no ofrecer ninguno.
 */
export function describePushFailure(raw: string): FailureMessage {
  const failure: PushFailure = recognizePushFailure(raw);
  switch (failure.kind) {
    case 'upstream-name-mismatch':
      return {
        key: `${BASE}.upstreamMismatch`,
        // El nombre viejo se nombra sólo si el mensaje lo traía: decir «apunta a
        // otra rama» sin poder decir a cuál es la mitad de una explicación.
        params: failure.remoteBranch ? { remoteBranch: failure.remoteBranch } : {},
        remedy: { kind: 'repoint-upstream' },
        raw,
      };
    case 'no-upstream':
      return {
        key: `${BASE}.noUpstream`,
        params: failure.branch ? { branch: failure.branch } : {},
        remedy: { kind: 'repoint-upstream' },
        raw,
      };
    case 'no-remote':
      // Sin remoto configurado no hay nada que reapuntar: falta agregarlo, y eso
      // pide una dirección que sólo la persona tiene.
      return { key: `${BASE}.noRemote`, params: {}, remedy: null, raw };
    case 'behind-remote':
      return { key: `${BASE}.behindRemote`, params: {}, remedy: { kind: 'pull-first' }, raw };
    case 'unreachable':
      return {
        key: `${BASE}.unreachable`,
        params: failure.host ? { host: failure.host } : {},
        remedy: null,
        raw,
      };
    default:
      return { key: `${BASE}.unknown`, params: {}, remedy: null, raw };
  }
}
