// @vitest-environment jsdom
import { cleanup, render, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommitNodesLayer, type CommitNodeDatum } from '../CommitNodesLayer';
import { useCanvasViewport } from '@/hooks/use-canvas-viewport';
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
    refs: [],
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

let resizeCallbacks: Array<() => void> = [];

class MockResizeObserver {
  private callback: () => void;
  constructor(cb: () => void) {
    this.callback = cb;
    resizeCallbacks.push(cb);
  }
  observe() {}
  unobserve() {}
  disconnect() {
    resizeCallbacks = resizeCallbacks.filter((c) => c !== this.callback);
  }
}

describe('Lienzo cronométrico · aislamiento de render ante cambio de tamaño de contenedor', () => {
  beforeEach(() => {
    resizeCallbacks = [];
    vi.stubGlobal('ResizeObserver', MockResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('un cambio de tamaño del contenedor altera el encuadre pero NO reconstruye la capa de nodos', () => {
    const isCommitEntering = vi.fn(() => false);
    const onSelectCommit = vi.fn();
    const onContextMenu = vi.fn();
    const onHoverNode = vi.fn();
    const onLeaveNode = vi.fn();

    let clientWidth = 1000;
    let clientHeight = 600;

    function ChronometricCanvasMock() {
      const { viewport, containerRef } = useCanvasViewport({
        worldWidth: 3000,
        worldHeight: 2000,
        preserveViewportOnWorldResize: true,
      });

      return (
        <div
          ref={(el) => {
            if (el) {
              Object.defineProperty(el, 'clientWidth', { get: () => clientWidth, configurable: true });
              Object.defineProperty(el, 'clientHeight', { get: () => clientHeight, configurable: true });
            }
            (containerRef as any).current = el;
          }}
        >
          <svg>
            <g transform={`translate(${viewport.offsetX}, ${viewport.offsetY}) scale(${viewport.scale})`}>
              <CommitNodesLayer
                nodes={nodes}
                selectedHash={null}
                hoveredHash={null}
                headHash={null}
                selectedBranchName={null}
                selectedBranchColor={null}
                textScale={1}
                isCommitEntering={isCommitEntering}
                onSelectCommit={onSelectCommit}
                onContextMenu={onContextMenu}
                onHoverNode={onHoverNode}
                onLeaveNode={onLeaveNode}
              />
            </g>
          </svg>
        </div>
      );
    }

    render(<ChronometricCanvasMock />);

    // Construcción inicial de la capa de nodos
    const callsAfterMount = isCommitEntering.mock.calls.length;
    expect(callsAfterMount).toBe(nodes.length);

    // Simular redimensionado del contenedor (ej. apertura del panel lateral o arrastre de separador de 1000px a 720px)
    act(() => {
      clientWidth = 720;
      clientHeight = 600;
      for (const cb of resizeCallbacks) {
        cb();
      }
    });

    // La capa de nodos NO debe haberse vuelto a construir
    expect(isCommitEntering.mock.calls.length).toBe(callsAfterMount);

    // Otro cambio de tamaño (ej. panel derecho desplegado de 720px a 450px)
    act(() => {
      clientWidth = 450;
      for (const cb of resizeCallbacks) {
        cb();
      }
    });

    // Sigue sin reconstruirse
    expect(isCommitEntering.mock.calls.length).toBe(callsAfterMount);
  });
});
