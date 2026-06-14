import { describe, expect, it } from 'vitest';
import { buildHunkPatch, parseUnifiedDiff } from '../hunk-patch';

describe('hunk-patch', () => {
  it('parses a simple modification and rebuilds its hunk patch', () => {
    const raw = [
      'diff --git a/src/app.ts b/src/app.ts',
      'index 1111111..2222222 100644',
      '--- a/src/app.ts',
      '+++ b/src/app.ts',
      '@@ -1,3 +1,3 @@',
      ' const name = "GitCron";',
      '-const mode = "file";',
      '+const mode = "hunk";',
      ' export { name, mode };',
    ].join('\n');

    const diff = parseUnifiedDiff(raw);

    expect(diff.filePath).toBe('src/app.ts');
    expect(diff.hunks).toHaveLength(1);
    expect(diff.hunks[0]).toMatchObject({
      oldStart: 1,
      oldLines: 3,
      newStart: 1,
      newLines: 3,
    });
    expect(diff.hunks[0].lines.map((line) => line.type)).toEqual(['context', 'remove', 'add', 'context']);
    expect(diff.hunks[0].lines[1].oldLineNumber).toBe(2);
    expect(diff.hunks[0].lines[1].newLineNumber).toBeUndefined();
    expect(diff.hunks[0].lines[2].oldLineNumber).toBeUndefined();
    expect(diff.hunks[0].lines[2].newLineNumber).toBe(2);
    expect(buildHunkPatch(diff, 0)).toBe(`${raw}\n`);
  });

  it('builds a patch for only the selected hunk in a multi-hunk diff', () => {
    const raw = [
      'diff --git a/src/app.ts b/src/app.ts',
      'index 1111111..2222222 100644',
      '--- a/src/app.ts',
      '+++ b/src/app.ts',
      '@@ -1,3 +1,3 @@',
      ' alpha',
      '-beta',
      '+bravo',
      ' gamma',
      '@@ -10,3 +10,3 @@',
      ' one',
      '-two',
      '+dos',
      ' three',
    ].join('\n');

    const diff = parseUnifiedDiff(raw);
    const patch = buildHunkPatch(diff, 1);

    expect(diff.hunks).toHaveLength(2);
    expect(patch).toContain('diff --git a/src/app.ts b/src/app.ts\n');
    expect(patch).toContain('@@ -10,3 +10,3 @@\n one\n-two\n+dos\n three\n');
    expect(patch).not.toContain('@@ -1,3 +1,3 @@');
    expect(patch).not.toContain('+bravo');
  });

  it('builds a partial patch for selected modification lines inside one hunk', () => {
    const raw = [
      'diff --git a/src/app.ts b/src/app.ts',
      'index 1111111..2222222 100644',
      '--- a/src/app.ts',
      '+++ b/src/app.ts',
      '@@ -1,4 +1,4 @@',
      ' one',
      '-two',
      '-three',
      '+dos',
      '+tres',
      ' four',
    ].join('\n');

    const diff = parseUnifiedDiff(raw);
    const patch = buildHunkPatch(diff, 0, { selectedLines: [1, 3] });

    expect(patch).toBe([
      'diff --git a/src/app.ts b/src/app.ts',
      'index 1111111..2222222 100644',
      '--- a/src/app.ts',
      '+++ b/src/app.ts',
      '@@ -1,4 +1,4 @@',
      ' one',
      '-two',
      '+dos',
      ' three',
      ' four',
      '',
    ].join('\n'));
  });

  it('keeps paired modification lines together when only one side is selected', () => {
    const raw = [
      'diff --git a/package.json b/package.json',
      'index 1111111..2222222 100644',
      '--- a/package.json',
      '+++ b/package.json',
      '@@ -23,7 +23,7 @@',
      '   },',
      '   "devDependencies": {',
      '     "@types/node": "^20",',
      '-    "@types/react": "^19",',
      '+    "@types/react": "^129",',
      '     "@types/react-dom": "^19",',
      '     "eslint": "^9.0.0",',
      '     "eslint-config-next": "15.1.0"',
    ].join('\n');

    const diff = parseUnifiedDiff(raw);
    const patch = buildHunkPatch(diff, 0, { selectedLines: [3] });

    expect(patch).toContain('-    "@types/react": "^19",\n+    "@types/react": "^129",');
    expect(patch).toContain('@@ -23,7 +23,7 @@');
  });

  it('omits unselected additions when building a partial insertion patch', () => {
    const raw = [
      'diff --git a/src/app.ts b/src/app.ts',
      'index 1111111..2222222 100644',
      '--- a/src/app.ts',
      '+++ b/src/app.ts',
      '@@ -1,2 +1,4 @@',
      ' alpha',
      '+beta',
      '+bonus',
      ' gamma',
    ].join('\n');

    const diff = parseUnifiedDiff(raw);
    const patch = buildHunkPatch(diff, 0, { selectedLines: [1] });

    expect(patch).toBe([
      'diff --git a/src/app.ts b/src/app.ts',
      'index 1111111..2222222 100644',
      '--- a/src/app.ts',
      '+++ b/src/app.ts',
      '@@ -1,2 +1,3 @@',
      ' alpha',
      '+beta',
      ' gamma',
      '',
    ].join('\n'));
  });

  it('rejects partial patches without selected changed lines', () => {
    const raw = [
      'diff --git a/src/app.ts b/src/app.ts',
      'index 1111111..2222222 100644',
      '--- a/src/app.ts',
      '+++ b/src/app.ts',
      '@@ -1,2 +1,2 @@',
      ' alpha',
      '-beta',
      '+bravo',
    ].join('\n');

    const diff = parseUnifiedDiff(raw);

    expect(() => buildHunkPatch(diff, 0, { selectedLines: [0] })).toThrow('No selected changed lines');
  });

  it('parses and rebuilds a new-file hunk', () => {
    const raw = [
      'diff --git a/src/new-file.ts b/src/new-file.ts',
      'new file mode 100644',
      'index 0000000..3333333',
      '--- /dev/null',
      '+++ b/src/new-file.ts',
      '@@ -0,0 +1,2 @@',
      '+export const created = true;',
      '+export const count = 1;',
    ].join('\n');

    const diff = parseUnifiedDiff(raw);

    expect(diff).toMatchObject({
      filePath: 'src/new-file.ts',
      isNewFile: true,
      isDeletedFile: false,
      newMode: '100644',
    });
    expect(diff.hunks[0]).toMatchObject({ oldStart: 0, oldLines: 0, newStart: 1, newLines: 2 });
    expect(buildHunkPatch(diff, 0)).toBe(`${raw}\n`);
  });

  it('parses and rebuilds a deleted-file hunk', () => {
    const raw = [
      'diff --git a/src/old-file.ts b/src/old-file.ts',
      'deleted file mode 100644',
      'index 4444444..0000000',
      '--- a/src/old-file.ts',
      '+++ /dev/null',
      '@@ -1,2 +0,0 @@',
      '-export const removed = true;',
      '-export const count = 1;',
    ].join('\n');

    const diff = parseUnifiedDiff(raw);

    expect(diff).toMatchObject({
      filePath: 'src/old-file.ts',
      isNewFile: false,
      isDeletedFile: true,
      oldMode: '100644',
    });
    expect(diff.hunks[0]).toMatchObject({ oldStart: 1, oldLines: 2, newStart: 0, newLines: 0 });
    expect(buildHunkPatch(diff, 0)).toBe(`${raw}\n`);
  });

  it('keeps no-newline markers attached to the hunk', () => {
    const raw = [
      'diff --git a/src/end.ts b/src/end.ts',
      'index 1111111..2222222 100644',
      '--- a/src/end.ts',
      '+++ b/src/end.ts',
      '@@ -1 +1 @@',
      '-old',
      '\\ No newline at end of file',
      '+new',
      '\\ No newline at end of file',
    ].join('\n');

    const diff = parseUnifiedDiff(raw);

    expect(diff.hunks[0].lines.map((line) => line.type)).toEqual([
      'remove',
      'no-newline',
      'add',
      'no-newline',
    ]);
    expect(buildHunkPatch(diff, 0)).toBe(`${raw}\n`);
  });

  it('normalizes CRLF diff transport without leaking carriage returns into content', () => {
    const raw = [
      'diff --git a/src/crlf.txt b/src/crlf.txt',
      'index 1111111..2222222 100644',
      '--- a/src/crlf.txt',
      '+++ b/src/crlf.txt',
      '@@ -1,2 +1,2 @@',
      ' first',
      '-second',
      '+segundo',
    ].join('\r\n');

    const diff = parseUnifiedDiff(raw);
    const patch = buildHunkPatch(diff, 0);

    expect(diff.hunks[0].lines.every((line) => !line.content.includes('\r'))).toBe(true);
    expect(patch).not.toContain('\r');
    expect(patch).toContain('+segundo\n');
  });

  it('parses paths with spaces from diff headers', () => {
    const raw = [
      'diff --git a/src/file name.ts b/src/file name.ts',
      'index 1111111..2222222 100644',
      '--- a/src/file name.ts',
      '+++ b/src/file name.ts',
      '@@ -1 +1 @@',
      '-old',
      '+new',
    ].join('\n');

    const diff = parseUnifiedDiff(raw);

    expect(diff.oldPath).toBe('src/file name.ts');
    expect(diff.newPath).toBe('src/file name.ts');
    expect(diff.filePath).toBe('src/file name.ts');
    expect(buildHunkPatch(diff, 0)).toBe(`${raw}\n`);
  });

  it('marks binary diffs as non-buildable text patches', () => {
    const raw = [
      'diff --git a/assets/image.png b/assets/image.png',
      'index 1111111..2222222 100644',
      'Binary files a/assets/image.png and b/assets/image.png differ',
    ].join('\n');

    const diff = parseUnifiedDiff(raw);

    expect(diff.isBinary).toBe(true);
    expect(diff.hunks).toHaveLength(0);
    expect(() => buildHunkPatch(diff, 0)).toThrow('Hunk index 0 does not exist');
  });
});
