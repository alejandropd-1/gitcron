// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ContentHeader } from '@/components/ContentHeader';
import { HistoryView, BlameView } from '@/components/RepoContentViews';
import { RepoMainView, type RepoMainViewProps } from '@/components/RepoMainView';
import { CommitGraph } from '@/components/CommitGraph';
import { translate, type Lang } from '@/lib/i18n';
import type { Commit } from '@/lib/git-store';
import type { BlameLine } from '@/types/electron';

const LANGUAGES: Lang[] = ['es', 'en', 'zh'];

const NEW_CONTENT_HEADER_KEYS = [
  'graph.colBranchTag',
  'graph.colGraph',
  'graph.colMessage',
  'graph.colDate',
  'graph.colCommit',
  'history.header',
  'history.filteredHeader',
] as const;

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

function renderMainViewWithGraph(
  beginGraphColDrag = vi.fn(),
  graphViewOverrides: Record<string, any> = {},
  tabViewsOverrides: Record<string, any> = {},
) {
  const graphColumns = {
    refs: 120,
    graph: 100,
    date: 110,
    hash: 80,
  };

  const mockProps: RepoMainViewProps = {
    activeView: 'repository',
    isRepoStartView: false,
    cartographyActive: false,
    cartographyRepoPath: null,
    onExitCartography: vi.fn(),
    settingsPanel: {} as any,
    helpPanel: {} as any,
    profilePanel: {} as any,
    repoStart: {} as any,
    diffViews: {
      selectedPullRequest: null,
      pullRequestDiff: null,
      pullRequestDiffLoading: false,
      selectedFile: null,
      currentDiff: '',
      wordWrap: false,
      fileDiffMode: null,
      fileHistoryFile: null,
      fileHistoryEntries: [],
      fileHistoryLoading: false,
      blameFile: null,
      blameLines: [],
      blameLoading: false,
      selectedBlameLineNo: null,
      hunkActionLoading: null,
      onToggleWordWrap: vi.fn(),
      onCloseDiff: vi.fn(),
      onSelectFileHistoryEntry: vi.fn(),
      onFileHistoryContextMenu: vi.fn(),
      onSelectBlameLine: vi.fn(),
      onStageHunk: vi.fn(),
      onUnstageHunk: vi.fn(),
      onDiscardHunk: vi.fn(),
      conflictFileLoading: false,
      conflictFileContent: '',
      isSaving: false,
      onSaveConflict: vi.fn(),
    },
    tabViews: {
      activeTab: 'Graph',
      commits: [
        {
          hash: 'abc1234567890abcdef1234567890abcdef123456',
          shortHash: 'abc1234',
          message: 'initial commit',
          authorName: 'Alejandro',
          authorEmail: 'ale@example.com',
          date: '2026-08-21T10:00:00Z',
          parents: [],
          refs: ['main'],
        },
      ],
      selectedCommit: null,
      currentBranch: 'main',
      filterText: '',
      isLoading: false,
      onSelectCommit: vi.fn(),
      onCommitContextMenu: vi.fn(),
      modifiedFiles: [],
      hasGithubUser: false,
      repoPath: '/test/repo',
      pipelineLayout: {
        leftOpen: true,
        rightOpen: true,
        leftWidth: 260,
        rightWidth: 320,
        onResizeLeft: vi.fn(),
        onResizeRight: vi.fn(),
        onEnsureRightOpen: vi.fn(),
      },
      ...tabViewsOverrides,
    },
    graphView: {
      graphMode: 'classic',
      activeGraphMode: 'classic',
      isDragging: false,
      sidebarOpen: true,
      sidebarW: 260,
      repositoryDetailsVisible: false,
      detailsW: 300,
      onChangeGraphMode: vi.fn(),
      isStartupGraphReady: true,
      graphColumns,
      beginGraphColDrag,
      enableCronometric: true,
      speculativeBranches: [],
      showSpeculative: false,
      onToggleSpeculative: vi.fn(),
      selectedBranchName: 'main',
      selectedBranchFocusRequest: 0,
      onClearGraphSelection: vi.fn(),
      leftGraphSafe: 0,
      rightGraphSafe: 0,
      branches: ['main'],
      isAnyContextMenuOpen: false,
      ...graphViewOverrides,
    },
    interactiveRebase: {
      interactiveRebaseFrom: null,
      setInteractiveRebaseFrom: vi.fn(),
    },
  };

  return {
    beginGraphColDrag,
    onChangeGraphMode: mockProps.graphView.onChangeGraphMode,
    ...render(<RepoMainView {...mockProps} />),
  };
}

describe('ContentHeader y unificación de encabezados de contenido', () => {
  afterEach(cleanup);

  describe('1. Pieza única ContentHeader', () => {
    it('renderiza con la firma visual declarada, altura fija h-9 (36px), px-4, sin border-b y acepta children', () => {
      render(
        <ContentHeader>
          <span data-testid="header-content">Contenido de prueba</span>
        </ContentHeader>
      );

      const header = screen.getByTestId('content-header');
      expect(header).toBeDefined();
      expect(header.className).toContain('sticky');
      expect(header.className).toContain('top-0');
      expect(header.className).toContain('bg-bg-surface/75');
      expect(header.className).toContain('h-9');
      expect(header.className).toContain('px-4');
      expect(header.className).not.toContain('border-b');
      expect(screen.getByTestId('header-content')).toBeDefined();
    });

    it('acepta slots left y right cuando no recibe children directos', () => {
      render(
        <ContentHeader
          left={<span data-testid="slot-left">Izquierda</span>}
          right={<span data-testid="slot-right">Derecha</span>}
        />
      );

      expect(screen.getByTestId('slot-left')).toBeDefined();
      expect(screen.getByTestId('slot-right')).toBeDefined();
    });
  });

  describe('2. Historial migrado a ContentHeader', () => {
    const dummyCommits: Commit[] = [
      {
        hash: 'abc1234567890abcdef1234567890abcdef123456',
        shortHash: 'abc1234',
        message: 'feat: primer commit',
        authorName: 'Alejandro',
        authorEmail: 'ale@example.com',
        date: '2026-08-21T10:00:00Z',
        parents: [],
        refs: ['main'],
      },
      {
        hash: 'def1234567890abcdef1234567890abcdef123456',
        shortHash: 'def1234',
        message: 'fix: segundo commit',
        authorName: 'Alejandro',
        authorEmail: 'ale@example.com',
        date: '2026-08-21T11:00:00Z',
        parents: [],
        refs: [],
      },
    ];

    it('muestra el encabezado sin filtro usando history.header', () => {
      render(
        <HistoryView
          commits={dummyCommits}
          selectedHash={undefined}
          currentBranch="main"
          filterText=""
          onSelect={vi.fn()}
          onContextMenu={vi.fn()}
          isLoading={false}
        />
      );

      const header = screen.getByTestId('content-header');
      expect(header).toBeDefined();
      expect(screen.getByText(/Historial · 2 commits/i)).toBeDefined();
    });

    it('muestra el encabezado con filtro activo usando history.filteredHeader', () => {
      render(
        <HistoryView
          commits={dummyCommits}
          selectedHash={undefined}
          currentBranch="main"
          filterText="primer"
          onSelect={vi.fn()}
          onContextMenu={vi.fn()}
          isLoading={false}
        />
      );

      expect(screen.getByText(/1 de 2 commits/i)).toBeDefined();
    });
  });

  describe('3. Autoría (Blame) migrado a ContentHeader', () => {
    const dummyLines: BlameLine[] = [
      {
        lineNo: 1,
        commitHash: 'abc1234567890abcdef1234567890abcdef123456',
        shortHash: 'abc1234',
        author: 'Alejandro',
        authorEmail: 'ale@example.com',
        authorTime: '1787220000',
        content: 'const a = 1;',
        summary: 'primer commit',
        isUncommitted: false,
      },
    ];

    it('renderiza encabezado estructurado dentro de ContentHeader', () => {
      render(
        <BlameView
          file={{ path: 'lib/example.ts', staged: false, status: 'modified' }}
          lines={dummyLines}
          selectedLineNo={null}
          isLoading={false}
          onBack={vi.fn()}
          onSelectLine={vi.fn()}
        />
      );

      const header = screen.getByTestId('content-header');
      expect(header).toBeDefined();
      expect(screen.getByText('Commit')).toBeDefined();
      expect(screen.getByText('Autor')).toBeDefined();
      expect(screen.getByText('Fecha')).toBeDefined();
      expect(screen.getByText('Linea')).toBeDefined();
      expect(screen.getByText('Contenido')).toBeDefined();
    });
  });

  describe('4. Grafo clásico migrado a ContentHeader y arrastre de columnas', () => {
    it('renderiza rótulos traducidos dentro de ContentHeader', () => {
      const { container } = renderMainViewWithGraph();

      const headers = container.querySelectorAll('[data-testid="content-header"]');
      expect(headers.length).toBe(2);
      expect(screen.getByText('Rama / Tag')).toBeDefined();
      expect(screen.getByText('Grafo')).toBeDefined();
      expect(screen.getByText('Mensaje de commit')).toBeDefined();
      expect(screen.getByText('Fecha')).toBeDefined();
      expect(screen.getByText('Commit')).toBeDefined();
    });

    it('invoca beginGraphColDrag con el identificador exacto de columna al iniciar arrastre', () => {
      const beginDrag = vi.fn();
      renderMainViewWithGraph(beginDrag);

      const handles = screen.getAllByTitle('Arrastrar para redimensionar columna');
      expect(handles.length).toBe(4);

      // Handle 0: columna refs
      fireEvent.mouseDown(handles[0], { clientX: 100 });
      expect(beginDrag).toHaveBeenLastCalledWith('refs', expect.anything());

      // Handle 1: columna graph
      fireEvent.mouseDown(handles[1], { clientX: 200 });
      expect(beginDrag).toHaveBeenLastCalledWith('graph', expect.anything());

      // Handle 2: columna date (lado izquierdo, dirección -1)
      fireEvent.mouseDown(handles[2], { clientX: 300 });
      expect(beginDrag).toHaveBeenLastCalledWith('date', expect.anything(), -1);

      // Handle 3: columna date (lado derecho)
      fireEvent.mouseDown(handles[3], { clientX: 400 });
      expect(beginDrag).toHaveBeenLastCalledWith('date', expect.anything());
    });

    it('no deja ningún rótulo de columna escrito como texto crudo en el componente', () => {
      renderMainViewWithGraph();
      // En español (por defecto), los textos crudos en inglés de antes no deben existir
      expect(screen.queryByText('Commit message')).toBeNull();
      expect(screen.queryByText('Branch / Tag')).toBeNull();
    });
  });

  describe('5. Paridad i18n de las claves de encabezado en ES, EN y ZH', () => {
    it.each(LANGUAGES)('resuelve todas las claves nuevas en %s sin devolver la clave cruda', (lang) => {
      for (const key of NEW_CONTENT_HEADER_KEYS) {
        const value = translate(key, lang, { count: 3, filtered: 1, total: 3 });
        expect(value).toBeDefined();
        expect(value).not.toBe(key);
        expect(value.trim().length).toBeGreaterThan(0);
        expect(value).not.toMatch(/\{\{/);
      }
    });
  });

  describe('6. Unificación estricta de firma visual (altura 36px, relleno lateral px-4, sin border-b)', () => {
    it('los encabezados de identidad (historial y grafo) usan h-11 y las columnas (autoría y grafo clásico) usan h-9 con relleno px-4', () => {
      // 1. Historial
      const { container: histContainer } = render(
        <HistoryView
          commits={[]}
          selectedHash={undefined}
          currentBranch="main"
          filterText=""
          onSelect={vi.fn()}
          onContextMenu={vi.fn()}
          isLoading={false}
        />
      );
      const histHeader = histContainer.querySelector('[data-testid="content-header"]') as HTMLElement;
      expect(histHeader).not.toBeNull();
      expect(histHeader.className).toContain('h-11');
      expect(histHeader.className).toContain('px-4');

      // 2. Autoría (Blame - columnas)
      const { container: blameContainer } = render(
        <BlameView
          file={{ path: 'lib/example.ts', staged: false, status: 'modified' }}
          lines={[]}
          selectedLineNo={null}
          isLoading={false}
          onBack={vi.fn()}
          onSelectLine={vi.fn()}
        />
      );
      const blameHeader = blameContainer.querySelector('[data-testid="content-header"]') as HTMLElement;
      expect(blameHeader).not.toBeNull();
      expect(blameHeader.className).toContain('h-9');
      expect(blameHeader.className).toContain('px-4');
      expect(blameHeader.className).not.toContain('border-b');

      // 3. Grafo (franja 1 de identidad y franja 2 de columnas)
      const { container: graphContainer } = renderMainViewWithGraph();
      const graphHeaders = graphContainer.querySelectorAll('[data-testid="content-header"]');
      const graphIdentityHeader = graphHeaders[0] as HTMLElement;
      const graphColumnHeader = graphHeaders[1] as HTMLElement;

      expect(graphIdentityHeader.className).toContain('h-11');
      expect(graphIdentityHeader.className).toContain('px-4');

      expect(graphColumnHeader.className).toContain('h-9');
      expect(graphColumnHeader.className).toContain('px-4');
      expect(graphColumnHeader.className).not.toContain('border-b');
    });
  });

  describe('7. Calce de margen y posicionamiento de filas en CommitGraph (2.7, 2.8, 2.9)', () => {
    const dummyCommit: Commit = {
      hash: 'abc1234567890abcdef1234567890abcdef123456',
      shortHash: 'abc1234',
      message: 'feat: commit de prueba',
      authorName: 'Alejandro',
      authorEmail: 'ale@example.com',
      date: '2026-08-21T10:00:00Z',
      parents: [],
      refs: ['main'],
    };

    it('las dos filas del grafo clásico (GraphRowView y WIPRow) llevan el relleno px-4 para coincidir con el margen de la cabecera', () => {
      const { container } = render(
        <CommitGraph
          commits={[dummyCommit]}
          workingTreeFiles={[{ path: 'modified-file.ts', staged: false, status: 'modified' }]}
          currentBranch="main"
          onSelect={vi.fn()}
          onContextMenu={vi.fn()}
        />
      );

      // Fila 1: WIPRow (trabajo en curso)
      const wipRow = container.querySelector('.bg-git-add\\/5') as HTMLElement;
      expect(wipRow).not.toBeNull();
      expect(wipRow.className).toContain('px-4');

      // Fila 2: GraphRowView (commit regular)
      const commitRow = container.querySelector('.group.relative') as HTMLElement;
      expect(commitRow).not.toBeNull();
      expect(commitRow.className).toContain('px-4');
    });

    it('WIPRow conserva su borde indicador de estado border-l-2 border-git-add/40', () => {
      const { container } = render(
        <CommitGraph
          commits={[dummyCommit]}
          workingTreeFiles={[{ path: 'staged-file.ts', staged: true, status: 'added' }]}
          currentBranch="main"
          onSelect={vi.fn()}
          onContextMenu={vi.fn()}
        />
      );

      const wipRow = container.querySelector('.bg-git-add\\/5') as HTMLElement;
      expect(wipRow).not.toBeNull();
      expect(wipRow.className).toContain('border-l-2');
      expect(wipRow.className).toContain('border-git-add/40');
    });

    it('el indicador de rama seleccionada se posiciona en absoluto pegado al borde izquierdo (left-0 top-0 bottom-0) sin desplazarse por el relleno (2.9)', () => {
      const { container } = render(
        <CommitGraph
          commits={[dummyCommit]}
          selectedHash={dummyCommit.hash}
          selectedBranchName="main"
          currentBranch="main"
          onSelect={vi.fn()}
          onContextMenu={vi.fn()}
        />
      );

      const row = container.querySelector('.group.relative') as HTMLElement;
      expect(row).not.toBeNull();
      expect(row.className).toContain('px-4');

      const indicator = row.querySelector('.absolute') as HTMLElement;
      expect(indicator).not.toBeNull();
      expect(indicator.className).toContain('absolute');
      expect(indicator.className).toContain('left-0');
      expect(indicator.className).toContain('top-0');
      expect(indicator.className).toContain('bottom-0');
      expect(indicator.className).not.toContain('left-4');
    });
  });

  describe('8. Selector de modo en el encabezado común del grafo (4.1, 5.1, 5.3, 5.4, 5.5)', () => {
    it('en modo clásico renderiza exactamente DOS franjas: la 1 con el selector y la 2 con las columnas', () => {
      const onChangeGraphMode = vi.fn();
      const { container } = renderMainViewWithGraph(undefined, {
        activeGraphMode: 'classic',
        enableCronometric: true,
        onChangeGraphMode,
      });

      // Exactamente dos franjas ContentHeader en el área del grafo clásico
      const headers = container.querySelectorAll('[data-testid="content-header"]');
      expect(headers.length).toBe(2);

      const header1 = headers[0] as HTMLElement;
      const header2 = headers[1] as HTMLElement;

      // Franja 1: contiene el selector y NO contiene ningún rótulo de columna
      expect(header1.querySelector('[data-testid="graph-mode-selector"]')).not.toBeNull();
      expect(header1.textContent).not.toContain('Rama / Tag');
      expect(header1.textContent).not.toContain('Grafo');
      expect(header1.textContent).not.toContain('Commit');

      // Franja 2: contiene los rótulos de columna y NO contiene el selector
      expect(header2.querySelector('[data-testid="graph-mode-selector"]')).toBeNull();
      expect(header2.textContent).toContain('Rama / Tag');
      expect(header2.textContent).toContain('Grafo');
      expect(header2.textContent).toContain('Commit');

      // Botón clásico presionado, cronométrico no
      const classicBtn = screen.getByRole('button', { name: /Clásico/i });
      const chronoBtn = screen.getByRole('button', { name: /Cronométrico/i });
      expect(classicBtn.getAttribute('aria-pressed')).toBe('true');
      expect(chronoBtn.getAttribute('aria-pressed')).toBe('false');

      // Clic en cronométrico invoca onChangeGraphMode
      fireEvent.click(chronoBtn);
      expect(onChangeGraphMode).toHaveBeenCalledWith('chronometric');
    });

    it('en modo cronométrico renderiza exactamente UNA franja con el selector y no muestra columnas', () => {
      const onChangeGraphMode = vi.fn();
      const { container } = renderMainViewWithGraph(undefined, {
        activeGraphMode: 'chronometric',
        enableCronometric: true,
        onChangeGraphMode,
      });

      // Exactamente una franja ContentHeader en el área del grafo cronométrico
      const headers = container.querySelectorAll('[data-testid="content-header"]');
      expect(headers.length).toBe(1);

      const header1 = headers[0] as HTMLElement;
      expect(header1.querySelector('[data-testid="graph-mode-selector"]')).not.toBeNull();

      // Botón cronométrico presionado, clásico no
      const classicBtn = screen.getByRole('button', { name: /Clásico/i });
      const chronoBtn = screen.getByRole('button', { name: /Cronométrico/i });
      expect(classicBtn.getAttribute('aria-pressed')).toBe('false');
      expect(chronoBtn.getAttribute('aria-pressed')).toBe('true');

      // Columnas NO visibles en modo cronométrico
      expect(screen.queryByText('Rama / Tag')).toBeNull();
      expect(screen.queryByText('Grafo')).toBeNull();
      expect(screen.queryByText('Fecha')).toBeNull();
      expect(screen.queryByText('Commit')).toBeNull();

      // Clic en clásico invoca onChangeGraphMode
      fireEvent.click(classicBtn);
      expect(onChangeGraphMode).toHaveBeenCalledWith('classic');
    });

    it('con enableCronometric=false no aparece el selector en la franja de identidad', () => {
      const { container } = renderMainViewWithGraph(undefined, {
        activeGraphMode: 'classic',
        enableCronometric: false,
      });

      const selector = screen.queryByTestId('graph-mode-selector');
      expect(selector).toBeNull();

      const headers = container.querySelectorAll('[data-testid="content-header"]');
      expect(headers.length).toBe(2);

      const header1 = headers[0] as HTMLElement;
      const header2 = headers[1] as HTMLElement;
      expect(header1.querySelector('[data-testid="graph-mode-selector"]')).toBeNull();
      expect(header2.querySelector('[data-testid="graph-mode-selector"]')).toBeNull();
      expect(header2.textContent).toContain('Rama / Tag');
      expect(header2.textContent).toContain('Grafo');
      expect(header2.textContent).toContain('Commit');
    });

    it('el selector no aparece en otras vistas como History', () => {
      renderMainViewWithGraph(undefined, {
        activeGraphMode: 'classic',
        enableCronometric: true,
      }, {
        activeTab: 'History',
      });

      const selector = screen.queryByTestId('graph-mode-selector');
      expect(selector).toBeNull();
    });
  });
});
