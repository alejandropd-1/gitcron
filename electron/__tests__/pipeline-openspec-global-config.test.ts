import { describe, expect, it } from 'vitest';
import { readOpenSpecGlobalConfig, __parsers } from '../pipeline/openspec-global-config';
import type { AuthorizedOpenSpecRuntime } from '../pipeline/openspec-engine';

const runtime: AuthorizedOpenSpecRuntime = {
  executablePath: 'C:\\nvm4w\\nodejs\\openspec.cmd',
  command: 'openspec.cmd',
  shell: true,
  displayPath: 'C:\\nvm4w\\nodejs\\openspec.cmd',
  provenance: 'global',
};

/**
 * Salida literal de `openspec config list` medida el 2026-09-10 en esta máquina
 * con OpenSpec 1.12.0: la lista escrita tiene 5 workflows (sin `update`) y el
 * perfil `core` resuelve 6 (con `update`). Es el caso exacto del defecto.
 */
const LIST_OUTPUT_WRITTEN_5_RESOLVED_6 = [
  'featureFlags: {}',
  'profile: core',
  'delivery: both',
  'telemetry:',
  '  noticeSeen: true',
  '  anonymousId: 5906519e-1435-4f32-bd20-6ed5befd0c43',
  'workflows:',
  '  - propose',
  '  - explore',
  '  - apply',
  '  - sync',
  '  - archive',
  'completionTipSeen: true',
  '',
  'Profile settings:',
  '  profile: core (explicit)',
  '  delivery: both (explicit)',
  '  workflows: propose, explore, apply, update, sync, archive (from core profile)',
].join('\n');

const LIST_OUTPUT_CUSTOM_EXPLICIT = [
  'featureFlags: {}',
  'profile: custom',
  'delivery: both',
  'workflows:',
  '  - propose',
  '  - explore',
  '  - apply',
  '  - sync',
  '  - archive',
  '',
  'Profile settings:',
  '  profile: custom (explicit)',
  '  delivery: both (explicit)',
  '  workflows: propose, explore, apply, sync, archive (explicit)',
].join('\n');

describe('__parsers (puros)', () => {
  it('parseProfile conserva el valor crudo (incluyendo futuros) y marca estado', () => {
    expect(__parsers.parseProfile('custom\n')).toEqual({ value: 'custom', state: 'read' });
    expect(__parsers.parseProfile('future-v2\n')).toEqual({ value: 'future-v2', state: 'read' });
    expect(__parsers.parseProfile('  ')).toEqual({ value: null, state: 'failed' });
    expect(__parsers.parseProfile(null)).toEqual({ value: null, state: 'failed' });
  });

  it('parseDelivery conserva el valor crudo (incluyendo futuros) y marca estado', () => {
    expect(__parsers.parseDelivery('both')).toEqual({ value: 'both', state: 'read' });
    expect(__parsers.parseDelivery('future-delivery-channel')).toEqual({ value: 'future-delivery-channel', state: 'read' });
    expect(__parsers.parseDelivery('')).toEqual({ value: null, state: 'failed' });
    expect(__parsers.parseDelivery(null)).toEqual({ value: null, state: 'failed' });
  });

  it('parseWorkflows acepta un JSON de array, preserva strings desconocidos y descarta no-strings', () => {
    expect(__parsers.parseWorkflows('["propose","explore","apply","sync","archive"]')).toEqual({
      value: ['propose', 'explore', 'apply', 'sync', 'archive'],
      state: 'read',
    });

    expect(__parsers.parseWorkflows('["propose", "custom-wf-1", 42, null, ""]')).toEqual({
      value: ['propose', 'custom-wf-1'],
      state: 'read',
    });

    expect(__parsers.parseWorkflows('[]')).toEqual({
      value: [],
      state: 'read',
    });
  });

  it('parseWorkflows marca failed y value null cuando no es JSON válido', () => {
    expect(__parsers.parseWorkflows('propose, explore')).toEqual({ value: null, state: 'failed' });
    expect(__parsers.parseWorkflows('')).toEqual({ value: null, state: 'failed' });
    expect(__parsers.parseWorkflows(null)).toEqual({ value: null, state: 'failed' });
  });

  it('parseResolvedWorkflows extrae la línea resuelta del bloque Profile settings y no la lista YAML superior', () => {
    expect(__parsers.parseResolvedWorkflows(LIST_OUTPUT_WRITTEN_5_RESOLVED_6)).toEqual({
      value: ['propose', 'explore', 'apply', 'update', 'sync', 'archive'],
      state: 'read',
    });

    expect(__parsers.parseResolvedWorkflows(LIST_OUTPUT_CUSTOM_EXPLICIT)).toEqual({
      value: ['propose', 'explore', 'apply', 'sync', 'archive'],
      state: 'read',
    });
  });

  it('parseResolvedWorkflows transporta sin filtro nombres que el código no conoce (sin enum cerrado)', () => {
    const output = [
      'Profile settings:',
      '  profile: custom (explicit)',
      '  delivery: both (explicit)',
      '  workflows: propose, custom-wf-x, future-archive-v2 (explicit)',
    ].join('\n');
    expect(__parsers.parseResolvedWorkflows(output)).toEqual({
      value: ['propose', 'custom-wf-x', 'future-archive-v2'],
      state: 'read',
    });
  });

  it('parseResolvedWorkflows resuelve (none) como lista vacía leída, no como fallo', () => {
    const output = [
      'Profile settings:',
      '  profile: custom (explicit)',
      '  delivery: both (explicit)',
      '  workflows: (none)',
    ].join('\n');
    expect(__parsers.parseResolvedWorkflows(output)).toEqual({ value: [], state: 'read' });
  });

  it('parseResolvedWorkflows detiene el bloque en la primera línea vacía o no indentada', () => {
    const output = [
      'Profile settings:',
      '  profile: core (explicit)',
      '  workflows: propose, explore (from core profile)',
      '',
      'otra seccion posterior:',
      'workflows: intruso, sin-espacio (explicit)',
    ].join('\n');
    expect(__parsers.parseResolvedWorkflows(output)).toEqual({
      value: ['propose', 'explore'],
      state: 'read',
    });
  });

  it('parseResolvedWorkflows marca failed y value null cuando falta el bloque o la línea', () => {
    expect(__parsers.parseResolvedWorkflows(null)).toEqual({ value: null, state: 'failed' });
    expect(__parsers.parseResolvedWorkflows('')).toEqual({ value: null, state: 'failed' });
    // Volcado YAML sin el bloque Profile settings (CLI que no lo tenga):
    // líneas 0..8 del fixture, terminando en la última entrada de la lista YAML.
    expect(__parsers.parseResolvedWorkflows(LIST_OUTPUT_CUSTOM_EXPLICIT.split('\n').slice(0, 9).join('\n'))).toEqual(
      { value: null, state: 'failed' },
    );
    // Bloque presente pero sin línea workflows.
    expect(
      __parsers.parseResolvedWorkflows('Profile settings:\n  profile: core (explicit)\n  delivery: both (explicit)'),
    ).toEqual({ value: null, state: 'failed' });
  });
});

describe('readOpenSpecGlobalConfig (minimizado, sin datos sensibles)', () => {
  it('confirma que el runtime inyectado es el recibido exactamente', async () => {
    let capturedRt: AuthorizedOpenSpecRuntime | null = null;
    await readOpenSpecGlobalConfig({
      runtime,
      runGet: async (_key, rt) => {
        capturedRt = rt;
        return 'core';
      },
      runList: async () => LIST_OUTPUT_WRITTEN_5_RESOLVED_6,
    });
    expect(capturedRt).toBe(runtime);
  });

  it('lee fixture real 1.5 diferenciado (custom con 5 workflows)', async () => {
    const result = await readOpenSpecGlobalConfig({
      runtime,
      runGet: async (key) => {
        switch (key) {
          case 'profile':
            return 'custom\n';
          case 'delivery':
            return 'both';
          case 'workflows':
            return '["propose","explore","apply","sync","archive"]';
        }
      },
      runList: async () => LIST_OUTPUT_CUSTOM_EXPLICIT,
    });
    expect(result.rawProfile).toBe('custom');
    expect(result.profileState).toBe('read');
    expect(result.delivery).toBe('both');
    expect(result.deliveryState).toBe('read');
    expect(result.configuredWorkflows).toEqual(['propose', 'explore', 'apply', 'sync', 'archive']);
    expect(result.workflowsState).toBe('read');
    expect(result.resolvedWorkflows).toEqual(['propose', 'explore', 'apply', 'sync', 'archive']);
    expect(result.resolvedWorkflowsState).toBe('read');
    expect(result.origin).toBe('cli');
  });

  it('lee fixture real 1.8 diferenciado (core con 6 workflows)', async () => {
    const result = await readOpenSpecGlobalConfig({
      runtime,
      runGet: async (key) => {
        switch (key) {
          case 'profile':
            return 'core';
          case 'delivery':
            return 'both';
          case 'workflows':
            return '["propose","explore","apply","update","sync","archive"]';
        }
      },
      runList: async () =>
        [
          'profile: core',
          'delivery: both',
          'workflows:',
          '  - propose',
          '  - explore',
          '  - apply',
          '  - update',
          '  - sync',
          '  - archive',
          '',
          'Profile settings:',
          '  profile: core (explicit)',
          '  delivery: both (explicit)',
          '  workflows: propose, explore, apply, update, sync, archive (from core profile)',
        ].join('\n'),
    });
    expect(result.rawProfile).toBe('core');
    expect(result.profileState).toBe('read');
    expect(result.configuredWorkflows).toHaveLength(6);
    expect(result.resolvedWorkflows).toHaveLength(6);
    expect(result.origin).toBe('cli');
  });

  it('conserva valores futuros de profile y delivery', async () => {
    const result = await readOpenSpecGlobalConfig({
      runtime,
      runGet: async (key) => {
        switch (key) {
          case 'profile':
            return 'enterprise-v3';
          case 'delivery':
            return 'cloud-sync';
          case 'workflows':
            return '["propose"]';
        }
      },
      runList: async () =>
        [
          'Profile settings:',
          '  profile: enterprise-v3 (explicit)',
          '  delivery: cloud-sync (explicit)',
          '  workflows: propose (explicit)',
        ].join('\n'),
    });
    expect(result.rawProfile).toBe('enterprise-v3');
    expect(result.delivery).toBe('cloud-sync');
    expect(result.resolvedWorkflows).toEqual(['propose']);
  });

  it('falla parcial preserva los campos leídos', async () => {
    const result = await readOpenSpecGlobalConfig({
      runtime,
      runGet: async (key) => {
        if (key === 'profile') return 'custom';
        if (key === 'delivery') throw new Error('key missing');
        if (key === 'workflows') return '["propose"]';
        return '';
      },
      runList: async () =>
        [
          'Profile settings:',
          '  profile: custom (explicit)',
          '  workflows: propose (explicit)',
        ].join('\n'),
    });
    expect(result.rawProfile).toBe('custom');
    expect(result.profileState).toBe('read');
    expect(result.delivery).toBeNull();
    expect(result.deliveryState).toBe('failed');
    expect(result.configuredWorkflows).toEqual(['propose']);
    expect(result.workflowsState).toBe('read');
    expect(result.resolvedWorkflowsState).toBe('read');
    expect(result.origin).toBe('cli');
  });

  it('falla total resulta en origin unknown y configuredWorkflows null', async () => {
    const result = await readOpenSpecGlobalConfig({
      runtime,
      runGet: async () => Promise.reject(new Error('CLI error')),
      runList: async () => Promise.reject(new Error('CLI error')),
    });
    expect(result.rawProfile).toBeNull();
    expect(result.profileState).toBe('failed');
    expect(result.delivery).toBeNull();
    expect(result.deliveryState).toBe('failed');
    expect(result.configuredWorkflows).toBeNull();
    expect(result.workflowsState).toBe('failed');
    expect(result.resolvedWorkflows).toBeNull();
    expect(result.resolvedWorkflowsState).toBe('failed');
    expect(result.origin).toBe('unknown');
  });

  it('runtime ausente (runtime: null) resulta en origin unknown y unread states', async () => {
    const result = await readOpenSpecGlobalConfig({ runtime: null });
    expect(result.origin).toBe('unknown');
    expect(result.rawProfile).toBeNull();
    expect(result.profileState).toBe('unread');
    expect(result.configuredWorkflows).toBeNull();
    expect(result.workflowsState).toBe('unread');
    expect(result.resolvedWorkflows).toBeNull();
    expect(result.resolvedWorkflowsState).toBe('unread');
  });

  it('nunca pide ni transporta telemetry o anonymousId', async () => {
    const seen: string[] = [];
    const result = await readOpenSpecGlobalConfig({
      runtime,
      runGet: async (key) => {
        seen.push(key);
        return 'custom';
      },
      // El fixture medido SÍ contiene la línea anonymousId del volcado; el struct
      // debe llegar sin ella aunque aparezca en la salida cruda.
      runList: async () => LIST_OUTPUT_WRITTEN_5_RESOLVED_6,
    });
    expect(seen).not.toContain('telemetry');
    expect(seen).not.toContain('anonymousId');
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('anonymousId');
    expect(serialized).not.toContain('telemetry');
  });

  it('devuelve la lista escrita y la resuelta por separado cuando difieren (caso medido 2026-09-10)', async () => {
    const result = await readOpenSpecGlobalConfig({
      runtime,
      runGet: async (key) => {
        switch (key) {
          case 'profile':
            return 'core\n';
          case 'delivery':
            return 'both';
          // Escrita en el archivo: 5 workflows, SIN update.
          case 'workflows':
            return '["propose","explore","apply","sync","archive"]';
        }
      },
      // Resuelta por el perfil core: 6 workflows, CON update.
      runList: async () => LIST_OUTPUT_WRITTEN_5_RESOLVED_6,
    });
    expect(result.configuredWorkflows).toEqual(['propose', 'explore', 'apply', 'sync', 'archive']);
    expect(result.workflowsState).toBe('read');
    expect(result.resolvedWorkflows).toEqual(['propose', 'explore', 'apply', 'update', 'sync', 'archive']);
    expect(result.resolvedWorkflowsState).toBe('read');
    // No las mezcla: cada lista conserva exactamente lo que su fuente informó.
    expect(result.configuredWorkflows).not.toContain('update');
    expect(result.resolvedWorkflows).toContain('update');
    expect(result.origin).toBe('cli');
  });

  it('transporta sin filtro un nombre de workflow que el código no conoce (sin enum cerrado)', async () => {
    const result = await readOpenSpecGlobalConfig({
      runtime,
      runGet: async (key) => {
        switch (key) {
          case 'profile':
            return 'custom';
          case 'delivery':
            return 'both';
          case 'workflows':
            return '["propose","custom-wf-x"]';
        }
      },
      runList: async () =>
        [
          'Profile settings:',
          '  profile: custom (explicit)',
          '  delivery: both (explicit)',
          '  workflows: propose, custom-wf-x, future-archive-v2 (explicit)',
        ].join('\n'),
    });
    expect(result.configuredWorkflows).toEqual(['propose', 'custom-wf-x']);
    expect(result.resolvedWorkflows).toEqual(['propose', 'custom-wf-x', 'future-archive-v2']);
  });

  it('falla de config list no tira las claves leídas por get', async () => {
    const result = await readOpenSpecGlobalConfig({
      runtime,
      runGet: async (key) => {
        if (key === 'profile') return 'core';
        if (key === 'delivery') return 'both';
        if (key === 'workflows') return '["propose","explore"]';
        return '';
      },
      runList: async () => Promise.reject(new Error('config list timed out')),
    });
    expect(result.configuredWorkflows).toEqual(['propose', 'explore']);
    expect(result.workflowsState).toBe('read');
    expect(result.resolvedWorkflows).toBeNull();
    expect(result.resolvedWorkflowsState).toBe('failed');
    expect(result.origin).toBe('cli');
  });
});
