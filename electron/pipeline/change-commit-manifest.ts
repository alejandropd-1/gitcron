/**
 * Qué archivos modificados pertenecen a un change.
 *
 * Derivación pura a partir del id: no depende de ninguna convención escrita ni
 * de que alguien haya declarado nada. Sirve para acotar el alcance de una
 * confirmación en Git sin tener que adivinarlo.
 *
 * Este módulo tenía además la tarea de firma y el parseo de `commit.md`. Ambas
 * eran convenciones propias de este repositorio que OpenSpec no define y que
 * ningún ejecutor podía descubrir consultando el CLI; existían para sostener un
 * archivado que además commiteaba. Retirado ese acoplamiento, quedan sólo las
 * dos derivaciones, que sí son universales.
 */

/** Rutas del propio change: sus artefactos, cualquiera sea su nombre. */
export function deterministicChangePaths(changeId: string, changedFiles: string[]): string[] {
  const changeRoot = `openspec/changes/${changeId}/`;
  return changedFiles.filter((file) => file.startsWith(changeRoot));
}

/** Rutas que produce el archivado: el destino, el origen borrado y las specs consolidadas. */
export function archiveCommitPaths(changeId: string, changedFiles: string[]): string[] {
  return changedFiles.filter((file) => (
    file.startsWith('openspec/changes/archive/')
    || file.startsWith(`openspec/changes/${changeId}/`)
    || file.startsWith('openspec/specs/')
  ));
}
