import { describe, expect, it } from 'vitest';
import { classifyCartoRole } from '../carto-roles';

describe('classifyCartoRole', () => {
  it('clasifica componentes y TSX como maqueta/UI', () => {
    expect(classifyCartoRole('components/cartography/CartographyView.tsx')).toBe('ui');
    expect(classifyCartoRole('app/page.tsx')).toBe('ui');
  });

  it('prioriza estilos y tokens sobre rutas de UI', () => {
    expect(classifyCartoRole('app/globals.css')).toBe('styles');
    expect(classifyCartoRole('components/Button.module.css')).toBe('styles');
  });

  it('detecta base de datos, SQL y persistencia', () => {
    expect(classifyCartoRole('electron/db/repository.ts')).toBe('database');
    expect(classifyCartoRole('migrations/001_init.sql')).toBe('database');
    expect(classifyCartoRole('lib/persistence-store.ts')).toBe('database');
  });

  it('marca IPC, main y lógica Git como funcionalidad crítica', () => {
    expect(classifyCartoRole('electron/main.ts')).toBe('critical');
    expect(classifyCartoRole('electron/ipc/git-ops.ts')).toBe('critical');
    expect(classifyCartoRole('hooks/git-actions/working-tree.ts')).toBe('critical');
  });

  it('clasifica lib/hooks/types no críticos como lógica/utilidades', () => {
    expect(classifyCartoRole('lib/carto-from-codegraph.ts')).toBe('logic');
    expect(classifyCartoRole('hooks/use-canvas-viewport.ts')).toBe('logic');
  });

  it('detecta archivos de configuración de forma extensible y determinista', () => {
    expect(classifyCartoRole('package.json')).toBe('config');
    expect(classifyCartoRole('next.config.ts')).toBe('config');
    expect(classifyCartoRole('.fallowrc.json')).toBe('config');
  });

  it('degrada lo no reconocido a otros', () => {
    expect(classifyCartoRole('docs/reports/CARTO_F7_REPORT.md')).toBe('other');
  });
});
