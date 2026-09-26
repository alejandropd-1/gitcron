import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { simpleGit } from 'simple-git';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerOpenSpecIpcHandlers } from '../ipc/pipeline-openspec';
import { authorizedRepoStore } from '../ipc/authorized-repos';
import { removeLegacySkills } from '../pipeline/openspec-legacy-skills';

describe('6.3: Canales para retirar copias viejas (legacy-skills-plan y remove-legacy-skills)', () => {
  let tempDir: string;
  let handlers: Map<string, Function>;
  let mockIpc: { handle: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitcron-legacy-test-'));
    authorizedRepoStore.clear();

    handlers = new Map();
    mockIpc = {
      handle: vi.fn((channel: string, handler: Function) => {
        handlers.set(channel, handler);
      }),
    };

    registerOpenSpecIpcHandlers({
      ipcMain: mockIpc as any,
      getUserDataDir: () => null,
    });

    // Inicializar repositorio Git real
    const git = simpleGit(tempDir);
    await git.init();
    await git.addConfig('user.name', 'GitCron Test');
    await git.addConfig('user.email', 'test@gitcronos.local');
    await git.addConfig('commit.gpgsign', 'false');
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
    vi.restoreAllMocks();
  });

  it('pipeline:openspec:legacy-skills-plan clasifica seguida limpia, no seguida y con cambios', async () => {
    authorizedRepoStore.authorizeRepo(tempDir);

    // 1. Crear estructura de skills viejos en .codex con nombres oficiales
    const cleanDir = path.join(tempDir, '.codex', 'skills', 'openspec-explore');
    const modDir = path.join(tempDir, '.codex', 'skills', 'openspec-apply-change');
    const untrackedDir = path.join(tempDir, '.codex', 'skills', 'openspec-archive-change');

    fs.mkdirSync(cleanDir, { recursive: true });
    fs.mkdirSync(modDir, { recursive: true });
    fs.mkdirSync(untrackedDir, { recursive: true });

    fs.writeFileSync(path.join(cleanDir, 'SKILL.md'), '---\ngeneratedBy: "1.5.0"\n---\nClean skill\n', 'utf-8');
    fs.writeFileSync(path.join(modDir, 'SKILL.md'), '---\ngeneratedBy: "1.5.0"\n---\nMod skill original\n', 'utf-8');
    fs.writeFileSync(path.join(untrackedDir, 'SKILL.md'), '---\ngeneratedBy: "1.5.0"\n---\nUntracked skill\n', 'utf-8');

    // 2. Committear clean y mod; dejar untracked sin agregar
    const git = simpleGit(tempDir);
    await git.add([
      path.join('.codex', 'skills', 'openspec-explore', 'SKILL.md'),
      path.join('.codex', 'skills', 'openspec-apply-change', 'SKILL.md'),
    ]);
    await git.commit('commit de prueba');

    // 3. Modificar openspec-apply-change
    fs.writeFileSync(path.join(modDir, 'SKILL.md'), '---\ngeneratedBy: "1.5.0"\n---\nMod skill modificado\n', 'utf-8');

    const planHandler = handlers.get('pipeline:openspec:legacy-skills-plan');
    expect(planHandler).toBeDefined();

    const result = await planHandler!({}, { repoPath: tempDir });
    expect(result).toHaveProperty('items');

    const cleanItem = result.items.find((i: any) => i.name === 'openspec-explore');
    const modItem = result.items.find((i: any) => i.name === 'openspec-apply-change');
    const untrackedItem = result.items.find((i: any) => i.name === 'openspec-archive-change');

    // Seguida y limpia -> removable: true
    expect(cleanItem).toBeDefined();
    expect(cleanItem.removable).toBe(true);
    expect(cleanItem.origin).toBe('legacy-codex');

    // Con cambios -> removable: false, reason: 'modified'
    expect(modItem).toBeDefined();
    expect(modItem.removable).toBe(false);
    expect(modItem.reason).toBe('modified');

    // No seguida -> removable: false, reason: 'untracked'
    expect(untrackedItem).toBeDefined();
    expect(untrackedItem.removable).toBe(false);
    expect(untrackedItem.reason).toBe('untracked');
  }, 20000);

  it('pipeline:openspec:legacy-skills-plan rechaza repositorios no autorizados o payload con claves de más', async () => {
    const planHandler = handlers.get('pipeline:openspec:legacy-skills-plan');
    expect(planHandler).toBeDefined();

    // No autorizado
    await expect(planHandler!({}, { repoPath: 'C:\\unauthorized\\repo' })).rejects.toThrow(
      'IPC Security Error: Invalid or unauthorized repository path',
    );

    // Claves de más
    authorizedRepoStore.authorizeRepo(tempDir);
    await expect(planHandler!({}, { repoPath: tempDir, extraParam: 'hack' })).rejects.toThrow(
      'IPC Security Error: Unknown payload property "extraParam"',
    );
  });

  it('pipeline:openspec:remove-legacy-skills borra sólo retirables, no confirma en Git y devuelve engineStatus', async () => {
    authorizedRepoStore.authorizeRepo(tempDir);

    const cleanDir = path.join(tempDir, '.codex', 'skills', 'openspec-explore');
    const modDir = path.join(tempDir, '.codex', 'skills', 'openspec-apply-change');
    const untrackedDir = path.join(tempDir, '.codex', 'skills', 'openspec-archive-change');
    const openspecDir = path.join(tempDir, 'openspec');
    fs.mkdirSync(openspecDir, { recursive: true });
    fs.writeFileSync(path.join(openspecDir, 'config.yaml'), 'schema: spec-driven\n', 'utf-8');

    fs.mkdirSync(cleanDir, { recursive: true });
    fs.mkdirSync(modDir, { recursive: true });
    fs.mkdirSync(untrackedDir, { recursive: true });

    fs.writeFileSync(path.join(cleanDir, 'SKILL.md'), '---\ngeneratedBy: "1.5.0"\n---\nClean skill\n', 'utf-8');
    fs.writeFileSync(path.join(modDir, 'SKILL.md'), '---\ngeneratedBy: "1.5.0"\n---\nMod skill original\n', 'utf-8');
    fs.writeFileSync(path.join(untrackedDir, 'SKILL.md'), '---\ngeneratedBy: "1.5.0"\n---\nUntracked skill\n', 'utf-8');

    const git = simpleGit(tempDir);
    await git.add([
      path.join('.codex', 'skills', 'openspec-explore', 'SKILL.md'),
      path.join('.codex', 'skills', 'openspec-apply-change', 'SKILL.md'),
    ]);
    const commitResult = await git.commit('commit inicial');
    const headCommitBefore = commitResult.commit;

    // Modificar mod
    fs.writeFileSync(path.join(modDir, 'SKILL.md'), '---\ngeneratedBy: "1.5.0"\n---\nMod skill modificado\n', 'utf-8');

    const removeHandler = handlers.get('pipeline:openspec:remove-legacy-skills');
    expect(removeHandler).toBeDefined();

    const result = await removeHandler!({}, { repoPath: tempDir });

    // 1. Borró sólo la limpia y retirable
    expect(result.removed).toHaveLength(1);
    expect(path.normalize(result.removed[0])).toBe(path.normalize(cleanDir));
    expect(fs.existsSync(cleanDir)).toBe(false);

    // 2. Omitió las no retirables
    const skippedMod = result.skipped.find((s: any) => path.normalize(s.path) === path.normalize(modDir));
    const skippedUntracked = result.skipped.find((s: any) => path.normalize(s.path) === path.normalize(untrackedDir));
    expect(skippedMod).toEqual({ path: modDir, reason: 'modified' });
    expect(skippedUntracked).toEqual({ path: untrackedDir, reason: 'untracked' });
    expect(fs.existsSync(modDir)).toBe(true);
    expect(fs.existsSync(untrackedDir)).toBe(true);

    // 3. NO confirmó nada en Git
    const headCommitAfter = (await git.revparse(['HEAD'])).trim();
    expect(headCommitAfter).toBe(headCommitBefore);

    // 4. El borrado queda como cambio no confirmado en el working tree
    const status = await git.status();
    const deletedClean = status.deleted.some((p) => p.includes('openspec-explore'));
    expect(deletedClean).toBe(true);

    // 5. Devuelve engineStatus recalculado
    expect(result.engineStatus).toBeDefined();
    expect(result.engineStatus.repoState).toBe('initialized');
  }, 20000);

  it('pipeline:openspec:remove-legacy-skills rechaza repositorios no autorizados o payload con claves de más', async () => {
    const removeHandler = handlers.get('pipeline:openspec:remove-legacy-skills');
    expect(removeHandler).toBeDefined();

    // No autorizado
    await expect(removeHandler!({}, { repoPath: 'C:\\unauthorized\\repo' })).rejects.toThrow(
      'IPC Security Error: Invalid or unauthorized repository path',
    );

    // Claves de más
    authorizedRepoStore.authorizeRepo(tempDir);
    await expect(removeHandler!({}, { repoPath: tempDir, extraKeys: true })).rejects.toThrow(
      'IPC Security Error: Unknown payload property "extraKeys"',
    );
  });

  it('removeLegacySkills con rm inyectado que rechaza empuja skipped con remove-failed', async () => {
    const cleanDir = path.join(tempDir, '.codex', 'skills', 'openspec-explore');
    fs.mkdirSync(cleanDir, { recursive: true });
    fs.writeFileSync(path.join(cleanDir, 'SKILL.md'), '---\ngeneratedBy: "1.5.0"\n---\nClean skill\n', 'utf-8');

    const git = simpleGit(tempDir);
    await git.add([path.join('.codex', 'skills', 'openspec-explore', 'SKILL.md')]);
    await git.commit('commit clean skill');

    const failingRm = vi.fn().mockRejectedValue(new Error('EBUSY: resource locked'));
    const mockBuildStatus = vi.fn().mockResolvedValue({ repoState: 'initialized', integrationState: 'outdated' } as any);

    const result = await removeLegacySkills(tempDir, {
      rm: failingRm,
      buildStatusSnapshot: mockBuildStatus,
    });

    expect(failingRm).toHaveBeenCalled();
    expect(result.removed).toHaveLength(0);
    const failedItem = result.skipped.find((s) => path.normalize(s.path) === path.normalize(cleanDir));
    expect(failedItem).toEqual({ path: cleanDir, reason: 'remove-failed' });
  });
});
