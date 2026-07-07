// electron/ipc/branch-merge.ts
// Parseo puro de `git branch --merged <base>` para decidir si una branch local
// ya está totalmente fusionada en la branch por defecto. Se usa para elegir
// -d vs -D y para el texto del diálogo de confirmación (avisar los commits que
// se pierden). Sin git ni red → testeable con fixtures.

/**
 * Convierte la salida de `git branch --merged <base>` en la lista de nombres de
 * branch. git prefija cada línea con dos espacios, `* ` (branch actual) o `+ `
 * (checked out en otro worktree). Las líneas de HEAD detachado
 * (`(HEAD detached at ...)`) se descartan.
 */
export function parseMergedBranches(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.replace(/^[*+\s]+/, '').trim())
    .filter((name) => name.length > 0 && !name.startsWith('('));
}

/**
 * ¿La branch aparece en la salida de `git branch --merged <base>`? Es decir,
 * ¿está totalmente fusionada en base y por lo tanto es seguro borrarla con -d?
 */
export function isBranchMerged(branch: string, mergedRaw: string): boolean {
  return parseMergedBranches(mergedRaw).includes(branch);
}
