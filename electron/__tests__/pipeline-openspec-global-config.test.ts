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
    });
    expect(result.rawProfile).toBe('custom');
    expect(result.profileState).toBe('read');
    expect(result.delivery).toBe('both');
    expect(result.deliveryState).toBe('read');
    expect(result.configuredWorkflows).toEqual(['propose', 'explore', 'apply', 'sync', 'archive']);
    expect(result.workflowsState).toBe('read');
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
    });
    expect(result.rawProfile).toBe('core');
    expect(result.profileState).toBe('read');
    expect(result.configuredWorkflows).toHaveLength(6);
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
    });
    expect(result.rawProfile).toBe('enterprise-v3');
    expect(result.delivery).toBe('cloud-sync');
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
    });
    expect(result.rawProfile).toBe('custom');
    expect(result.profileState).toBe('read');
    expect(result.delivery).toBeNull();
    expect(result.deliveryState).toBe('failed');
    expect(result.configuredWorkflows).toEqual(['propose']);
    expect(result.workflowsState).toBe('read');
    expect(result.origin).toBe('cli');
  });

  it('falla total resulta en origin unknown y configuredWorkflows null', async () => {
    const result = await readOpenSpecGlobalConfig({
      runtime,
      runGet: async () => Promise.reject(new Error('CLI error')),
    });
    expect(result.rawProfile).toBeNull();
    expect(result.profileState).toBe('failed');
    expect(result.delivery).toBeNull();
    expect(result.deliveryState).toBe('failed');
    expect(result.configuredWorkflows).toBeNull();
    expect(result.workflowsState).toBe('failed');
    expect(result.origin).toBe('unknown');
  });

  it('runtime ausente (runtime: null) resulta en origin unknown y unread states', async () => {
    const result = await readOpenSpecGlobalConfig({ runtime: null });
    expect(result.origin).toBe('unknown');
    expect(result.rawProfile).toBeNull();
    expect(result.profileState).toBe('unread');
    expect(result.configuredWorkflows).toBeNull();
    expect(result.workflowsState).toBe('unread');
  });

  it('nunca pide ni transporta telemetry o anonymousId', async () => {
    const seen: string[] = [];
    const result = await readOpenSpecGlobalConfig({
      runtime,
      runGet: async (key) => {
        seen.push(key);
        return 'custom';
      },
    });
    expect(seen).not.toContain('telemetry');
    expect(seen).not.toContain('anonymousId');
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('anonymousId');
    expect(serialized).not.toContain('telemetry');
  });
});
