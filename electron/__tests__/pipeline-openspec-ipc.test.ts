import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import {
  buildEngineStatusSnapshot,
  registerOpenSpecIpcHandlers,
  validateStrictPayloadKeys,
  validateStrictRepoPath,
} from '../ipc/pipeline-openspec';
import { registerGitRepoHandlers } from '../ipc/git-repo';
import { authorizedRepoStore, isContainedWithin } from '../ipc/authorized-repos';
import type { AuthorizedOpenSpecRuntime } from '../pipeline/openspec-engine';

describe('AuthorizedRepoStore & validateStrictRepoPath (Autoridad de Repositorios P0)', () => {
  it('autoriza un repositorio real explícitamente y lo valida', () => {
    authorizedRepoStore.clear();
    const authorized = authorizedRepoStore.authorizeRepo(process.cwd());
    expect(authorized).not.toBeNull();
    expect(authorizedRepoStore.isAuthorized(process.cwd())).toBe(true);

    const validated = validateStrictRepoPath(process.cwd());
    expect(validated).toBe(fs.realpathSync(process.cwd()));
  });

  it('rechaza autoautorización mediante repoWatch o process.cwd() incidental sin registrar', () => {
    authorizedRepoStore.clear();
    // Sin haber registrado process.cwd(), validateStrictRepoPath(process.cwd()) debe fallar
    const validated = validateStrictRepoPath(process.cwd());
    expect(validated).toBeNull();
  });

  it('rechaza otro repositorio Git válido en disco que no fue abierto/autorizado', () => {
    authorizedRepoStore.clear();
    authorizedRepoStore.authorizeRepo(process.cwd());

    const otherRepo = path.dirname(process.cwd());
    expect(authorizedRepoStore.isAuthorized(otherRepo)).toBe(false);
    expect(validateStrictRepoPath(otherRepo)).toBeNull();
  });

  it('rechaza rutas relativas, traversal, archivos o subdirectorios', () => {
    authorizedRepoStore.clear();
    authorizedRepoStore.authorizeRepo(process.cwd());

    expect(validateStrictRepoPath('relative/path')).toBeNull();
    expect(validateStrictRepoPath('../gitCronos')).toBeNull();
    expect(validateStrictRepoPath(path.join(process.cwd(), 'package.json'))).toBeNull();
    expect(validateStrictRepoPath(path.join(process.cwd(), 'node_modules'))).toBeNull();
    expect(validateStrictRepoPath('')).toBeNull();
    expect(validateStrictRepoPath(null)).toBeNull();
  });

  it('soporta repositorios con .git como archivo (worktrees)', async () => {
    const tempWorktree = fs.mkdtempSync(path.join(os.tmpdir(), 'gitcron-worktree-test-'));
    try {
      // En un worktree .git es un archivo, no un directorio
      const gitFile = path.join(tempWorktree, '.git');
      fs.writeFileSync(gitFile, 'gitdir: /path/to/main/.git/worktrees/test\n');

      authorizedRepoStore.clear();
      const auth = authorizedRepoStore.authorizeRepo(tempWorktree);
      expect(auth).not.toBeNull();
      expect(authorizedRepoStore.isAuthorized(tempWorktree)).toBe(true);
      expect(validateStrictRepoPath(tempWorktree)).toBe(fs.realpathSync(tempWorktree));
    } finally {
      try {
        fs.rmSync(tempWorktree, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });

  it('la autorización es idempotente por ruta canónica: reabrir no acumula y cerrar la única pestaña revoca', () => {
    authorizedRepoStore.clear();
    const repo = process.cwd();

    // Abrir el mismo repo dos veces (el renderer deduplica a una sola pestaña:
    // addOrActivateRepo nunca crea dos pestañas del mismo path canónico).
    authorizedRepoStore.authorizeRepo(repo);
    authorizedRepoStore.authorizeRepo(repo);
    expect(authorizedRepoStore.isAuthorized(repo)).toBe(true);

    // Cerrar la única pestaña revoca: nunca queda un contador huérfano.
    authorizedRepoStore.deauthorizeRepo(repo);
    expect(authorizedRepoStore.isAuthorized(repo)).toBe(false);

    // Un cierre duplicado no rompe el estado.
    authorizedRepoStore.deauthorizeRepo(repo);
    expect(authorizedRepoStore.isAuthorized(repo)).toBe(false);
  });
});

describe('isContainedWithin (Symlinks y Containment Seguro P0)', () => {
  it('detecta correctamente rutas dentro del contenedor', () => {
    expect(isContainedWithin('C:\\repo', 'C:\\repo')).toBe(true);
    expect(isContainedWithin('C:\\repo', 'C:\\repo\\skills\\tool')).toBe(true);
    expect(isContainedWithin('C:\\repo', 'C:\\repo\\.agents')).toBe(true);
  });

  it('rechaza carpetas hermanas con prefijo similar (ej. C:\\repo-externo NO está en C:\\repo)', () => {
    expect(isContainedWithin('C:\\repo', 'C:\\repo-externo')).toBe(false);
    expect(isContainedWithin('C:\\repo', 'C:\\repo-sibling\\skills')).toBe(false);
    expect(isContainedWithin('C:\\repo', 'D:\\repo\\skills')).toBe(false);
    expect(isContainedWithin('C:\\repo', 'C:\\other\\skills')).toBe(false);
  });
});

describe('validateStrictPayloadKeys (Decodificación de shapes exactos y rechazo de propiedades desconocidas)', () => {
  it('permite objetos válidos con claves permitidas y undefined/null', () => {
    expect(() => validateStrictPayloadKeys(undefined, ['repoPath'])).not.toThrow();
    expect(() => validateStrictPayloadKeys(null, ['repoPath'])).not.toThrow();
    expect(() => validateStrictPayloadKeys({ repoPath: 'C:\\repo' }, ['repoPath'])).not.toThrow();
    expect(() => validateStrictPayloadKeys({}, ['repoPath'])).not.toThrow();
  });

  it('rechaza explícitamente cualquier propiedad desconocida en el payload', () => {
    expect(() => validateStrictPayloadKeys({ repoPath: 'C:\\repo', executablePath: 'evil.exe' }, ['repoPath'])).toThrow('IPC Security Error');
    expect(() => validateStrictPayloadKeys({ displayPath: 'fake.cmd' }, ['repoPath'])).toThrow('IPC Security Error');
    expect(() => validateStrictPayloadKeys({ registryUrl: 'https://evil.org' }, [])).toThrow('IPC Security Error');
    expect(() => validateStrictPayloadKeys('not-an-object', ['repoPath'])).toThrow('IPC Security Error');
  });
});

describe('Single Runtime Resolution (Audit Point 5)', () => {
  it('resuelve el AuthorizedOpenSpecRuntime UNA SOLA VEZ usando discoverCli productivo sin mockearlo', async () => {
    const dummyRuntime: AuthorizedOpenSpecRuntime = {
      executablePath: 'C:\\global\\openspec.cmd',
      command: 'openspec.cmd',
      shell: true,
      displayPath: 'C:\\global\\openspec.cmd',
      provenance: 'global',
    };

    let resolveCallCount = 0;
    const mockResolve = vi.fn().mockImplementation(() => {
      resolveCallCount++;
      return dummyRuntime;
    });

    const mockReadConfig = vi.fn().mockImplementation(async () => null);

    authorizedRepoStore.clear();
    authorizedRepoStore.authorizeRepo(process.cwd());

    const snapshot = await buildEngineStatusSnapshot(process.cwd(), {
      getUserDataDir: () => 'C:\\userData',
      resolveRuntime: mockResolve,
      readGlobalConfig: mockReadConfig,
    });

    // resolveRuntime se invoca exactamente 1 sola vez en el snapshot completo
    expect(resolveCallCount).toBe(1);
    expect(snapshot.cli.displayPath).toBe('C:\\global\\openspec.cmd');
    expect((snapshot.cli as any).executablePath).toBeUndefined();
  });

  it('buildEngineStatusSnapshot pasa repoPath a resolveOpenSpecExecutable y adopta procedencia local cuando existe en repo', async () => {
    const localRuntime: AuthorizedOpenSpecRuntime = {
      executablePath: path.join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'openspec.cmd' : 'openspec'),
      command: process.platform === 'win32' ? 'openspec.cmd' : 'openspec',
      shell: process.platform === 'win32',
      displayPath: path.join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'openspec.cmd' : 'openspec'),
      provenance: 'local',
    };

    authorizedRepoStore.clear();
    authorizedRepoStore.authorizeRepo(process.cwd());

    const snapshot = await buildEngineStatusSnapshot(process.cwd(), {
      getUserDataDir: () => 'C:\\userData',
      resolveRuntime: (opts) => {
        expect(opts?.repoPath).toBe(process.cwd());
        return localRuntime;
      },
      discoverCli: async (opts) => {
        expect(opts?.runtime?.provenance).toBe('local');
        return {
          installed: true,
          runtimeVersion: '1.8.0',
          provenance: 'local',
          displayPath: opts?.runtime?.displayPath ?? null,
          supportedRange: { min: '1.5.0', max: '1.8.0' },
          versionClass: 'supported',
          evidenceStatus: 'confirmed',
          diagnostics: [],
        };
      },
      readGlobalConfig: async () => null,
    });

    expect(snapshot.cli.provenance).toBe('local');
    expect(snapshot.cli.displayPath).toBe(localRuntime.displayPath);
    expect((snapshot.cli as any).executablePath).toBeUndefined();
  });
});

describe('IPC Channels Handlers (Rechazo explícito, autoridad real e invalidación de planes)', () => {
  function createMockIpc() {
    const map = new Map<string, Function>();
    return {
      map,
      ipcMain: {
        handle: (channel: string, listener: Function) => {
          map.set(channel, listener);
        },
      },
    };
  }

  it('los canales de repo rechazan rutas no autorizadas sin degradar silenciosamente', async () => {
    const { map, ipcMain } = createMockIpc();
    authorizedRepoStore.clear();
    authorizedRepoStore.authorizeRepo(process.cwd());

    registerOpenSpecIpcHandlers({
      ipcMain: ipcMain as any,
      getUserDataDir: () => 'C:\\userData',
      getGitInfo: async () => ({ branch: 'main', headCommit: 'abc1234fullcommitsha', isClean: true, workingTreeFingerprint: 'clean:0:abc' }),
      discoverCli: async () => ({
        installed: true,
        runtimeVersion: '1.8.0',
        provenance: 'global',
        displayPath: 'C:\\global\\openspec.cmd',
        supportedRange: { min: '1.5.0', max: '1.8.0' },
        versionClass: 'supported',
        evidenceStatus: 'confirmed',
        diagnostics: [],
      }),
      readGlobalConfig: async () => null,
    });

    const statusHandler = map.get('pipeline:openspec:engine-status')!;
    const checkLatestHandler = map.get('pipeline:openspec:check-latest')!;
    const updatePlanHandler = map.get('pipeline:openspec:update-plan')!;
    const updateExecuteHandler = map.get('pipeline:openspec:update-execute')!;
    const previewHandler = map.get('pipeline:openspec:preview')!;

    // 1. Claves maliciosas -> Rechazo explícito
    await expect(statusHandler({}, { repoPath: process.cwd(), malicious: 'true' })).rejects.toThrow('IPC Security Error');
    await expect(checkLatestHandler({}, { extraProp: 123 })).rejects.toThrow('IPC Security Error');
    await expect(updatePlanHandler({}, { repoPath: process.cwd(), executablePath: 'evil' })).rejects.toThrow('IPC Security Error');
    await expect(updateExecuteHandler({}, { repoPath: process.cwd(), displayPath: 'fake' })).rejects.toThrow('IPC Security Error');
    await expect(previewHandler({}, { repoPath: process.cwd(), badKey: 'val' })).rejects.toThrow('IPC Security Error');

    // 2. Ruta no autorizada en engine-status, update-plan, preview y update-execute
    await expect(statusHandler({}, { repoPath: 'C:\\unauthorized-repo' })).rejects.toThrow('Invalid or unauthorized repository path');
    await expect(updatePlanHandler({}, { repoPath: 'C:\\unauthorized-repo' })).rejects.toThrow('Invalid or unauthorized repository path');
    await expect(previewHandler({}, { repoPath: 'C:\\unauthorized-repo' })).rejects.toThrow('Invalid or unauthorized repository path');
    await expect(updateExecuteHandler({}, { repoPath: 'C:\\unauthorized-repo' })).rejects.toThrow('Invalid or unauthorized repository path');

    // 3. engine-status sin repoPath (global engine) funciona
    const globalStatus = await statusHandler({}, {});
    expect(globalStatus.repoState).toBe('unknown');
  });

  it('update-execute detecta la invalidación del plan diagnóstico frente a cambios en la evidencia viva', async () => {
    const { map, ipcMain } = createMockIpc();
    authorizedRepoStore.clear();
    authorizedRepoStore.authorizeRepo(process.cwd());

    let liveFingerprint = 'clean:0:original';

    registerOpenSpecIpcHandlers({
      ipcMain: ipcMain as any,
      getUserDataDir: () => 'C:\\userData',
      getGitInfo: async () => ({ branch: 'main', headCommit: 'abc1234', isClean: true, workingTreeFingerprint: liveFingerprint }),
      discoverCli: async () => ({
        installed: true,
        runtimeVersion: '1.8.0',
        provenance: 'global',
        displayPath: 'C:\\global\\openspec.cmd',
        supportedRange: { min: '1.5.0', max: '1.8.0' },
        versionClass: 'supported',
        evidenceStatus: 'confirmed',
        diagnostics: [],
      }),
      readGlobalConfig: async () => null,
    });

    const updatePlanHandler = map.get('pipeline:openspec:update-plan')!;
    const updateExecuteHandler = map.get('pipeline:openspec:update-execute')!;

    // Generar plan
    const plan = await updatePlanHandler({}, { repoPath: process.cwd() });
    expect(plan).toBeDefined();

    // Cambiar la huella viva del repositorio antes de ejecutar
    liveFingerprint = 'dirty:1:changed';

    const execResult = await updateExecuteHandler({}, { repoPath: process.cwd(), plan });
    expect(execResult.success).toBe(false);
    expect(execResult.status).toBe('blocked');
    expect(execResult.reason).toBe('poc-required');
  });

  describe('pipeline:openspec:run-update (Salvaguardas de Git y Ejecución Controlada)', () => {
    it('bloquea incondicionalmente la ejecución si el repositorio está en main o master', async () => {
      const { map, ipcMain } = createMockIpc();
      authorizedRepoStore.clear();
      authorizedRepoStore.authorizeRepo(process.cwd());

      const runUpdateMock = vi.fn();

      registerOpenSpecIpcHandlers({
        ipcMain: ipcMain as any,
        getUserDataDir: () => 'C:\\userData',
        getGitInfo: async () => ({ branch: 'main', headCommit: 'abc1234', isClean: true, workingTreeFingerprint: 'clean:0:abc' }),
        runUpdate: runUpdateMock,
      });

      const runUpdateHandler = map.get('pipeline:openspec:run-update')!;

      const result = await runUpdateHandler({}, { repoPath: process.cwd() });
      expect(result.success).toBe(false);
      expect(result.status).toBe('blocked');
      expect(result.errors).toContain('branch-protected-main');
      expect(runUpdateMock).not.toHaveBeenCalled();
    });

    it('bloquea incondicionalmente la ejecución si la rama es null o HEAD desacoplado (detached HEAD)', async () => {
      const { map, ipcMain } = createMockIpc();
      authorizedRepoStore.clear();
      authorizedRepoStore.authorizeRepo(process.cwd());

      const runUpdateMock = vi.fn();

      registerOpenSpecIpcHandlers({
        ipcMain: ipcMain as any,
        getUserDataDir: () => 'C:\\userData',
        getGitInfo: async () => ({ branch: null, headCommit: 'abc1234', isClean: true, workingTreeFingerprint: 'clean:0:abc' }),
        runUpdate: runUpdateMock,
      });

      const runUpdateHandler = map.get('pipeline:openspec:run-update')!;

      const result = await runUpdateHandler({}, { repoPath: process.cwd() });
      expect(result.success).toBe(false);
      expect(result.status).toBe('blocked');
      expect(result.errors).toContain('branch-detached');
      expect(runUpdateMock).not.toHaveBeenCalled();
    });

    it('bloquea la ejecución si el working tree contiene cambios no confirmados (dirty)', async () => {
      const { map, ipcMain } = createMockIpc();
      authorizedRepoStore.clear();
      authorizedRepoStore.authorizeRepo(process.cwd());

      const runUpdateMock = vi.fn();

      registerOpenSpecIpcHandlers({
        ipcMain: ipcMain as any,
        getUserDataDir: () => 'C:\\userData',
        getGitInfo: async () => ({ branch: 'change/mi-tarea', headCommit: 'abc1234', isClean: false, workingTreeFingerprint: 'dirty:1:abc' }),
        runUpdate: runUpdateMock,
      });

      const runUpdateHandler = map.get('pipeline:openspec:run-update')!;

      const result = await runUpdateHandler({}, { repoPath: process.cwd() });
      expect(result.success).toBe(false);
      expect(result.status).toBe('blocked');
      expect(result.errors).toContain('working-tree-dirty');
      expect(runUpdateMock).not.toHaveBeenCalled();
    });

    it('ejecuta openspec update en rama de trabajo limpia y propaga opciones force', async () => {
      const { map, ipcMain } = createMockIpc();
      authorizedRepoStore.clear();
      authorizedRepoStore.authorizeRepo(process.cwd());

      const runUpdateMock = vi.fn().mockResolvedValue({
        success: true,
        status: 'completed',
        filesUpdated: ['.agents/skills/openspec-propose/SKILL.md'],
        errors: [],
      });

      registerOpenSpecIpcHandlers({
        ipcMain: ipcMain as any,
        getUserDataDir: () => 'C:\\userData',
        getGitInfo: async () => ({ branch: 'change/actualizar-openspec', headCommit: 'abc1234', isClean: true, workingTreeFingerprint: 'clean:0:abc' }),
        runUpdate: runUpdateMock,
      });

      const runUpdateHandler = map.get('pipeline:openspec:run-update')!;

      const result = await runUpdateHandler({}, { repoPath: process.cwd(), force: true });
      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.filesUpdated).toEqual(['.agents/skills/openspec-propose/SKILL.md']);
      expect(runUpdateMock).toHaveBeenCalledWith(
        fs.realpathSync(process.cwd()),
        expect.objectContaining({ force: true }),
      );
    });
  });
});
