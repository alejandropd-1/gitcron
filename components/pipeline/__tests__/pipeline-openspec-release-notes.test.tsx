// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenSpecReleaseNotes } from '../OpenSpecReleaseNotes';
import type { OpenSpecVersionAnalysisResult } from '@/types/pipeline';
import { useGitStore } from '@/lib/git-store';

describe('OpenSpecReleaseNotes', () => {
  let mockShellOpenExternal: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    useGitStore.setState({ language: 'es' });
    mockShellOpenExternal = vi.fn();
    (window as unknown as { api: unknown }).api = {
      shellOpenExternal: mockShellOpenExternal,
    };
  });

  afterEach(() => {
    cleanup();
    delete (window as unknown as { api?: unknown }).api;
    vi.restoreAllMocks();
  });

  it('muestra estado de carga cuando loading es true', () => {
    render(
      <OpenSpecReleaseNotes
        latest="1.13.0"
        analysis={null}
        loading={true}
        error={null}
      />
    );

    expect(screen.getByRole('heading', { level: 3, name: 'Qué trae la v1.13.0' })).toBeTruthy();
    expect(screen.getByText('Buscando las notas de la versión…')).toBeTruthy();
  });

  it('muestra changelog obtenido con viñetas, botón para ver notas completas y veredicto compatible', () => {
    const analysis: OpenSpecVersionAnalysisResult = {
      measured: {
        installedVersion: '1.11.0',
        availableVersion: '1.13.0',
        isUpgradeAvailable: true,
        versionClass: 'supported',
        behindCycle: false,
        targetVersion: '1.13.0',
        supportedRange: { min: '1.5.0' },
        changelog: {
          source: 'GitHub Releases (fission-ai/openspec)',
          sourceUrl: 'https://github.com/fission-ai/openspec/releases/tag/v1.13.0',
          fetched: true,
          rawText: `## What's New in v1.13.0

Actualizaciones importantes en el motor.

### Cambios
- **Comando status** - ahora incluye diagnósticos
- **Instrucciones** - formato simplificado`,
          error: null,
        },
        consumedSurfaces: [
          { surface: 'status', description: 'Status checks', verdict: 'compatible', evidence: 'sin cambios' },
        ],
        breakingChangesDetected: false,
        strategyProposal: null,
      },
      redaction: {
        provider: 'lmstudio:local-model',
        status: 'offline',
        text: '',
      },
    };

    render(
      <OpenSpecReleaseNotes
        latest="1.13.0"
        analysis={analysis}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByRole('heading', { level: 3, name: 'Qué trae la v1.13.0' })).toBeTruthy();
    expect(screen.getByText('Actualizaciones importantes en el motor.')).toBeTruthy();
    expect(screen.getByText('Comando status — ahora incluye diagnósticos')).toBeTruthy();
    expect(screen.getByText('Instrucciones — formato simplificado')).toBeTruthy();
    expect(screen.getByText('No toca lo que GitCron usa')).toBeTruthy();
    expect(screen.getByText('Fuente: GitHub Releases (fission-ai/openspec)')).toBeTruthy();

    const viewFullBtn = screen.getByRole('button', { name: /Ver las notas completas/i });
    expect(viewFullBtn).toBeTruthy();
    fireEvent.click(viewFullBtn);
    expect(mockShellOpenExternal).toHaveBeenCalledWith('https://github.com/fission-ai/openspec/releases/tag/v1.13.0');
  });

  it('muestra alerta cuando se detectan breaking changes en superficies consumidas', () => {
    const analysis: OpenSpecVersionAnalysisResult = {
      measured: {
        installedVersion: '1.11.0',
        availableVersion: '1.13.0',
        isUpgradeAvailable: true,
        versionClass: 'supported',
        behindCycle: false,
        targetVersion: '1.13.0',
        supportedRange: { min: '1.5.0' },
        changelog: {
          source: 'GitHub Releases (fission-ai/openspec)',
          sourceUrl: 'https://github.com/fission-ai/openspec/releases/tag/v1.13.0',
          fetched: true,
          rawText: `## What's New in v1.13.0\n\nCambio mayor.\n\n- Flag deprecada`,
          error: null,
        },
        consumedSurfaces: [
          { surface: 'status', description: 'Status output', verdict: 'breaking', evidence: 'flags removed' },
          { surface: 'instructions', description: 'Instruction template', verdict: 'potential-break', evidence: 'format changed' },
          { surface: 'archive', description: 'Archive command', verdict: 'compatible', evidence: 'unchanged' },
        ],
        breakingChangesDetected: true,
        strategyProposal: null,
      },
      redaction: {
        provider: 'lmstudio:local-model',
        status: 'offline',
        text: '',
      },
    };

    render(
      <OpenSpecReleaseNotes
        latest="1.13.0"
        analysis={analysis}
        loading={false}
        error={null}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Puede afectar a lo que GitCron usa: status, instructions');
  });

  it('muestra motivo de no disponibilidad cuando fetched es false', () => {
    const analysis: OpenSpecVersionAnalysisResult = {
      measured: {
        installedVersion: '1.11.0',
        availableVersion: '1.13.0',
        isUpgradeAvailable: true,
        versionClass: 'supported',
        behindCycle: false,
        targetVersion: '1.13.0',
        supportedRange: { min: '1.5.0' },
        changelog: {
          source: 'unavailable',
          sourceUrl: 'https://github.com/fission-ai/openspec/releases/tag/v1.13.0',
          fetched: false,
          rawText: null,
          error: 'HTTP 404',
        },
        consumedSurfaces: [],
        breakingChangesDetected: false,
        strategyProposal: null,
      },
      redaction: {
        provider: 'lmstudio:local-model',
        status: 'offline',
        text: '',
      },
    };

    render(
      <OpenSpecReleaseNotes
        latest="1.13.0"
        analysis={analysis}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByText(/No se pudieron leer las notas de la versión\.\s*HTTP 404/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Ver las notas completas/i })).toBeTruthy();
  });

  it('muestra texto redactado y proveedor cuando status es generated', () => {
    const analysis: OpenSpecVersionAnalysisResult = {
      measured: {
        installedVersion: '1.11.0',
        availableVersion: '1.13.0',
        isUpgradeAvailable: true,
        versionClass: 'supported',
        behindCycle: false,
        targetVersion: '1.13.0',
        supportedRange: { min: '1.5.0' },
        changelog: {
          source: 'GitHub Releases (fission-ai/openspec)',
          sourceUrl: null,
          fetched: true,
          rawText: `## v1.13.0\n\nNotas.`,
          error: null,
        },
        consumedSurfaces: [],
        breakingChangesDetected: false,
        strategyProposal: null,
      },
      redaction: {
        provider: 'LM Studio (modelo local)',
        status: 'generated',
        text: `## Qué hay de nuevo\nNotas del release.\n\n## Qué hace de hecho\nComportamiento medido.\n\n## Cómo afecta a GitCron\nNo rompe nada.\n\n## Cómo encararlo\nActualización sugerida.`,
      },
    };

    render(
      <OpenSpecReleaseNotes
        latest="1.13.0"
        analysis={analysis}
        loading={false}
        error={null}
      />
    );

    expect(screen.getByRole('heading', { name: /Qué hay de nuevo/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Qué hace de hecho/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Cómo afecta a GitCron/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Cómo encararlo/i })).toBeTruthy();
    expect(screen.getByText('Explicación redactada por LM Studio (modelo local)')).toBeTruthy();
  });

  it('no muestra atribución de redacción cuando status es offline', () => {
    const analysis: OpenSpecVersionAnalysisResult = {
      measured: {
        installedVersion: '1.11.0',
        availableVersion: '1.13.0',
        isUpgradeAvailable: true,
        versionClass: 'supported',
        behindCycle: false,
        targetVersion: '1.13.0',
        supportedRange: { min: '1.5.0' },
        changelog: {
          source: 'GitHub Releases (fission-ai/openspec)',
          sourceUrl: null,
          fetched: true,
          rawText: `## v1.13.0\n\nNotas.`,
          error: null,
        },
        consumedSurfaces: [],
        breakingChangesDetected: false,
        strategyProposal: null,
      },
      redaction: {
        provider: 'LM Studio (modelo local)',
        status: 'offline',
        text: '',
      },
    };

    render(
      <OpenSpecReleaseNotes
        latest="1.13.0"
        analysis={analysis}
        loading={false}
        error={null}
      />
    );

    expect(screen.queryByText(/redactada/i)).toBeNull();
  });

  it('muestra mensaje declarando que el informe no está disponible cuando el estado es offline', () => {
    const analysis: OpenSpecVersionAnalysisResult = {
      measured: {
        installedVersion: '1.11.0',
        availableVersion: '1.13.0',
        isUpgradeAvailable: true,
        versionClass: 'supported',
        behindCycle: false,
        targetVersion: '1.13.0',
        supportedRange: { min: '1.5.0' },
        changelog: {
          source: 'GitHub Releases (fission-ai/openspec)',
          sourceUrl: null,
          fetched: true,
          rawText: `## v1.13.0\n\nNotas.`,
          error: null,
        },
        consumedSurfaces: [],
        breakingChangesDetected: false,
        strategyProposal: null,
      },
      redaction: {
        provider: 'LM Studio (modelo local)',
        status: 'offline',
        text: '',
      },
    };

    render(
      <OpenSpecReleaseNotes
        latest="1.13.0"
        analysis={analysis}
        loading={false}
        error={null}
      />
    );

    expect(
      screen.getByText('Informe asistido no disponible: el modelo local está apagado o no respondió.')
    ).toBeTruthy();
  });
});
