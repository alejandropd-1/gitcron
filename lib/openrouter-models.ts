// lib/openrouter-models.ts
//
// Lista curada de modelos de OpenRouter, COMPARTIDA por el Temporal Agent y la
// capa de IA de Cartografía. Ambos usan la misma key de OpenRouter (un router:
// una key → muchos modelos), así que comparten también el catálogo de modelos y
// el selector. Single source of truth para no divergir.
//
// El id es lo único que viaja al adapter; label/price son sólo para la UI.

export interface OpenRouterModel {
  id: string;
  label: string;
  /** Precio entrada/salida por millón de tokens, sólo informativo en la UI. */
  price: string;
}

export const OPENROUTER_MODELS: OpenRouterModel[] = [
  { id: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash (barato)', price: '$0.50 / $3.00' },
  { id: 'google/gemini-3.5-flash', label: 'Gemini 3.5 Flash', price: '$1.50 / $9.00' },
  { id: 'deepseek/deepseek-v4-pro', label: 'DeepSeek V4 Pro', price: '$0.44 / $0.87' },
  { id: 'xiaomi/mimo-v2.5-pro', label: 'MiMo V2.5 Pro', price: '$0.44 / $0.87' },
  { id: 'minimax/minimax-m2.7', label: 'MiniMax M2.7', price: '$0.26 / $1.20' },
  { id: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5 (default)', price: '$3.00 / $15.00' },
  { id: 'openai/gpt-5.5', label: 'GPT-5.5', price: '$5.00 / $30.00' },
];

/** Id del proveedor online en el vault cifrado (compartido con el Temporal Agent). */
export const OPENROUTER_PROVIDER_ID = 'openrouter';
