// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GitFailureNotice } from '../GitFailureNotice';

/**
 * El aviso que reemplaza al cartel con la salida cruda de Git.
 *
 * Lo que se protege: que el texto original nunca se pierda, que la acción no se
 * dispare sola, y que no aparezca un botón cuando no hay nada que resolver.
 */

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string>) =>
    params && Object.keys(params).length > 0 ? `${key}:${JSON.stringify(params)}` : key,
}));

afterEach(cleanup);

const VINCULO = `fatal: The upstream branch of your current branch does not match
the name of your current branch.  To push to the upstream branch
on the remote, use

    git push origin HEAD:change/name-task-in-commit-message`;

describe('la explicación', () => {
  it('muestra el motivo en el idioma de la aplicación, nombrando la rama vieja', () => {
    render(<GitFailureNotice error={VINCULO} />);
    expect(screen.getByText(/pushFailure\.upstreamMismatch.*name-task-in-commit-message/)).toBeTruthy();
  });

  it('un fallo desconocido usa el texto genérico y no inventa una causa', () => {
    render(<GitFailureNotice error="fatal: algo que nadie previó" />);
    expect(screen.getByText('git.pushFailure.unknown')).toBeTruthy();
  });
});

describe('el texto de Git', () => {
  it('empieza plegado y se puede abrir', () => {
    // Quien lo necesita lo encuentra; quien no, no lo tiene que leer.
    render(<GitFailureNotice error={VINCULO} />);
    expect(screen.queryByText(/does not match/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /showRaw/ }));
    expect(screen.getByText(/does not match/)).toBeTruthy();
  });

  it('está disponible también cuando el fallo no se reconoce', () => {
    // Es justamente el caso donde es lo único que sirve.
    render(<GitFailureNotice error="fatal: algo que nadie previó" />);
    fireEvent.click(screen.getByRole('button', { name: /showRaw/ }));
    expect(screen.getByText(/algo que nadie previó/)).toBeTruthy();
  });
});

describe('la acción', () => {
  it('no se dispara sola: hace falta apretarla', () => {
    // Empujar y reapuntar tocan el remoto, y eso lo pide una persona.
    const onRemedy = vi.fn();
    render(<GitFailureNotice error={VINCULO} onRemedy={onRemedy} />);

    expect(onRemedy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /pushFailure\.repoint/ }));
    expect(onRemedy).toHaveBeenCalledWith({ kind: 'repoint-upstream' });
  });

  it('no aparece cuando no hay nada que la aplicación pueda resolver', () => {
    // Un botón que no resuelve nada es peor que ninguno.
    const onRemedy = vi.fn();
    render(<GitFailureNotice error="fatal: No configured push destination." onRemedy={onRemedy} />);
    expect(screen.queryByRole('button', { name: /pushFailure\.repoint|pushFailure\.pullFirst/ })).toBeNull();
  });

  it('tampoco aparece si nadie puede atenderla', () => {
    // Sin `onRemedy` el botón no tendría a quién avisarle.
    render(<GitFailureNotice error={VINCULO} />);
    expect(screen.queryByRole('button', { name: /pushFailure\.repoint/ })).toBeNull();
  });
});
