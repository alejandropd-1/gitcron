import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const execFileMock = vi.fn();

vi.mock('node:child_process', () => ({
  execFile: (...args: unknown[]) => execFileMock(...args),
}));

import { registerOpenSpecIpcHandlers } from '../ipc/pipeline-openspec';
import { artifactGraphOpenSpecWithCli } from '../pipeline/openspec-cli';
import type { AuthorizedOpenSpecRuntime } from '../pipeline/openspec-engine';

const fixturesDir = path.resolve(__dirname, 'fixtures/openspec-1.13');

const mockRuntime: AuthorizedOpenSpecRuntime = {
  executablePath: 'C:\\custom\\path\\openspec.cmd',
  command: 'openspec.cmd',
  shell: true,
  displayPath: 'C:\\custom\\path\\openspec.cmd',
  provenance: 'global',
};

describe('pipeline:openspec:artifact-graph', () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  describe('IPC handler validation & dedupe', () => {
    it('valida estrictamente las claves del payload y rechaza claves ajenas', async () => {
      const handlers = new Map<string, Function>();
      const mockIpc = {
        handle: (channel: string, listener: Function) => {
          handlers.set(channel, listener);
        },
      };

      registerOpenSpecIpcHandlers({
        ipcMain: mockIpc,
        getUserDataDir: () => 'C:/userData',
        getAuthorizedRepoRoots: () => ['C:/valid-repo'],
        validateRepoPath: (p: unknown) => (p === 'C:/valid-repo' ? 'C:/valid-repo' : null),
        getArtifactGraph: vi.fn().mockResolvedValue({ ok: true, artifacts: [] }),
      });

      const handler = handlers.get('pipeline:openspec:artifact-graph');
      expect(handler).toBeDefined();

      // Clave ajena
      await expect(
        handler!({}, { repoPath: 'C:/valid-repo', changeId: 'test-change', evilKey: true }),
      ).rejects.toThrow(/IPC Security Error/);

      // Repo no autorizado
      await expect(
        handler!({}, { repoPath: 'C:/unauthorized-repo', changeId: 'test-change' }),
      ).rejects.toThrow(/IPC Security Error/);
    });

    it('requiere changeId no vacío', async () => {
      const handlers = new Map<string, Function>();
      const mockIpc = {
        handle: (channel: string, listener: Function) => {
          handlers.set(channel, listener);
        },
      };

      registerOpenSpecIpcHandlers({
        ipcMain: mockIpc,
        getUserDataDir: () => 'C:/userData',
        getAuthorizedRepoRoots: () => ['C:/valid-repo'],
        validateRepoPath: (p: unknown) => (p === 'C:/valid-repo' ? 'C:/valid-repo' : null),
      });

      const handler = handlers.get('pipeline:openspec:artifact-graph');
      const result = await handler!({}, { repoPath: 'C:/valid-repo', changeId: '' });
      expect(result).toEqual({ ok: false, error: 'changeId-required' });
    });

    it('deduplica pedidos en vuelo para el mismo repo + change', async () => {
      const handlers = new Map<string, Function>();
      const mockIpc = {
        handle: (channel: string, listener: Function) => {
          handlers.set(channel, listener);
        },
      };

      let resolver: (val: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolver = resolve;
      });

      const mockGetArtifactGraph = vi.fn().mockImplementation(() => delayedPromise);

      registerOpenSpecIpcHandlers({
        ipcMain: mockIpc,
        getUserDataDir: () => 'C:/userData',
        getAuthorizedRepoRoots: () => ['C:/valid-repo'],
        validateRepoPath: (p: unknown) => (p === 'C:/valid-repo' ? 'C:/valid-repo' : null),
        getArtifactGraph: mockGetArtifactGraph,
      });

      const handler = handlers.get('pipeline:openspec:artifact-graph');
      expect(handler).toBeDefined();

      // Dos llamadas simultáneas con los mismos parámetros
      const call1 = handler!({}, { repoPath: 'C:/valid-repo', changeId: 'change-1' });
      const call2 = handler!({}, { repoPath: 'C:/valid-repo', changeId: 'change-1' });

      expect(mockGetArtifactGraph).toHaveBeenCalledTimes(1);

      resolver!({ ok: true, artifacts: [] });

      const [res1, res2] = await Promise.all([call1, call2]);
      expect(res1).toEqual({ ok: true, artifacts: [] });
      expect(res2).toEqual({ ok: true, artifacts: [] });
      expect(mockGetArtifactGraph).toHaveBeenCalledTimes(1);
    });

    it('devuelve ok: false sin artifacts cuando el CLI falla', async () => {
      const handlers = new Map<string, Function>();
      const mockIpc = {
        handle: (channel: string, listener: Function) => {
          handlers.set(channel, listener);
        },
      };

      registerOpenSpecIpcHandlers({
        ipcMain: mockIpc,
        getUserDataDir: () => 'C:/userData',
        getAuthorizedRepoRoots: () => ['C:/valid-repo'],
        validateRepoPath: (p: unknown) => (p === 'C:/valid-repo' ? 'C:/valid-repo' : null),
        getArtifactGraph: vi.fn().mockResolvedValue({ ok: false, error: 'cli-error-details' }),
      });

      const handler = handlers.get('pipeline:openspec:artifact-graph');
      const result = await handler!({}, { repoPath: 'C:/valid-repo', changeId: 'failing-change' });
      expect(result.ok).toBe(false);
      expect(result.error).toBe('cli-error-details');
      expect(result.artifacts).toBeUndefined();
    });
  });

  describe('artifactGraphOpenSpecWithCli con fixtures', () => {
    it('compone status e instructions para los cuatro artefactos desde las fixtures', async () => {
      const statusJson = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'status.json'), 'utf8'));
      const instProposal = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'instructions-proposal.json'), 'utf8'));
      const instSpecs = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'instructions-specs.json'), 'utf8'));
      const instDesign = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'instructions-design.json'), 'utf8'));
      const instTasks = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'instructions-tasks.json'), 'utf8'));

      const instMap: Record<string, any> = {
        proposal: instProposal,
        specs: instSpecs,
        design: instDesign,
        tasks: instTasks,
      };

      execFileMock.mockImplementation((_file: string, args: string[], _opts: any, cb: any) => {
        if (args[0] === 'status') {
          cb(null, { stdout: JSON.stringify(statusJson), stderr: '' });
        } else if (args[0] === 'instructions') {
          const artId = args[1];
          const data = instMap[artId];
          if (data) {
            cb(null, { stdout: JSON.stringify(data), stderr: '' });
          } else {
            cb(new Error(`Unknown artifact ${artId}`));
          }
        }
      });

      const result = await artifactGraphOpenSpecWithCli('C:/repo', 'recorrido-de-artefactos-openspec', {
        runtime: mockRuntime,
      });

      expect(result.ok).toBe(true);
      expect(result.artifacts).toBeDefined();
      expect(result.artifacts?.length).toBe(4);

      const [proposal, specs, design, tasks] = result.artifacts!;
      expect(proposal.id).toBe('proposal');
      expect(proposal.status).toBe('done');
      expect(proposal.requires).toEqual([]);
      expect(proposal.description).toBe('Initial proposal document outlining the change');
      expect(proposal.instruction).toContain('Create the proposal document');
      expect(proposal.unlocks).toEqual(['specs', 'design']);

      expect(specs.id).toBe('specs');
      expect(specs.status).toBe('done');
      expect(specs.requires).toEqual(['proposal']);
      expect(specs.dependencies).toBeDefined();

      expect(design.id).toBe('design');
      expect(design.status).toBe('done');
      expect(design.requires).toEqual(['proposal']);

      expect(tasks.id).toBe('tasks');
      expect(tasks.status).toBe('done');
      expect(tasks.requires).toEqual(['specs', 'design']);

      expect(result.applyRequires).toEqual(['tasks']);
      expect(result.nextSteps).toBeDefined();
    });

    it('devuelve ok: false sin artifacts cuando el CLI devuelve error en status', async () => {
      const err = new Error('Command failed') as any;
      err.stderr = 'Change not found';
      execFileMock.mockImplementation((_file: string, _args: string[], _opts: any, cb: any) => {
        cb(err);
      });

      const result = await artifactGraphOpenSpecWithCli('C:/repo', 'non-existent', {
        runtime: mockRuntime,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('Change not found');
      expect(result.artifacts).toBeUndefined();
    });
  });
});
