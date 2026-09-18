import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { archiveOpenSpecChange } from '../pipeline/openspec-archive';
import type { AuthorizedOpenSpecRuntime } from '../pipeline/openspec-engine';

const mockRuntime: AuthorizedOpenSpecRuntime = {
  executablePath: 'C:\\fake\\openspec.cmd',
  command: 'openspec.cmd',
  shell: true,
  displayPath: 'C:\\fake\\openspec.cmd',
  provenance: 'global',
};

describe('archiveOpenSpecChange — archivado por copia verificada en raíz temporal', () => {
  let repoPath: string;

  beforeEach(async () => {
    repoPath = await fs.mkdtemp(path.join(os.tmpdir(), 'gitcron-repo-test-'));
    // Estructura inicial del repo
    await fs.mkdir(path.join(repoPath, 'openspec', 'specs', 'cap-a'), { recursive: true });
    await fs.mkdir(path.join(repoPath, 'openspec', 'specs', 'cap-b'), { recursive: true });
    await fs.mkdir(path.join(repoPath, 'openspec', 'changes', 'mi-cambio', 'specs', 'cap-a'), { recursive: true });

    await fs.writeFile(path.join(repoPath, 'openspec', 'config.yaml'), 'version: "1.0"\n', 'utf8');
    await fs.writeFile(path.join(repoPath, 'openspec', 'specs', 'cap-a', 'spec.md'), '# Cap A original\n', 'utf8');
    await fs.writeFile(path.join(repoPath, 'openspec', 'specs', 'cap-b', 'spec.md'), '# Cap B para retirar\n', 'utf8');

    await fs.writeFile(path.join(repoPath, 'openspec', 'changes', 'mi-cambio', 'proposal.md'), '# Propuesta\n', 'utf8');
    await fs.writeFile(path.join(repoPath, 'openspec', 'changes', 'mi-cambio', 'tasks.md'), '- [x] 1.1 Tarea lista\n', 'utf8');
    await fs.writeFile(path.join(repoPath, 'openspec', 'changes', 'mi-cambio', 'specs', 'cap-a', 'spec.md'), '# Delta Cap A\n', 'utf8');
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(repoPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }).catch(() => {});
  });

  it('archiva exitosamente: mueve change a archive, sincroniza specs modificadas, elimina specs retiradas, borra original y limpia temporal', async () => {
    let capturedTmpRoot: string | null = null;

    const simulatedRunner = vi.fn(async (_runtime, args, options) => {
      expect(args).toEqual(['archive', 'mi-cambio', '--yes']);
      capturedTmpRoot = options.cwd;

      // Verificar que la raíz temporal contiene la estructura mínima requerida
      const tmpConfig = await fs.readFile(path.join(capturedTmpRoot!, 'openspec', 'config.yaml'), 'utf8');
      expect(tmpConfig).toBe('version: "1.0"\n');

      // Simular comportamiento del CLI dentro de tmpRoot:
      // 1. Modificar spec existente (cap-a)
      await fs.writeFile(
        path.join(capturedTmpRoot!, 'openspec', 'specs', 'cap-a', 'spec.md'),
        '# Cap A consolidado y actualizado\n',
        'utf8',
      );

      // 2. Retirar spec eliminada (cap-b)
      await fs.unlink(path.join(capturedTmpRoot!, 'openspec', 'specs', 'cap-b', 'spec.md'));
      await fs.rmdir(path.join(capturedTmpRoot!, 'openspec', 'specs', 'cap-b')).catch(() => {});

      // 3. Mover changes/mi-cambio a changes/archive/2026-09-18-mi-cambio
      const tmpChangeDir = path.join(capturedTmpRoot!, 'openspec', 'changes', 'mi-cambio');
      const tmpArchivedDir = path.join(capturedTmpRoot!, 'openspec', 'changes', 'archive', '2026-09-18-mi-cambio');
      await fs.mkdir(path.dirname(tmpArchivedDir), { recursive: true });
      await fs.rename(tmpChangeDir, tmpArchivedDir);

      return { stdout: 'Archived change mi-cambio\n', stderr: '' };
    });

    const result = await archiveOpenSpecChange(repoPath, 'mi-cambio', mockRuntime, {
      runOpenSpec: simulatedRunner,
    });

    expect(result.ok).toBe(true);
    expect(result.archivedDir).toBe('2026-09-18-mi-cambio');
    expect(result.error).toBeNull();
    expect(result.specsChanged).toContain('cap-a/spec.md');
    expect(result.specsRemoved).toContain('cap-b/spec.md');

    // Comprobaciones en el repositorio real:
    // a) Specs modificadas fueron actualizadas
    const updatedSpec = await fs.readFile(path.join(repoPath, 'openspec', 'specs', 'cap-a', 'spec.md'), 'utf8');
    expect(updatedSpec).toBe('# Cap A consolidado y actualizado\n');

    // b) Specs retiradas fueron borradas
    let capBExists = true;
    try {
      await fs.access(path.join(repoPath, 'openspec', 'specs', 'cap-b', 'spec.md'));
    } catch {
      capBExists = false;
    }
    expect(capBExists).toBe(false);

    // c) Carpeta archivada existe en el repositorio y contiene los artefactos originales
    const archivedProposal = await fs.readFile(
      path.join(repoPath, 'openspec', 'changes', 'archive', '2026-09-18-mi-cambio', 'proposal.md'),
      'utf8',
    );
    expect(archivedProposal).toBe('# Propuesta\n');

    const archivedTasks = await fs.readFile(
      path.join(repoPath, 'openspec', 'changes', 'archive', '2026-09-18-mi-cambio', 'tasks.md'),
      'utf8',
    );
    expect(archivedTasks).toBe('- [x] 1.1 Tarea lista\n');

    const archivedDeltaSpec = await fs.readFile(
      path.join(repoPath, 'openspec', 'changes', 'archive', '2026-09-18-mi-cambio', 'specs', 'cap-a', 'spec.md'),
      'utf8',
    );
    expect(archivedDeltaSpec).toBe('# Delta Cap A\n');

    // d) El cambio original en repo fue completamente eliminado
    let originalExists = true;
    try {
      await fs.access(path.join(repoPath, 'openspec', 'changes', 'mi-cambio'));
    } catch {
      originalExists = false;
    }
    expect(originalExists).toBe(false);

    // e) La raíz temporal fue limpiada por el bloque finally
    expect(capturedTmpRoot).not.toBeNull();
    let tmpExists = true;
    try {
      await fs.access(capturedTmpRoot!);
    } catch {
      tmpExists = false;
    }
    expect(tmpExists).toBe(false);
  });

  it('aborta sin tocar nada si las huellas del repositorio cambian durante la ejecución del CLI', async () => {
    let capturedTmpRoot: string | null = null;

    const simulatedRunner = vi.fn(async (_runtime, _args, options) => {
      capturedTmpRoot = options.cwd;

      // El CLI modifica su directorio temporal
      const tmpArchivedDir = path.join(capturedTmpRoot!, 'openspec', 'changes', 'archive', '2026-09-18-mi-cambio');
      await fs.mkdir(path.dirname(tmpArchivedDir), { recursive: true });
      await fs.rename(
        path.join(capturedTmpRoot!, 'openspec', 'changes', 'mi-cambio'),
        tmpArchivedDir,
      );

      // Simular mutación concurrente o externa en el repositorio original
      await fs.writeFile(
        path.join(repoPath, 'openspec', 'changes', 'mi-cambio', 'proposal.md'),
        '# Modificado concurrentemente\n',
        'utf8',
      );

      return { stdout: '', stderr: '' };
    });

    const result = await archiveOpenSpecChange(repoPath, 'mi-cambio', mockRuntime, {
      runOpenSpec: simulatedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('El repositorio fue modificado externamente');

    // Nada debió archivarse en repo
    let archiveExists = true;
    try {
      await fs.access(path.join(repoPath, 'openspec', 'changes', 'archive', '2026-09-18-mi-cambio'));
    } catch {
      archiveExists = false;
    }
    expect(archiveExists).toBe(false);

    // El change original se preservó
    const proposalContent = await fs.readFile(
      path.join(repoPath, 'openspec', 'changes', 'mi-cambio', 'proposal.md'),
      'utf8',
    );
    expect(proposalContent).toBe('# Modificado concurrentemente\n');

    // Temporal limpiado
    let tmpExists = true;
    try {
      await fs.access(capturedTmpRoot!);
    } catch {
      tmpExists = false;
    }
    expect(tmpExists).toBe(false);
  });

  it('falla limpiamente sin modificaciones si la carpeta de archivo ya existe en el repositorio', async () => {
    // Crear previamente la carpeta en el repositorio
    const existingArchiveDir = path.join(repoPath, 'openspec', 'changes', 'archive', '2026-09-18-mi-cambio');
    await fs.mkdir(existingArchiveDir, { recursive: true });
    await fs.writeFile(path.join(existingArchiveDir, 'preexistente.md'), 'ya estaba\n', 'utf8');

    let capturedTmpRoot: string | null = null;
    const simulatedRunner = vi.fn(async (_runtime, _args, options) => {
      capturedTmpRoot = options.cwd;
      const tmpArchivedDir = path.join(capturedTmpRoot!, 'openspec', 'changes', 'archive', '2026-09-18-mi-cambio');
      await fs.mkdir(path.dirname(tmpArchivedDir), { recursive: true });
      await fs.rename(
        path.join(capturedTmpRoot!, 'openspec', 'changes', 'mi-cambio'),
        tmpArchivedDir,
      );
      return { stdout: '', stderr: '' };
    });

    const result = await archiveOpenSpecChange(repoPath, 'mi-cambio', mockRuntime, {
      runOpenSpec: simulatedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('ya existe en el repositorio');

    // El archivo preexistente no se sobreescribió
    const preContent = await fs.readFile(path.join(existingArchiveDir, 'preexistente.md'), 'utf8');
    expect(preContent).toBe('ya estaba\n');

    // El change original en repo sigue intacto
    const originalProposal = await fs.readFile(
      path.join(repoPath, 'openspec', 'changes', 'mi-cambio', 'proposal.md'),
      'utf8',
    );
    expect(originalProposal).toBe('# Propuesta\n');

    // Temporal limpiado
    let tmpExists = true;
    try {
      await fs.access(capturedTmpRoot!);
    } catch {
      tmpExists = false;
    }
    expect(tmpExists).toBe(false);
  });

  it('devuelve el error real del CLI y no toca el repositorio si el proceso falla en el temporal', async () => {
    let capturedTmpRoot: string | null = null;
    const simulatedRunner = vi.fn(async (_runtime, _args, options) => {
      capturedTmpRoot = options.cwd;
      const error = new Error('Command failed: openspec archive');
      (error as any).stderr = 'Error: delta specs have unsatisfied dependencies in requirement X';
      throw error;
    });

    const result = await archiveOpenSpecChange(repoPath, 'mi-cambio', mockRuntime, {
      runOpenSpec: simulatedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('Error: delta specs have unsatisfied dependencies in requirement X');

    // El change original en repo sigue intacto
    const originalProposal = await fs.readFile(
      path.join(repoPath, 'openspec', 'changes', 'mi-cambio', 'proposal.md'),
      'utf8',
    );
    expect(originalProposal).toBe('# Propuesta\n');

    // Temporal limpiado
    let tmpExists = true;
    try {
      await fs.access(capturedTmpRoot!);
    } catch {
      tmpExists = false;
    }
    expect(tmpExists).toBe(false);
  });

  it('falla la verificación si la carpeta archivada en el temporal fue corrompida o falta un archivo del cambio', async () => {
    let capturedTmpRoot: string | null = null;
    const simulatedRunner = vi.fn(async (_runtime, _args, options) => {
      capturedTmpRoot = options.cwd;
      const tmpArchivedDir = path.join(capturedTmpRoot!, 'openspec', 'changes', 'archive', '2026-09-18-mi-cambio');
      await fs.mkdir(path.dirname(tmpArchivedDir), { recursive: true });
      await fs.rename(
        path.join(capturedTmpRoot!, 'openspec', 'changes', 'mi-cambio'),
        tmpArchivedDir,
      );
      // Corromper intencionalmente un archivo original en el temporal
      await fs.writeFile(path.join(tmpArchivedDir, 'proposal.md'), '# Propuesta adulterada\n', 'utf8');
      return { stdout: '', stderr: '' };
    });

    const result = await archiveOpenSpecChange(repoPath, 'mi-cambio', mockRuntime, {
      runOpenSpec: simulatedRunner,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Verificación fallida: el contenido de proposal.md difiere');

    // El change original en repo sigue intacto
    const originalProposal = await fs.readFile(
      path.join(repoPath, 'openspec', 'changes', 'mi-cambio', 'proposal.md'),
      'utf8',
    );
    expect(originalProposal).toBe('# Propuesta\n');
  });

  it('rechaza identificadores inválidos o carpetas inexistentes antes de tocar procesos o temporales', async () => {
    const resInvalid = await archiveOpenSpecChange(repoPath, 'invalido/../slug', mockRuntime);
    expect(resInvalid.ok).toBe(false);
    expect(resInvalid.error).toBe('invalid-change-id');

    const resNonExistent = await archiveOpenSpecChange(repoPath, 'no-existe', mockRuntime);
    expect(resNonExistent.ok).toBe(false);
    expect(resNonExistent.error).toContain('No existe la carpeta del cambio: no-existe');
  });

  it('reintenta el borrado si algún archivo del cambio presenta bloqueo transitorio', async () => {
    let sleepCount = 0;
    const customSleep = vi.fn(async (_ms: number) => {
      sleepCount++;
    });

    const simulatedRunner = vi.fn(async (_runtime, _args, options) => {
      const tmpArchivedDir = path.join(options.cwd, 'openspec', 'changes', 'archive', '2026-09-18-mi-cambio');
      await fs.mkdir(path.dirname(tmpArchivedDir), { recursive: true });
      await fs.rename(
        path.join(options.cwd, 'openspec', 'changes', 'mi-cambio'),
        tmpArchivedDir,
      );
      return { stdout: '', stderr: '' };
    });

    let failedOnce = false;
    const customUnlink = vi.fn(async (targetPath: string) => {
      if (!failedOnce && targetPath.includes('proposal.md')) {
        failedOnce = true;
        const err = new Error('EPERM: operation not permitted');
        (err as any).code = 'EPERM';
        throw err;
      }
      return fs.unlink(targetPath);
    });

    const result = await archiveOpenSpecChange(repoPath, 'mi-cambio', mockRuntime, {
      runOpenSpec: simulatedRunner,
      sleep: customSleep,
      unlink: customUnlink,
    });

    expect(result.ok).toBe(true);
    expect(failedOnce).toBe(true);
    expect(sleepCount).toBeGreaterThan(0);

    // Finalmente el archivo y carpeta fueron borrados
    let originalExists = true;
    try {
      await fs.access(path.join(repoPath, 'openspec', 'changes', 'mi-cambio'));
    } catch {
      originalExists = false;
    }
    expect(originalExists).toBe(false);
  });
});
