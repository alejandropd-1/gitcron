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

/**
 * El cambio que la rama declara, si declara alguno.
 *
 * Es la operación inversa y la fuente de atribución primaria: una rama
 * `change/<slug>` es alguien diciendo que ese trabajo pertenece a ese cambio, y
 * Git lo sostiene con independencia de quién editó los archivos, con qué
 * herramienta y desde dónde.
 *
 * Cualquier otra rama devuelve `null` y no una suposición: parado en `main` no
 * hay nada que la rama afirme, y heredar el cambio seleccionado en la pantalla
 * sería inventar la atribución que este trabajo existe para no inventar.
 */
export function changeIdFromBranch(branch: string | null | undefined): string | null {
  const name = (branch ?? '').trim();
  if (!name.startsWith(CHANGE_BRANCH_PREFIX)) return null;
  const changeId = name.slice(CHANGE_BRANCH_PREFIX.length);
  // Sin identificador —`change/` pelado— no hay nada que atribuir. Un `/` adentro
  // tampoco: `change/algo/otro` no es la rama de ningún cambio, porque el slug
  // de OpenSpec no admite barras.
  return changeId.length > 0 && !changeId.includes('/') ? changeId : null;
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
