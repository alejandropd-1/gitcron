export type RemoteBranchTarget = {
  remote: string;
  branch: string;
};

/**
 * Converts Git's short upstream form (`origin/feature/name`) into the remote
 * and branch arguments expected by `git push <remote> --delete <branch>`.
 */
export function remoteBranchTarget(
  upstream: string | null | undefined,
  fallbackBranch: string,
): RemoteBranchTarget {
  if (!upstream) return { remote: 'origin', branch: fallbackBranch };

  const separator = upstream.indexOf('/');
  if (separator <= 0 || separator === upstream.length - 1) {
    return { remote: 'origin', branch: fallbackBranch };
  }

  return {
    remote: upstream.slice(0, separator),
    branch: upstream.slice(separator + 1),
  };
}

/**
 * ¿La rama remota que se iba a borrar es la rama por defecto del remoto? Se
 * compara el nombre corto (el `branch` de `remoteBranchTarget`, p. ej. `main`)
 * contra la rama por defecto resuelta del remoto. Si no hay rama por defecto
 * resuelta, no se puede afirmar: devuelve false (la protección visible por
 * `remoteBranchDiffers` queda como red de seguridad).
 */
export function isRemoteBranchDefault(
  remoteBranch: string,
  defaultBranch: string | null | undefined,
): boolean {
  return !!defaultBranch && remoteBranch === defaultBranch;
}

/**
 * ¿El nombre de la rama remota a borrar difiere del local? Cuando difiere, la
 * confirmación debe mostrar el nombre remoto exacto: borrar `main` no se puede
 * deducir del nombre local `claude/x`.
 */
export function remoteBranchDiffers(remoteBranch: string, localBranch: string): boolean {
  return remoteBranch !== localBranch;
}

/**
 * Parsea la salida de `git symbolic-ref --short refs/remotes/<remote>/HEAD` en el
 * nombre corto de la rama por defecto del remoto. `symbolic-ref --short` devuelve
 * `origin/main`; acá se le quita el prefijo `<remote>/` para dejar `main`,
 * comparable con el objetivo del borrado remoto. Devuelve `null` si no hay HEAD
 * del remoto resuelto localmente. Pura y testeable: la usan los handlers sin que
 * haga falta mockear todo el camino de credenciales.
 */
export function parseRemoteDefaultBranch(
  raw: string | null | undefined,
  remote: string,
): string | null {
  const short = (raw ?? '').trim();
  if (!short) return null;
  const prefix = `${remote}/`;
  return short.startsWith(prefix) ? short.slice(prefix.length) : short;
}
