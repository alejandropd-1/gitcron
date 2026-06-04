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
      'electron/db/__tests__/**/*.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
