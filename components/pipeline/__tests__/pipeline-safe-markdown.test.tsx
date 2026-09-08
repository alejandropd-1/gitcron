// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MarkdownViewer } from '../MarkdownViewer';

/**
 * El visor de Markdown (MarkdownViewer) utiliza react-markdown con remark-gfm.
 * Debe satisfacer los comportamientos reales que OpenSpec exige:
 * - Los escenarios (# a ######) mapean a la jerarquía de página (h3 a h6).
 * - Acumula líneas consecutivas en un solo párrafo y resuelve negritas multilínea.
 * - Soporta tablas, listas de verificación (checkboxes) y enlaces externos.
 * - Escapa HTML crudo sin usar dangerouslySetInnerHTML.
 */

afterEach(cleanup);

describe('visor de artefactos (MarkdownViewer)', () => {
  it('renderiza el escenario de cuatro almohadillas como encabezado', () => {
    render(<MarkdownViewer content={'#### Scenario: Path fuera del repo'} />);

    const heading = screen.getByRole('heading', { name: 'Scenario: Path fuera del repo' });
    expect(heading).toBeTruthy();
    // Y las almohadillas no llegan a pantalla.
    expect(document.body.textContent).not.toContain('####');
  });

  it('encaja los niveles del documento bajo los de la página, sin saltos', () => {
    // El panel usa `h2` para su marca y `h3` para sus secciones, así que el
    // documento arranca en `h3` y no introduce un segundo `h1`.
    render(<MarkdownViewer content={'# Uno\n\n## Dos\n\n### Tres\n\n#### Cuatro'} />);

    expect(screen.getByRole('heading', { name: 'Uno', level: 3 })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Dos', level: 4 })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Tres', level: 5 })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Cuatro', level: 6 })).toBeTruthy();
  });

  it('no inventa niveles más allá del último que existe', () => {
    render(<MarkdownViewer content={'##### Cinco\n\n###### Seis'} />);

    expect(screen.getByRole('heading', { name: 'Cinco', level: 6 })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Seis', level: 6 })).toBeTruthy();
  });

  it('conserva los ítems de una lista', () => {
    render(<MarkdownViewer content={'- **WHEN** el modelo pide algo\n- **THEN** el tool lo rechaza'} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('WHEN');
    expect(items[1].textContent).toContain('THEN');
  });

  it('una almohadilla sin espacio no es un encabezado', () => {
    // `#hashtag` es texto, no título: el nivel exige separador.
    render(<MarkdownViewer content={'#sin-espacio'} />);

    expect(screen.queryByRole('heading')).toBeNull();
    expect(document.body.textContent).toContain('#sin-espacio');
  });

  it('Obs 56: acumula líneas consecutivas en un mismo párrafo y resuelve negritas que cruzan cortes de línea', () => {
    // Texto real cortado a ~100 caracteres como en los artefactos del repo
    const multilineMd = `\`remaquetar-cuerpo-de-sdd\` reordenó el cuerpo de la vista del ciclo y **su revisión visual se
rechazó**. No por mala ejecución: por la regla que ese change se puso a sí mismo.

Segundo párrafo independiente.`;

    const { container } = render(<MarkdownViewer content={multilineMd} />);

    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(2);

    const firstP = paragraphs[0];
    const strong = firstP.querySelector('strong');
    expect(strong).toBeTruthy();
    expect(strong?.textContent?.replace(/\s+/g, ' ')).toBe('su revisión visual se rechazó');
    expect(firstP.textContent).not.toContain('**');
    expect(firstP.textContent?.replace(/\s+/g, ' ')).toContain('su revisión visual se rechazó. No por mala ejecución');
  });

  it('Obs 56: admite asteriscos dentro de negrita (por ejemplo globs en bloques de código)', () => {
    const textWithGlobInBold = '**Las cadenas de `pipeline.openspec.prepare.*` hablan del cambio.**';
    const { container } = render(<MarkdownViewer content={textWithGlobInBold} />);

    const strong = container.querySelector('strong');
    expect(strong).toBeTruthy();
    expect(strong?.textContent).toContain('pipeline.openspec.prepare.*');
    const code = strong?.querySelector('code');
    expect(code).toBeTruthy();
    expect(code?.textContent).toBe('pipeline.openspec.prepare.*');
  });

  it('renderiza tablas y casillas de verificación de GFM', () => {
    const gfmContent = `
| Tarea | Estado |
| :--- | :--- |
| Tarea 1 | Lista |

- [ ] Tarea pendiente
- [x] Tarea completada
`;
    const { container } = render(<MarkdownViewer content={gfmContent} />);

    expect(container.querySelector('table')).toBeTruthy();
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(2);
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(false);
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(true);
  });

  it('abre enlaces de forma externa y no interpreta HTML crudo peligroso', () => {
    const unsafeContent = '[Documentación](https://example.com)\n\n<script>alert("xss")</script><div id="pwn">bad</div>';
    const { container } = render(<MarkdownViewer content={unsafeContent} />);

    const link = container.querySelector('a');
    expect(link).toBeTruthy();
    expect(link?.getAttribute('href')).toBe('https://example.com');
    expect(link?.getAttribute('target')).toBe('_blank');

    // No debe haber tags de script ni divs inyectados como DOM
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('#pwn')).toBeNull();
    expect(container.textContent).toContain('<script>alert("xss")</script>');
  });

  it('Bloque B: apila sublistas anidadas y párrafos debajo del texto del ítem sin crear columnas', () => {
    const nestedContent = `- [ ] 1. Tarea principal con texto descriptivo
  - Subtarea anidada 1.1
  - Subtarea anidada 1.2
- [x] 2. Tarea con múltiples párrafos

  Segundo párrafo explicativo debajo

  \`\`\`ts
  const variable = 42;
  \`\`\`
`;
    const { container } = render(<MarkdownViewer content={nestedContent} />);

    const taskItems = container.querySelectorAll('li.task-list-item');
    expect(taskItems.length).toBeGreaterThanOrEqual(2);

    const firstItem = taskItems[0];
    const nestedUl = firstItem.querySelector('ul');
    expect(nestedUl).toBeTruthy();
    expect(nestedUl?.querySelectorAll('li').length).toBe(2);

    const secondItem = taskItems[1];
    const paragraphs = secondItem.querySelectorAll('p');
    expect(paragraphs.length).toBe(2);
    const pre = secondItem.querySelector('pre');
    expect(pre).toBeTruthy();
    expect(pre?.textContent).toContain('const variable = 42;');
  });

  it('Bloque B: renderiza listas numeradas con tag ol y tablas con contenedor responsivo', () => {
    const complexContent = `
1. Primer paso ordenado
2. Segundo paso ordenado
   - Sub-viñeta no ordenada dentro de lista numerada
3. Tercer paso

> Cita en bloque destacada

| Col A | Col B |
| :--- | :--- |
| Val 1 | Val 2 |
`;
    const { container } = render(<MarkdownViewer content={complexContent} />);

    const ol = container.querySelector('ol');
    expect(ol).toBeTruthy();
    expect(ol?.querySelectorAll('li').length).toBeGreaterThanOrEqual(3);

    const nestedUl = ol?.querySelector('ul');
    expect(nestedUl).toBeTruthy();

    const tableWrap = container.querySelector('.pipeline-markdown__table-wrap');
    expect(tableWrap).toBeTruthy();
    expect(tableWrap?.querySelector('table')).toBeTruthy();

    const blockquote = container.querySelector('blockquote');
    expect(blockquote).toBeTruthy();
    expect(blockquote?.textContent).toContain('Cita en bloque destacada');
  });

  it('Bloque B: renderiza el tasks.md real del change sin errores ni desbordes', () => {
    const tasksFilePath = path.resolve(__dirname, '../../../openspec/changes/gestionar-ciclo-openspec-desde-gitcron/tasks.md');
    const realTasksContent = fs.readFileSync(tasksFilePath, 'utf-8');
    const { container } = render(<MarkdownViewer content={realTasksContent} />);

    expect(container.querySelector('.pipeline-markdown')).toBeTruthy();
    const taskItems = container.querySelectorAll('li.task-list-item');
    expect(taskItems.length).toBeGreaterThanOrEqual(90);
  });
});
