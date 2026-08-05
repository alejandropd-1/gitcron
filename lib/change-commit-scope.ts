/**
 * Qué preparar y qué mensaje sugerir para el commit del repositorio.
 *
 * Todo se deriva del estado real —lo que Git reporta como modificado y dónde
 * vive cada archivo—, sin que ningún artefacto declare nada. La versión que
 * exigía un `commit.md` escrito de antemano no funcionaba si nadie lo escribía,
 * y mentía sin avisar si quedaba desactualizado.
 *
 * La versión anterior a ésta derivaba el alcance a partir de un cambio de
 * referencia y repartía lo modificado entre propio y ajeno. Eso ataba el
 * alcance de un commit a qué cambio estuviera seleccionado en una lista
 * lateral, cuando el commit describe el estado del árbol: con el cambio ya
 * archivado, o sin ningún cambio activo, sus propios restos no tenían dónde
 * prepararse. Acá no hay categoría privilegiada: cada archivo declara de dónde
 * viene y nada entra sin elegirse.
 *
 * Puro y sin dependencias: se prueba entero con tablas de entrada y salida.
 */

/**
 * De dónde viene un archivo modificado.
 *
 * `change` lleva el identificador del cambio al que pertenece: esa atribución
 * existe —un artefacto vive bajo la carpeta de su cambio— y descartarla obligaba
 * a recordar qué se tocó en cada trabajo para poder elegir.
 */
export type CommitFileOrigin =
  | { kind: 'change'; changeId: string }
  | { kind: 'archived' }
  | { kind: 'unattributed' };

export interface CommitFileEntry {
  path: string;
  origin: CommitFileOrigin;
}

/**
 * Un grupo de archivos con la misma procedencia.
 *
 * `key` es estable y sirve tanto para el render como para el control que suma
 * o quita el grupo entero: derivarla del origen evita tener que reconstruirla
 * en el componente y que las dos versiones se separen.
 */
export interface CommitFileGroup {
  key: string;
  origin: CommitFileOrigin;
  entries: CommitFileEntry[];
}

export interface RepoCommitScope {
  /** Todos los modificados, cada uno con su procedencia, en el orden recibido. */
  files: CommitFileEntry[];
  /**
   * Los mismos archivos agrupados por procedencia. Se deriva de `files`: dos
   * fuentes para la misma pregunta terminarían contradiciéndose.
   */
  groups: CommitFileGroup[];
}

const CHANGES_ROOT = 'openspec/changes/';
const SPECS_ROOT = 'openspec/specs/';

/** Las carpetas de archivado se llaman `YYYY-MM-DD-<id>`. */
const ARCHIVE_FOLDER = /^\d{4}-\d{2}-\d{2}-(.+)$/;

/**
 * Identificador del cambio dentro de una ruta de archivado, si la carpeta lo
 * declara.
 *
 * Se saca quitando el prefijo de fecha, no partiendo por el último guion ni
 * buscándolo entre los cambios activos: lo primero rompe con cualquier
 * identificador que contenga guiones —que es la norma— y lo segundo no funciona
 * justamente para un cambio archivado, que ya no está entre los activos. Una
 * carpeta sin el prefijo no aporta identificador, que es más seguro que adivinar.
 */
export function archivedChangeId(file: string): string | null {
  if (!file.startsWith(`${CHANGES_ROOT}archive/`)) return null;
  const [folder] = file.slice(`${CHANGES_ROOT}archive/`.length).split('/');
  return ARCHIVE_FOLDER.exec(folder ?? '')?.[1] ?? null;
}

/**
 * Procedencia de un archivo modificado, deducida de su ubicación y del conjunto
 * al que pertenece.
 *
 * Los restos de un archivado se distinguen de los artefactos de un cambio
 * activo porque pertenecen a la confirmación del archivado, no al trabajo en
 * curso. Las specs consolidadas viven bajo `openspec/specs/` y acompañan a
 * `archive/…`, así que cuentan como lo mismo.
 *
 * `archivedIds` es lo que la ruta sola no puede decir: cuando un cambio se
 * archivó, lo que queda bajo su ruta anterior es la mitad borrada del mismo
 * movimiento que creó `archive/…`, y va con la otra mitad. Ofrecerlas por
 * separado hacía que prepararlas grupo por grupo repartiera el movimiento en
 * dos commits, y la detección de renombres de Git —que opera sobre el diff de un
 * commit— quedaba deshabilitada. Sin ninguna carpeta de archivado que lo
 * reclame, un archivo bajo la ruta de un cambio sigue siendo de ese cambio.
 */
export function fileOrigin(file: string, archivedIds: ReadonlySet<string> = new Set()): CommitFileOrigin {
  if (file.startsWith(CHANGES_ROOT)) {
    const rest = file.slice(CHANGES_ROOT.length);
    if (rest.startsWith('archive/')) return { kind: 'archived' };
    const [id] = rest.split('/');
    if (!id) return { kind: 'archived' };
    return archivedIds.has(id) ? { kind: 'archived' } : { kind: 'change', changeId: id };
  }
  if (file.startsWith(SPECS_ROOT)) return { kind: 'archived' };
  return { kind: 'unattributed' };
}

/**
 * Qué clase de archivo es, deducida de su ubicación y su nombre.
 *
 * No es atribución: no dice de qué trabajo vino —ese dato no existe en el
 * repositorio— sino qué clase de archivo es, que es lo que sí se puede afirmar.
 * Se muestra donde no hay otra información, que es el grupo que ningún cambio
 * reclama.
 *
 * Se deriva de la ruta y no del contenido: leer archivos es del proceso
 * principal, y una convención de carpetas que el repositorio respeta da lo mismo
 * sin esa vuelta. Lo que no encaja cae en `code`, que es el caso más común y el
 * más inocuo si se equivoca; una categoría "desconocido" no ayudaría a decidir
 * nada.
 */
export type CommitFileKind = 'artifact' | 'test' | 'docs' | 'config' | 'code';

const CONFIG_NAMES = /^(package\.json|pnpm-lock\.yaml|tsconfig[^/]*\.json|[^/]*\.config\.[cm]?[jt]s|\.[^/]+rc([^/]*)?)$/;

export function fileKind(file: string): CommitFileKind {
  if (file.startsWith('openspec/')) return 'artifact';
  if (file.includes('__tests__/') || /\.(test|spec)\.[cm]?[jt]sx?$/.test(file)) return 'test';
  if (file.startsWith('docs/') || file.endsWith('.md')) return 'docs';
  const name = file.slice(file.lastIndexOf('/') + 1);
  if (CONFIG_NAMES.test(name) || /\.(ya?ml|toml|ini)$/.test(name)) return 'config';
  return 'code';
}

/** Clave estable de un grupo. Los cambios se distinguen entre sí por su id. */
function groupKey(origin: CommitFileOrigin): string {
  return origin.kind === 'change' ? `change:${origin.changeId}` : origin.kind;
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
 * El único cambio al que pertenece un conjunto, si es que hay uno solo.
 *
 * Los archivos sin atribuir no contradicen: no tienen dueño con el cual entrar
 * en conflicto, y el caso corriente —trabajar en un cambio tocando sus
 * artefactos y algo de código— tiene que seguir nombrando ese cambio.
 *
 * Un cambio archivado sí aporta identificador. Antes no lo hacía, para que un
 * trabajo ya cerrado no nombrara un commit de trabajo en curso; el problema es
 * que cuando la selección **es** el archivado, negarlo dejaba sin descripción
 * justo el commit que mejor se puede describir. El riesgo original lo sigue
 * cubriendo esta misma regla: restos de un archivado más artefactos de un cambio
 * activo son dos identificadores, y la descripción queda vacía igual.
 */
export function soleChangeId(files: string[]): string | null {
  const ids = new Set<string>();
  for (const file of files) {
    const archived = archivedChangeId(file);
    if (archived) { ids.add(archived); continue; }
    const origin = fileOrigin(file);
    if (origin.kind === 'change') ids.add(origin.changeId);
  }
  return ids.size === 1 ? [...ids][0] : null;
}

/**
 * Mensaje sugerido para el conjunto que se va a preparar.
 *
 * El tipo es siempre `chore` porque el diff no distingue una corrección de una
 * función nueva, y afirmarlo sería inventar.
 *
 * La descripción es el identificador del cambio cuando el conjunto pertenece a
 * uno solo: ya describe el trabajo en kebab-case y no hay nada más informativo
 * que derivar sin entender qué se hizo. Cuando abarca varios cambios, o
 * ninguno, se devuelve el prefijo con el alcance y la descripción vacía, para
 * que la escriba una persona. Es deliberado que deje de nombrar un cambio: es
 * la señal visible de que el commit está mezclando trabajos, y llega antes de
 * confirmar. Concatenar los identificadores se descartó porque produce mensajes
 * ilegibles en cuanto son tres.
 */
export function suggestCommitMessage(files: string[]): string {
  const scope = deriveScope(files);
  const prefix = scope ? `chore(${scope}):` : 'chore:';
  const changeId = soleChangeId(files);
  return changeId ? `${prefix} ${changeId}` : `${prefix} `;
}

/**
 * Alcance completo de la preparación, a nivel del repositorio.
 *
 * No recibe ningún cambio de referencia y no privilegia ningún grupo: sin un
 * cambio desde el cual mirar no hay criterio para que uno entre por defecto, y
 * preseleccionar el que estuviera enfocado en una lista lateral produciría un
 * commit distinto según dónde estuviera el foco. La elección es explícita para
 * todos.
 *
 * Los archivos ya preparados no se filtran acá: quien llama decide qué es
 * "modificado sin preparar", porque esa condición sale del estado de Git y no
 * de la ubicación del archivo.
 */
export function deriveRepoCommitScope(changedFiles: string[]): RepoCommitScope {
  // Qué cambios fueron archivados se resuelve contra el conjunto, antes de
  // clasificar: la ruta sola no distingue la mitad borrada de un movimiento de
  // un artefacto de un cambio en curso.
  const archivedIds = new Set(
    changedFiles.map(archivedChangeId).filter((id): id is string => id !== null),
  );
  const files: CommitFileEntry[] = changedFiles.map((path) => ({ path, origin: fileOrigin(path, archivedIds) }));

  // Los grupos de cambio salen en el orden en que aparecen sus archivos, y los
  // dos grupos fijos van al final: es determinista a partir de la entrada y
  // deja lo atribuible arriba, que es lo que se elige más seguido.
  const byKey = new Map<string, CommitFileGroup>();
  for (const entry of files) {
    const key = groupKey(entry.origin);
    const existing = byKey.get(key);
    if (existing) existing.entries.push(entry);
    else byKey.set(key, { key, origin: entry.origin, entries: [entry] });
  }

  const rank = (group: CommitFileGroup): number => (
    group.origin.kind === 'change' ? 0 : group.origin.kind === 'archived' ? 1 : 2
  );
  const groups = [...byKey.values()].sort((a, b) => rank(a) - rank(b));

  return { files, groups };
}
