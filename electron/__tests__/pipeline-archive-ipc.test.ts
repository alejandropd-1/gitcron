import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SIGNATURE_TASK_TEXT } from '../pipeline/change-commit-manifest';
import type { ArchiveGit, ReadRepoFile, WriteRepoFile } from '../ipc/pipeline-archive';

type Handler = (_event: unknown, ...args: unknown[]) => unknown;
const ipc = vi.hoisted(() => ({
  handlers: new Map<string, Handler>(),
  handle: vi.fn((channel: string, handler: Handler) => ipc.handlers.set(channel, handler)),
}));

vi.mock('electron', () => ({ ipcMain: { handle: ipc.handle } }));

/**
 * Archivar escribe en el repositorio, así que vive fuera del módulo de snapshot
 * —cuyo contrato declara que no acepta operaciones de escritura— y valida el
 * slug antes de que llegue a un proceso.
 *
 * Lo que se fija acá es la orquestación y, sobre todo, sus caminos de fallo: el
 * orden importa porque archivar mueve el directorio, y frenar a tiempo evita
 * dejar el repositorio a mitad de camino sin decirlo.
 */
describe('IPC de archivado de un change', () => {
  const binding = { resolveBinding: vi.fn(async () => ({ repoId: 'r1', canonicalPath: 'C:/repo-real' })) };

  function fakeGit(changed: string[] = []): ArchiveGit & { added: string[][]; commits: string[] } {
    const added: string[][] = [];
    const commits: string[] = [];
    return {
      added,
      commits,
      changedFiles: async () => changed,
      add: async (_repo, files) => { added.push(files); },
      commit: async (_repo, message) => { commits.push(message); },
    };
  }

  beforeEach(() => {
    ipc.handlers.clear();
    ipc.handle.mockClear();
    binding.resolveBinding.mockClear();
  });

  /** Manifiesto y tareas en memoria: la orquestación no depende del disco. */
  function fakeRead(manifest: string | null, tasks: string | null): ReadRepoFile {
    return async (_repo, relative) => {
      if (relative.endsWith('/commit.md')) return manifest;
      if (relative.endsWith('/tasks.md')) return tasks;
      return null;
    };
  }

  const MANIFEST = [
    '## Mensaje',
    '',
    'feat: el trabajo',
    '',
    '## Archivos',
    '',
    '- components/algo.tsx',
    '',
  ].join('\n');

  async function register(
    archive: (repoPath: string, changeId: string) => Promise<{ ok: boolean; error: string | null }>,
    git: ArchiveGit,
    read: ReadRepoFile = fakeRead(null, null),
  ) {
    const written: Array<{ relative: string; content: string }> = [];
    const write: WriteRepoFile = async (_repo, relative, content) => { written.push({ relative, content }); };
    const { registerPipelineArchiveHandlers } = await import('../ipc/pipeline-archive');
    registerPipelineArchiveHandlers(() => null, archive, binding as never, git, read, write);
    return {
      plan: ipc.handlers.get('pipeline:archive-plan')!,
      run: ipc.handlers.get('pipeline:archive-change')!,
      written,
    };
  }

  const ok = async () => ({ ok: true, error: null });

  it('archiva sobre la ruta canónica y declara éxito sólo si el CLI lo dice', async () => {
    const archive = vi.fn(ok);
    const { run } = await register(archive, fakeGit());
    await expect(run(null, 'C:/repo', 'mi-cambio', false)).resolves.toEqual({ success: true });
    // La ruta canónica es la misma identidad que usa la evidencia: si divergieran
    // se archivaría en un repositorio distinto del que la vista muestra.
    expect(archive).toHaveBeenCalledWith('C:/repo-real', 'mi-cambio');
  });

  it('propaga el motivo real del CLI cuando falla', async () => {
    const archive = vi.fn(async () => ({ ok: false, error: "Requirement 'X' not found" }));
    const { run } = await register(archive, fakeGit());
    await expect(run(null, 'C:/repo', 'mi-cambio', false))
      .resolves.toMatchObject({ success: false, error: "Requirement 'X' not found", stage: 'archive' });
  });

  it('rechaza todo slug capaz de tocar el shell o escapar del repo', async () => {
    const archive = vi.fn(ok);
    const { run } = await register(archive, fakeGit());
    const peligrosos = [
      'mal slug', 'UPPER', '../escape', '..\\escape', 'x; rm -rf /', 'a && b',
      'a|b', 'a`b`', "a'b", 'a"b', 'a$b', 'a\nb', '/abs/path', '',
    ];
    for (const slug of peligrosos) {
      await expect(run(null, 'C:/repo', slug, false)).resolves.toMatchObject({ success: false });
    }
    expect(archive).not.toHaveBeenCalled();
  });

  it('rechaza una ruta de repositorio inválida', async () => {
    const archive = vi.fn(ok);
    const { run } = await register(archive, fakeGit());
    await expect(run(null, '', 'mi-cambio', false)).resolves.toMatchObject({ success: false });
    await expect(run(null, 42, 'mi-cambio', false)).resolves.toMatchObject({ success: false });
    expect(archive).not.toHaveBeenCalled();
  });

  it('no declara éxito si resolver el repositorio falla', async () => {
    binding.resolveBinding.mockRejectedValueOnce(new Error('no es un repo'));
    const archive = vi.fn(ok);
    const { run } = await register(archive, fakeGit());
    await expect(run(null, 'C:/repo', 'mi-cambio', false)).resolves.toMatchObject({ success: false });
    expect(archive).not.toHaveBeenCalled();
  });

  it('sin confirmación de commit no toca Git', async () => {
    const git = fakeGit(['components/algo.tsx']);
    const { run } = await register(vi.fn(ok), git);
    await expect(run(null, 'C:/repo', 'mi-cambio', false)).resolves.toEqual({ success: true });
    expect(git.added).toEqual([]);
    expect(git.commits).toEqual([]);
  });

  it('el plan separa lo que entra de lo que queda fuera', async () => {
    // Sin manifiesto en disco, sólo entran las rutas deterministas del cambio.
    const git = fakeGit(['openspec/changes/mi-cambio/tasks.md', 'components/otro-change.tsx']);
    const { plan } = await register(vi.fn(ok), git);
    const result = await plan(null, 'C:/repo', 'mi-cambio') as { success: boolean; data: { included: string[]; excluded: string[]; archiveMessage: string } };
    expect(result.success).toBe(true);
    expect(result.data.included).toEqual(['openspec/changes/mi-cambio/tasks.md']);
    // Lo de otros cambios en curso queda a la vista, para que una omisión del
    // manifiesto se note antes de confirmar y no después.
    expect(result.data.excluded).toEqual(['components/otro-change.tsx']);
    expect(result.data.archiveMessage).toBe('chore(openspec): archivar mi-cambio');
  });

  it('commitea el trabajo con la lista declarada y después archiva', async () => {
    const archive = vi.fn(ok);
    const git = fakeGit(['components/algo.tsx', 'openspec/changes/mi-cambio/tasks.md']);
    const { run } = await register(archive, git, fakeRead(MANIFEST, `- [ ] 1.1 ${SIGNATURE_TASK_TEXT}
`));

    await expect(run(null, 'C:/repo', 'mi-cambio', true)).resolves.toEqual({ success: true });
    // Lista explícita de archivos, nunca un directorio.
    expect(git.added[0]).toEqual(['components/algo.tsx', 'openspec/changes/mi-cambio/tasks.md']);
    expect(git.commits[0]).toBe('feat: el trabajo');
    expect(archive).toHaveBeenCalledWith('C:/repo-real', 'mi-cambio');
    expect(git.commits[1]).toBe('chore(openspec): archivar mi-cambio');
  });

  it('no archiva si falla el commit del trabajo', async () => {
    const archive = vi.fn(ok);
    const git = fakeGit(['components/algo.tsx']);
    git.commit = async () => { throw new Error('nada para commitear'); };
    const { run } = await register(archive, git, fakeRead(MANIFEST, null));

    await expect(run(null, 'C:/repo', 'mi-cambio', true))
      .resolves.toMatchObject({ success: false, stage: 'work-commit' });
    // La garantía que importa: archivar es irreversible, así que no ocurre tras
    // un fallo previo. Dejar el change archivado con su trabajo sin commitear
    // sería un estado peor y bastante menos evidente.
    expect(archive).not.toHaveBeenCalled();
  });

  it('informa sin declarar éxito si falla el commit del archivado', async () => {
    const archive = vi.fn(ok);
    // Hace falta que el paso 4 tenga algo que commitear: la spec consolidada.
    const git = fakeGit(['components/algo.tsx', 'openspec/specs/una-capacidad/spec.md']);
    let calls = 0;
    git.commit = async (_repo, message) => {
      calls += 1;
      if (calls === 2) throw new Error('conflicto al commitear el archivado');
      git.commits.push(message);
    };
    const { run } = await register(archive, git, fakeRead(MANIFEST, null));

    await expect(run(null, 'C:/repo', 'mi-cambio', true))
      .resolves.toMatchObject({ success: false, stage: 'archive-commit' });
    // El archivado ya ocurrió: se informa tal cual, sin fingir que no pasó.
    expect(archive).toHaveBeenCalled();
  });

  it('nunca publica: sólo hay commits, jamás push, merge ni tag', async () => {
    const git = fakeGit(['openspec/changes/mi-cambio/tasks.md']);
    const surface = Object.keys(git);
    expect(surface).not.toContain('push');
    expect(surface).not.toContain('merge');
    expect(surface).not.toContain('tag');
    const { run } = await register(vi.fn(ok), git);
    await run(null, 'C:/repo', 'mi-cambio', true);
    // El único mensaje posible es el del archivado: sin manifiesto no hay commit
    // del trabajo, y publicar no está en la superficie inyectada.
    expect(git.commits.every((message) => message.startsWith('chore(openspec): archivar'))).toBe(true);
  });
});
