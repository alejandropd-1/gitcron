// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { OpenSpecEngineCard } from '../OpenSpecEngineCard';
import type { OpenSpecEngineStatus } from '../../../types/pipeline';
import { deriveUpdateMatrixAction } from '../../../lib/openspec-update-guide';
import { hasOpenSpecEngineAttention } from '../pipeline-domain';

describe('OpenSpecEngineCard (UI Audit Tests & Jerarquía)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renderiza la insignia compacta cuando compact=true', () => {
    render(<OpenSpecEngineCard status={null} isLoading={true} compact={true} />);
    expect(screen.getByText(/OpenSpec: Comprobando runtimes…/i)).toBeDefined();
  });

  it('renderiza la vista primaria inicial comprensible y accionable', () => {
    const dummyStatus: OpenSpecEngineStatus = {
      cli: {
        installed: true,
        runtimeVersion: '1.11.0',
        provenance: 'global',
        displayPath: 'C:\\global\\openspec.cmd',
        supportedRange: { min: '1.5.0', max: '1.11.0' },
        versionClass: 'supported',
        evidenceStatus: 'confirmed',
        diagnostics: [],
      },
      latestAvailable: {
        status: 'online',
        latestVersion: '1.11.0',
        checkedAt: 'now',
        fromCache: false,
        cacheAgeSeconds: 0,
        freshness: 'fresh',
        error: null,
      },
      globalConfig: null,
      installedIntegration: {
        skills: [],
        generatedBy: '1.11.0',
        markersFound: [],
        outputInventory: [],
        evidenceStatus: 'confirmed',
        tools: ['codex', 'agents'],
        targets: ['codex', 'agents'],
        installedWorkflowsByTarget: {},
        missing: null,
        legacy: [],
        customized: [],
        conflicts: null,
      },
      repoState: 'initialized',
      integrationState: 'up-to-date',
    };

    render(<OpenSpecEngineCard status={dummyStatus} compact={false} />);
    expect(screen.getByText(/Listo/i)).toBeDefined();
    expect(screen.getByText(/2 agentes configurados/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Ver diagnóstico avanzado/i })).toBeDefined();
  });

  it('despliega el diagnóstico avanzado al hacer clic en el botón de alternancia', () => {
    const dummyStatus: OpenSpecEngineStatus = {
      cli: {
        installed: true,
        runtimeVersion: '1.8.0',
        provenance: 'global',
        displayPath: 'C:\\global\\openspec.cmd',
        supportedRange: { min: '1.5.0', max: '1.8.0' },
        versionClass: 'supported',
        evidenceStatus: 'confirmed',
        diagnostics: [],
      },
      latestAvailable: null,
      globalConfig: null,
      installedIntegration: null,
      repoState: 'initialized',
      integrationState: 'outdated',
      divergence: {
        isDivergent: true,
        overallStatus: 'divergent',
        reason: {
          kind: 'profile-mismatch',
          globalProfileClass: 'core',
          repoProfileClass: 'custom',
        },
        globalProfileClass: 'core',
        repoProfileClass: 'custom',
      },
    };

    render(<OpenSpecEngineCard status={dummyStatus} compact={false} />);
    
    // Antes de desplegar, la sección avanzada está oculta
    expect(screen.queryByText(/Ruta y Procedencia/i)).toBeNull();

    // Hacer clic en desplegar
    fireEvent.click(screen.getByRole('button', { name: /Ver diagnóstico avanzado/i }));

    // Ahora la información avanzada es visible
    expect(screen.getByText(/Ruta y Procedencia/i)).toBeDefined();
    expect(screen.getByText(/El perfil global \(core\) difiere/i)).toBeDefined();
  });

  it('alterna el texto del botón entre Revisar actualización y Cerrar revisión según isReviewOpen', () => {
    const dummyStatus: OpenSpecEngineStatus = {
      cli: {
        installed: true,
        runtimeVersion: '1.8.0',
        provenance: 'global',
        displayPath: 'C:\\global\\openspec.cmd',
        supportedRange: { min: '1.5.0', max: '1.8.0' },
        versionClass: 'supported',
        evidenceStatus: 'confirmed',
        diagnostics: [],
      },
      latestAvailable: null,
      globalConfig: null,
      installedIntegration: null,
      repoState: 'initialized',
      integrationState: 'outdated',
    };

    const handleReview = vi.fn();

    // 1. Con isReviewOpen=false
    const { rerender } = render(
      <OpenSpecEngineCard
        status={dummyStatus}
        compact={false}
        onOpenReview={handleReview}
        isReviewOpen={false}
      />,
    );

    const openBtn = screen.getByRole('button', { name: /Revisar actualización/i });
    expect(openBtn).toBeDefined();
    fireEvent.click(openBtn);
    expect(handleReview).toHaveBeenCalledTimes(1);

    // 2. Con isReviewOpen=true
    rerender(
      <OpenSpecEngineCard
        status={dummyStatus}
        compact={false}
        onOpenReview={handleReview}
        isReviewOpen={true}
      />,
    );

    const closeBtn = screen.getByRole('button', { name: /Cerrar revisión/i });
    expect(closeBtn).toBeDefined();
    fireEvent.click(closeBtn);
    expect(handleReview).toHaveBeenCalledTimes(2);
  });

  it('con motor 1.5.0 atrasado y todo lo demás sano, la insignia general pasa a «Requiere atención» y avisa del desfase', () => {
    const status150With190Npm: OpenSpecEngineStatus = {
      cli: {
        installed: true,
        runtimeVersion: '1.5.0',
        provenance: 'global',
        displayPath: 'C:\\global\\openspec.cmd',
        supportedRange: { min: '1.5.0', max: '1.9.0' },
        versionClass: 'supported',
        evidenceStatus: 'confirmed',
        diagnostics: [],
      },
      latestAvailable: {
        status: 'online',
        latestVersion: '1.9.0',
        checkedAt: 'now',
        fromCache: false,
        cacheAgeSeconds: 0,
        freshness: 'fresh',
        error: null,
      },
      globalConfig: null,
      installedIntegration: {
        skills: [],
        generatedBy: '1.5.0',
        markersFound: [],
        outputInventory: [],
        evidenceStatus: 'confirmed',
        tools: ['agents'],
        targets: ['agents'],
        installedWorkflowsByTarget: {},
        missing: null,
        legacy: [],
        customized: [],
        conflicts: null,
      },
      repoState: 'initialized',
      integrationState: 'up-to-date',
      freshnessState: 'cli-upgrade-available',
    };

    render(<OpenSpecEngineCard status={status150With190Npm} compact={false} />);

    // 1. Con motor 1.5.0 atrasado respecto al ciclo 1.11.0, la insignia general NO puede decir «listo»
    // sino que debe reflejar «Necesita atención» en coherencia con el aviso de desfase
    expect(screen.getByText(/Necesita atención/i)).toBeDefined();
    expect(screen.queryByText(/Listo/i)).toBeNull();

    // 2. La fila de la tarjeta informa el desfase concreto hacia atrás
    expect(screen.getByText(/anterior al ciclo declarado/i)).toBeDefined();

    // 3. Muestra la versión concreta «v1.5.0», «Motor compatible» y «Versión 1.9.0 disponible en npm»
    expect(screen.getAllByText(/v1\.5\.0/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/1\.5\.0/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Motor compatible/i)).toBeDefined();
    expect(screen.getByText(/Versión 1.9.0 disponible en npm/i)).toBeDefined();
  });

  it('con motor 1.11.0 alineado al ciclo y todo lo demás sano, la insignia general sigue diciendo «Listo»', () => {
    const status111Healthy: OpenSpecEngineStatus = {
      cli: {
        installed: true,
        runtimeVersion: '1.11.0',
        provenance: 'global',
        displayPath: 'C:\\global\\openspec.cmd',
        supportedRange: { min: '1.5.0', max: '1.11.0' },
        versionClass: 'supported',
        evidenceStatus: 'confirmed',
        diagnostics: [],
      },
      latestAvailable: null,
      globalConfig: null,
      installedIntegration: {
        skills: [],
        generatedBy: '1.11.0',
        markersFound: [],
        outputInventory: [],
        evidenceStatus: 'confirmed',
        tools: ['agents'],
        targets: ['agents'],
        installedWorkflowsByTarget: {},
        missing: null,
        legacy: [],
        customized: [],
        conflicts: null,
      },
      repoState: 'initialized',
      integrationState: 'up-to-date',
      freshnessState: 'cli-up-to-date',
    };

    render(<OpenSpecEngineCard status={status111Healthy} compact={false} />);
    expect(screen.getByText(/Listo/i)).toBeDefined();
    expect(screen.queryByText(/Requiere atención/i)).toBeNull();
    expect(screen.queryByText(/anterior al ciclo declarado/i)).toBeNull();
    expect(screen.queryByText(/supera la versión del ciclo/i)).toBeNull();
  });

  it.each([
    {
      versionClass: 'supported' as const,
      expectedText: 'Motor compatible',
    },
    {
      versionClass: 'too-old' as const,
      expectedText: 'Motor obsoleto (requiere ≥ 1.5.0)',
    },
    {
      versionClass: 'too-new' as const,
      expectedText: 'Motor no probado (superior a 1.9.0)',
    },
    {
      versionClass: 'unknown' as const,
      expectedText: 'Versión no clasificada',
    },
  ])('renderiza versionClass: $versionClass traduciendo sin literales "pipeline." (Hallazgo B)', ({ versionClass, expectedText }) => {
    const testStatus: OpenSpecEngineStatus = {
      cli: {
        installed: true,
        runtimeVersion: '1.5.0',
        provenance: 'global',
        displayPath: 'C:\\global\\openspec.cmd',
        supportedRange: { min: '1.5.0', max: '1.9.0' },
        versionClass,
        evidenceStatus: 'confirmed',
        diagnostics: [],
      },
      latestAvailable: null,
      globalConfig: null,
      installedIntegration: null,
      repoState: 'initialized',
      integrationState: 'up-to-date',
    };

    const { container } = render(<OpenSpecEngineCard status={testStatus} compact={false} />);

    // 1. El texto visible en la tarjeta NO debe contener claves crudas "pipeline."
    const fullText = container.textContent ?? '';
    expect(fullText).not.toContain('pipeline.');

    // 2. El texto esperado debe estar presente en el render
    expect(screen.getByText(new RegExp(expectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))).toBeDefined();
  });

  it('el estado resumido no dice «Al día» ni «Listo» si el detalle informa un target sin configurar (1.3/1.4)', () => {
    const statusWithUnconfiguredTarget: OpenSpecEngineStatus = {
      cli: {
        installed: true,
        runtimeVersion: '1.11.0',
        provenance: 'global',
        displayPath: 'C:\\global\\openspec.cmd',
        supportedRange: { min: '1.5.0', max: '1.11.0' },
        versionClass: 'supported',
        evidenceStatus: 'confirmed',
        diagnostics: [],
      },
      latestAvailable: null,
      globalConfig: null,
      installedIntegration: {
        skills: [],
        generatedBy: '1.11.0',
        markersFound: [],
        outputInventory: [],
        evidenceStatus: 'confirmed',
        tools: [],
        targets: [],
        configuredTools: [],
        presentToolDirectories: ['agents'],
        configuredAgentsCount: 0,
        totalPresentAgentsCount: 1,
        installedWorkflowsByTarget: {},
        missing: null,
        legacy: [],
        customized: [],
        conflicts: null,
      },
      repoState: 'initialized',
      integrationState: 'outdated',
    };

    render(<OpenSpecEngineCard status={statusWithUnconfiguredTarget} compact={false} />);

    // 1. El estado resumido de la integración NO puede decir «Al día»
    expect(screen.queryByText(/^Al día$/i)).toBeNull();
    expect(screen.getByText(/Desactualizado/i)).toBeDefined();

    // 2. La insignia general NO puede decir «Listo», debe decir «Necesita atención»
    expect(screen.queryByText(/Listo/i)).toBeNull();
    expect(screen.getByText(/Necesita atención/i)).toBeDefined();

    // 3. El detalle informa la proporción con target sin configurar
    expect(screen.getByText(/0 de 1 agentes configurados/i)).toBeDefined();
  });

  it('en modo compacto no declara «Al día» si el detalle informa un target sin configurar (1.3/1.4)', () => {
    const statusWithUnconfiguredTarget: OpenSpecEngineStatus = {
      cli: {
        installed: true,
        runtimeVersion: '1.11.0',
        provenance: 'global',
        displayPath: 'C:\\global\\openspec.cmd',
        supportedRange: { min: '1.5.0', max: '1.11.0' },
        versionClass: 'supported',
        evidenceStatus: 'confirmed',
        diagnostics: [],
      },
      latestAvailable: null,
      globalConfig: null,
      installedIntegration: {
        skills: [],
        generatedBy: '1.11.0',
        markersFound: [],
        outputInventory: [],
        evidenceStatus: 'confirmed',
        tools: [],
        targets: [],
        configuredTools: [],
        presentToolDirectories: ['agents'],
        configuredAgentsCount: 0,
        totalPresentAgentsCount: 1,
        installedWorkflowsByTarget: {},
        missing: null,
        legacy: [],
        customized: [],
        conflicts: null,
      },
      repoState: 'initialized',
      integrationState: 'outdated',
    };

    render(<OpenSpecEngineCard status={statusWithUnconfiguredTarget} compact={true} />);
    expect(screen.queryByText(/Al día/i)).toBeNull();
    expect(screen.getByText(/Desactualizado/i)).toBeDefined();
  });

  /**
   * Auditoría del 2026-09-07 (Tarea 1.4): Una sola autoridad sobre el estado de integración.
   *
   * Medición y causa del 2026-09-07:
   * Al resolver 1.3 se agregó `deriveEffectiveIntegrationState` en OpenSpecEngineCard.tsx:
   * una segunda derivación en el renderer que degradaba 'up-to-date' a 'outdated' ante targets
   * sin configurar. Sin embargo, los otros dos consumidores del estado leían el valor crudo de main:
   * - `deriveUpdateMatrixAction` devolvía 'none' (no ofreciendo actualizar).
   * - `hasOpenSpecEngineAttention` no encendía el triángulo ámbar del inspector.
   * Se cambió una contradicción por otra: la tarjeta decía «Desactualizado» mientras la app no ofrecía
   * ninguna acción y el inspector no se enteraba.
   *
   * Al unificar la regla en `buildEngineStatusSnapshot` en el proceso principal, los tres consumidores
   * leen exactamente el mismo valor de la única fuente de verdad:
   * 1. La tarjeta muestra «Desactualizado» y «Necesita atención» (nunca «Al día» ni «Listo»).
   * 2. `deriveUpdateMatrixAction(status)` devuelve 'update' (ofreciendo actualizar, nunca 'none').
   * 3. `hasOpenSpecEngineAttention(status)` devuelve true (encendiendo la atención en el inspector).
   */
  it('prueba conjunta (1.4): tarjeta, matriz de actualización e inspector coinciden ante target sin configurar', () => {
    const statusWithUnconfiguredTarget: OpenSpecEngineStatus = {
      cli: {
        installed: true,
        runtimeVersion: '1.11.0',
        provenance: 'global',
        displayPath: 'C:\\global\\openspec.cmd',
        supportedRange: { min: '1.5.0', max: '1.11.0' },
        versionClass: 'supported',
        evidenceStatus: 'confirmed',
        diagnostics: [],
      },
      latestAvailable: null,
      globalConfig: null,
      installedIntegration: {
        skills: [],
        generatedBy: '1.11.0',
        markersFound: [],
        outputInventory: [],
        evidenceStatus: 'confirmed',
        tools: [],
        targets: [],
        configuredTools: [],
        presentToolDirectories: ['agents'],
        configuredAgentsCount: 0,
        totalPresentAgentsCount: 1,
        installedWorkflowsByTarget: {},
        missing: null,
        legacy: [],
        customized: [],
        conflicts: null,
      },
      repoState: 'initialized',
      integrationState: 'outdated',
    };

    // 1. La tarjeta muestra «Desactualizado» y «Necesita atención» (y NO «Al día» ni «Listo»)
    const { unmount } = render(<OpenSpecEngineCard status={statusWithUnconfiguredTarget} compact={false} />);
    expect(screen.queryByText(/^Al día$/i)).toBeNull();
    expect(screen.getByText(/Desactualizado/i)).toBeDefined();
    expect(screen.queryByText(/Listo/i)).toBeNull();
    expect(screen.getByText(/Necesita atención/i)).toBeDefined();
    unmount();

    // 2. deriveUpdateMatrixAction devuelve 'update' (y NO 'none')
    const action = deriveUpdateMatrixAction(statusWithUnconfiguredTarget);
    expect(action).toBe('update');
    expect(action).not.toBe('none');

    // 3. hasOpenSpecEngineAttention devuelve true
    const attention = hasOpenSpecEngineAttention(statusWithUnconfiguredTarget);
    expect(attention).toBe(true);
  });

  describe('Diagnósticos del Motor CLI (3b.3)', () => {
    it('muestra diagnóstico limpio sin inventar advertencias con procedencia declarada', () => {
      const statusClean: OpenSpecEngineStatus = {
        cli: {
          installed: true,
          runtimeVersion: '1.11.0',
          provenance: 'global',
          displayPath: 'C:\\global\\openspec.cmd',
          supportedRange: { min: '1.5.0', max: '1.11.0' },
          versionClass: 'supported',
          evidenceStatus: 'confirmed',
          diagnostics: [],
        },
        latestAvailable: null,
        globalConfig: null,
        installedIntegration: null,
        repoState: 'initialized',
        integrationState: 'up-to-date',
        doctor: {
          command: 'openspec doctor --json',
          ok: true,
          error: null,
          data: {
            root: {
              path: 'C:\\www\\gitCronos',
              source: 'nearest',
              healthy: true,
              status: [],
            },
            store: null,
            references: [],
            status: [],
          },
        },
        contextBrief: {
          command: 'openspec context --json',
          ok: true,
          error: null,
          data: {
            root: {
              path: 'C:\\www\\gitCronos',
              source: 'nearest',
              role: 'openspec_root',
            },
            members: [],
            status: [],
          },
        },
      };

      const { container } = render(<OpenSpecEngineCard status={statusClean} compact={false} />);
      fireEvent.click(screen.getByText(/Ver diagnóstico avanzado/i));

      // Comprobar procedencia de comandos declarada
      expect(screen.getByText('openspec doctor --json')).toBeDefined();
      expect(screen.getByText('openspec context --json')).toBeDefined();

      // Diagnóstico limpio: muestra texto limpio y NO inventa advertencias
      const cleanTexts = screen.getAllByText(/Sin problemas reportados/i);
      expect(cleanTexts.length).toBe(2);

      // Ningún badge de gravedad error o warning inventado
      expect(container.querySelector('[data-severity="error"]')).toBeNull();
      expect(container.querySelector('[data-severity="warning"]')).toBeNull();
    });

    it('presenta condiciones reportadas por el CLI respetando exactamente su gravedad declarada', () => {
      const statusWithIssues: OpenSpecEngineStatus = {
        cli: {
          installed: true,
          runtimeVersion: '1.11.0',
          provenance: 'global',
          displayPath: 'C:\\global\\openspec.cmd',
          supportedRange: { min: '1.5.0', max: '1.11.0' },
          versionClass: 'supported',
          evidenceStatus: 'confirmed',
          diagnostics: [],
        },
        latestAvailable: null,
        globalConfig: null,
        installedIntegration: null,
        repoState: 'initialized',
        integrationState: 'outdated',
        doctor: {
          command: 'openspec doctor --json',
          ok: true,
          error: null,
          data: {
            root: {
              path: 'C:\\www\\gitCronos',
              source: 'nearest',
              healthy: false,
              status: [
                {
                  severity: 'error',
                  code: 'store_corrupt',
                  message: 'El almacén de configuración está corrupto',
                  fix: 'Ejecutar openspec init --force',
                },
              ],
            },
            store: null,
            references: [
              {
                store_id: 'ref-repo',
                status: [
                  {
                    severity: 'warning',
                    code: 'drift_detected',
                    message: 'Deriva detectada en la referencia remota',
                  },
                ],
              },
            ],
            status: [],
          },
        },
        contextBrief: {
          command: 'openspec context --json',
          ok: true,
          error: null,
          data: {
            root: {
              path: 'C:\\www\\gitCronos',
              source: 'nearest',
              role: 'openspec_root',
            },
            members: [
              {
                id: 'aux-member',
                role: 'referenced_store',
                status: [
                  {
                    severity: 'info',
                    code: 'member_offline',
                    message: 'Miembro opcional offline',
                  },
                ],
              },
            ],
            status: [],
          },
        },
      };

      const { container } = render(<OpenSpecEngineCard status={statusWithIssues} compact={false} />);
      fireEvent.click(screen.getByText(/Ver diagnóstico avanzado/i));

      // Verificación de mensajes literales
      expect(screen.getByText('El almacén de configuración está corrupto')).toBeDefined();
      expect(screen.getByText('Deriva detectada en la referencia remota')).toBeDefined();
      expect(screen.getByText('Miembro opcional offline')).toBeDefined();
      expect(screen.getByText(/Sugerencia: Ejecutar openspec init --force/i)).toBeDefined();

      // Verificación de gravedad preservada exactamente sin alteración
      const errorBadge = container.querySelector('[data-severity="error"]');
      expect(errorBadge).not.toBeNull();
      expect(errorBadge?.textContent).toBe('error');

      const warningBadge = container.querySelector('[data-severity="warning"]');
      expect(warningBadge).not.toBeNull();
      expect(warningBadge?.textContent).toBe('warning');

      const infoBadge = container.querySelector('[data-severity="info"]');
      expect(infoBadge).not.toBeNull();
      expect(infoBadge?.textContent).toBe('info');
    });

    it('declara explícitamente cuando el diagnóstico falló o no está disponible sin síntesis engañosa', () => {
      const statusUnavailable: OpenSpecEngineStatus = {
        cli: {
          installed: true,
          runtimeVersion: '1.11.0',
          provenance: 'global',
          displayPath: 'C:\\global\\openspec.cmd',
          supportedRange: { min: '1.5.0', max: '1.11.0' },
          versionClass: 'supported',
          evidenceStatus: 'confirmed',
          diagnostics: [],
        },
        latestAvailable: null,
        globalConfig: null,
        installedIntegration: null,
        repoState: 'initialized',
        integrationState: 'unknown',
        doctor: {
          command: 'openspec doctor --json',
          ok: false,
          error: 'openspec doctor fallo: timeout de 15000ms excedido',
          data: null,
        },
        contextBrief: null,
      };

      render(<OpenSpecEngineCard status={statusUnavailable} compact={false} />);
      fireEvent.click(screen.getByText(/Ver diagnóstico avanzado/i));

      expect(screen.getByText('openspec doctor fallo: timeout de 15000ms excedido')).toBeDefined();
      expect(screen.getByText(/Diagnóstico no disponible para este comando/i)).toBeDefined();
    });
  });

  describe('Superficie de motor e instalación honesta (Grupo 9: 9.1, 9.2, 9.3, 9.5)', () => {
    const absentCliStatus: OpenSpecEngineStatus = {
      cli: {
        installed: false,
        runtimeVersion: null,
        provenance: 'unknown',
        displayPath: null,
        supportedRange: { min: '1.5.0', max: '1.11.0' },
        versionClass: 'unknown',
        evidenceStatus: 'confirmed',
        diagnostics: [],
      },
      latestAvailable: {
        status: 'online',
        latestVersion: '1.11.0',
        checkedAt: 'now',
        fromCache: false,
        cacheAgeSeconds: 0,
        freshness: 'fresh',
        error: null,
      },
      globalConfig: null,
      installedIntegration: null,
      repoState: 'initialized',
      integrationState: 'unknown',
    };

    it('9.1: las acciones preceden a la caja primaria de diagnóstico', () => {
      const handleReview = vi.fn();
      const dummyStatus: OpenSpecEngineStatus = {
        cli: {
          installed: true,
          runtimeVersion: '1.11.0',
          provenance: 'global',
          displayPath: 'C:\\global\\openspec.cmd',
          supportedRange: { min: '1.5.0', max: '1.11.0' },
          versionClass: 'supported',
          evidenceStatus: 'confirmed',
          diagnostics: [],
        },
        latestAvailable: null,
        globalConfig: null,
        installedIntegration: null,
        repoState: 'initialized',
        integrationState: 'up-to-date',
      };

      const { container } = render(
        <OpenSpecEngineCard
          status={dummyStatus}
          compact={false}
          onOpenReview={handleReview}
        />,
      );

      const actionBtn = screen.getByRole('button', { name: /Revisar actualización/i });
      const summaryBox = container.querySelector('[class*="primarySummaryBox"]');
      expect(actionBtn).toBeDefined();
      expect(summaryBox).toBeDefined();
      expect(actionBtn.compareDocumentPosition(summaryBox!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('9.2: ofrece instalación local deshabilitada con motivo de ausencia de package.json cuando hasPackageJson=false', () => {
      render(
        <OpenSpecEngineCard
          status={absentCliStatus}
          compact={false}
          hasPackageJson={false}
        />,
      );

      const localBtn = screen.getByRole('button', { name: /Instalación local/i });
      expect(localBtn.hasAttribute('disabled')).toBe(true);
      expect(screen.getByText(/El repositorio no cuenta con un archivo package\.json para instalación local/i)).toBeDefined();
    });

    it('9.2: ofrece instalación local deshabilitada con gestor no disponible cuando hay package.json', () => {
      render(
        <OpenSpecEngineCard
          status={absentCliStatus}
          compact={false}
          hasPackageJson={true}
        />,
      );

      const localBtn = screen.getByRole('button', { name: /Instalación local/i });
      expect(localBtn.hasAttribute('disabled')).toBe(true);
      expect(screen.getByText(/Instalación local no disponible \(pendiente de implementación en backend\)/i)).toBeDefined();
    });

    it('9.3 y 9.5: ofrece instalación global deshabilitada con comando literal, copiado y confirmación de alcance', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(
        <OpenSpecEngineCard
          status={absentCliStatus}
          compact={false}
          nodePath="C:\\Program Files\\nodejs\\node.exe"
          npmPath="C:\\Program Files\\nodejs\\npm.cmd"
          openRepoPaths={['C:\\repo1', 'C:\\repo2']}
        />,
      );

      const globalBtn = screen.getByRole('button', { name: /Instalación global/i });
      expect(globalBtn.hasAttribute('disabled')).toBe(true);
      expect(screen.getByText(/Instalación global desde la interfaz pendiente de implementar en backend/i)).toBeDefined();

      // Comando literal visible
      expect(screen.getByText('npm i -g @fission-ai/openspec@latest')).toBeDefined();

      // Copiado funcional
      const copyBtn = screen.getByRole('button', { name: /Copiar comando/i });
      fireEvent.click(copyBtn);
      expect(writeTextMock).toHaveBeenCalledWith('npm i -g @fission-ai/openspec@latest');

      // Rutas y repositorios afectados
      expect(screen.getByText((content) => content.includes('Node:') && content.includes('node.exe'))).toBeDefined();
      expect(screen.getByText((content) => content.includes('npm:') && content.includes('npm.cmd'))).toBeDefined();
      expect(screen.getByText(/Repositorios afectados \(2\)/i)).toBeDefined();
    });
  });
});
