/**
 * La rama de un cambio, derivada sin tocar Git.
 *
 * La regla vive en el canal —`openspec/config.yaml`— y dice que todo cambio se
 * trabaja en `change/<slug>`. Acá sólo se deriva la correspondencia: qué rama le
 * toca a un cambio y si la actual es ésa. El nombre de la rama entra como
 * parámetro para que este módulo no dependa de Git ni de la forma del snapshot,
 * igual que `change-commit-scope`.
 *
 * El prefijo distingue estas ramas de `imagined/*` y `flight/*`, que ya
 * significan otra cosa en este proyecto.
 */

export const CHANGE_BRANCH_PREFIX = 'change/';

/** La rama que le corresponde a un cambio. */
export function changeBranchName(changeId: string): string {
  return `${CHANGE_BRANCH_PREFIX}${changeId}`;
}

export type ChangeBranchState = {
  /** La que corresponde según la regla. */
  expected: string;
  /** En la que se está parado. */
  actual: string;
  /** Si coinciden. Cuando es `true` no hay nada que declarar. */
  matches: boolean;
};

/**
 * Estado de la rama respecto del cambio abierto.
 *
 * Devuelve `null` cuando no hay nada que afirmar: sin cambio abierto no hay
 * rama que corresponda, y sin nombre de rama no se sabe dónde se está parado.
 * No saber no es lo mismo que estar en la rama equivocada, y por eso el nulo
 * existe en vez de un `matches: false` por omisión.
 */
export function deriveChangeBranchState(
  branch: string | null | undefined,
  changeId: string | null | undefined,
): ChangeBranchState | null {
  if (!changeId) return null;
  const actual = (branch ?? '').trim();
  if (actual.length === 0) return null;
  const expected = changeBranchName(changeId);
  return { expected, actual, matches: actual === expected };
}
