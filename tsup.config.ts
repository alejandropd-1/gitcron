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
    // Bundle everything except 'electron' (provided by the Electron runtime)
    noExternal: [/^(?!electron$).+/],
    external: ['electron'],
    platform: 'node',
    minify: false,
    sourcemap: false,
  },
  {
    // Preload — bundle all deps except 'electron' (must be required at runtime).
    entry: ['electron/preload.ts'],
    format: ['cjs'],
    outDir: 'dist',
    target: 'es2017',
    bundle: true,
    noExternal: [/^(?!electron$).+/],
    external: ['electron'],
    platform: 'node',
    minify: false,
    sourcemap: false,
  },
]);
