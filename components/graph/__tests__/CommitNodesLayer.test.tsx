// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommitNodesLayer, type CommitNodeDatum, type CommitNodesLayerProps } from '../CommitNodesLayer';
import type { Commit } from '@/lib/git-store';

afterEach(cleanup);

function commit(hash: string): Commit {
  return {
    hash,
    shortHash: hash.slice(0, 7),
    message: `mensaje ${hash}`,
    authorName: 'Ale Delgado',
    authorEmail: 'ale@example.com',
    date: '2026-08-02T00:00:00.000Z',
    refs: '',
    parents: [],
  } as unknown as Commit;
}

const nodes: CommitNodeDatum[] = ['aaa', 'bbb', 'ccc'].map((hash, index) => ({
  x: index * 10,
  y: index * 10,
  laneColor: '#fff',
  branchName: 'main',
  commit: commit(hash),
}));

/**
 * `isCommitEntering` se invoca una vez por nodo en cada construcción de la capa,
 * así que contar sus llamadas mide si la capa se reconstruyó, sin tener que
 * instrumentar el componente por dentro.
 */
function setup(overrides: Partial<CommitNodesLayerProps> = {}) {
  const isCommitEntering = vi.fn(() => false);
  const props: CommitNodesLayerProps = {
    nodes,
    selectedHash: null,
    hoveredHash: null,
    headHash: null,
    selectedBranchName: null,
    selectedBranchColor: null,
    textScale: 1,
    isCommitEntering,
    onSelectCommit: vi.fn(),
    onContextMenu: vi.fn(),
    onHoverNode: vi.fn(),
    onLeaveNode: vi.fn(),
    ...overrides,
  };
  // El `<g>` de encuadre es lo que envuelve a la capa en el grafo real; su
  // `transform` es justamente lo que no debe reconstruirla.
  const utils = render(
    <svg><g transform="translate(0, 0) scale(1)"><CommitNodesLayer {...props} /></g></svg>,
  );
  const rerenderWith = (next: Partial<CommitNodesLayerProps>, transform: string) => utils.rerender(
    <svg><g transform={transform}><CommitNodesLayer {...props} {...next} /></g></svg>,
  );
  return { isCommitEntering, rerenderWith };
}

describe('CommitNodesLayer', () => {
  it('does not rebuild when only the viewport transform changes', () => {
    const { isCommitEntering, rerenderWith } = setup();
    const afterFirst = isCommitEntering.mock.calls.length;
    expect(afterFirst).toBe(nodes.length);

    rerenderWith({}, 'translate(120, -40) scale(1)');
    rerenderWith({}, 'translate(300, -90) scale(2.4)');

    expect(isCommitEntering.mock.calls.length).toBe(afterFirst);
  });

  it('rebuilds when the selection changes', () => {
    const { isCommitEntering, rerenderWith } = setup();
    const afterFirst = isCommitEntering.mock.calls.length;

    rerenderWith({ selectedHash: 'bbb' }, 'translate(0, 0) scale(1)');

    expect(isCommitEntering.mock.calls.length).toBe(afterFirst + nodes.length);
  });

  it('rebuilds when the hovered node changes', () => {
    const { isCommitEntering, rerenderWith } = setup();
    const afterFirst = isCommitEntering.mock.calls.length;

    rerenderWith({ hoveredHash: 'ccc' }, 'translate(0, 0) scale(1)');

    expect(isCommitEntering.mock.calls.length).toBe(afterFirst + nodes.length);
  });

  it('rebuilds when the projected commits change', () => {
    const { isCommitEntering, rerenderWith } = setup();
    const afterFirst = isCommitEntering.mock.calls.length;

    rerenderWith({ nodes: [...nodes, { ...nodes[0], commit: commit('ddd') }] }, 'translate(0, 0) scale(1)');

    expect(isCommitEntering.mock.calls.length).toBe(afterFirst + nodes.length + 1);
  });

  it('renders one group per commit with its author initials', () => {
    setup();
    expect(document.querySelectorAll('g[class*="cursor-pointer"]')).toHaveLength(nodes.length);
    expect(document.querySelectorAll('text')[0].textContent).toBe('AD');
  });
});
