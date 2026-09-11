import { describe, expect, it } from 'vitest';
import {
  readOpenSpecGlobalConfig,
  setOpenSpecWorkflow,
  setOpenSpecProfile,
  __parsers,
  type ReadOpenSpecGlobalConfigOptions,
} from '../pipeline/openspec-global-config';
import type { AuthorizedOpenSpecRuntime } from '../pipeline/openspec-engine';
import type { OpenSpecGlobalConfig } from '../../types/pipeline';

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

describe('setOpenSpecWorkflow (Tanda 7.2a: alternar UN workflow del perfil global)', () => {
  // Runtime falso dedicado a estos tests: el runner inyectado captura los args
  // y afirma la llamada EXACTA que llegaría al CLI.
  const setRuntime: AuthorizedOpenSpecRuntime = {
    executablePath: 'C:\\fake\\openspec.cmd',
    command: 'openspec.cmd',
    shell: true,
    displayPath: 'C:\\fake\\openspec.cmd',
    provenance: 'global',
  };

  function baseConfig(overrides: Partial<OpenSpecGlobalConfig> = {}): OpenSpecGlobalConfig {
    return {
      rawProfile: 'core',
      profileState: 'read',
      delivery: 'both',
      deliveryState: 'read',
      configuredWorkflows: ['propose', 'explore', 'apply', 'sync', 'archive'],
      workflowsState: 'read',
      resolvedWorkflows: null,
      resolvedWorkflowsState: 'failed',
      origin: 'cli',
      readAt: '2026-09-10T12:00:00.000Z',
      ...overrides,
    };
  }

  /** Lector con dos estados: la 1ª llamada devuelve `pre`, las siguientes `post`. */
  function makeRead(pre: OpenSpecGlobalConfig, post: OpenSpecGlobalConfig) {
    let calls = 0;
    const fn = async (_opts?: ReadOpenSpecGlobalConfigOptions): Promise<OpenSpecGlobalConfig> => {
      calls += 1;
      return calls === 1 ? pre : post;
    };
    return { fn, count: () => calls };
  }

  /** Runner falso que captura los args exactos de cada `config set`. */
  function makeCapturingRunSet() {
    const calls: Array<{ args: string[]; runtime: AuthorizedOpenSpecRuntime }> = [];
    const fn = async (args: string[], rt: AuthorizedOpenSpecRuntime): Promise<string> => {
      calls.push({ args, runtime: rt });
      return '';
    };
    return { fn, calls };
  }

  it('agregar: base sin el workflow, enabled:true → set EXACTO con JSON.stringify, lo agrega al final y re-lee', async () => {
    const pre = baseConfig(); // 5 workflows medidos, SIN 'update'
    const post = baseConfig({ configuredWorkflows: ['propose', 'explore', 'apply', 'sync', 'archive', 'update'] });
    const reader = makeRead(pre, post);
    const setter = makeCapturingRunSet();

    const result = await setOpenSpecWorkflow({
      workflow: 'update',
      enabled: true,
      runtime: setRuntime,
      runSet: setter.fn,
      read: reader.fn,
    });

    expect(setter.calls).toHaveLength(1);
    // La llamada EXACTA al CLI: valor SIEMPRE como JSON array, nunca string con comas.
    expect(setter.calls[0].args).toEqual([
      'config',
      'set',
      'workflows',
      JSON.stringify(['propose', 'explore', 'apply', 'sync', 'archive', 'update']),
    ]);
    expect(setter.calls[0].args[3]).toBe('["propose","explore","apply","sync","archive","update"]');
    // El runtime inyectado es el que se usa, exactamente.
    expect(setter.calls[0].runtime).toBe(setRuntime);

    expect(result.ok).toBe(true);
    expect(result.appliedWorkflows).toEqual(['propose', 'explore', 'apply', 'sync', 'archive', 'update']);
    // Devuelve el estado RE-LEÍDO, no el calculado en memoria.
    expect(result.config).toBe(post);
  });

  it('quitar: base con el workflow, enabled:false → set EXACTO con la lista sin él', async () => {
    const pre = baseConfig({ configuredWorkflows: ['propose', 'explore', 'apply', 'update', 'sync', 'archive'] });
    const post = baseConfig(); // 5 workflows, SIN 'update'
    const reader = makeRead(pre, post);
    const setter = makeCapturingRunSet();

    const result = await setOpenSpecWorkflow({
      workflow: 'update',
      enabled: false,
      runtime: setRuntime,
      runSet: setter.fn,
      read: reader.fn,
    });

    expect(setter.calls).toHaveLength(1);
    expect(setter.calls[0].args).toEqual([
      'config',
      'set',
      'workflows',
      JSON.stringify(['propose', 'explore', 'apply', 'sync', 'archive']),
    ]);
    expect(result.ok).toBe(true);
    expect(result.appliedWorkflows).toEqual(['propose', 'explore', 'apply', 'sync', 'archive']);
    expect(result.config).toBe(post);
  });

  it('no-op: ya en el estado pedido → OMITE la escritura (decisión documentada) pero re-lee para confirmar', async () => {
    const pre = baseConfig(); // ya contiene 'propose'
    const post = baseConfig({ readAt: '2026-09-10T12:00:01.000Z' });
    const reader = makeRead(pre, post);
    const setter = makeCapturingRunSet();

    const result = await setOpenSpecWorkflow({
      workflow: 'propose',
      enabled: true,
      runtime: setRuntime,
      runSet: setter.fn,
      read: reader.fn,
    });

    // Decisión documentada: sin cambio no se toca disco.
    expect(setter.calls).toHaveLength(0);
    // Pero SÍ re-lee para confirmar (lectura inicial + re-lectura).
    expect(reader.count()).toBe(2);
    expect(result.ok).toBe(true);
    expect(result.appliedWorkflows).toEqual(['propose', 'explore', 'apply', 'sync', 'archive']);
    expect(result.config).toBe(post);
  });

  it('fallo de lectura: configuredWorkflows null / state no-read → NO llama runSet, ok:false con motivo', async () => {
    const unread = baseConfig({ configuredWorkflows: null, workflowsState: 'failed' });
    const reader = makeRead(unread, unread);
    const setter = makeCapturingRunSet();

    const result = await setOpenSpecWorkflow({
      workflow: 'update',
      enabled: true,
      runtime: setRuntime,
      runSet: setter.fn,
      read: reader.fn,
    });

    expect(setter.calls).toHaveLength(0); // no adivina la lista
    expect(result.ok).toBe(false);
    expect(result.error).toBe('configured-workflows-unread');
    expect(result.appliedWorkflows).toBeNull();
    expect(result.config).toBe(unread);

    // Variante: lista presente pero state no-read también bloquea.
    const stale = baseConfig({ configuredWorkflows: ['propose'], workflowsState: 'unread' });
    const reader2 = makeRead(stale, stale);
    const setter2 = makeCapturingRunSet();
    const result2 = await setOpenSpecWorkflow({
      workflow: 'update',
      enabled: true,
      runtime: setRuntime,
      runSet: setter2.fn,
      read: reader2.fn,
    });
    expect(setter2.calls).toHaveLength(0);
    expect(result2.ok).toBe(false);
    expect(result2.error).toBe('configured-workflows-unread');
  });

  it('fallo del set (runner lanza) → ok:false con el error, sin tirar', async () => {
    const pre = baseConfig();
    const reader = makeRead(pre, pre);
    let runSetCalls = 0;
    const failingRunSet = async (_args: string[], _rt: AuthorizedOpenSpecRuntime): Promise<string> => {
      runSetCalls += 1;
      throw new Error('openspec config set exited with code 1');
    };

    const result = await setOpenSpecWorkflow({
      workflow: 'update',
      enabled: true,
      runtime: setRuntime,
      runSet: failingRunSet,
      read: reader.fn,
    });

    expect(runSetCalls).toBe(1);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('openspec config set exited with code 1');
    expect(result.appliedWorkflows).toBeNull();
    // Último estado conocido (el de la lectura previa a la escritura).
    expect(result.config).toBe(pre);
  });

  it('workflow vacío → ok:false sin leer ni escribir', async () => {
    const reader = makeRead(baseConfig(), baseConfig());
    const setter = makeCapturingRunSet();

    const result = await setOpenSpecWorkflow({
      workflow: '   ',
      enabled: true,
      runtime: setRuntime,
      runSet: setter.fn,
      read: reader.fn,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('workflow-required');
    expect(reader.count()).toBe(0);
    expect(setter.calls).toHaveLength(0);
  });
});

describe('setOpenSpecProfile (candado de perfil con dos estados)', () => {
  const setRuntime: AuthorizedOpenSpecRuntime = {
    executablePath: 'C:\\fake\\openspec.cmd',
    command: 'openspec.cmd',
    shell: true,
    displayPath: 'C:\\fake\\openspec.cmd',
    provenance: 'global',
  };

  function baseConfig(overrides: Partial<OpenSpecGlobalConfig> = {}): OpenSpecGlobalConfig {
    return {
      rawProfile: 'core',
      profileState: 'read',
      delivery: 'both',
      deliveryState: 'read',
      configuredWorkflows: ['propose', 'explore', 'apply', 'sync', 'archive'],
      workflowsState: 'read',
      resolvedWorkflows: ['propose', 'explore', 'apply', 'sync', 'archive'],
      resolvedWorkflowsState: 'read',
      origin: 'cli',
      readAt: '2026-09-10T12:00:00.000Z',
      ...overrides,
    };
  }

  function makeRead(pre: OpenSpecGlobalConfig, post: OpenSpecGlobalConfig) {
    let calls = 0;
    const fn = async (_opts?: ReadOpenSpecGlobalConfigOptions): Promise<OpenSpecGlobalConfig> => {
      calls += 1;
      return calls === 1 ? pre : post;
    };
    return { fn, count: () => calls };
  }

  function makeCapturingRunSet() {
    const calls: Array<{ args: string[]; runtime: AuthorizedOpenSpecRuntime }> = [];
    const fn = async (args: string[], rt: AuthorizedOpenSpecRuntime): Promise<string> => {
      calls.push({ args, runtime: rt });
      return '';
    };
    return { fn, calls };
  }

  it('custom con lista escrita [a,b] → runSet se llama UNA vez: [\'config\',\'set\',\'profile\',\'custom\']', async () => {
    const pre = baseConfig({
      rawProfile: 'core',
      configuredWorkflows: ['a', 'b'],
      resolvedWorkflows: ['a', 'b', 'c'],
    });
    const post = baseConfig({
      rawProfile: 'custom',
      configuredWorkflows: ['a', 'b'],
      resolvedWorkflows: ['a', 'b'],
    });
    const reader = makeRead(pre, post);
    const setter = makeCapturingRunSet();

    const result = await setOpenSpecProfile({
      profile: 'custom',
      runtime: setRuntime,
      runSet: setter.fn,
      read: reader.fn,
    });

    expect(setter.calls).toHaveLength(1);
    expect(setter.calls[0].args).toEqual(['config', 'set', 'profile', 'custom']);
    expect(result.ok).toBe(true);
    expect(result.config).toBe(post);
  });

  it('custom con lista escrita vacía y resueltos [a,b,c] → DOS llamados en orden: workflows \'["a","b","c"]\' y después profile custom', async () => {
    const pre = baseConfig({
      rawProfile: 'core',
      configuredWorkflows: [],
      resolvedWorkflows: ['a', 'b', 'c'],
      resolvedWorkflowsState: 'read',
    });
    const post = baseConfig({
      rawProfile: 'custom',
      configuredWorkflows: ['a', 'b', 'c'],
      resolvedWorkflows: ['a', 'b', 'c'],
      resolvedWorkflowsState: 'read',
    });
    const reader = makeRead(pre, post);
    const setter = makeCapturingRunSet();

    const result = await setOpenSpecProfile({
      profile: 'custom',
      runtime: setRuntime,
      runSet: setter.fn,
      read: reader.fn,
    });

    expect(setter.calls).toHaveLength(2);
    expect(setter.calls[0].args).toEqual(['config', 'set', 'workflows', '["a","b","c"]']);
    expect(setter.calls[1].args).toEqual(['config', 'set', 'profile', 'custom']);
    expect(result.ok).toBe(true);
    expect(result.config).toBe(post);
  });

  it('perfil ya custom → runSet NO se llama (0 llamados), ok: true', async () => {
    const pre = baseConfig({ rawProfile: 'custom' });
    const reader = makeRead(pre, pre);
    const setter = makeCapturingRunSet();

    const result = await setOpenSpecProfile({
      profile: 'custom',
      runtime: setRuntime,
      runSet: setter.fn,
      read: reader.fn,
    });

    expect(setter.calls).toHaveLength(0);
    expect(result.ok).toBe(true);
    expect(result.config).toBe(pre);
  });

  it('custom con resolvedWorkflows no leído y lista escrita vacía → runSet NO se llama, ok: false con motivo \'resolved-workflows-unread\'', async () => {
    const pre = baseConfig({
      rawProfile: 'core',
      configuredWorkflows: [],
      resolvedWorkflows: null,
      resolvedWorkflowsState: 'unread',
    });
    const reader = makeRead(pre, pre);
    const setter = makeCapturingRunSet();

    const result = await setOpenSpecProfile({
      profile: 'custom',
      runtime: setRuntime,
      runSet: setter.fn,
      read: reader.fn,
    });

    expect(setter.calls).toHaveLength(0);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('resolved-workflows-unread');
  });

  it('el primer set falla en custom con lista vacía → el segundo NO se ejecuta, ok: false con error', async () => {
    const pre = baseConfig({
      rawProfile: 'core',
      configuredWorkflows: [],
      resolvedWorkflows: ['a', 'b', 'c'],
      resolvedWorkflowsState: 'read',
    });
    const reader = makeRead(pre, pre);
    const calls: string[][] = [];
    const failingRunSet = async (args: string[], _rt: AuthorizedOpenSpecRuntime): Promise<string> => {
      calls.push(args);
      throw new Error('failed to set workflows');
    };

    const result = await setOpenSpecProfile({
      profile: 'custom',
      runtime: setRuntime,
      runSet: failingRunSet,
      read: reader.fn,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual(['config', 'set', 'workflows', '["a","b","c"]']);
    expect(result.ok).toBe(false);
    expect(result.error).toBe('failed to set workflows');
  });

  it('core desde custom → UNA vez: [\'config\',\'set\',\'profile\',\'core\']; workflows NO se toca', async () => {
    const pre = baseConfig({
      rawProfile: 'custom',
      configuredWorkflows: ['a', 'b'],
    });
    const post = baseConfig({
      rawProfile: 'core',
      configuredWorkflows: ['a', 'b'],
      resolvedWorkflows: ['a', 'b', 'c', 'd', 'e', 'f'],
    });
    const reader = makeRead(pre, post);
    const setter = makeCapturingRunSet();

    const result = await setOpenSpecProfile({
      profile: 'core',
      runtime: setRuntime,
      runSet: setter.fn,
      read: reader.fn,
    });

    expect(setter.calls).toHaveLength(1);
    expect(setter.calls[0].args).toEqual(['config', 'set', 'profile', 'core']);
    expect(result.ok).toBe(true);
    expect(result.config).toBe(post);
  });

  it('core cuando ya es core → cero llamados, ok: true', async () => {
    const pre = baseConfig({ rawProfile: 'core', configuredWorkflows: ['a', 'b'] });
    const reader = makeRead(pre, pre);
    const setter = makeCapturingRunSet();

    const result = await setOpenSpecProfile({
      profile: 'core',
      runtime: setRuntime,
      runSet: setter.fn,
      read: reader.fn,
    });

    expect(setter.calls).toHaveLength(0);
    expect(result.ok).toBe(true);
    expect(result.config).toBe(pre);
  });

  it('profile \'minimal\' → cero llamados, ok: false', async () => {
    const pre = baseConfig({ rawProfile: 'core' });
    const reader = makeRead(pre, pre);
    const setter = makeCapturingRunSet();

    const result = await setOpenSpecProfile({
      profile: 'minimal',
      runtime: setRuntime,
      runSet: setter.fn,
      read: reader.fn,
    });

    expect(setter.calls).toHaveLength(0);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('invalid-profile');
  });
});
