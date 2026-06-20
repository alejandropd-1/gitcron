import { describe, expect, it } from 'vitest';
import { buildExplainPrompts, buildAskPrompts } from '../prompts';
import type { CartoAINodeRef, CartoAIContext } from '../../../../types/carto-ai';

const node: CartoAINodeRef = {
  name: 'calculateTotal',
  kind: 'function',
  filePath: 'lib/cart.ts',
  startLine: 10,
  endLine: 24,
  signature: 'calculateTotal(items: Item[]): number',
};

describe('buildExplainPrompts', () => {
  it('ancla la respuesta en el idioma pedido', () => {
    const { system } = buildExplainPrompts(node, { lang: 'en' });
    expect(system).toContain('Answer in English');
  });

  it('por defecto responde en español', () => {
    const { system } = buildExplainPrompts(node, {});
    expect(system).toContain('español');
  });

  it('incluye nombre, tipo, ubicación y firma del nodo', () => {
    const { user } = buildExplainPrompts(node, {});
    expect(user).toContain('calculateTotal');
    expect(user).toContain('function');
    expect(user).toContain('lib/cart.ts:10-24');
    expect(user).toContain('calculateTotal(items: Item[]): number');
  });

  it('renderiza las relaciones reales como contexto verificado', () => {
    const ctx: CartoAIContext = {
      imports: ['lib/money.ts'],
      usedBy: ['app/page.tsx', 'components/Cart.tsx'],
      impact: { fileCount: 2, symbolCount: 5, sampleFiles: ['app/page.tsx'] },
    };
    const { user } = buildExplainPrompts(node, ctx);
    expect(user).toContain('Importa a (1): lib/money.ts');
    expect(user).toContain('Es usado por (2): app/page.tsx, components/Cart.tsx');
    expect(user).toContain('2 archivos · 5 símbolos');
  });

  it('declara la ausencia de relaciones en vez de inventarlas', () => {
    const { user } = buildExplainPrompts(node, {});
    expect(user).toContain('sin relaciones registradas en el grafo');
  });

  it('el system prompt prohíbe inventar relaciones', () => {
    const { system } = buildExplainPrompts(node, {});
    expect(system).toMatch(/NO inventes/);
  });
});

describe('buildAskPrompts', () => {
  it('incluye la pregunta del usuario, trimmeada', () => {
    const { user } = buildAskPrompts('  ¿qué hace el store?  ', {});
    expect(user).toContain('¿qué hace el store?');
    expect(user).not.toMatch(/ {2}¿/);
  });

  it('omite el bloque de contexto cuando no hay relaciones', () => {
    const { user } = buildAskPrompts('hola', {});
    expect(user).not.toContain('Contexto estructural verificado');
  });

  it('agrega el contexto cuando hay relaciones disponibles', () => {
    const { user } = buildAskPrompts('¿quién la usa?', { filePath: 'lib/cart.ts', usedBy: ['app/page.tsx'] });
    expect(user).toContain('Contexto estructural verificado');
    expect(user).toContain('app/page.tsx');
  });
});
