import { describe, expect, it, beforeEach } from 'vitest';
import type { DatabaseSync } from 'node:sqlite';
import { openTemporalAgentDatabase } from '../connection';
import {
  getCartoExplanation,
  upsertCartoExplanation,
  getCartoPanorama,
  upsertCartoPanorama,
} from '../carto-cache';

const KEY = {
  repoPath: '/repo',
  nodePath: 'lib/cart.ts#calculateTotal',
  contentHash: 'hash-v1',
  lang: 'es',
};

function entry(overrides: Partial<Parameters<typeof upsertCartoExplanation>[0]> = {}) {
  return {
    ...KEY,
    provider: 'lmstudio:local-model',
    model: 'local-model',
    explanation: 'Suma el total del carrito.',
    generatedAt: '2026-06-20T10:00:00.000Z',
    ...overrides,
  };
}

describe('carto explanation cache', () => {
  let db: DatabaseSync;
  const opts = () => ({ db, now: () => '2026-06-20T10:00:00.000Z' });

  beforeEach(() => {
    // Migraciones (incluida v2) corren al abrir; :memory: aísla cada test.
    db = openTemporalAgentDatabase(':memory:');
  });

  it('devuelve null cuando no hay nada cacheado', () => {
    expect(getCartoExplanation(KEY, opts())).toBeNull();
  });

  it('guarda y recupera una explicación por su clave de contenido', () => {
    upsertCartoExplanation(entry(), opts());
    const hit = getCartoExplanation(KEY, opts());
    expect(hit).not.toBeNull();
    expect(hit?.explanation).toBe('Suma el total del carrito.');
    expect(hit?.provider).toBe('lmstudio:local-model');
    expect(hit?.generatedAt).toBe('2026-06-20T10:00:00.000Z');
  });

  it('no hace hit si cambia el hash del contenido (nodo modificado)', () => {
    upsertCartoExplanation(entry(), opts());
    expect(getCartoExplanation({ ...KEY, contentHash: 'hash-v2' }, opts())).toBeNull();
  });

  it('separa la caché por idioma', () => {
    upsertCartoExplanation(entry(), opts());
    expect(getCartoExplanation({ ...KEY, lang: 'en' }, opts())).toBeNull();
  });

  it('poda versiones viejas del mismo nodo+idioma al guardar contenido nuevo', () => {
    upsertCartoExplanation(entry(), opts());
    upsertCartoExplanation(
      entry({ contentHash: 'hash-v2', explanation: 'Versión nueva.' }),
      opts(),
    );
    // La versión vieja ya no está; sólo queda la del contenido vigente.
    expect(getCartoExplanation(KEY, opts())).toBeNull();
    const fresh = getCartoExplanation({ ...KEY, contentHash: 'hash-v2' }, opts());
    expect(fresh?.explanation).toBe('Versión nueva.');
  });

  it('sobrescribe (no duplica) cuando se regenera el mismo contenido', () => {
    upsertCartoExplanation(entry(), opts());
    upsertCartoExplanation(entry({ explanation: 'Regenerada.' }), opts());
    const hit = getCartoExplanation(KEY, opts());
    expect(hit?.explanation).toBe('Regenerada.');
    const count = (db.prepare('SELECT COUNT(*) AS n FROM carto_explanation').get() as { n: number }).n;
    expect(count).toBe(1);
  });
});

describe('carto panorama cache', () => {
  let db: DatabaseSync;
  const opts = () => ({ db, now: () => '2026-06-21T10:00:00.000Z' });
  const key = { repoPath: '/repo', structureHash: 'panorama-v1-a', lang: 'es' };

  beforeEach(() => {
    db = openTemporalAgentDatabase(':memory:');
  });

  it('guarda y recupera panorama por hash estructural', () => {
    upsertCartoPanorama(
      {
        ...key,
        provider: 'lmstudio:local-model',
        model: 'local-model',
        oneLine: 'GitCron es un cliente Git de escritorio.',
        paragraph: 'Organiza repositorios, ramas y acciones Git con ayuda visual.',
        flows: [{ title: 'Pull', steps: ['Revisa remoto', 'Actualiza ramas'] }],
        generatedAt: '2026-06-21T10:00:00.000Z',
      },
      opts(),
    );

    const hit = getCartoPanorama(key, opts());
    expect(hit?.oneLine).toBe('GitCron es un cliente Git de escritorio.');
    expect(hit?.flows[0].steps).toEqual(['Revisa remoto', 'Actualiza ramas']);
  });

  it('no hace hit si cambia la estructura y poda versiones viejas del repo', () => {
    upsertCartoPanorama(
      {
        ...key,
        provider: 'lmstudio:local-model',
        oneLine: 'Versión vieja.',
        paragraph: 'Vieja.',
        flows: [{ title: 'Viejo', steps: ['Uno'] }],
        generatedAt: '2026-06-21T10:00:00.000Z',
      },
      opts(),
    );
    upsertCartoPanorama(
      {
        ...key,
        structureHash: 'panorama-v1-b',
        provider: 'lmstudio:local-model',
        oneLine: 'Versión nueva.',
        paragraph: 'Nueva.',
        flows: [{ title: 'Nuevo', steps: ['Dos'] }],
        generatedAt: '2026-06-21T10:01:00.000Z',
      },
      opts(),
    );

    expect(getCartoPanorama(key, opts())).toBeNull();
    expect(getCartoPanorama({ ...key, structureHash: 'panorama-v1-b' }, opts())?.oneLine).toBe('Versión nueva.');
  });
});
