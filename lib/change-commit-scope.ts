/**
 * Qué preparar y qué mensaje sugerir para el commit de un cambio.
 *
 * Todo se deriva del estado real —el identificador del cambio, los otros
 * cambios activos y lo que Git reporta como modificado—, sin que ningún
 * artefacto declare nada. La versión anterior exigía un `commit.md` escrito de
 * antemano: si nadie lo escribía no funcionaba, y si quedaba desactualizado
 * mentía sin avisar.
 *
 * Puro y sin dependencias: se prueba entero con tablas de entrada y salida.
 */

/**
 * De dónde viene un archivo modificado.
 *
 * `other` lleva el identificador del cambio al que pertenece: esa atribución
 * existe —un artefacto vive bajo la carpeta de su cambio— y descartarla obligaba
 * a recordar qué se tocó en cada trabajo para poder elegir.
 */
export type CommitFileOrigin =
  | { kind: 'own' }
  | { kind: 'other'; changeId: string }
  | { kind: 'archived' }
  | { kind: 'unattributed' };

export interface CommitFileEntry {
  path: string;
  origin: CommitFileOrigin;
}

export interface ChangeCommitScope {
  /** Todos los modificados, cada uno con su procedencia. */
  files: CommitFileEntry[];
  /** Archivos atribuibles al cambio. Se deriva de `files`. */
  own: string[];
  /**
   * Modificados que no se le pueden atribuir con certeza. Se muestran para que
   * una omisión se vea, y se suman sólo por elección explícita.
   */
  foreign: string[];
  /**
   * Sugerencia inicial para el campo de commit, o `null` si no corresponde pisar
   * lo escrito. Es el valor a mostrar antes de que se elija nada: al preparar,
   * el mensaje se recompone sobre el conjunto que realmente se envía.
   */
  suggestedMessage: string | null;
}

const CHANGES_ROOT = 'openspec/changes/';
const SPECS_ROOT = 'openspec/specs/';

/**
 * Clasificación de un archivo modificado.
 *
 * Tres clases, no dos valores: antes `archive/` y el código compartían el
 * mismo `null`, y el loop los mandaba juntos a `own` cuando no había
 * ambigüedad. Los restos de un archivado pertenecen a su propia confirmación,
 * no al change activo, así que se distinguen del código que sí puede
 * atribuirse por descarte.
 */
type ArtifactOwner =
  | { kind: 'change'; id: string }
  | { kind: 'archived' }
  | { kind: 'code' };

/** A qué cambia pertenece un archivo modificado, si es que es de alguno. */
function artifactOwner(file: string): ArtifactOwner {
  if (file.startsWith(CHANGES_ROOT)) {
    const rest = file.slice(CHANGES_ROOT.length);
    if (rest.startsWith('archive/')) return { kind: 'archived' };
    const [id] = rest.split('/');
    return id ? { kind: 'change', id } : { kind: 'archived' };
  }
  // Las specs consolidadas también son producto del archivado: viven bajo
  // `openspec/specs/` y acompañan a `archive/…`. Se tratan como archivadas
  // para que no caigan en el alcance del change activo por defecto.
  if (file.startsWith(SPECS_ROOT)) return { kind: 'archived' };
  return { kind: 'code' };
}

/**
 * Alcance del mensaje, a partir del directorio común de los archivos.
 *
 * Se omite cuando no hay uno: un alcance inventado es peor que ninguno. Los
 * artefactos y la documentación no cuentan para calcularlo, porque están en casi
 * todos los commits y arrastrarían el alcance a `openspec` siempre.
 */
export function deriveScope(files: string[]): string | null {
  const meaningful = files.filter((file) => !file.startsWith('openspec/') && !file.startsWith('docs/'));
  if (meaningful.length === 0) return null;

  const segments = meaningful.map((file) => file.split('/').filter(Boolean));
  const [first] = segments;
  if (!first || first.length < 2) return null;

  // `components/pipeline/x.tsx` → "pipeline" cuando todos comparten ese nivel;
  // si no, `electron/...` → "electron" cuando comparten el primero.
  const sameSecond = first.length > 2 && segments.every((parts) => parts.length > 2 && parts[1] === first[1]);
  if (sameSecond) return first[1];

  return segments.every((parts) => parts[0] === first[0]) ? first[0] : null;
}

/**
 * Mensaje sugerido: `<tipo>(<alcance>): <identificador>`.
 *
 * El tipo es siempre `chore` porque el diff no distingue una corrección de una
 * función nueva, y afirmarlo sería inventar. La descripción es el identificador
 * del cambio, que ya describe el trabajo en kebab-case: el título que expone
 * OpenSpec es igual al identificador, así que no hay nada más informativo que
 * derivar sin entender qué se hizo.
 */
export function suggestCommitMessage(changeId: string, files: string[]): string {
  const scope = deriveScope(files);
  return scope ? `chore(${scope}): ${changeId}` : `chore: ${changeId}`;
}

/**
 * Alcance completo de la preparación.
 *
 * La atribución del código —lo que no es artefacto de ningún cambio— depende de
 * si hay ambigüedad: con un solo cambio tocando artefactos, todo lo modificado
 * es suyo y no hay nada que adivinar. Con varios, nada dice qué archivo de
 * código es de cuál, así que quedan fuera y se eligen a mano. Es exactamente la
 * pregunta que `commit.md` respondía declarándola, respondida ahora mirando el
 * estado.
 *
 * `currentMessage` decide si se sugiere: un mensaje que alguien empezó a
 * escribir no se pisa por apretar preparar, porque perderlo sería un daño
 * silencioso que sólo se nota después de confirmar.
 */
export function deriveChangeCommitScope(
  changeId: string,
  changedFiles: string[],
  currentMessage: string,
): ChangeCommitScope {
  const otherChangesTouched = new Set(
    changedFiles
      .map(artifactOwner)
      .filter((owner): owner is { kind: 'change'; id: string } =>
        owner.kind === 'change' && owner.id !== changeId,
      )
      .map((owner) => owner.id),
  );
  const codeIsAmbiguous = otherChangesTouched.size > 0;

  const files: CommitFileEntry[] = changedFiles.map((path) => {
    const owner = artifactOwner(path);
    // Los restos de un archivado —`archive/…` y `openspec/specs/…`— son
    // siempre ajenos al change activo: pertenecen al commit del archivado.
    if (owner.kind === 'archived') return { path, origin: { kind: 'archived' } };
    if (owner.kind === 'change') {
      return owner.id === changeId
        ? { path, origin: { kind: 'own' } }
        : { path, origin: { kind: 'other', changeId: owner.id } };
    }
    // Código no atribuible: es del cambio cuando no hay ambigüedad, porque
    // ningún otro lo reclama; con varios en curso no se adivina y queda para
    // elegir a mano.
    return { path, origin: codeIsAmbiguous ? { kind: 'unattributed' } : { kind: 'own' } };
  });

  // `own` y `foreign` salen de los grupos y no se calculan aparte: dos fuentes
  // para la misma pregunta terminarían contradiciéndose.
  const own = files.filter((entry) => entry.origin.kind === 'own').map((entry) => entry.path);
  const foreign = files.filter((entry) => entry.origin.kind !== 'own').map((entry) => entry.path);

  return {
    files,
    own,
    foreign,
    suggestedMessage: currentMessage.trim() ? null : suggestCommitMessage(changeId, own),
  };
}
