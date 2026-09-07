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

  it('Obs 56: acumula líneas consecutivas en un mismo párrafo y resuelve negritas que cruzan cortes de línea', () => {
    // Texto real cortado a ~100 caracteres como en los artefactos del repo
    const multilineMd = `\`remaquetar-cuerpo-de-sdd\` reordenó el cuerpo de la vista del ciclo y **su revisión visual se
rechazó**. No por mala ejecución: por la regla que ese change se puso a sí mismo.

Segundo párrafo independiente.`;

    const { container } = render(<SafeMarkdown content={multilineMd} />);

    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(2);

    const firstP = paragraphs[0];
    const strong = firstP.querySelector('strong');
    expect(strong).toBeTruthy();
    expect(strong?.textContent).toBe('su revisión visual se rechazó');
    expect(firstP.textContent).not.toContain('**');
    expect(firstP.textContent).toContain('su revisión visual se rechazó. No por mala ejecución');
  });

  it('Obs 56: admite asteriscos dentro de negrita (por ejemplo globs en bloques de código)', () => {
    const textWithGlobInBold = '**Las cadenas de `pipeline.openspec.prepare.*` hablan del cambio.**';
    const { container } = render(<SafeMarkdown content={textWithGlobInBold} />);

    const strong = container.querySelector('strong');
    expect(strong).toBeTruthy();
    expect(strong?.textContent).toContain('pipeline.openspec.prepare.*');
    const code = strong?.querySelector('code');
    expect(code).toBeTruthy();
    expect(code?.textContent).toBe('pipeline.openspec.prepare.*');
  });
});
