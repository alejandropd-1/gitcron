import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type IpcHandler = (_event: unknown, ...args: unknown[]) => Promise<unknown>;

const mockIpc = vi.hoisted(() => ({
  handlers: new Map<string, IpcHandler>(),
  handle: vi.fn((channel: string, handler: IpcHandler) => {
    mockIpc.handlers.set(channel, handler);
  }),
}));

const mockDialog = vi.hoisted(() => ({
  showOpenDialog: vi.fn(),
}));

const mockGit = vi.hoisted(() => ({
  checkIsRepo: vi.fn(),
  status: vi.fn(),
  raw: vi.fn(),
}));

const mockSimpleGit = vi.hoisted(() => vi.fn(() => mockGit));

vi.mock('electron', () => ({
  ipcMain: { handle: mockIpc.handle },
  dialog: mockDialog,
}));

vi.mock('simple-git', () => ({
  simpleGit: mockSimpleGit,
}));

describe('git repo IPC handlers', () => {
  let tempDir: string;
  let handler: (channel: string) => IpcHandler;

  beforeEach(async () => {
    mockIpc.handlers.clear();
    mockIpc.handle.mockClear();
    mockDialog.showOpenDialog.mockReset();
    mockSimpleGit.mockClear();
    mockGit.checkIsRepo.mockReset();
    mockGit.status.mockReset();
    mockGit.checkIsRepo.mockResolvedValue(false);
    mockGit.raw.mockReset();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitcron-open-repo-'));

    const { registerGitRepoHandlers } = await import('../../electron/ipc/git-repo');
    registerGitRepoHandlers();

    handler = (channel: string) => {
      const h = mockIpc.handlers.get(channel);
      if (!h) throw new Error(`No handler registered for channel: ${channel}`);
      return h;
    };
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('git:open-path returns a structured not-a-repo result for plain folders', async () => {
    const plainFolder = path.join(tempDir, 'plain-folder');
    fs.mkdirSync(plainFolder);

    const result = await handler('git:open-path')(null, plainFolder);

    expect(result).toMatchObject({
      success: false,
      ok: false,
      reason: 'not-a-repo',
      path: plainFolder,
    });
    expect(mockSimpleGit).toHaveBeenCalledWith(plainFolder);
    expect(mockGit.checkIsRepo).toHaveBeenCalledTimes(1);
    expect(mockGit.status).not.toHaveBeenCalled();
  });

  it('git:open-repo returns a structured not-a-repo result for the selected folder', async () => {
    const selectedFolder = path.join(tempDir, 'selected-folder');
    fs.mkdirSync(selectedFolder);
    mockDialog.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [selectedFolder],
    });

    const result = await handler('git:open-repo')(null);

    expect(result).toMatchObject({
      success: false,
      ok: false,
      reason: 'not-a-repo',
      path: selectedFolder,
    });
    expect(mockSimpleGit).toHaveBeenCalledWith(selectedFolder);
    expect(mockGit.checkIsRepo).toHaveBeenCalledTimes(1);
    expect(mockGit.status).not.toHaveBeenCalled();
  });

  it('git:apply-patch-file treats closing the picker as a no-op', async () => {
    mockDialog.showOpenDialog.mockResolvedValue({
      canceled: true,
      filePaths: [],
    });

    const result = await handler('git:apply-patch-file')(null, tempDir);

    expect(result).toMatchObject({ success: false, canceled: true });
    expect(mockGit.raw).not.toHaveBeenCalled();
  });

  it('git:apply-patch-file applies the selected patch in the active repo', async () => {
    const patchPath = path.join(tempDir, 'fix.diff');
    fs.writeFileSync(patchPath, 'diff --git a/a.txt b/a.txt\n');
    mockDialog.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [patchPath],
    });
    mockGit.raw.mockResolvedValue('');

    const result = await handler('git:apply-patch-file')(null, tempDir);

    expect(result).toEqual({
      success: true,
      data: { fileName: 'fix.diff' },
    });
    expect(mockSimpleGit).toHaveBeenCalledWith(tempDir);
    expect(mockGit.raw).toHaveBeenCalledWith(['apply', '--', patchPath]);
    expect(mockDialog.showOpenDialog).toHaveBeenCalledWith(expect.objectContaining({
      properties: ['openFile'],
      defaultPath: tempDir,
    }));
  });
});
