// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { OpenSpecEngineCard } from '../OpenSpecEngineCard';
import { OpenSpecUpdateReview } from '../OpenSpecUpdateReview';
import { OpenSpecUpdateRunner } from '../OpenSpecUpdateRunner';
import { OpenSpecToolList } from '../OpenSpecReadiness';
import type { OpenSpecEngineStatus } from '../../../types/pipeline';

afterEach(() => {
  cleanup();
  delete (window as unknown as { api?: unknown }).api;
});

function makeStatus(overrides?: Partial<OpenSpecEngineStatus>): OpenSpecEngineStatus {
  return {
    cli: {
      installed: true,
      runtimeVersion: '1.13.2',
      provenance: 'global',
      displayPath: 'C:\\global\\openspec.cmd',
      supportedRange: { min: '1.5.0', max: '1.13.2' },
      versionClass: 'supported',
      evidenceStatus: 'confirmed',
      diagnostics: [],
    },
    latestAvailable: {
      status: 'online',
      latestVersion: '1.13.2',
      checkedAt: 'now',
      fromCache: false,
      cacheAgeSeconds: 0,
      freshness: 'fresh',
      error: null,
    },
    globalConfig: null,
    installedIntegration: {
      skills: [],
      generatedBy: '1.13.2',
      markersFound: [],
      outputInventory: [],
      evidenceStatus: 'confirmed',
      tools: ['codex'],
      targets: ['codex'],
      configuredTools: ['codex'],
      presentToolDirectories: ['codex'],
      configuredAgentsCount: 1,
      totalPresentAgentsCount: 1,
      configuredCount: 1,
      totalPresentCount: 1,
      installedWorkflowsByTarget: {
        codex: ['apply', 'archive', 'explore', 'propose', 'sync', 'update'],
      },
      missing: null,
      legacy: [],
      customized: [],
      conflicts: null,
    },
    repoState: 'initialized',
    integrationState: 'up-to-date',
    pendingTools: [],
    toolReport: {
      source: 'engine',
      engineVersion: '1.13.2',
      tools: [
        {
          id: 'codex',
          label: 'Codex',
          skillsDir: '.agents',
          available: true,
          configured: true,
          needsUpdate: false,
          generatedBy: '1.13.2',
        },
      ],
      profileSyncNeeded: [],
    },
    ...overrides,
  };
}

describe('Tanda D - Tareas 6.1 a 6.6: UI Estados legibles y sin saltos', () => {
  // 6.1 Estado «leyendo»
  describe('6.1: Estado «leyendo» vs ausencia medida', () => {
    it('sin estado o con isLoading: muestra «Leyendo OpenSpec…» y ningún texto falso de ausencia', () => {
      render(<OpenSpecEngineCard status={null} isLoading={true} compact={false} repoPath="/test/repo" />);

      // Debe mostrar «Leyendo OpenSpec…»
      expect(screen.getAllByText(/Leyendo OpenSpec…/i).length).toBeGreaterThanOrEqual(1);

      // NO debe mostrar textos de ausencia o error prematuro
      expect(screen.queryByText(/^Ausente$/i)).toBeNull();
      expect(screen.queryByText(/Desconocido/i)).toBeNull();
      expect(screen.queryByText(/No se puede determinar/i)).toBeNull();
      expect(screen.queryByText(/El CLI de OpenSpec no está instalado en el sistema/i)).toBeNull();
    });

    it('modo compacto sin estado o con isLoading: muestra insignia con «Leyendo OpenSpec…»', () => {
      render(<OpenSpecEngineCard status={null} isLoading={true} compact={true} repoPath="/test/repo" />);

      expect(screen.getByText(/Leyendo OpenSpec…/i)).toBeDefined();
      expect(screen.queryByText(/Ausente/i)).toBeNull();
    });

    it('con ausencia medida: recién entonces muestra «Ausente» y el motivo de instalación', () => {
      const absentStatus = makeStatus({
        cli: {
          installed: false,
          runtimeVersion: null,
          provenance: 'unknown',
          displayPath: null,
          supportedRange: { min: '1.5.0', max: '1.13.2' },
          versionClass: 'unknown',
          evidenceStatus: 'confirmed',
          diagnostics: [],
        },
      });

      render(<OpenSpecEngineCard status={absentStatus} isLoading={false} compact={false} repoPath="/test/repo" />);

      expect(screen.getAllByText(/Ausente/i).length).toBeGreaterThanOrEqual(1);
    });

    it('OpenSpecUpdateRunner con isLoading muestra botón deshabilitado «Leyendo OpenSpec…»', () => {
      render(
        <OpenSpecUpdateRunner
          repoPath="/test/repo"
          engine={null}
          integration={false}
          isLoading={true}
        />,
      );

      const readingBtn = screen.getByRole('button', { name: /Leyendo OpenSpec…/i });
      expect(readingBtn).toBeDefined();
      expect((readingBtn as HTMLButtonElement).disabled).toBe(true);
    });
  });

  // 6.2 Repositorio sin OpenSpec
  describe('6.2: Repositorio sin OpenSpec ofrece inicializarlo una sola vez con selección', () => {
    it('sin OpenSpec: bloque único con casillas preseleccionadas, sin botones por herramienta y resultado visible', () => {
      const initMock = vi.fn();
      const detectedTools = [
        { toolId: 'claude', label: 'Claude Code', directory: '.claude', configured: false },
        { toolId: 'cursor', label: 'Cursor', directory: '.cursor', configured: false },
      ];

      render(
        <OpenSpecToolList
          present={false}
          tools={detectedTools}
          uncommittedCount={3}
          onInitializeWith={initMock}
        />,
      );

      // No hay botones «Configurar» por herramienta
      expect(screen.queryByRole('button', { name: /^Configurar$/i })).toBeNull();

      // Las casillas están preseleccionadas
      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      expect(checkboxes).toHaveLength(2);
      expect(checkboxes.every((cb) => cb.checked)).toBe(true);

      // Muestra lo que va a escribir
      expect(screen.getByText(/Escribe en el repositorio/i)).toBeDefined();

      // Botón único «Inicializar OpenSpec»
      const initBtn = screen.getByRole('button', { name: /Inicializar OpenSpec/i });
      expect(initBtn).toBeDefined();

      // Desmarcar una herramienta y pulsar inicializar
      fireEvent.click(checkboxes[1]); // desmarca cursor
      fireEvent.click(initBtn);

      expect(initMock).toHaveBeenCalledWith(['claude']);

      // Muestra la línea de resultado
      expect(screen.getByText(/OpenSpec quedó inicializado con Claude Code · 3 archivos nuevos sin confirmar/i)).toBeDefined();
    });
  });

  // 6.3 Pendientes con OpenSpec ya inicializado
  describe('6.3: Herramientas sin configurar se resumen con una sola acción Configurar…', () => {
    it('tarjeta con dos pendientes muestra una sola línea y un solo botón Configurar…, y ejecuta la unión', async () => {
      const initMock = vi.fn().mockResolvedValue({ success: true });
      (window as unknown as { api: unknown }).api = { pipelineInitOpenSpec: initMock };

      const status = makeStatus({
        pendingTools: ['zcode', 'continue'],
        toolReport: {
          source: 'engine',
          engineVersion: '1.13.2',
          tools: [
            { id: 'codex', label: 'Codex', skillsDir: '.agents', available: true, configured: true, needsUpdate: false, generatedBy: '1.13.2' },
            { id: 'zcode', label: 'Zcode', skillsDir: '.zcode', available: true, configured: false, needsUpdate: false, generatedBy: null },
            { id: 'continue', label: 'Continue', skillsDir: '.continue', available: true, configured: false, needsUpdate: false, generatedBy: null },
          ],
          profileSyncNeeded: [],
        },
      });

      render(
        <OpenSpecEngineCard
          status={status}
          compact={false}
          repoPath="/test/repo"
          uncommittedCount={2}
        />,
      );

      // Una sola línea con las herramientas detectadas sin configurar
      expect(screen.getByText(/Detectadas sin configurar: Zcode, Continue/i)).toBeDefined();

      // Un solo botón «Configurar…»
      const configureEllipsisBtn = screen.getByRole('button', { name: /Configurar…/i });
      expect(configureEllipsisBtn).toBeDefined();

      // Abre la elección
      fireEvent.click(configureEllipsisBtn);

      // Las casillas de las dos pendientes aparecen
      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      expect(checkboxes.length).toBe(2);

      // Desmarcar continue para configurar sólo zcode
      fireEvent.click(checkboxes[1]);

      // Confirmar configuración
      const confirmBtn = screen.getByRole('button', { name: /^Configurar$/i });
      fireEvent.click(confirmBtn);

      // Llama con la unión de las ya configuradas (codex) + las elegidas (zcode)
      expect(initMock).toHaveBeenCalledWith('/test/repo', ['codex', 'zcode']);

      // Muestra el resultado en una línea
      expect(await screen.findByText(/Se configuró Zcode · 2 archivos nuevos sin confirmar/i)).toBeDefined();
    });
  });

  // 6.4 Maqueta sin superposiciones ni saltos
  describe('6.4: Maqueta con columnas fijas y elementos separados', () => {
    it('filas de herramientas renderizan ícono, nombre, carpeta y estado como elementos hermanos sin superponerse', () => {
      const tools = [
        { toolId: 'agents', label: 'Carpeta compartida .agents', directory: '.agents', configured: true },
        { toolId: 'zcode', label: 'Zcode', directory: '.zcode', configured: false },
      ];

      render(<OpenSpecToolList present={true} tools={tools} />);

      const listItems = screen.getAllByRole('listitem');
      expect(listItems.length).toBeGreaterThanOrEqual(2);

      // Verificar que el nombre y la carpeta están en elementos hermanos separados (strong y code)
      const firstRow = listItems[0];
      const strongEl = within(firstRow).getByText('Carpeta compartida .agents');
      const codeEl = within(firstRow).getByText('.agents');

      expect(strongEl.tagName).toBe('STRONG');
      expect(codeEl.tagName).toBe('CODE');
      expect(strongEl.parentElement).toBe(codeEl.parentElement);
    });
  });

  // 6.5 Cabecera coherente
  describe('6.5: Cabecera coherente: un repo no inicializado o con pendientes NO muestra «Todo al día»', () => {
    it('repositorio sin inicializar muestra «Inicializar OpenSpec» y no «Todo al día»', () => {
      const initMock = vi.fn();
      render(
        <OpenSpecUpdateRunner
          repoPath="/test/repo"
          engine={null}
          integration={false}
          repoInitialized={false}
          onInitialize={initMock}
        />,
      );

      // NO debe decir «Todo al día»
      expect(screen.queryByRole('button', { name: /Todo al día/i })).toBeNull();

      // Debe decir «Inicializar OpenSpec»
      const initBtn = screen.getByRole('button', { name: /Inicializar OpenSpec/i });
      expect(initBtn).toBeDefined();

      fireEvent.click(initBtn);
      expect(initMock).toHaveBeenCalledTimes(1);
    });

    it('repositorio con herramientas pendientes muestra «Configurar…» y no «Todo al día»', () => {
      const configureMock = vi.fn();
      render(
        <OpenSpecUpdateRunner
          repoPath="/test/repo"
          engine={null}
          integration={false}
          repoInitialized={true}
          pendingTools={['zcode']}
          onConfigurePendingTools={configureMock}
        />,
      );

      // NO debe decir «Todo al día»
      expect(screen.queryByRole('button', { name: /Todo al día/i })).toBeNull();

      // Debe ofrecer «Configurar…»
      const configBtn = screen.getByRole('button', { name: /Configurar…/i });
      expect(configBtn).toBeDefined();

      fireEvent.click(configBtn);
      expect(configureMock).toHaveBeenCalledTimes(1);
    });

    it('repositorio inicializado, sin pendientes y con motor/integración al día SÍ muestra «Todo al día»', () => {
      render(
        <OpenSpecUpdateRunner
          repoPath="/test/repo"
          engine={null}
          integration={false}
          repoInitialized={true}
          pendingTools={[]}
        />,
      );

      const upToDateBtn = screen.getByRole('button', { name: /Todo al día/i });
      expect(upToDateBtn).toBeDefined();
      expect((upToDateBtn as HTMLButtonElement).disabled).toBe(true);
    });
  });
});
