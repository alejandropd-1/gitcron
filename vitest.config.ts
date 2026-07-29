import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'lib/__tests__/**/*.test.ts',
      'hooks/__tests__/**/*.test.ts',
      'electron/__tests__/**/*.test.ts',
      'electron/ai/__tests__/**/*.test.ts',
      'electron/ai/carto/__tests__/**/*.test.ts',
      'electron/db/__tests__/**/*.test.ts',
      // F04 introduce lógica de UI testeable sin DOM (resolución de estado del
      // workspace Pipeline), que vive junto a sus componentes.
      'components/**/__tests__/**/*.test.ts',
      // Los tests de componentes declaran `@vitest-environment jsdom` en su
      // cabecera. El entorno por defecto sigue siendo `node`: montar un DOM
      // para las suites de dominio sería más lento sin aportar nada.
      'components/**/__tests__/**/*.test.tsx',
    ],
  },
  // `tsconfig.json` declara `jsx: preserve` porque la transformación la hace
  // Next. Vitest usa rolldown/oxc y necesita hacerla por su cuenta para poder
  // montar componentes.
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
