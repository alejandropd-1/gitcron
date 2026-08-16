import { describe, expect, it } from 'vitest';
import {
  classifyOpenSpecProfile,
  OPENSPEC_CORE_WORKFLOWS,
  OPENSPEC_EXPANDED_EXTRA_WORKFLOWS,
  OPENSPEC_EXPANDED_WORKFLOWS,
} from '../openspec-profile';

describe('classifyOpenSpecProfile (conjuntos oficiales 1.8)', () => {
  it('expone core con seis y ampliado con doce', () => {
    expect(OPENSPEC_CORE_WORKFLOWS).toHaveLength(6);
    expect(OPENSPEC_EXPANDED_EXTRA_WORKFLOWS).toHaveLength(6);
    expect(OPENSPEC_EXPANDED_WORKFLOWS).toHaveLength(12);
  });

  it('clasifica core cuando el conjunto es exactamente los seis núcleo', () => {
    const res = classifyOpenSpecProfile({ workflows: [...OPENSPEC_CORE_WORKFLOWS], source: 'global-config' });
    expect(res.profileClass).toBe('core');
    expect(res.source).toBe('global-config');
  });

  it('clasifica expanded cuando están exactamente los doce del conjunto ampliado', () => {
    const res = classifyOpenSpecProfile({ workflows: [...OPENSPEC_EXPANDED_WORKFLOWS], source: 'installed-integration' });
    expect(res.profileClass).toBe('expanded');
    expect(res.source).toBe('installed-integration');
  });

  it('clasifica custom para 5 workflows observados (sin update)', () => {
    const observed = ['propose', 'explore', 'apply', 'sync', 'archive'];
    const res = classifyOpenSpecProfile({ rawProfile: 'custom', workflows: observed, source: 'global-config' });
    expect(res.profileClass).toBe('custom');
    expect(res.rawProfile).toBe('custom');
    expect(res.source).toBe('global-config');
  });

  it('clasifica custom cuando hay 6+1 workflows (core + extra)', () => {
    const partial = [...OPENSPEC_CORE_WORKFLOWS, 'extra-workflow'];
    const res = classifyOpenSpecProfile({ workflows: partial, source: 'global-config' });
    expect(res.profileClass).toBe('custom');
  });

  it('clasifica custom cuando hay 12+1 workflows (expanded + extra)', () => {
    const superset = [...OPENSPEC_EXPANDED_WORKFLOWS, 'extra-workflow'];
    const res = classifyOpenSpecProfile({ workflows: superset, source: 'installed-integration' });
    expect(res.profileClass).toBe('custom');
  });

  it('maneja duplicados y entradas vacías deduplicando antes de clasificar', () => {
    const withDupes = ['', 'propose', 'propose', 'explore', 'apply', 'update', 'sync', 'archive'];
    const res = classifyOpenSpecProfile({ workflows: withDupes, source: 'global-config' });
    expect(res.profileClass).toBe('core');
  });

  it('fuente no legible (null, undefined, vacía) resulta en profileClass unknown y source unknown', () => {
    expect(classifyOpenSpecProfile({ workflows: null, source: 'global-config' })).toEqual({
      profileClass: 'unknown',
      source: 'unknown',
      rawProfile: null,
    });

    expect(classifyOpenSpecProfile({ workflows: undefined, source: 'installed-integration' })).toEqual({
      profileClass: 'unknown',
      source: 'unknown',
      rawProfile: null,
    });

    expect(classifyOpenSpecProfile({ workflows: [] })).toEqual({
      profileClass: 'unknown',
      source: 'unknown',
      rawProfile: null,
    });
  });

  it('conserva rawProfile separado sin alterar la clasificación derivada por workflows', () => {
    const res1 = classifyOpenSpecProfile({ rawProfile: 'core', workflows: ['propose', 'explore'], source: 'global-config' });
    expect(res1.profileClass).toBe('custom');
    expect(res1.rawProfile).toBe('core');

    const res2 = classifyOpenSpecProfile({ rawProfile: 'custom', workflows: [...OPENSPEC_CORE_WORKFLOWS], source: 'global-config' });
    expect(res2.profileClass).toBe('core');
    expect(res2.rawProfile).toBe('custom');
  });
});
