import { defineConfig } from 'tsup';

export default defineConfig([
  {
    // Main process — bundle ALL dependencies into a single file.
    // Only 'electron' stays external (it's provided by the Electron runtime).
    entry: ['electron/main.ts'],
    format: ['cjs'],
    outDir: 'dist',
    target: 'node22',
    bundle: true,
    // Bundle everything except 'electron' (provided by the Electron runtime)
    // and `@colbymchenry/codegraph` (Cartography's CodeGraph engine): it
    // re-exports a per-platform bundle with WASM/tree-sitter that it resolves via
    // `require.resolve` at runtime and opens node:sqlite lazily. Bundling it would
    // break that dynamic resolution, so it stays external and loads from
    // node_modules at runtime (zero network — the bundle is installed on disk).
    noExternal: [/^(?!electron$|node:|@colbymchenry\/codegraph$).+/],
    external: ['electron', 'node:sqlite', '@colbymchenry/codegraph'],
    // tsup/esbuild currently strips `node:` from `node:sqlite` even with the
    // supported flags below and a Node 22 target. Keep this post-build fallback
    // scoped to the main bundle so Electron 42/Node 24 loads the builtin module.
    onSuccess: "node -e \"const fs=require('fs');const path=require('path');const p=path.join('dist','main.js');const q=String.fromCharCode(34);const a='require('+q+'sqlite'+q+')';const b='require('+q+'node:sqlite'+q+')';const s=fs.readFileSync(p,'utf8');const next=s.split(a).join(b);if(next!==s)fs.writeFileSync(p,next,'utf8');\"",
    esbuildOptions(options) {
      options.supported = {
        ...(options.supported ?? {}),
        'node-colon-prefix-import': true,
        'node-colon-prefix-require': true,
      };
    },
    platform: 'node',
    minify: false,
    sourcemap: false,
  },
  {
    // Preload — bundle all deps except 'electron' (must be required at runtime).
    entry: ['electron/preload.ts'],
    format: ['cjs'],
    outDir: 'dist',
    target: 'node22',
    bundle: true,
    noExternal: [/^(?!electron$|node:).+/],
    external: ['electron'],
    esbuildOptions(options) {
      options.supported = {
        ...(options.supported ?? {}),
        'node-colon-prefix-import': true,
        'node-colon-prefix-require': true,
      };
    },
    platform: 'node',
    minify: false,
    sourcemap: false,
  },
]);
