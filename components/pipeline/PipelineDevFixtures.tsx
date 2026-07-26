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

export type PipelineDevFixturePickerProps = {
  value: DevFixtureName;
  onChange: (name: DevFixtureName) => void;
};

/**
 * `live` decía "(sin conectar)" cuando no existía stream de runtime. Desde que
 * el hub lo conecta, ese paréntesis mentía cada vez que se leía. Los otros tres
 * llevan "fixture" en el nombre porque el rótulo de arriba se lee una vez y
 * después se olvida: el que importa es el que estás mirando en el desplegable.
 */
const LABELS: Record<DevFixtureName, string> = {
  live: 'Datos reales',
  running: 'Fixture · Auditoría en curso',
  localUnpriced: 'Fixture · Proveedor local sin precio',
  rejected: 'Fixture · Auditor rechazó + decisiones',
};

export function PipelineDevFixturePicker({ value, onChange }: PipelineDevFixturePickerProps) {
  if (!DEV_FIXTURES_ENABLED) return null;
  return (
    <div className="pipeline-devbar" data-dev-only="true">
      <label className="pipeline-devbar__label" htmlFor="pipeline-dev-fixture">
        Vista previa (sólo desarrollo)
      </label>
      <select
        id="pipeline-dev-fixture"
        className="pipeline-devbar__select"
        value={value}
        onChange={(event) => onChange(event.target.value as DevFixtureName)}
      >
        {DEV_FIXTURE_NAMES.map((name) => (
          <option key={name} value={name}>{LABELS[name]}</option>
        ))}
      </select>
    </div>
  );
}
