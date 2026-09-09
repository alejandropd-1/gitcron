import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  detectRepoPackageManager,
  getPackageManagerInstallArgs,
  resolvePackageManager,
  resolveSystemExecutable,
  type ResolvedPackageManager,
} from '../pipeline/package-manager';
import {
  installOpenSpecGlobal,
  installOpenSpecLocal,
  isValidTargetVersion,
} from '../pipeline/openspec-install';
import { registerOpenSpecIpcHandlers } from '../ipc/pipeline-openspec';
import { authorizedRepoStore } from '../ipc/authorized-repos';
import type { OpenSpecEngineStatus } from '../../types/pipeline';

describe('Instalación del Motor OpenSpec (Tareas 6.1 a 6.5)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitcron-pm-test-'));
    fs.mkdirSync(path.join(tempDir, '.git'));
    authorizedRepoStore.clear();
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 6.1: Resolución del gestor de paquetes del sistema
  // =========================================================================
  describe('6.1: Detección y resolución del gestor de paquetes', () => {
    it('detecta pnpm si existe pnpm-lock.yaml en el repositorio', () => {
      fs.writeFileSync(path.join(tempDir, 'pnpm-lock.yaml'), 'lockfileVersion: 5.4\n');
      expect(detectRepoPackageManager(tempDir)).toBe('pnpm');
    });

    it('detecta yarn si existe yarn.lock en el repositorio', () => {
      fs.writeFileSync(path.join(tempDir, 'yarn.lock'), '# yarn lockfile v1\n');
      expect(detectRepoPackageManager(tempDir)).toBe('yarn');
    });

    it('detecta npm si existe package-lock.json en el repositorio', () => {
      fs.writeFileSync(path.join(tempDir, 'package-lock.json'), '{"lockfileVersion": 2}\n');
      expect(detectRepoPackageManager(tempDir)).toBe('npm');
    });

    it('detecta bun si existe bun.lockb o bun.lock en el repositorio', () => {
      fs.writeFileSync(path.join(tempDir, 'bun.lock'), '');
      expect(detectRepoPackageManager(tempDir)).toBe('bun');
    });

    it('detecta gestor desde el campo packageManager en package.json', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-app', packageManager: 'pnpm@9.1.0' }),
      );
      expect(detectRepoPackageManager(tempDir)).toBe('pnpm');
    });

    it('resuelve el ejecutable con canonicalización realpathSync y verifica que sea ejecutable', () => {
      const isWin = process.platform === 'win32';
      const fakeBinName = isWin ? 'pnpm.cmd' : 'pnpm';
      const binPath = path.join(tempDir, fakeBinName);
      fs.writeFileSync(binPath, '#!/bin/sh\necho ok\n', { mode: 0o755 });

      const resolved = resolveSystemExecutable('pnpm', {
        pathEnv: tempDir,
        platform: process.platform,
        exists: (p) => fs.existsSync(p),
        isRegularFile: (p) => {
          try {
            return fs.statSync(p).isFile();
          } catch {
            return false;
          }
        },
        isExecutable: () => true,
        realpath: (p) => fs.realpathSync(p),
      });

      expect(resolved).not.toBeNull();
      expect(resolved?.name).toBe('pnpm');
      expect(resolved?.executablePath).toBe(fs.realpathSync(binPath));
      if (isWin) {
        expect(resolved?.shell).toBe(true);
      }
    });

    it('resuelve en cada uso y sin memorizar (no almacena en caché)', () => {
      const isWin = process.platform === 'win32';
      const fakeBinName = isWin ? 'npm.cmd' : 'npm';
      const binPath = path.join(tempDir, fakeBinName);

      // 1. Sin el archivo en disco, devuelve null
      const res1 = resolvePackageManager({
        pathEnv: tempDir,
        preferredManager: 'npm',
        exists: (p) => fs.existsSync(p),
        isRegularFile: (p) => {
          try {
            return fs.statSync(p).isFile();
          } catch {
            return false;
          }
        },
        isExecutable: () => true,
        realpath: (p) => {
          try {
            return fs.realpathSync(p);
          } catch {
            return null;
          }
        },
      });
      expect(res1).toBeNull();

      // 2. Se crea el archivo en disco
      fs.writeFileSync(binPath, 'echo npm\n', { mode: 0o755 });

      // 3. En la siguiente invocación inmediata, resuelve el archivo recién creado sin recordar el null previo
      const res2 = resolvePackageManager({
        pathEnv: tempDir,
        preferredManager: 'npm',
        exists: (p) => fs.existsSync(p),
        isRegularFile: (p) => {
          try {
            return fs.statSync(p).isFile();
          } catch {
            return false;
          }
        },
        isExecutable: () => true,
        realpath: (p) => fs.realpathSync(p),
      });
      expect(res2).not.toBeNull();
      expect(res2?.executablePath).toBe(fs.realpathSync(binPath));
    });

    it('en Windows excluye explícitamente .ps1', () => {
      const ps1Path = path.join(tempDir, 'pnpm.ps1');
      fs.writeFileSync(ps1Path, 'Write-Host "hello"\n');

      const resolved = resolveSystemExecutable('pnpm', {
        pathEnv: tempDir,
        platform: 'win32',
        exists: (p) => fs.existsSync(p),
        isRegularFile: () => true,
        isExecutable: () => true,
        realpath: (p) => p,
      });

      expect(resolved).toBeNull();
    });
  });

  // =========================================================================
  // 6.5 Requisito 1: Sin gestor resuelto no se invoca nada y se devuelve el código correspondiente
  // =========================================================================
  describe('6.5: Sin gestor resuelto no se invoca nada y devuelve el código', () => {
    it('en instalación local sin gestor resuelto no llama al runner y devuelve package-manager-not-found', async () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{"name":"test"}\n');
      const runnerMock = vi.fn();

      const result = await installOpenSpecLocal(tempDir, {
        resolvePackageManager: () => null,
        runPackageManager: runnerMock,
        recalculateStatus: vi.fn().mockResolvedValue(null),
      });

      // Afirmación sobre EL LLAMADO: no se invoca nada
      expect(runnerMock).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.code).toBe('package-manager-not-found');
    });

    it('en instalación global sin gestor resuelto no llama al runner y devuelve package-manager-not-found', async () => {
      const runnerMock = vi.fn();

      const result = await installOpenSpecGlobal({
        resolvePackageManager: () => null,
        runPackageManager: runnerMock,
        recalculateStatus: vi.fn().mockResolvedValue(null),
      });

      // Afirmación sobre EL LLAMADO: no se invoca nada
      expect(runnerMock).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.code).toBe('package-manager-not-found');
    });

    it('en instalación local sin archivo package.json no llama al runner y devuelve no-manifest', async () => {
      const runnerMock = vi.fn();

      const result = await installOpenSpecLocal(tempDir, {
        runPackageManager: runnerMock,
        recalculateStatus: vi.fn().mockResolvedValue(null),
      });

      // Afirmación sobre EL LLAMADO: no se invoca nada
      expect(runnerMock).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.code).toBe('no-manifest');
    });
  });

  // =========================================================================
  // 6.5 Requisito 2: El argv es exactamente el esperado para cada modo
  // =========================================================================
  describe('6.5: El argv es exactamente el esperado para cada modo (afirmación sobre EL LLAMADO)', () => {
    const fakePm = (name: 'pnpm' | 'npm' | 'yarn' | 'bun'): ResolvedPackageManager => ({
      name,
      executablePath: `/bin/${name}`,
      command: name,
      shell: false,
      displayPath: `/bin/${name}`,
    });

    it('local con pnpm llama con [add, -D, @fission-ai/openspec@latest]', async () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{"name":"test"}\n');
      const runnerMock = vi.fn().mockResolvedValue({ stdout: 'Done', stderr: '' });

      await installOpenSpecLocal(tempDir, {
        resolvePackageManager: () => fakePm('pnpm'),
        runPackageManager: runnerMock,
        git: { status: vi.fn().mockResolvedValue({ files: [{ path: 'package.json' }, { path: 'pnpm-lock.yaml' }] }) } as any,
        recalculateStatus: vi.fn().mockResolvedValue(null),
      });

      // Afirmación directa sobre los argumentos de la invocación
      expect(runnerMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'pnpm' }),
        ['add', '-D', '@fission-ai/openspec@latest'],
        expect.objectContaining({ cwd: tempDir }),
      );
    });

    it('global con pnpm llama con [add, -g, @fission-ai/openspec@latest]', async () => {
      const runnerMock = vi.fn().mockResolvedValue({ stdout: 'Done', stderr: '' });

      await installOpenSpecGlobal({
        resolvePackageManager: () => fakePm('pnpm'),
        runPackageManager: runnerMock,
        recalculateStatus: vi.fn().mockResolvedValue(null),
      });

      expect(runnerMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'pnpm' }),
        ['add', '-g', '@fission-ai/openspec@latest'],
        expect.any(Object),
      );
    });

    it('local con npm llama con [install, -D, @fission-ai/openspec@latest]', async () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{"name":"test"}\n');
      const runnerMock = vi.fn().mockResolvedValue({ stdout: 'Done', stderr: '' });

      await installOpenSpecLocal(tempDir, {
        resolvePackageManager: () => fakePm('npm'),
        runPackageManager: runnerMock,
        git: { status: vi.fn().mockResolvedValue({ files: [] }) } as any,
        recalculateStatus: vi.fn().mockResolvedValue(null),
      });

      expect(runnerMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'npm' }),
        ['install', '-D', '@fission-ai/openspec@latest'],
        expect.objectContaining({ cwd: tempDir }),
      );
    });

    it('global con npm llama con [install, -g, @fission-ai/openspec@latest]', async () => {
      const runnerMock = vi.fn().mockResolvedValue({ stdout: 'Done', stderr: '' });

      await installOpenSpecGlobal({
        resolvePackageManager: () => fakePm('npm'),
        runPackageManager: runnerMock,
        recalculateStatus: vi.fn().mockResolvedValue(null),
      });

      expect(runnerMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'npm' }),
        ['install', '-g', '@fission-ai/openspec@latest'],
        expect.any(Object),
      );
    });

    it('local con yarn llama con [add, -D, @fission-ai/openspec@latest]', async () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{"name":"test"}\n');
      const runnerMock = vi.fn().mockResolvedValue({ stdout: 'Done', stderr: '' });

      await installOpenSpecLocal(tempDir, {
        resolvePackageManager: () => fakePm('yarn'),
        runPackageManager: runnerMock,
        git: { status: vi.fn().mockResolvedValue({ files: [] }) } as any,
        recalculateStatus: vi.fn().mockResolvedValue(null),
      });

      expect(runnerMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'yarn' }),
        ['add', '-D', '@fission-ai/openspec@latest'],
        expect.any(Object),
      );
    });

    it('global con yarn llama con [global, add, @fission-ai/openspec@latest]', async () => {
      const runnerMock = vi.fn().mockResolvedValue({ stdout: 'Done', stderr: '' });

      await installOpenSpecGlobal({
        resolvePackageManager: () => fakePm('yarn'),
        runPackageManager: runnerMock,
        recalculateStatus: vi.fn().mockResolvedValue(null),
      });

      expect(runnerMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'yarn' }),
        ['global', 'add', '@fission-ai/openspec@latest'],
        expect.any(Object),
      );
    });

    it('local con bun llama con [add, -d, @fission-ai/openspec@latest]', async () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{"name":"test"}\n');
      const runnerMock = vi.fn().mockResolvedValue({ stdout: 'Done', stderr: '' });

      await installOpenSpecLocal(tempDir, {
        resolvePackageManager: () => fakePm('bun'),
        runPackageManager: runnerMock,
        git: { status: vi.fn().mockResolvedValue({ files: [] }) } as any,
        recalculateStatus: vi.fn().mockResolvedValue(null),
      });

      expect(runnerMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'bun' }),
        ['add', '-d', '@fission-ai/openspec@latest'],
        expect.any(Object),
      );
    });

    it('global con bun llama con [add, -g, @fission-ai/openspec@latest]', async () => {
      const runnerMock = vi.fn().mockResolvedValue({ stdout: 'Done', stderr: '' });

      await installOpenSpecGlobal({
        resolvePackageManager: () => fakePm('bun'),
        runPackageManager: runnerMock,
        recalculateStatus: vi.fn().mockResolvedValue(null),
      });

      expect(runnerMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'bun' }),
        ['add', '-g', '@fission-ai/openspec@latest'],
        expect.any(Object),
      );
    });

    it('permite especificar versión destino explícita en el paquete', () => {
      const args = getPackageManagerInstallArgs('pnpm', 'local', '@fission-ai/openspec@1.11.0');
      expect(args).toEqual(['add', '-D', '@fission-ai/openspec@1.11.0']);
    });
  });

  // =========================================================================
  // 6.5 Requisito 3: Ante fallo de permisos el estado del motor queda como estaba
  // =========================================================================
  describe('6.5: Ante fallo de permisos el estado del motor queda como estaba', () => {
    const fakeStatus: OpenSpecEngineStatus = {
      cli: {
        installed: true,
        runtimeVersion: '1.11.0',
        provenance: 'global',
        displayPath: '/usr/local/bin/openspec',
        supportedRange: { min: '1.5.0', max: '1.11.0' },
        versionClass: 'supported',
        evidenceStatus: 'confirmed',
        diagnostics: [],
      },
      latestAvailable: null,
      globalConfig: null,
      installedIntegration: null,
      repoState: 'initialized',
      integrationState: 'up-to-date',
      freshnessState: 'cli-up-to-date',
      divergence: {
        isDivergent: false,
        reason: null,
        overallStatus: 'convergent',
        globalProfileClass: 'core',
        repoProfileClass: 'core',
        targetConvergences: {},
      },
      doctor: null,
      contextBrief: null,
    };

    it('ante error EACCES en instalación global captura salida y conserva el estado previo del motor', async () => {
      const runnerMock = vi.fn().mockRejectedValue(
        Object.assign(new Error('EACCES: permission denied, mkdir /usr/local/lib/node_modules'), {
          code: 'EACCES',
          stderr: 'npm ERR! code EACCES\nnpm ERR! syscall mkdir\nnpm ERR! path /usr/local/lib/node_modules',
          stdout: '',
        }),
      );

      const recalculateStatusMock = vi.fn().mockResolvedValue(fakeStatus);

      const result = await installOpenSpecGlobal({
        resolvePackageManager: () => ({
          name: 'npm',
          executablePath: '/usr/bin/npm',
          command: 'npm',
          shell: false,
          displayPath: '/usr/bin/npm',
        }),
        runPackageManager: runnerMock,
        recalculateStatus: recalculateStatusMock,
      });

      // Afirmación sobre EL LLAMADO
      expect(runnerMock).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(false);
      expect(result.code).toBe('permission-denied');
      expect(result.stderr).toContain('EACCES');
      expect(recalculateStatusMock).toHaveBeenCalledTimes(1);
      // El estado del motor queda exactamente como estaba leído de disco
      expect(result.engineStatus).toEqual(fakeStatus);
      expect(result.engineStatus?.cli.runtimeVersion).toBe('1.11.0');
    });

    it('ante error EPERM en instalación local captura salida y conserva el estado previo del motor', async () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{"name":"test"}\n');

      const runnerMock = vi.fn().mockRejectedValue(
        Object.assign(new Error('EPERM: operation not permitted'), {
          code: 'EPERM',
          stderr: 'pnpm ERR! EPERM: operation not permitted',
          stdout: '',
        }),
      );

      const recalculateStatusMock = vi.fn().mockResolvedValue(fakeStatus);

      const result = await installOpenSpecLocal(tempDir, {
        resolvePackageManager: () => ({
          name: 'pnpm',
          executablePath: 'C:\\pnpm\\pnpm.cmd',
          command: 'pnpm.cmd',
          shell: true,
          displayPath: 'C:\\pnpm\\pnpm.cmd',
        }),
        runPackageManager: runnerMock,
        recalculateStatus: recalculateStatusMock,
      });

      expect(runnerMock).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(false);
      expect(result.code).toBe('permission-denied');
      expect(result.stderr).toContain('EPERM');
      expect(result.engineStatus).toEqual(fakeStatus);
    });
  });

  // =========================================================================
  // 6.5 Requisito 4: Prueba que ejercita el camino como lo registra main.ts (sin inyectar dependencias)
  // =========================================================================
  describe('6.5: Camino de producción como lo registra main.ts (sin dependencias inyectadas)', () => {
    it('ejercita el handler registrado de install-local tal como lo registra main.ts:325', async () => {
      const handlers = new Map<string, Function>();
      const mockIpc = {
        handle: (channel: string, listener: Function) => handlers.set(channel, listener),
      };

      // Registro idéntico al de electron/main.ts:325, SIN inyectar dependencias
      registerOpenSpecIpcHandlers({
        ipcMain: mockIpc as any,
        getUserDataDir: () => null,
      });

      const localHandler = handlers.get('pipeline:openspec:install-local');
      expect(localHandler).toBeDefined();

      // Autorizar el repositorio de prueba real en disco
      authorizedRepoStore.authorizeRepo(tempDir);

      // 1. Sobre un repositorio sin package.json, el camino real de producción
      // ejecuta la validación estricta de repo, la verificación de disco y devuelve no-manifest
      // sin dependencias simuladas.
      const resultNoManifest = await localHandler!({}, { repoPath: tempDir });
      expect(resultNoManifest.success).toBe(false);
      expect(resultNoManifest.code).toBe('no-manifest');
      expect(resultNoManifest.mode).toBe('local');

      // 2. Rechaza propiedades desconocidas en payload (seguridad IPC estricta)
      await expect(localHandler!({}, { repoPath: tempDir, maliciousKey: 'foo' })).rejects.toThrow(
        'IPC Security Error: Unknown payload property "maliciousKey"',
      );
    }, 30_000);

    it('ejercita el handler registrado de install-global tal como lo registra main.ts:325', async () => {
      const handlers = new Map<string, Function>();
      const mockIpc = {
        handle: (channel: string, listener: Function) => handlers.set(channel, listener),
      };

      registerOpenSpecIpcHandlers({
        ipcMain: mockIpc as any,
        getUserDataDir: () => null,
      });

      const globalHandler = handlers.get('pipeline:openspec:install-global');
      expect(globalHandler).toBeDefined();

      // Valida que el canal registrado en producción aplica la validación estricta de payload
      await expect(globalHandler!({}, { badKey: 'invalid' })).rejects.toThrow(
        'IPC Security Error: Unknown payload property "badKey"',
      );

      // Valida que si se envía una ruta de repositorio no autorizada, falla la validación estricta
      await expect(globalHandler!({}, { repoPath: 'C:\\unauthorized\\repo' })).rejects.toThrow(
        'IPC Security Error: Invalid or unauthorized repository path',
      );
    }, 30_000);

    it('rechaza targetVersion con metacaracteres de shell sin invocar el runner ni el comando de instalación', async () => {
      // 1. Validación pura del formato de versión o tag
      expect(isValidTargetVersion('1.11.0')).toBe(true);
      expect(isValidTargetVersion('latest')).toBe(true);
      expect(isValidTargetVersion('1.11.0 & echo SEGUNDO')).toBe(false);
      expect(isValidTargetVersion('1.11.0; calc')).toBe(false);
      expect(isValidTargetVersion('latest | whoami')).toBe(false);
      expect(isValidTargetVersion('`rm -rf /`')).toBe(false);
      expect(isValidTargetVersion('$(whoami)')).toBe(false);

      const runnerMock = vi.fn();
      const installLocalSpy = vi.fn();
      const installGlobalSpy = vi.fn();

      const handlers = new Map<string, Function>();
      const mockIpc = {
        handle: (channel: string, listener: Function) => handlers.set(channel, listener),
      };

      registerOpenSpecIpcHandlers({
        ipcMain: mockIpc as any,
        getUserDataDir: () => null,
        resolveRuntime: () => null,
        runVersionAnalysis: vi.fn().mockResolvedValue({ status: 'analyzed', analysis: {} } as any),
        checkLatest: vi.fn().mockResolvedValue({ isLatest: true, latestVersion: '1.11.0' } as any),
        installLocal: installLocalSpy,
        installGlobal: installGlobalSpy,
      });

      const localHandler = handlers.get('pipeline:openspec:install-local')!;
      const globalHandler = handlers.get('pipeline:openspec:install-global')!;
      authorizedRepoStore.authorizeRepo(tempDir);

      // 2. Invocación de install-local con metacarácter de shell (& echo SEGUNDO)
      const localResult = await localHandler({}, {
        repoPath: tempDir,
        targetVersion: '1.11.0 & echo SEGUNDO',
      });
      expect(localResult.success).toBe(false);
      expect(localResult.code).toBe('invalid-target-version');
      expect(installLocalSpy).not.toHaveBeenCalled();

      // 3. Invocación de install-global con metacarácter de shell (| dir)
      const globalResult = await globalHandler({}, {
        targetVersion: 'latest | dir',
      });
      expect(globalResult.success).toBe(false);
      expect(globalResult.code).toBe('invalid-target-version');
      expect(installGlobalSpy).not.toHaveBeenCalled();

      // 4. Verificación directa en installOpenSpecLocal: no invoca runnerMock
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{"name":"test"}\n');
      const directResult = await installOpenSpecLocal(tempDir, {
        targetPackage: '@fission-ai/openspec@1.11.0 & echo SEGUNDO',
        runPackageManager: runnerMock,
        resolvePackageManager: () => ({
          name: 'pnpm',
          executablePath: 'C:\\pnpm\\pnpm.cmd',
          command: 'pnpm.cmd',
          shell: true,
          displayPath: 'C:\\pnpm\\pnpm.cmd',
        }),
        recalculateStatus: vi.fn().mockResolvedValue(null),
      });
      expect(directResult.success).toBe(false);
      expect(directResult.code).toBe('invalid-target-version');
      expect(runnerMock).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 6.2 y 6.3: Contratos adicionales de archivos tocados y rutas devueltas
  // =========================================================================
  describe('6.2 y 6.3: Archivos tocados y comando devuelto', () => {
    it('6.2 devuelve la lista exacta de archivos tocados y no hace commit', async () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{"name":"test"}\n');

      const commitSpy = vi.fn();
      let statusCallCount = 0;
      const mockGit = {
        commit: commitSpy,
        status: vi.fn().mockImplementation(async () => {
          statusCallCount++;
          if (statusCallCount === 1) {
            // Estado previo a la instalación: ya había un archivo modificado ajeno
            return {
              files: [
                { path: 'components/unrelated-preexisting.ts', index: ' ', working_dir: 'M' },
              ],
            };
          }
          // Estado posterior a la instalación: contiene el archivo previo + los archivos tocados por pnpm
          return {
            files: [
              { path: 'components/unrelated-preexisting.ts', index: ' ', working_dir: 'M' },
              { path: 'package.json', index: ' ', working_dir: 'M' },
              { path: 'pnpm-lock.yaml', index: '?', working_dir: '?' },
            ],
          };
        }),
      };

      const result = await installOpenSpecLocal(tempDir, {
        resolvePackageManager: () => ({
          name: 'pnpm',
          executablePath: 'C:\\pnpm\\pnpm.cmd',
          command: 'pnpm.cmd',
          shell: true,
          displayPath: 'C:\\pnpm\\pnpm.cmd',
        }),
        runPackageManager: vi.fn().mockResolvedValue({ stdout: 'Added 1 package', stderr: '' }),
        git: mockGit as any,
        recalculateStatus: vi.fn().mockResolvedValue(null),
      });

      expect(result.success).toBe(true);
      // Afirmar que sólo aparecen los archivos tocados por la instalación, NO los previos
      expect(result.filesUpdated).toEqual(['package.json', 'pnpm-lock.yaml']);
      // Verifica que no se llamó a commit en git
      expect(commitSpy).not.toHaveBeenCalled();
    });

    it('6.3 devuelve el comando ejecutado y las rutas resueltas del gestor y de Node', async () => {
      const result = await installOpenSpecGlobal({
        resolvePackageManager: () => ({
          name: 'npm',
          executablePath: '/opt/homebrew/bin/npm',
          command: 'npm',
          shell: false,
          displayPath: '/opt/homebrew/bin/npm',
        }),
        resolveNode: () => ({
          name: 'node',
          executablePath: '/opt/homebrew/bin/node',
          command: 'node',
          shell: false,
          displayPath: '/opt/homebrew/bin/node',
        }),
        runPackageManager: vi.fn().mockResolvedValue({ stdout: 'installed @fission-ai/openspec', stderr: '' }),
        recalculateStatus: vi.fn().mockResolvedValue(null),
      });

      expect(result.success).toBe(true);
      expect(result.commandExecuted).toBe('npm install -g @fission-ai/openspec@latest');
      expect(result.packageManagerPath).toBe('/opt/homebrew/bin/npm');
      expect(result.nodePath).toBe('/opt/homebrew/bin/node');
    });
  });
});
