import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import {
  analyzeOpenSpecVersion,
  buildStrategyProposal,
  evaluateConsumedSurfaces,
  fetchOpenSpecChangelog,
  type ConsumedSurfaceName,
} from '../pipeline/openspec-version-analysis';
import {
  OPENSPEC_CYCLE_TARGET_VERSION,
  SUPPORTED_OPENSPEC_VERSIONS,
} from '../../lib/openspec-version';
import { authorizedRepoStore } from '../ipc/authorized-repos';

describe('Verificación de versión de OpenSpec con criterio (Grupo 9c)', () => {
  const ORIGINAL_FETCH = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    authorizedRepoStore.clear();
  });

  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  describe('9c.1: Consulta de cambios con fuentes citadas', () => {
    it('obtiene notas con fuente citada cuando GitHub Releases responde', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          body: '## Qué cambió en 1.12.0\n- Nuevas flags en el CLI\n- Mejoras en profile',
          html_url: 'https://github.com/fission-ai/openspec/releases/tag/v1.12.0',
        }),
      });

      const res = await fetchOpenSpecChangelog('1.12.0', { fetchFn: mockFetch as unknown as typeof fetch });

      expect(res.fetched).toBe(true);
      expect(res.source).toBe('GitHub Releases (fission-ai/openspec)');
      expect(res.sourceUrl).toBe('https://github.com/fission-ai/openspec/releases/tag/v1.12.0');
      expect(res.rawText).toContain('Qué cambió en 1.12.0');
      expect(res.error).toBeNull();
    });

    it('declara honestamente "unavailable" ante 404 sin inventar lista', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const res = await fetchOpenSpecChangelog('1.12.0', { fetchFn: mockFetch as unknown as typeof fetch });

      expect(res.fetched).toBe(false);
      expect(res.source).toBe('unavailable');
      expect(res.rawText).toBeNull();
      expect(res.error).toContain('HTTP 404');
    });

    it('declara honestamente "unavailable" ante caída de red sin inventar lista', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const res = await fetchOpenSpecChangelog('1.12.0', { fetchFn: mockFetch as unknown as typeof fetch });

      expect(res.fetched).toBe(false);
      expect(res.source).toBe('unavailable');
      expect(res.rawText).toBeNull();
      expect(res.error).toContain('ECONNREFUSED');
    });
  });

  describe('9c.2: Juicio determinístico sobre las 6 superficies que GitCron consume', () => {
    const EXPECTED_SURFACES: ConsumedSurfaceName[] = [
      'status',
      'instructions',
      'validate',
      'archive',
      'sync',
      'profiles',
    ];

    it('evalúa exactamente las 6 superficies consumidas', () => {
      const { surfaces } = evaluateConsumedSurfaces('1.11.0', '1.11.0', null);
      const names = surfaces.map((s) => s.surface);
      expect(names).toEqual(EXPECTED_SURFACES);
      surfaces.forEach((s) => {
        expect(s.verdict).toBe('compatible');
        expect(s.evidence).toBeTruthy();
      });
    });

    it('identifica riesgo potencial ante versión superior al rango soportado (1.12.0)', () => {
      const { surfaces, breakingChangesDetected } = evaluateConsumedSurfaces('1.11.0', '1.12.0', null);
      expect(breakingChangesDetected).toBe(true);

      const statusSurface = surfaces.find((s) => s.surface === 'status');
      expect(statusSurface?.verdict).toBe('potential-break');
      expect(statusSurface?.evidence).toContain('isPlanningComplete');

      const instructionsSurface = surfaces.find((s) => s.surface === 'instructions');
      expect(instructionsSurface?.verdict).toBe('potential-break');
      expect(instructionsSurface?.evidence).toContain('resolvedOutputPath');

      const validateSurface = surfaces.find((s) => s.surface === 'validate');
      expect(validateSurface?.verdict).toBe('potential-break');
      expect(validateSurface?.evidence).toContain('--strict --json');
    });

    it('identifica rotura ante salto de versión mayor (2.0.0)', () => {
      const { surfaces, breakingChangesDetected } = evaluateConsumedSurfaces('1.11.0', '2.0.0', null);
      expect(breakingChangesDetected).toBe(true);
      surfaces.forEach((s) => {
        expect(s.verdict).toBe('breaking');
        expect(s.evidence).toContain('Salto mayor');
      });
    });
  });

  describe('9c.3: Propuesta de estrategia para decisión de Alejandro', () => {
    it('no genera propuesta de estrategia si la versión es totalmente compatible', () => {
      const proposal = buildStrategyProposal('1.10.0', '1.11.0', false);
      expect(proposal).toBeNull();
    });

    it('genera propuesta estructurada ante versión 1.12.0 (outside range)', () => {
      const proposal = buildStrategyProposal('1.11.0', '1.12.0', true);
      expect(proposal).not.toBeNull();
      expect(proposal?.summary).toContain('1.12.0');
      expect(proposal?.whatToModify.length).toBeGreaterThan(0);
      expect(proposal?.orderOfOperations.length).toBeGreaterThan(0);
      expect(proposal?.whatWorksUntouched.length).toBeGreaterThan(0);
      expect(proposal?.recommendation).toContain('decisión de Alejandro');
    });
  });

  describe('9c.4 & 9c.5: Redacción en criollo y separación estricta de redacción vs hechos medidos', () => {
    it('redacta con modelo local cuando está disponible', async () => {
      const mockComplete = vi.fn().mockResolvedValue({
        text: 'Ale, mirá: salió la versión 1.12.0. Todavía no la subas porque GitCron consume el JSON de status e instructions...',
        finishReason: 'stop',
      });

      const res = await analyzeOpenSpecVersion(process.cwd(), {
        getInstalledVersion: async () => '1.11.0',
        checkLatest: async () => ({
          status: 'online',
          latestVersion: '1.12.0',
          checkedAt: new Date().toISOString(),
          fromCache: false,
          cacheAgeSeconds: 0,
          freshness: 'fresh',
          error: null,
        }),
        fetchChangelog: async () => ({
          source: 'GitHub Releases (fission-ai/openspec)',
          sourceUrl: 'https://github.com/fission-ai/openspec/releases/tag/v1.12.0',
          fetched: true,
          rawText: '- Modificaciones en CLI',
          error: null,
        }),
        completeTextFn: mockComplete as never,
      });

      // 9c.5: Separación estricta
      expect(res.measured).toBeDefined();
      expect(res.redaction).toBeDefined();

      // Hechos medidos determinados por código
      expect(res.measured.installedVersion).toBe('1.11.0');
      expect(res.measured.availableVersion).toBe('1.12.0');
      expect(res.measured.versionClass).toBe('too-new');
      expect(res.measured.breakingChangesDetected).toBe(true);
      expect(res.measured.consumedSurfaces.length).toBe(6);

      // Redacción del modelo
      expect(res.redaction.status).toBe('generated');
      expect(res.redaction.text).toContain('Ale, mirá');
    });

    it('degrada limpiamente sin voltear los hechos medidos si el modelo local está apagado', async () => {
      const mockComplete = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const res = await analyzeOpenSpecVersion(process.cwd(), {
        getInstalledVersion: async () => '1.11.0',
        checkLatest: async () => ({
          status: 'online',
          latestVersion: '1.12.0',
          checkedAt: new Date().toISOString(),
          fromCache: false,
          cacheAgeSeconds: 0,
          freshness: 'fresh',
          error: null,
        }),
        fetchChangelog: async () => ({
          source: 'unavailable',
          sourceUrl: null,
          fetched: false,
          rawText: null,
          error: 'Offline',
        }),
        completeTextFn: mockComplete as never,
      });

      // Hechos medidos intactos y completos
      expect(res.measured.installedVersion).toBe('1.11.0');
      expect(res.measured.availableVersion).toBe('1.12.0');
      expect(res.measured.breakingChangesDetected).toBe(true);
      expect(res.measured.consumedSurfaces.length).toBe(6);

      // Redacción informa degradación
      expect(res.redaction.status).toBe('offline');
      expect(res.redaction.text).toContain('Servidor local de IA no disponible');
      expect(res.redaction.error).toContain('ECONNREFUSED');
    });
  });

  describe('9c.6: Rangos y versión objetivo no se modifican automáticamente', () => {
    it('SUPPORTED_OPENSPEC_VERSIONS y OPENSPEC_CYCLE_TARGET_VERSION permanecen inmutables', () => {
      expect(OPENSPEC_CYCLE_TARGET_VERSION).toBe('1.11.0');
      expect(SUPPORTED_OPENSPEC_VERSIONS.min).toBe('1.5.0');
      expect(SUPPORTED_OPENSPEC_VERSIONS.max).toBe('1.11.0');
    });
  });

  describe('Integración IPC: canal pipeline:openspec:version-analysis tal como se registra en main', () => {
    it('registra el canal en ipcMain y rechaza repositorios no autorizados', async () => {
      const handlers = new Map<string, (_event: unknown, payload?: unknown) => Promise<unknown>>();
      const mockIpc = {
        handle: vi.fn((channel: string, handler: any) => {
          handlers.set(channel, handler);
        }),
      };

      const { registerOpenSpecIpcHandlers } = await import('../ipc/pipeline-openspec');
      registerOpenSpecIpcHandlers({
        ipcMain: mockIpc as never,
        getUserDataDir: () => os.tmpdir(),
      });

      expect(handlers.has('pipeline:openspec:version-analysis')).toBe(true);
      const handler = handlers.get('pipeline:openspec:version-analysis')!;

      // Rechaza sin repositorio autorizado
      await expect(handler({}, { repoPath: 'C:/unauthorized-repo' })).rejects.toThrow(
        /IPC Security Error: Invalid or unauthorized repository path/,
      );

      // Rechaza payloads con propiedades maliciosas/desconocidas
      authorizedRepoStore.authorizeRepo(process.cwd());
      await expect(
        handler({}, { repoPath: process.cwd(), maliciousKey: 'hack' }),
      ).rejects.toThrow(/IPC Security Error: Unknown payload property/);
    });

    it('ejecuta el análisis a través del canal IPC autorizado sin inyectar dependencias falsas', async () => {
      const handlers = new Map<string, (_event: unknown, payload?: unknown) => Promise<unknown>>();
      const mockIpc = {
        handle: vi.fn((channel: string, handler: any) => {
          handlers.set(channel, handler);
        }),
      };

      const realRepo = fs.realpathSync(process.cwd());
      authorizedRepoStore.authorizeRepo(realRepo);

      const { registerOpenSpecIpcHandlers } = await import('../ipc/pipeline-openspec');
      registerOpenSpecIpcHandlers({
        ipcMain: mockIpc as never,
        getUserDataDir: () => os.tmpdir(),
      });

      const handler = handlers.get('pipeline:openspec:version-analysis')!;
      const result = (await handler({}, { repoPath: realRepo })) as any;

      expect(result).toBeDefined();
      expect(result.measured).toBeDefined();
      expect(result.measured.supportedRange.max).toBe('1.11.0');
      expect(result.measured.consumedSurfaces.length).toBe(6);
      expect(result.redaction).toBeDefined();
    });
  });
});
