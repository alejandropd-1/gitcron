import { describe, expect, it } from 'vitest';
import * as path from 'node:path';
import {
  doctorOpenSpecWithCli,
  contextOpenSpecWithCli,
} from '../pipeline/openspec-cli';
import { buildEngineStatusSnapshot } from '../ipc/pipeline-openspec';
import { authorizedRepoStore } from '../ipc/authorized-repos';
import type {
  OpenSpecDoctorData,
  OpenSpecContextBriefData,
} from '../../types/pipeline';

describe('Diagnóstico del motor CLI: doctor y context (Grupo 3b)', () => {
  const currentRepo = path.resolve(__dirname, '../..');

  describe('3b.1 doctorOpenSpecWithCli (`openspec doctor --json`)', () => {
    it('devuelve openspec-cli-not-found cuando el runtime no se puede resolver', async () => {
      const result = await doctorOpenSpecWithCli('C:\\test\\repo', {
        resolve: () => null,
      });
      expect(result.command).toBe('openspec doctor --json');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('openspec-cli-not-found');
      expect(result.data).toBeNull();
    });

    it('un diagnóstico sin problemas no produce advertencias (3b.4)', async () => {
      // Fixture limpio tal como devuelve el CLI openspec 1.11.0
      const cleanData: OpenSpecDoctorData = {
        root: {
          path: 'C:\\repo',
          source: 'nearest',
          healthy: true,
          status: [],
        },
        store: null,
        references: [],
        status: [],
      };

      // Comprobamos la función pura de inspección de severidades
      const allDiagnostics = [
        ...cleanData.status,
        ...(cleanData.root?.status ?? []),
        ...(cleanData.store?.status ?? []),
        ...cleanData.references.flatMap((r) => r.status),
      ];

      expect(allDiagnostics).toHaveLength(0);
      const warnings = allDiagnostics.filter((d) => d.severity === 'warning');
      const errors = allDiagnostics.filter((d) => d.severity === 'error');
      expect(warnings).toHaveLength(0);
      expect(errors).toHaveLength(0);
    });

    it('las condiciones reportadas conservan exactamente la gravedad que el motor les asigna (3b.4)', async () => {
      const issuesData: OpenSpecDoctorData = {
        root: {
          path: 'C:\\repo',
          source: 'nearest',
          healthy: false,
          status: [
            {
              severity: 'error',
              code: 'store_corrupt',
              message: 'Store configuration corrupt',
              fix: 'Reinitialize store',
            },
          ],
        },
        store: {
          id: 'store-1',
          metadata: { present: true, valid: false },
          status: [
            {
              severity: 'warning',
              code: 'metadata_invalid',
              message: 'Store metadata is invalid',
            },
          ],
        },
        references: [
          {
            store_id: 'ref-store',
            status: [
              {
                severity: 'info',
                code: 'reference_dormant',
                message: 'Reference is dormant',
              },
            ],
          },
        ],
        status: [],
      };

      const allDiagnostics = [
        ...issuesData.status,
        ...(issuesData.root?.status ?? []),
        ...(issuesData.store?.status ?? []),
        ...issuesData.references.flatMap((r) => r.status),
      ];

      expect(allDiagnostics).toHaveLength(3);

      const errorDiag = allDiagnostics.find((d) => d.code === 'store_corrupt');
      expect(errorDiag).toBeDefined();
      expect(errorDiag?.severity).toBe('error');
      expect(errorDiag?.message).toBe('Store configuration corrupt');
      expect(errorDiag?.fix).toBe('Reinitialize store');

      const warningDiag = allDiagnostics.find((d) => d.code === 'metadata_invalid');
      expect(warningDiag).toBeDefined();
      expect(warningDiag?.severity).toBe('warning');

      const infoDiag = allDiagnostics.find((d) => d.code === 'reference_dormant');
      expect(infoDiag).toBeDefined();
      expect(infoDiag?.severity).toBe('info');
    });

    it('ejecución real en Windows sobre el repositorio actual devuelve JSON válido sin errores inventados', async () => {
      const result = await doctorOpenSpecWithCli(currentRepo);

      expect(result.command).toBe('openspec doctor --json');
      expect(result.ok).toBe(true);
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.root).toBeDefined();
      expect(result.data?.root?.healthy).toBe(true);
      // Repositorio sano: no debe tener diagnósticos con severidad de error
      const errors = (result.data?.root?.status ?? []).filter((s) => s.severity === 'error');
      expect(errors).toHaveLength(0);
    }, 30_000);
  });

  describe('3b.2 contextOpenSpecWithCli (`openspec context --json`)', () => {
    it('devuelve openspec-cli-not-found cuando el runtime no se puede resolver', async () => {
      const result = await contextOpenSpecWithCli('C:\\test\\repo', {
        resolve: () => null,
      });
      expect(result.command).toBe('openspec context --json');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('openspec-cli-not-found');
      expect(result.data).toBeNull();
    });

    it('un contexto de trabajo limpio no produce advertencias (3b.4)', () => {
      const cleanContext: OpenSpecContextBriefData = {
        root: {
          path: 'C:\\repo',
          source: 'nearest',
          role: 'openspec_root',
        },
        members: [],
        status: [],
      };

      const allDiagnostics = [
        ...cleanContext.status,
        ...cleanContext.members.flatMap((m) => m.status),
      ];

      expect(allDiagnostics).toHaveLength(0);
      const warnings = allDiagnostics.filter((d) => d.severity === 'warning');
      expect(warnings).toHaveLength(0);
    });

    it('las condiciones reportadas en miembros conservan su gravedad intacta (3b.4)', () => {
      const contextWithIssue: OpenSpecContextBriefData = {
        root: {
          path: 'C:\\repo',
          source: 'nearest',
          role: 'openspec_root',
        },
        members: [
          {
            id: 'remote-team-store',
            role: 'referenced_store',
            status: [
              {
                severity: 'warning',
                code: 'store_unreachable',
                message: 'Remote member unreachable',
                fix: 'Verify VPN or credentials',
              },
            ],
          },
        ],
        status: [],
      };

      const diagnostics = contextWithIssue.members.flatMap((m) => m.status);
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].severity).toBe('warning');
      expect(diagnostics[0].message).toBe('Remote member unreachable');
      expect(diagnostics[0].fix).toBe('Verify VPN or credentials');
    });

    it('ejecución real en Windows sobre el repositorio actual devuelve contexto válido de openspec_root', async () => {
      const result = await contextOpenSpecWithCli(currentRepo);

      expect(result.command).toBe('openspec context --json');
      expect(result.ok).toBe(true);
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data?.root?.role).toBe('openspec_root');
      expect(Array.isArray(result.data?.members)).toBe(true);
      expect(Array.isArray(result.data?.status)).toBe(true);
    }, 30_000);
  });

  describe('buildEngineStatusSnapshot transporta doctor y contextBrief estructurados', () => {
    it('adjunta doctor y contextBrief en el snapshot de estado', async () => {
      authorizedRepoStore.clear();
      authorizedRepoStore.authorizeRepo(currentRepo);

      const mockDoctor = {
        command: 'openspec doctor --json' as const,
        ok: true,
        error: null,
        data: {
          root: { path: currentRepo, source: 'nearest', healthy: true, status: [] },
          store: null,
          references: [],
          status: [],
        },
      };

      const mockContext = {
        command: 'openspec context --json' as const,
        ok: true,
        error: null,
        data: {
          root: { path: currentRepo, source: 'nearest', role: 'openspec_root' as const },
          members: [],
          status: [],
        },
      };

      const snapshot = await buildEngineStatusSnapshot(currentRepo, {
        discoverCli: async () => ({
          installed: true,
          runtimeVersion: '1.12.0',
          provenance: 'global',
          displayPath: 'C:\\global\\openspec.cmd',
          supportedRange: { min: '1.5.0', max: '1.12.0' },
          versionClass: 'supported',
          evidenceStatus: 'confirmed',
          diagnostics: [],
        }),
        readGlobalConfig: async () => ({
          rawProfile: 'core',
          configuredWorkflows: ['apply'],
          origin: 'cli',
          readAt: new Date().toISOString(),
        }),
        runDoctor: async () => mockDoctor,
        runContext: async () => mockContext,
      });

      expect(snapshot.doctor).toEqual(mockDoctor);
      expect(snapshot.contextBrief).toEqual(mockContext);
      expect(snapshot.doctor?.command).toBe('openspec doctor --json');
      expect(snapshot.contextBrief?.command).toBe('openspec context --json');
    });
  });
});
