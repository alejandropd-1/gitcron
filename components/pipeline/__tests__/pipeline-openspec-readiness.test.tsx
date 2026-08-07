// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenSpecReadiness, OpenSpecToolList } from '../OpenSpecReadiness';

/**
 * Lo que le falta al repositorio para que el método funcione.
 *
 * El estado que esto existe para mostrar convive con un repositorio
 * correctamente inicializado: una herramienta presente sin sus skills. Su
 * ejecutor no sabe que el canal de instrucciones existe, así que trabaja sin el
 * método y sin avisar. Pasó con Antigravity en `odontoPau`.
 */

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

afterEach(cleanup);

const tool = (toolId: string, configured: boolean) => ({
  toolId,
  label: toolId,
  directory: `.${toolId}`,
  configured,
});

describe('estado de preparación del repositorio', () => {
  it('declara el repositorio sin OpenSpec y nombra la consecuencia', () => {
    render(<OpenSpecReadiness present={false} tools={[]} />);

    expect(screen.getByText(/readiness\.missingTitle/)).toBeTruthy();
    // No alcanza con decir que falta: hay que decir qué pasa si no se resuelve.
    expect(screen.getByText(/readiness\.missingHelp/)).toBeTruthy();
  });

  it('avisa cuántas faltan, sin listar el detalle', () => {
    // El aviso interrumpe y por eso es una línea; el detalle vive en el rail.
    render(<OpenSpecReadiness present tools={[tool('codex', true), tool('antigravity', false)]} />);

    expect(screen.getByText(/readiness\.toolsTitle.*1/)).toBeTruthy();
    expect(screen.queryByText('antigravity')).toBeNull();
  });

  it('no muestra nada cuando está todo en orden', () => {
    // Un bloque que siempre está enseña a saltearlo, incluido el día que dice algo.
    const { container } = render(<OpenSpecReadiness present tools={[tool('codex', true)]} />);
    expect(container.firstChild).toBeNull();
  });

  it('sin el dato no afirma nada', () => {
    // Un snapshot de una versión anterior no lo trae, y no saber no es «no hay».
    const { container } = render(<OpenSpecReadiness />);
    expect(container.firstChild).toBeNull();
  });
});

describe('detalle de herramientas en el rail', () => {
  it('lista las configuradas junto a las que faltan', () => {
    // El contraste es lo que hace legible lo que falta, y sin las que están bien
    // el rail estaría vacío casi siempre.
    render(<OpenSpecToolList present tools={[tool('codex', true), tool('antigravity', false)]} />);

    expect(screen.getByText('codex')).toBeTruthy();
    expect(screen.getByText('antigravity')).toBeTruthy();
    expect(screen.getByText(/readiness\.configured/)).toBeTruthy();
    expect(screen.getByText(/readiness\.notConfigured/)).toBeTruthy();
  });

  it('con todo en orden sigue mostrando la lista', () => {
    // A diferencia del aviso, la referencia no desaparece: se consulta.
    render(<OpenSpecToolList present tools={[tool('codex', true)]} />);
    expect(screen.getByText('codex')).toBeTruthy();
  });

  it('sin OpenSpec lo declara en vez de listar nada', () => {
    render(<OpenSpecToolList present={false} tools={[]} />);
    expect(screen.getByText(/readiness\.missingTitle/)).toBeTruthy();
  });

  it('sin herramientas reconocidas lo dice, en vez de quedar en blanco', () => {
    render(<OpenSpecToolList present tools={[]} />);
    expect(screen.getByText(/rail\.noTools/)).toBeTruthy();
  });
});
