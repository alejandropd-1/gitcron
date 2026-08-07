// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EMPTY_NEW_CHANGE_DRAFT,
  useNewChangeDraftStore,
} from '@/lib/new-change-draft-store';
import { PipelineNewChangeFlow } from '../PipelineNewChangeFlow';

/**
 * Lo escrito sobrevive a salir del panel y volver.
 *
 * Las solapas de la aplicación no se ocultan: se desmontan. En `RepoMainView`
 * cada una es un `return` distinto, así que ir al grafo desmonta
 * `PipelineWorkspace` y React se lleva todo su `useState`. Ale lo encontró yendo
 * a mirar algo a Graph a mitad de empezar un cambio: al volver la pantalla no
 * estaba y tuvo que rehacerlo.
 */

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

vi.mock('../PipelineRuntimeLauncher', () => ({
  PipelineRuntimeLauncher: ({ onStarted }: { onStarted?: () => void }) => (
    <button type="button" data-testid="launcher" onClick={() => onStarted?.()}>arrancar</button>
  ),
}));

const gitCreateBranch = vi.fn();
const ORIGINAL_API = (globalThis as { window?: { api?: unknown } }).window?.api;

beforeEach(() => {
  useNewChangeDraftStore.setState({ drafts: {} });
  gitCreateBranch.mockReset().mockResolvedValue({ success: true });
  Object.defineProperty(window, 'api', { configurable: true, value: { gitCreateBranch } });
});

afterEach(() => {
  cleanup();
  if (ORIGINAL_API === undefined) delete (window as { api?: unknown }).api;
  else Object.defineProperty(window, 'api', { configurable: true, value: ORIGINAL_API });
});

function renderFlow(repoPath = 'C:/repo') {
  return render(
    <PipelineNewChangeFlow repoPath={repoPath} projection={null} onStarted={() => undefined} />,
  );
}

/** Escribe en los tres campos del modo propuesta y desmarca la rama. */
function fillEverything() {
  const [objective, slugField] = screen.getAllByRole('textbox');
  fireEvent.change(objective, { target: { value: 'ordenar el rail de actividad' } });
  fireEvent.change(slugField, { target: { value: 'ordenar-rail' } });
  const constraints = screen.getAllByRole('textbox')[2];
  fireEvent.change(constraints, { target: { value: 'sin tocar el store de Git' } });
  fireEvent.click(screen.getByRole('checkbox', { name: /propose\.branch/ }));
}

describe('el borrador en el store', () => {
  it('los borradores de dos repositorios no se pisan', () => {
    const { patchDraft } = useNewChangeDraftStore.getState();
    patchDraft('C:/uno', { objective: 'lo del primero' });
    patchDraft('C:/dos', { objective: 'lo del segundo' });

    expect(useNewChangeDraftStore.getState().drafts['C:/uno'].objective).toBe('lo del primero');
    expect(useNewChangeDraftStore.getState().drafts['C:/dos'].objective).toBe('lo del segundo');
  });

  it('descartar deja el estado inicial, y no un hueco', () => {
    // Los componentes leen campos: un `undefined` los obligaría a repetir el
    // mismo `??` en cada uno.
    const { patchDraft, clearDraft } = useNewChangeDraftStore.getState();
    patchDraft('C:/uno', { objective: 'algo', open: true });
    clearDraft('C:/uno');

    expect(useNewChangeDraftStore.getState().drafts['C:/uno']).toBeUndefined();
    renderFlow('C:/uno');
    expect((screen.getAllByRole('textbox')[0] as HTMLTextAreaElement).value)
      .toBe(EMPTY_NEW_CHANGE_DRAFT.objective);
  });
});

describe('salir del panel y volver', () => {
  it('conserva cada campo, uno por uno', () => {
    const { unmount } = renderFlow();
    fillEverything();

    // Irse a otra solapa es exactamente esto: el panel se desmonta.
    unmount();
    renderFlow();

    const [objective, slugField, constraints] = screen.getAllByRole('textbox');
    expect((objective as HTMLTextAreaElement).value).toBe('ordenar el rail de actividad');
    expect((slugField as HTMLInputElement).value).toBe('ordenar-rail');
    expect((constraints as HTMLTextAreaElement).value).toBe('sin tocar el store de Git');
    // También la casilla, que es una decisión tomada y no un texto.
    expect((screen.getByRole('checkbox', { name: /propose\.branch/ }) as HTMLInputElement).checked)
      .toBe(false);
  });

  it('el modo elegido también sobrevive', () => {
    const { unmount } = renderFlow();
    fireEvent.click(screen.getByRole('button', { name: /intent\.explore/ }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'una idea a medio pensar' } });

    unmount();
    renderFlow();

    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('una idea a medio pensar');
  });

  it('en otro repositorio no aparece lo del primero', () => {
    // El workspace ya se remonta a propósito al cambiar de repositorio para no
    // mostrar el snapshot del anterior: un borrador compartido reintroduciría
    // ese defecto, y peor, como si fuera del repositorio nuevo.
    const { unmount } = renderFlow('C:/uno');
    fillEverything();
    unmount();

    renderFlow('C:/dos');
    expect((screen.getAllByRole('textbox')[0] as HTMLTextAreaElement).value).toBe('');
  });
});

describe('cuándo se descarta', () => {
  it('arrancar la sesión lo descarta', async () => {
    renderFlow();
    const [objective, slugField] = screen.getAllByRole('textbox');
    fireEvent.change(objective, { target: { value: 'un objetivo suficientemente claro' } });
    fireEvent.change(slugField, { target: { value: 'mi-cambio' } });
    fireEvent.click(screen.getByRole('button', { name: /newChange\.propose\.review/ }));

    fireEvent.click(await screen.findByTestId('launcher'));

    // Lo escrito ya está en manos del ejecutor: dejó de ser un borrador.
    expect(useNewChangeDraftStore.getState().drafts['C:/repo']).toBeUndefined();
  });
});
