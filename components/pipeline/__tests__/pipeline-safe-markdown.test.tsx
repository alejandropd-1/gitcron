// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SafeMarkdown } from '../SafeMarkdown';

/**
 * El visor tiene que entender el markdown que OpenSpec escribe.
 *
 * El parser reconocía tres niveles de encabezado, y el que la metodología usa
 * para cada escenario es el cuarto —«los escenarios llevan exactamente cuatro
 * almohadillas»—. Ese nivel caía al `else` final y salía impreso con sus cuatro
 * almohadillas a la vista: el nivel más frecuente de una spec era el único que
 * el visor no entendía.
 */

afterEach(cleanup);

describe('visor de artefactos', () => {
  it('renderiza el escenario de cuatro almohadillas como encabezado', () => {
    render(<SafeMarkdown content={'#### Scenario: Path fuera del repo'} />);

    const heading = screen.getByRole('heading', { name: 'Scenario: Path fuera del repo' });
    expect(heading).toBeTruthy();
    // Y las almohadillas no llegan a pantalla.
    expect(document.body.textContent).not.toContain('####');
  });

  it('encaja los niveles del documento bajo los de la página, sin saltos', () => {
    // El panel usa `h2` para su marca y `h3` para sus secciones, así que el
    // documento arranca en `h3` y no introduce un segundo `h1`.
    render(<SafeMarkdown content={'# Uno\n\n## Dos\n\n### Tres\n\n#### Cuatro'} />);

    expect(screen.getByRole('heading', { name: 'Uno', level: 3 })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Dos', level: 4 })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Tres', level: 5 })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Cuatro', level: 6 })).toBeTruthy();
  });

  it('no inventa niveles más allá del último que existe', () => {
    render(<SafeMarkdown content={'##### Cinco\n\n###### Seis'} />);

    expect(screen.getByRole('heading', { name: 'Cinco', level: 6 })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Seis', level: 6 })).toBeTruthy();
  });

  it('conserva los ítems de una lista', () => {
    render(<SafeMarkdown content={'- **WHEN** el modelo pide algo\n- **THEN** el tool lo rechaza'} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('WHEN');
    expect(items[1].textContent).toContain('THEN');
  });

  it('una almohadilla sin espacio no es un encabezado', () => {
    // `#hashtag` es texto, no título: el nivel exige separador.
    render(<SafeMarkdown content={'#sin-espacio'} />);

    expect(screen.queryByRole('heading')).toBeNull();
    expect(document.body.textContent).toContain('#sin-espacio');
  });
});
