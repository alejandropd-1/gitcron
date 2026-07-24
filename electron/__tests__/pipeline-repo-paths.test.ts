import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveContainedRepoPath, safeReadRepoFile } from '../pipeline/repo-paths';

describe('Pipeline repo path containment', () => {
  let root: string;
  let outside: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'gitcron-pipeline-repo-'));
    outside = await fs.mkdtemp(path.join(os.tmpdir(), 'gitcron-pipeline-outside-'));
    await fs.writeFile(path.join(root, 'inside.txt'), 'safe');
    await fs.writeFile(path.join(outside, 'secret.txt'), 'outside');
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(outside, { recursive: true, force: true });
  });

  it('reads a regular contained file', async () => {
    await expect(resolveContainedRepoPath(root, 'inside.txt')).resolves.toBe(path.join(await fs.realpath(root), 'inside.txt'));
    await expect(safeReadRepoFile(root, 'inside.txt')).resolves.toMatchObject({ status: 'ok', content: 'safe' });
  });

  it('rejects traversal and absolute paths', async () => {
    await expect(safeReadRepoFile(root, '../secret.txt')).resolves.toMatchObject({ status: 'rejected' });
    await expect(safeReadRepoFile(root, path.join(outside, 'secret.txt'))).resolves.toMatchObject({ status: 'rejected' });
  });

  it('rejects a symlink that resolves outside the repo', async () => {
    const link = path.join(root, 'escape.txt');
    try {
      await fs.symlink(path.join(outside, 'secret.txt'), link, 'file');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EPERM') return;
      throw error;
    }
    await expect(safeReadRepoFile(root, 'escape.txt')).resolves.toMatchObject({ status: 'rejected' });
  });

  it('degrades a missing file without failing the snapshot', async () => {
    await expect(safeReadRepoFile(root, 'missing.jsonl')).resolves.toMatchObject({ status: 'missing', content: null });
  });

  it('enforces an explicit byte limit', async () => {
    await expect(safeReadRepoFile(root, 'inside.txt', { maxBytes: 2 })).resolves.toMatchObject({ status: 'too-large' });
  });

  it('degrades when a file disappears between stat and read', async () => {
    const target = path.join(root, 'inside.txt');
    const io = {
      stat: fs.stat,
      readFile: async () => {
        await fs.rm(target);
        const error = new Error('gone') as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        throw error;
      },
    };
    await expect(safeReadRepoFile(root, 'inside.txt', {}, io as never)).resolves.toMatchObject({
      status: 'missing', diagnostics: [{ code: 'file.disappeared' }],
    });
  });
});
