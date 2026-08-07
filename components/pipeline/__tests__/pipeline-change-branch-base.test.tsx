// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PipelineNewChangeFlow } from '../PipelineNewChangeFlow';

/**
 * De dónde sale la rama del cambio, y cuándo no se crea.
 *
 * `git checkout -b` no dice de dónde sale la rama, y este repositorio tiene 35
 * ramas locales con varias deliberadamente sin fusionar: medido,
 * `claude/jolly-khayyam-2be14c` está 501 commits detrás de `main`. Crear el
 * cambio parado ahí hereda una base de meses atrás sin que nada lo declare.
 *
 * Y con trabajo sin confirmar la rama no se crea: `git checkout -b` lo arrastra,
 * y la rama se crea al abrir un cambio, que es justo cuando lo que hay sin
 * confirmar pertenece a otro. Pasó al proponer este mismo cambio.
 */

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

vi.mock('../PipelineRuntimeLauncher', () => ({
  PipelineRuntimeLauncher: () => <div data-testid="launcher" />,
}));

const gitCreateBranch = vi.fn();
const ORIGINAL_API = (globalThis as { window?: { api?: unknown } }).window?.api;

beforeEach(() => {
  gitCreateBranch.mockReset().mockResolvedValue({ success: true });
  Object.defineProperty(window, 'api', { configurable: true, value: { gitCreateBranch } });
});

afterEach(() => {
  cleanup();
  if (ORIGINAL_API === undefined) delete (window as { api?: unknown }).api;
  else Object.defineProperty(window, 'api', { configurable: true, value: ORIGINAL_API });
});

type Overrides = Partial<React.ComponentProps<typeof PipelineNewChangeFlow>>;

function renderFlow(overrides: Overrides = {}) {
  render(
    <PipelineNewChangeFlow
      repoPath="C:/repo"
      projection={null}
      initialMode="propose"
      onStarted={() => undefined}
      {...overrides}
    />,
  );
}

function fillForm(slug = 'mi-cambio') {
  const [objective, slugField] = screen.getAllByRole('textbox');
  fireEvent.change(objective, { target: { value: 'Un objetivo suficientemente claro' } });
  fireEvent.change(slugField, { target: { value: slug } });
}

const behindMain = { measured: true as const, base: 'main', behind: 501, ahead: 0 };

describe('la base de la rama del cambio', () => {
  it('declara de dónde sale cuando la rama actual está atrasada', () => {
    renderFlow({ currentBranch: 'claude/jolly-khayyam-2be14c', divergence: behindMain });

    expect(screen.getByText(/branch\.baseBehind/)).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: /propose\.fromBase/ })).toBeTruthy();
  });

  it('estando al día no ofrece elegir base ni declara nada', () => {
    renderFlow({ currentBranch: 'main', divergence: { measured: true, base: 'main', behind: 0, ahead: 0 } });

    expect(screen.queryByText(/branch\.baseBehind/)).toBeNull();
    expect(screen.queryByRole('checkbox', { name: /propose\.fromBase/ })).toBeNull();
  });

  it('sin elegir base, la rama sale de donde se está parado', async () => {
    // Es lo que hace Git, y elegir por la persona perdería de vista el trabajo
    // sin fusionar a propósito.
    renderFlow({ currentBranch: 'vieja', divergence: behindMain });
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /newChange\.propose\.review/ }));

    await vi.waitFor(() => expect(gitCreateBranch).toHaveBeenCalledWith('C:/repo', 'change/mi-cambio'));
  });

  it('eligiendo la base, la rama sale de main', async () => {
    renderFlow({ currentBranch: 'vieja', divergence: behindMain });
    fillForm();
    fireEvent.click(screen.getByRole('checkbox', { name: /propose\.fromBase/ }));
    fireEvent.click(screen.getByRole('button', { name: /newChange\.propose\.review/ }));

    await vi.waitFor(() => expect(gitCreateBranch).toHaveBeenCalledWith('C:/repo', 'change/mi-cambio', 'main'));
  });
});

describe('árbol de trabajo sucio', () => {
  it('no crea la rama y declara el motivo', async () => {
    renderFlow({ currentBranch: 'main', workingTreeClean: false });
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /newChange\.propose\.review/ }));

    await vi.waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/propose\.branchDirty/));
    expect(gitCreateBranch).not.toHaveBeenCalled();
    // Tampoco arranca nada: la sesión trabajaría en una rama que no se creó.
    expect(screen.queryByTestId('launcher')).toBeNull();
  });

  it('con el árbol limpio la crea como siempre', async () => {
    renderFlow({ currentBranch: 'main', workingTreeClean: true });
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /newChange\.propose\.review/ }));

    await vi.waitFor(() => expect(gitCreateBranch).toHaveBeenCalledWith('C:/repo', 'change/mi-cambio'));
  });

  it('sin saber el estado del árbol, no se afirma que esté sucio', async () => {
    // `undefined` es no saber, y con eso la rama se crea como hasta ahora.
    renderFlow({ currentBranch: 'main' });
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /newChange\.propose\.review/ }));

    await vi.waitFor(() => expect(gitCreateBranch).toHaveBeenCalled());
  });
});
