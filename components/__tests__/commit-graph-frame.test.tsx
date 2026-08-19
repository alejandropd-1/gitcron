// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommitGraph } from '../CommitGraph';
import type { Commit } from '@/lib/git-store';

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string) => key,
  tNow: () => 'ahora',
}));

afterEach(cleanup);

function makeCommit(hash: string, refs: string[] = []): Commit {
  return {
    hash,
    shortHash: hash.slice(0, 7),
    message: `Commit ${hash}`,
    authorName: 'Ale Delgado',
    authorEmail: 'ale@example.com',
    date: '2026-08-19T12:00:00.000Z',
    refs,
    parents: [],
  } as unknown as Commit;
}

describe('CommitGraph · bordes de maqueta vs datos', () => {
  it('el contenedor de filas no declara bordes divisorios de maqueta', () => {
    const commits = [
      makeCommit('1111111', ['refs/heads/main']),
      makeCommit('2222222', ['refs/heads/feature']),
    ];

    const { container } = render(
      <CommitGraph
        commits={commits}
        selectedHash="1111111"
        onSelect={vi.fn()}
        onContextMenu={vi.fn()}
        currentBranch="main"
      />
    );

    const rowsContainer = container.firstChild as HTMLElement;
    expect(rowsContainer).not.toBeNull();
    expect(rowsContainer.className).not.toContain('border-b');
    expect(rowsContainer.className).not.toContain('border-t');
    expect(rowsContainer.className).not.toContain('border-r');
    expect(rowsContainer.className).not.toContain('border-l');

    // Filas no tienen bordes de layout
    const rows = container.querySelectorAll('.flex.items-center.cursor-pointer');
    expect(rows.length).toBe(2);
    rows.forEach((row) => {
      expect(row.className).not.toContain('border-b');
      expect(row.className).not.toContain('border-t');
    });
  });

  it('conserva bordes de datos: fila WIP para cambios sin confirmar y chips de ref', () => {
    const commits = [makeCommit('1111111', ['refs/heads/main'])];

    const { container } = render(
      <CommitGraph
        commits={commits}
        selectedHash={undefined}
        onSelect={vi.fn()}
        onContextMenu={vi.fn()}
        currentBranch="main"
        workingTreeFiles={[
          { path: 'file1.ts', staged: true, status: 'M' } as any,
          { path: 'file2.ts', staged: false, status: 'M' } as any,
        ]}
      />
    );

    // Fila WIP: border-l-2 border-git-add/40 comunica dato (trabajo en curso)
    const wipRow = container.querySelector('.bg-git-add\\/5');
    expect(wipRow).not.toBeNull();
    expect(wipRow?.className).toContain('border-l-2');
    expect(wipRow?.className).toContain('border-git-add/40');

    // Badge + 1 staged en WIPRow
    const stagedBadge = screen.getByText('+ 1');
    expect(stagedBadge.className).toContain('border-git-add/50');
  });
});
