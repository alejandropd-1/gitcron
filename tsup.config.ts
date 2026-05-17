import { defineConfig } from 'tsup';

export default defineConfig([
  {
    // Main process — bundle ALL dependencies into a single file.
    // Only 'electron' stays external (it's provided by the Electron runtime).
    entry: ['electron/main.ts'],
    format: ['cjs'],
    outDir: 'dist',
    target: 'es2017',
    bundle: true,
    noExternal: [/.*/],   // bundle every import, including node_modules
    external: ['electron'],
    platform: 'node',
    minify: false,
    sourcemap: false,
  },
  {
    // Preload — also bundle all deps, external only electron.
    entry: ['electron/preload.ts'],
    format: ['cjs'],
    outDir: 'dist',
    target: 'es2017',
    bundle: true,
    noExternal: [/.*/],
    external: ['electron'],
    platform: 'node',
    minify: false,
    sourcemap: false,
  },
]);
