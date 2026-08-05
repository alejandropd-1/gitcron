// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PipelineNewChangeFlow } from '../PipelineNewChangeFlow';

/**
 * Empezar un cambio deja el trabajo en su propia rama.
 *
 * Un archivo de código no se puede atribuir a un cambio: ese dato no existe en el
 * repositorio. Una rama por cambio lo resuelve con el mecanismo propio de Git,
 * sin inventar registro alguno. Como es una escritura de Git, se declara antes,
 * se puede desactivar, y un fallo no deja arrancar nada.
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

function renderFlow() {
  render(
    <PipelineNewChangeFlow
      repoPath="C:/repo"
      projection={null}
      initialMode="propose"
      onStarted={() => undefined}
    />,
  );
}

/** Completa el formulario con datos válidos. */
function fillForm(slug: string) {
  // Objetivo, slug y restricciones, en ese orden. La etiqueta del slug arrastra
  // su texto de ayuda, así que buscarla por nombre accesible es frágil.
  const [objective, slugField] = screen.getAllByRole('textbox');
  fireEvent.change(objective, { target: { value: 'Un objetivo suficientemente claro' } });
  fireEvent.change(slugField, { target: { value: slug } });
}

describe('la rama del cambio al empezarlo', () => {
  it('se crea con el prefijo, y recién después aparece el lanzador', async () => {
    // El prefijo distingue las ramas de trabajo de `imagined/*` y `flight/*`,
    // que ya tienen significado en este proyecto.
    renderFlow();
    fillForm('mi-cambio');
    fireEvent.click(screen.getByRole('button', { name: /newChange\.propose\.review/ }));

    await vi.waitFor(() => expect(gitCreateBranch).toHaveBeenCalledWith('C:/repo', 'change/mi-cambio'));
    await vi.waitFor(() => expect(screen.getByTestId('launcher')).toBeTruthy());
  });

  it('desmarcada no toca Git', () => {
    renderFlow();
    fillForm('mi-cambio');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /newChange\.propose\.review/ }));

    expect(gitCreateBranch).not.toHaveBeenCalled();
  });

  it('un fallo muestra el motivo real y no deja arrancar la sesión', async () => {
    // Arrancar igual dejaría al agente en una rama distinta de la declarada, que
    // es divergencia entre lo declarado y lo ejecutado.
    gitCreateBranch.mockResolvedValue({ success: false, error: 'branch already exists' });
    renderFlow();
    fillForm('mi-cambio');
    fireEvent.click(screen.getByRole('button', { name: /newChange\.propose\.review/ }));

    await vi.waitFor(() => expect(screen.getByRole('alert').textContent).toContain('branch already exists'));
    expect(screen.queryByTestId('launcher')).toBeNull();
  });

  it('declara que arma la instrucción y no los artefactos', () => {
    // Nada de lo que se completa se guarda en un archivo: los campos componen un
    // texto que un ejecutor recibe, y la instrucción entera se ve recién en el
    // paso siguiente. Hasta acá no había forma de saber qué se estaba armando.
    renderFlow();

    expect(screen.getByText('pipeline.newChange.propose.nature')).toBeTruthy();
    expect(screen.getByText('pipeline.newChange.propose.objectiveHelp')).toBeTruthy();
    expect(screen.getByText('pipeline.newChange.propose.constraintsHelp')).toBeTruthy();
    expect(screen.getByText(/newChange\.propose\.slugTarget/)).toBeTruthy();
  });

  it('un formulario inválido no crea ninguna rama', () => {
    renderFlow();
    fireEvent.click(screen.getByRole('button', { name: /newChange\.propose\.review/ }));

    expect(gitCreateBranch).not.toHaveBeenCalled();
    expect(screen.queryByTestId('launcher')).toBeNull();
  });
});
