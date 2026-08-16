import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { simpleGit } from 'simple-git';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseDivergenceCounts, readBranchDivergence } from '../pipeline/branch-divergence';

/**
 * Cuánto se aparta la rama actual de la base local.
 *
 * Existe porque `git checkout -b` no dice de dónde sale la rama, y este
 * repositorio tiene ramas deliberadamente sin fusionar a 500 commits de `main`.
 * El caso que más importa acá es el negativo: cuando no se puede medir, la
 * respuesta es «no se midió» y no un cero, porque un cero afirma que la rama
 * está al día.
 */

describe('parseDivergenceCounts', () => {
  it('lee los dos enteros que devuelve el CLI', () => {
    expect(parseDivergenceCounts('501\t0\n')).toEqual({ behind: 501, ahead: 0 });
    expect(parseDivergenceCounts('  296   1  ')).toEqual({ behind: 296, ahead: 1 });
  });

  it('una salida que no se entiende no se lee como ceros', () => {
    // Interpretar lo desconocido como cero afirmaría que está al día.
    expect(parseDivergenceCounts('')).toBeNull();
    expect(parseDivergenceCounts('fatal: bad revision')).toBeNull();
    expect(parseDivergenceCounts('3')).toBeNull();
    expect(parseDivergenceCounts('3 4 5')).toBeNull();
    expect(parseDivergenceCounts('-1 2')).toBeNull();
  });
});

describe('readBranchDivergence', { timeout: 15_000 }, () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'gitcron-branch-divergence-'));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true }).catch(() => undefined);
  });

  async function commit(git: ReturnType<typeof simpleGit>, name: string) {
    await fs.writeFile(path.join(root, name), name);
    await git.add(name);
    await git.commit(name);
  }

  it('mide los commits que faltan y los propios', async () => {
    const git = simpleGit(root);
    await git.init(['--initial-branch=main']);
    await git.addConfig('user.email', 'test@example.com');
    await git.addConfig('user.name', 'Test');
    await commit(git, 'base.txt');
    await git.checkoutLocalBranch('vieja');
    await commit(git, 'propio.txt');
    await git.checkout('main');
    await commit(git, 'nuevo-1.txt');
    await commit(git, 'nuevo-2.txt');
    await git.checkout('vieja');

    const divergence = await readBranchDivergence(root);

    // Dos números y no uno: distinguen «rama vieja ya fusionada» de «rama con
    // trabajo sin fusionar a propósito», que piden respuestas distintas.
    expect(divergence).toEqual({ measured: true, base: 'main', behind: 2, ahead: 1 });
  });

  it('parado en la base, sin divergencia', async () => {
    const git = simpleGit(root);
    await git.init(['--initial-branch=main']);
    await git.addConfig('user.email', 'test@example.com');
    await git.addConfig('user.name', 'Test');
    await commit(git, 'base.txt');

    expect(await readBranchDivergence(root)).toEqual({ measured: true, base: 'main', behind: 0, ahead: 0 });
  });

  it('sin la rama base la respuesta es «no se midió», no un cero', async () => {
    // Un repositorio con otra rama principal es un caso normal, no un error que
    // merezca romper el resto de la evidencia.
    const git = simpleGit(root);
    await git.init(['--initial-branch=trunk']);
    await git.addConfig('user.email', 'test@example.com');
    await git.addConfig('user.name', 'Test');
    await commit(git, 'base.txt');

    expect(await readBranchDivergence(root)).toEqual({ measured: false });
  });

  it('fuera de un repositorio tampoco inventa un cero', async () => {
    expect(await readBranchDivergence(root)).toEqual({ measured: false });
  });
});
