import { describe, expect, it, vi } from 'vitest';
import { buildCartoPanorama } from '../../lib/carto-panorama';
import { classifyCartoRole } from '../../lib/carto-roles';
import { buildGraphSnapshot } from '../carto/graph-engine';

vi.mock('@colbymchenry/codegraph', () => ({
  CodeGraph: {
    isInitialized: vi.fn(),
    open: vi.fn(),
    init: vi.fn(),
  },
}));

function makeRepoFiles(): string[] {
  return [
    'app/globals.css',
    ...Array.from({ length: 230 }, (_, i) => `misc/file-${String(i).padStart(3, '0')}.md`),
    'src/a.ts',
    'src/b.ts',
    'styles/x.scss',
  ];
}

describe('buildGraphSnapshot', () => {
  it('une archivos del filesystem con CodeGraph y conserva estilos para roles', () => {
    const cg = {
      getFiles: () => [{ path: 'src/a.ts' }, { path: 'src/b.ts' }],
      getFileDependencies: (filePath: string) => (filePath === 'src/a.ts' ? ['src/b.ts'] : []),
    };

    const snapshot = buildGraphSnapshot(cg, makeRepoFiles(), false, 1);
    const allNodes = snapshot.allNodes ?? snapshot.nodes;
    const byPath = new Map(allNodes.map((node) => [node.filePath, node]));

    expect(snapshot.nodes).toHaveLength(220);
    expect(snapshot.totals.nodes).toBe(234);
    expect(byPath.get('app/globals.css')).toBeTruthy();
    expect(byPath.get('styles/x.scss')).toBeTruthy();
    expect(classifyCartoRole(byPath.get('app/globals.css')!)).toBe('styles');
    expect(classifyCartoRole(byPath.get('styles/x.scss')!)).toBe('styles');
    expect(snapshot.edges).toEqual([
      {
        fromId: byPath.get('src/a.ts')!.id,
        toId: byPath.get('src/b.ts')!.id,
        relation: 'import',
      },
    ]);
  });

  it('hace que Panorama cuente roles desde el set completo, no desde el cap visual', () => {
    const cg = {
      getFiles: () => [{ path: 'src/a.ts' }, { path: 'src/b.ts' }],
      getFileDependencies: (filePath: string) => (filePath === 'src/a.ts' ? ['src/b.ts'] : []),
    };
    const snapshot = buildGraphSnapshot(cg, makeRepoFiles(), false, 1);

    const panorama = buildCartoPanorama(snapshot);
    const styles = panorama.groups.find((group) => group.id === 'styles');

    expect(styles?.fileCount).toBe(2);
    expect(styles?.files.map((file) => file.node.filePath).sort()).toEqual([
      'app/globals.css',
      'styles/x.scss',
    ]);
  });
});
