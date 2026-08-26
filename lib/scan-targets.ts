import fs from 'node:fs';
import path from 'node:path';

/**
 * Define el conjunto canónico de archivos de interfaz que recorren las
 * verificaciones automáticas de paleta de color y escala tipográfica / espaciado.
 *
 * QUÉ INCLUYE:
 * 1. `app/`:
 *    - `app/globals.css`: hoja de estilos global, temas y utilidades compuestas.
 *    - `app/layout.tsx`: estructura HTML y layout raíz de la aplicación.
 *    - `app/page.tsx`: orquestador de vistas y layout principal.
 * 2. `components/`:
 *    - Todos los componentes `.tsx` en `components/` y sus subdirectorios
 *      (cartography/, graph/, pipeline/, temporal/, primitives/, etc.).
 *    - Todos los módulos de hoja de estilos `.css` en `components/`
 *      (e.g. `components/pipeline/OpenSpecDashboard.module.css`).
 *
 * QUÉ DEJA AFUERA Y POR QUÉ:
 * 1. `__tests__/` y archivos `*.test.tsx` / `*.test.ts`:
 *    - Son fixtures de prueba, mocks y aserciones de testing, no código de interfaz de producto.
 * 2. Archivos `.ts` (no `.tsx`) dentro de `app/` y `components/` (e.g. `components/pipeline/pipeline-domain.ts`):
 *    - Son adaptadores de estado, modelos de dominio y tipados puros sin JSX ni marcado visual (contienen 0 declaraciones de color).
 * 3. `lib/`, `hooks/`, `electron/`:
 *    - Son capas de lógica pura, estado Zustand, hooks no visuales y proceso principal Electron / IPC.
 *      No definen maquetación visual ni clases de presentación de interfaz.
 * 4. `node_modules/`, `.next/`, `dist/`:
 *    - Dependencias externas empaquetadas y artefactos de compilación.
 * 5. `openspec/`, `docs/`, `.agents/`:
 *    - Especificaciones de producto, documentación de arquitectura y configuración de agentes.
 */
export function getScannedUiFiles(rootDir = process.cwd()): string[] {
  const targets: string[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '__tests__' || entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        if (entry.name.endsWith('.test.tsx') || entry.name.endsWith('.test.ts')) {
          continue;
        }
        if (entry.name.endsWith('.tsx') || entry.name.endsWith('.css')) {
          const relPath = path.relative(rootDir, fullPath).split(path.sep).join('/');
          targets.push(relPath);
        }
      }
    }
  }

  walk(path.join(rootDir, 'app'));
  walk(path.join(rootDir, 'components'));

  return targets.sort();
}
