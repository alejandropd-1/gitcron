import { describe, it, expect } from 'vitest';
import {
  buildFileTree,
  countFiles,
  countDirs,
  normalizeRelPath,
  type CartoTreeNode,
} from '../carto-tree';

describe('normalizeRelPath', () => {
  it('convierte separadores Windows a POSIX', () => {
    expect(normalizeRelPath('lib\\carto\\tree.ts')).toBe('lib/carto/tree.ts');
  });

  it('colapsa separadores repetidos', () => {
    expect(normalizeRelPath('a//b///c')).toBe('a/b/c');
  });

  it('quita ./ inicial y / de los extremos', () => {
    expect(normalizeRelPath('./a/b/')).toBe('a/b');
    expect(normalizeRelPath('/a/b/')).toBe('a/b');
  });

  it('devuelve cadena vacía para entradas vacías o sólo separadores', () => {
    expect(normalizeRelPath('')).toBe('');
    expect(normalizeRelPath('///')).toBe('');
    expect(normalizeRelPath('./')).toBe('');
  });
});

describe('buildFileTree', () => {
  it('devuelve [] para lista vacía', () => {
    expect(buildFileTree([])).toEqual([]);
  });

  it('crea un único archivo en la raíz', () => {
    const tree = buildFileTree(['README.md']);
    expect(tree).toEqual<CartoTreeNode[]>([
      { name: 'README.md', path: 'README.md', type: 'file' },
    ]);
  });

  it('crea carpetas intermedias para rutas anidadas', () => {
    const tree = buildFileTree(['lib/i18n.ts']);
    expect(tree).toHaveLength(1);
    const lib = tree[0];
    expect(lib).toMatchObject({ name: 'lib', path: 'lib', type: 'dir' });
    expect(lib.children).toEqual<CartoTreeNode[]>([
      { name: 'i18n.ts', path: 'lib/i18n.ts', type: 'file' },
    ]);
  });

  it('reusa carpetas compartidas entre rutas hermanas', () => {
    const tree = buildFileTree(['lib/a.ts', 'lib/b.ts']);
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('lib');
    expect(tree[0].children).toHaveLength(2);
    expect(tree[0].children!.map((c) => c.name)).toEqual(['a.ts', 'b.ts']);
  });

  it('asigna rutas POSIX acumuladas a las carpetas', () => {
    const tree = buildFileTree(['electron/ipc/carto.ts']);
    const electron = tree[0];
    const ipc = electron.children![0];
    expect(electron.path).toBe('electron');
    expect(ipc.path).toBe('electron/ipc');
    expect(ipc.children![0].path).toBe('electron/ipc/carto.ts');
  });

  it('ordena carpetas antes que archivos y luego alfabético (case-insensitive)', () => {
    const tree = buildFileTree([
      'zeta.ts',
      'Alpha.ts',
      'src/x.ts',
      'docs/y.md',
    ]);
    expect(tree.map((n) => `${n.type}:${n.name}`)).toEqual([
      'dir:docs',
      'dir:src',
      'file:Alpha.ts',
      'file:zeta.ts',
    ]);
  });

  it('deduplica rutas repetidas', () => {
    const tree = buildFileTree(['a/b.ts', 'a/b.ts']);
    expect(tree[0].children).toHaveLength(1);
  });

  it('normaliza separadores Windows y ./ al construir', () => {
    const tree = buildFileTree(['.\\lib\\carto\\tree.ts']);
    expect(tree[0].path).toBe('lib');
    expect(tree[0].children![0].children![0].path).toBe('lib/carto/tree.ts');
  });

  it('ignora entradas vacías sin romper', () => {
    const tree = buildFileTree(['', 'a.ts', '   '.trim()]);
    expect(tree.map((n) => n.name)).toEqual(['a.ts']);
  });
});

describe('countFiles / countDirs', () => {
  const tree = buildFileTree([
    'README.md',
    'lib/a.ts',
    'lib/sub/b.ts',
    'lib/sub/c.ts',
  ]);

  it('cuenta todas las hojas archivo', () => {
    expect(countFiles(tree)).toBe(4);
  });

  it('cuenta todas las carpetas (incluyendo anidadas)', () => {
    // lib, lib/sub
    expect(countDirs(tree)).toBe(2);
  });

  it('cuenta 0 sobre un árbol vacío', () => {
    expect(countFiles([])).toBe(0);
    expect(countDirs([])).toBe(0);
  });
});
