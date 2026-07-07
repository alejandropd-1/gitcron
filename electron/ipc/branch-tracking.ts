// electron/ipc/branch-tracking.ts
// Parseo puro del estado local/remoto de cada branch local.
// Fuente: `git for-each-ref --format=%(refname:short)|%(upstream:short)|%(upstream:track) refs/heads`
// que se calcula SOLO contra refs locales (no toca la red).
// Se mantiene sin dependencias de electron/simple-git para poder testearlo con fixtures.

import type { BranchTrackingInfo } from '../../types/electron';

/**
 * Convierte la salida cruda de `git for-each-ref` (una línea por branch local, con el
 * formato `name|upstream|track`) en un mapa por branch con su estado de tracking.
 *
 * El campo `track` de git se ve como `[ahead 1, behind 3]`, `[ahead 2]`, `[behind 5]`,
 * `[gone]` o vacío. A partir de eso derivamos:
 *  - solo-local     → sin upstream, o upstream `gone`  → `hasRemote: false`
 *  - sincronizada   → upstream vivo, ahead 0 y behind 0 → `hasRemote: true`
 *  - divergida      → upstream vivo con ahead y/o behind > 0
 *
 * Puro: no ejecuta git ni red, por eso es unit-testable con fixtures.
 */
export function parseBranchTracking(raw: string): Record<string, BranchTrackingInfo> {
  const tracking: Record<string, BranchTrackingInfo> = {};

  for (const line of raw.split('\n').filter((l) => l.trim())) {
    const [name, upstream, track] = line.split('|');
    if (!name) continue;

    let ahead = 0;
    let behind = 0;
    const aheadMatch = track?.match(/ahead (\d+)/);
    const behindMatch = track?.match(/behind (\d+)/);
    if (aheadMatch) ahead = parseInt(aheadMatch[1], 10);
    if (behindMatch) behind = parseInt(behindMatch[1], 10);

    const gone = !!track?.includes('gone');
    const hasUpstream = !!(upstream && upstream.trim());

    tracking[name] = {
      upstream: hasUpstream ? upstream : null,
      ahead,
      behind,
      gone,
      hasRemote: hasUpstream && !gone,
    };
  }

  return tracking;
}
