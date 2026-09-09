// @vitest-environment jsdom
// Guardia de regresión del cableado del plan de instalación: en una tanda
// anterior siete pruebas daban verde porque le pasaban a OpenSpecEngineCard, a
// mano, el comando, las rutas y los repositorios afectados —la aplicación nunca
// se los pasaba. Esta prueba NO rinde la tarjeta: rinde RepoDetailsPanel (quien
// monta OpenSpecInspector, quien monta la tarjeta) y lo único que simula es el
// canal getInstallPlan del preload, el estado del motor (no instalado) y el
// store de repositorios abiertos. Si el cableado se rompe, esto falla.
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RepoDetailsPanel } from '../RepoDetailsPanel';
import { useGitStore, type RepoState } from '@/lib/git-store';
import { usePipelineStore } from '@/lib/pipeline-store';
import type { OpenSpecEngineStatus, OpenSpecInstallPlan } from '@/types/pipeline';

vi.mock('@/hooks/use-git-actions', () => ({
  useGitActions: () => ({
    commitChanges: vi.fn(),
    stageFile: vi.fn(),
    stageFiles: vi.fn(),
    continueInteractiveRebase: vi.fn(),
    abortInteractiveRebase: vi.fn(),
    undoInteractiveRebase: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
  tNow: (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

const REPO_PATH = 'C:/test-repo';
const OTHER_REPO_PATH = 'C:/otro-repo';

function makeRepo(path: string): RepoState {
  return {
    path,
    name: path.split(/[\\/]/).pop() ?? path,
    currentBranch: 'main',
    branches: ['main'],
    remoteBranches: [],
    commits: [],
    modifiedFiles: [],
    stashes: [],
    tags: [],
    submodules: [],
    remotes: [],
    branchTracking: {},
    defaultRemoteBranch: null,
    worktrees: [],
    pullRequests: [],
    commitMessage: '',
    selectedCommit: null,
    selectedFile: null,
    currentDiff: '',
    graphShowAllBranches: false,
    graphMode: 'chronometric',
    cartographyExpandedRoles: [],
    inCartography: false,
    isLoading: false,
    error: null,
    success: null,
    lastFetchError: null,
    mergeInProgress: false,
    rebaseInProgress: false,
  };
}

// Estado del motor devuelto por el canal getEngineStatus: NO instalado, para
// que la tarjeta dibuje la superficie de instalación.
const engineStatusNotInstalled: OpenSpecEngineStatus = {
  cli: {
    installed: false,
    runtimeVersion: null,
    provenance: 'unknown',
    displayPath: null,
    supportedRange: { min: '1.5.0', max: '1.12.0' },
    versionClass: 'unknown',
    evidenceStatus: 'unknown',
    diagnostics: [],
  },
  latestAvailable: null,
  globalConfig: null,
  installedIntegration: null,
  repoState: 'not-initialized',
  integrationState: 'unknown',
};

function planWith(overrides: Partial<OpenSpecInstallPlan>): OpenSpecInstallPlan {
  return {
    detectedManager: 'npm',
    packageManagerPath: 'C:/Program Files/nodejs/npm.cmd',
    nodePath: 'C:/Program Files/nodejs/node.exe',
    localCommand: 'npm install @fission-ai/openspec@latest',
    globalCommand: 'npm install -g @fission-ai/openspec@latest',
    hasManifest: true,
    ...overrides,
  };
}

const ORIGINAL_API = (globalThis as { window?: { api?: unknown } }).window?.api;

// Simula el puente del preload (electron/preload.ts) con la forma real de
// pipelineOpenSpec: getInstallPlan devuelve el plan y getEngineStatus devuelve
// el estado del motor. installLocal/installGlobal existen para que los botones
// no queden deshabilitados por ausencia de canal; ninguna instalación se ejecuta.
function stubPreloadBridge(plan: OpenSpecInstallPlan) {
  const getInstallPlan = vi.fn().mockResolvedValue(plan);
  const getEngineStatus = vi.fn().mockResolvedValue(engineStatusNotInstalled);
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      pipelineOpenSpec: {
        getInstallPlan,
        getEngineStatus,
        installLocal: vi.fn(),
        installGlobal: vi.fn(),
      },
    },
  });
  return { getInstallPlan, getEngineStatus };
}

function renderPanel() {
  return render(
    <RepoDetailsPanel
      activeTab="Pipeline"
      graphMode="chronometric"
      detailsW={320}
      visible={true}
      isDragging={false}
      onResizeStart={vi.fn()}
      onOpenStashModal={vi.fn()}
      onOpenCommitFile={vi.fn()}
      onSelectFile={vi.fn()}
      onDiscardRequest={vi.fn()}
      onRequestAmend={vi.fn()}
      onRequestSquash={vi.fn()}
      onFileContextMenu={vi.fn()}
      onRequestResetAll={vi.fn()}
      onRequestCleanUntracked={vi.fn()}
    />
  );
}

describe('RepoDetailsPanel — cableado real del plan de instalación (sin props a la tarjeta)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    // La sección «Herramientas» no está en DEFAULT_OPEN_RIGHT_PANEL: el estado
    // persistido por repositorio es lo que la deja abierta, igual que lo dejaría
    // el toggle real del panel. Sin eso la tarjeta nunca se dibuja.
    window.localStorage.setItem(
      `gitcron:sidebarSections:${REPO_PATH}`,
      JSON.stringify({ 'details-tools': true })
    );
    usePipelineStore.setState({
      prepareOpen: false,
      aiNotice: null,
      snapshot: null,
      projection: null,
      runtimeHistory: [],
      selectedChangeId: null,
      openSpecificationId: null,
      expandedChanges: {},
      lastPreparedCount: null,
    });
    useGitStore.setState({
      repoPath: REPO_PATH,
      currentBranch: 'change/gestionar-ciclo-openspec-desde-gitcron',
      selectedCommit: null,
      modifiedFiles: [],
      commitMessage: '',
      isLoading: false,
      openRepos: [makeRepo(REPO_PATH), makeRepo(OTHER_REPO_PATH)],
    });
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    if (ORIGINAL_API === undefined) {
      delete (window as { api?: unknown }).api;
    } else {
      Object.defineProperty(window, 'api', { configurable: true, value: ORIGINAL_API });
    }
  });

  it('1. La confirmación de instalación global muestra comando, gestor, Node y repositorios afectados desde el árbol real', async () => {
    const { getInstallPlan } = stubPreloadBridge(planWith({ hasManifest: true }));
    renderPanel();

    // El Inspector consultó el canal del plan con la ruta del repo activo: esa
    // es la entrada del cableado que las pruebas viejas saltaban.
    expect(getInstallPlan).toHaveBeenCalledWith(REPO_PATH);

    // La superficie de instalación aparece porque el estado del motor figura NO instalado
    const globalButton = await screen.findByRole('button', { name: 'pipeline.openspec.engine.install.globalTitle' });
    fireEvent.click(globalButton);

    const confirmBox = screen.getByRole('region', {
      name: 'pipeline.openspec.engine.install.confirmGlobalAction',
    });

    // El comando literal que devolvió el canal getInstallPlan
    expect(within(confirmBox).getByText('npm install -g @fission-ai/openspec@latest')).toBeDefined();
    // La ruta del gestor de paquetes resuelta por el plan
    expect(within(confirmBox).getByText('npm: C:/Program Files/nodejs/npm.cmd')).toBeDefined();
    // La ruta de Node resuelta por el plan
    expect(within(confirmBox).getByText('Node: C:/Program Files/nodejs/node.exe')).toBeDefined();
    // Los repositorios abiertos del store, afectados por la instalación global
    expect(
      within(confirmBox).getByText('pipeline.openspec.engine.install.affectedRepos:{"count":2}')
    ).toBeDefined();
    expect(within(confirmBox).getByText(`${REPO_PATH}, ${OTHER_REPO_PATH}`)).toBeDefined();
  });

  it('2. Sin manifiesto, «Instalación local» queda deshabilitada y su motivo se lee al lado', async () => {
    stubPreloadBridge(planWith({ hasManifest: false }));
    renderPanel();

    const localButton = await screen.findByRole('button', { name: 'pipeline.openspec.engine.install.localTitle' });
    expect(localButton.hasAttribute('disabled')).toBe(true);

    // El motivo del bloqueo vive en la misma fila que el botón, no en otro lugar del panel
    const reason = screen.getByText('pipeline.openspec.engine.install.localNoManifest');
    expect(reason.parentElement).toBe(localButton.parentElement);

    // La global sigue disponible: la local no se ofrece, declarando por qué
    const globalButton = screen.getByRole('button', { name: 'pipeline.openspec.engine.install.globalTitle' });
    expect(globalButton.hasAttribute('disabled')).toBe(false);
  });
});
