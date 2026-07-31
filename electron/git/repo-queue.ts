import * as path from 'node:path';

/**
 * Cola de operaciones de Git por repositorio.
 *
 * Git protege su índice con `.git/index.lock`: lo crea al empezar a escribir y
 * lo borra al terminar. Dos procesos que toquen el índice a la vez hacen que el
 * segundo falle con `Unable to create index.lock: File exists`, y si uno se
 * corta a la mitad el archivo queda huérfano y bloquea todo lo que venga
 * después.
 *
 * La aplicación no serializaba nada: el watcher dispara relecturas de evidencia
 * —`status`, `branchLocal`, `log`— que caen encima de un commit o de un
 * archivado. `git status` también toca el índice, así que también compite.
 *
 * Esto no es una novedad del todo: `git:stage-batch` ya existía justamente para
 * evitar N `git add` en paralelo. Lo que faltaba era generalizar ese cuidado en
 * vez de resolverlo caso por caso.
 *
 * Serializar por repositorio y no globalmente es deliberado: dos repositorios
 * distintos tienen índices distintos y no tienen por qué esperarse.
 */

/** Cola pendiente por repositorio. El valor es la última promesa encolada. */
const queues = new Map<string, Promise<unknown>>();

/**
 * Clave del repositorio.
 *
 * Se normaliza porque `C:/repo`, `C:\repo` y `c:\repo` son el mismo índice: sin
 * esto quedarían en colas distintas y volverían a chocar.
 */
function repoKey(repoPath: string): string {
  const normalized = path.resolve(repoPath);
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

/**
 * Corre `operation` cuando el repositorio esté libre.
 *
 * Un fallo de una operación no rompe la cola: la siguiente arranca igual. Lo que
 * no puede pasar es que un error deje la cola trabada para siempre, porque eso
 * congelaría todas las operaciones de ese repositorio.
 */
export function withRepoLock<T>(repoPath: string, operation: () => Promise<T>): Promise<T> {
  const key = repoKey(repoPath);
  const previous = queues.get(key) ?? Promise.resolve();
  const next = previous.then(operation, operation);
  // Se encola la versión "silenciada": si se encolara `next` tal cual, el
  // rechazo de una operación se propagaría a la siguiente por la cadena.
  const settled = next.then(() => undefined, () => undefined);
  queues.set(key, settled);
  void settled.finally(() => {
    // Sólo se limpia si nadie encoló después: si no, se borraría la cola viva.
    if (queues.get(key) === settled) queues.delete(key);
  });
  return next;
}

/** Sólo para pruebas: deja el estado de colas como recién arrancado. */
export function resetRepoQueues(): void {
  queues.clear();
}
