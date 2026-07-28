'use client';

import type { PipelineSnapshot } from './pipeline-view-state';

/**
 * Selector de fixtures **sólo para desarrollo**.
 *
 * Existe para que Ale pueda recorrer los estados del workspace en la app real
 * —con su CSS y a su resolución— antes de que exista el lector de evidencia.
 *
 * Next.js reemplaza `process.env.NODE_ENV` en build, así que en un paquete de
 * producción esta rama es código muerto y el bundler la elimina junto con el
 * import dinámico de los fixtures.
 */
export const DEV_FIXTURES_ENABLED = process.env.NODE_ENV === 'development';

export type DevFixtureName = 'live' | 'running' | 'localUnpriced' | 'rejected';

export const DEV_FIXTURE_NAMES: DevFixtureName[] = [
  'live',
  'running',
  'localUnpriced',
  'rejected',
];

/** Carga diferida: los fixtures no entran al bundle de producción. */
export async function loadDevFixture(name: DevFixtureName): Promise<PipelineSnapshot | null> {
  if (!DEV_FIXTURES_ENABLED || name === 'live') return null;
  const { FIXTURES } = await import('./__fixtures__/pipeline-fixtures');
  return FIXTURES[name] ?? null;
}
