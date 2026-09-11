import { describe, expect, it } from 'vitest';
import {
  classifyOpenSpecProfile,
  deriveProfileWorkflowRows,
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

describe('deriveProfileWorkflowRows (panel de perfil 7.2b)', () => {
  it('deriva filas desde configured+resolved preservando el orden de configured', () => {
    const rows = deriveProfileWorkflowRows(['propose', 'explore', 'apply'], ['apply', 'archive']);
    expect(rows).toEqual([
      { workflow: 'propose', enabled: false, configured: true },
      { workflow: 'explore', enabled: false, configured: true },
      { workflow: 'apply', enabled: true, configured: true },
      { workflow: 'archive', enabled: true, configured: false },
    ]);
  });

  it('anexa al final los workflows que están en resolved pero no en configured', () => {
    const rows = deriveProfileWorkflowRows(['sync'], ['propose', 'sync']);
    expect(rows.map((row) => row.workflow)).toEqual(['sync', 'propose']);
    expect(rows[1]).toEqual({ workflow: 'propose', enabled: true, configured: false });
  });

  it('un nombre desconocido por el código aparece igual como fila válida sin romper [7.3]', () => {
    const rows = deriveProfileWorkflowRows(['mi-flujo-propio'], ['mi-flujo-propio', 'otro-desconocido']);
    expect(rows).toEqual([
      { workflow: 'mi-flujo-propio', enabled: true, configured: true },
      { workflow: 'otro-desconocido', enabled: true, configured: false },
    ]);
  });

  it('ambas listas null (o vacías) devuelven array vacío', () => {
    expect(deriveProfileWorkflowRows(null, null)).toEqual([]);
    expect(deriveProfileWorkflowRows([], [])).toEqual([]);
    expect(deriveProfileWorkflowRows(null, [])).toEqual([]);
  });

  it('resolved null marca enabled=false aunque configured tenga workflows', () => {
    const rows = deriveProfileWorkflowRows(['propose', 'explore'], null);
    expect(rows).toEqual([
      { workflow: 'propose', enabled: false, configured: true },
      { workflow: 'explore', enabled: false, configured: true },
    ]);
  });

  it('configured null toma el universo completo desde resolved con configured=false', () => {
    const rows = deriveProfileWorkflowRows(null, ['archive', 'verify']);
    expect(rows).toEqual([
      { workflow: 'archive', enabled: true, configured: false },
      { workflow: 'verify', enabled: true, configured: false },
    ]);
  });

  it('deduplica nombres repetidos dentro de cada lista', () => {
    const rows = deriveProfileWorkflowRows(['propose', 'propose'], ['propose']);
    expect(rows).toEqual([{ workflow: 'propose', enabled: true, configured: true }]);
  });
});
