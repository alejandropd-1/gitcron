// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommitDraftLog } from '../CommitDraftLog';
import { clearDraftLog, startDraftLog, appendDraftChunks } from '@/lib/commit-draft-log';
import { translate } from '@/lib/i18n';

describe('CommitDraftLog — control de copiado de razonamiento', () => {
  const originalClipboard = navigator.clipboard;
  let writeTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clearDraftLog();
    writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });
  });

  afterEach(() => {
    cleanup();
    clearDraftLog();
    Object.assign(navigator, { clipboard: originalClipboard });
  });

  it('con razonamiento presente, el control aparece y copia el texto completo', async () => {
    const pensamientoLargo = [
      'Analizando el diff del repositorio...',
      'Línea 1: Se unifica validRepoPath en shared.ts',
      'Línea 2: Se agrega defensa en profundidad en openspec-engine.ts',
      'Conclusión: redactar fix(pipeline): validar repos autorizados',
    ].join('\n');

    startDraftLog('draft-1');
    appendDraftChunks({
      draftId: 'draft-1',
      chunks: [{ kind: 'reasoning', text: pensamientoLargo }],
    });

    render(<CommitDraftLog />);

    const botonCopiar = screen.getByRole('button', { name: /copiar/i });
    expect(botonCopiar).toBeTruthy();

    await act(async () => {
      fireEvent.click(botonCopiar);
    });

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(writeTextMock).toHaveBeenCalledWith(pensamientoLargo);

    // Estado transitorio de confirmación
    await waitFor(() => {
      expect(screen.getByText(/copiado/i)).toBeTruthy();
    });
  });

  it('sin razonamiento pero con contenido, no se renderiza el botón de razonamiento pero sí el de resultado', async () => {
    const respuestaTexto = 'feat(pipeline): agregar nueva función\n\nCuerpo de la respuesta.';
    startDraftLog('draft-2');
    appendDraftChunks({
      draftId: 'draft-2',
      chunks: [{ kind: 'content', text: respuestaTexto }],
    });

    render(<CommitDraftLog />);

    // El botón de copiar razonamiento NO está
    expect(screen.queryByTitle(/copiar razonamiento/i)).toBeNull();

    // El botón de copiar resultado SÍ está
    const botonCopiarResultado = screen.getByTitle(/copiar resultado/i);
    expect(botonCopiarResultado).toBeTruthy();

    await act(async () => {
      fireEvent.click(botonCopiarResultado);
    });

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(writeTextMock).toHaveBeenCalledWith(respuestaTexto);

    await waitFor(() => {
      expect(screen.getByText(/copiado/i)).toBeTruthy();
    });
  });

  it('con ambos presentes, ambos controles aparecen y copian su texto respectivo', async () => {
    const pensamiento = 'Pensando en el diff...';
    const respuesta = 'fix(ipc): corregir timeout\n\nDetalles del fix.';

    startDraftLog('draft-3');
    appendDraftChunks({
      draftId: 'draft-3',
      chunks: [
        { kind: 'reasoning', text: pensamiento },
        { kind: 'content', text: respuesta },
      ],
    });

    render(<CommitDraftLog />);

    const botonRazonamiento = screen.getByTitle(/copiar razonamiento/i);
    const botonResultado = screen.getByTitle(/copiar resultado/i);

    expect(botonRazonamiento).toBeTruthy();
    expect(botonResultado).toBeTruthy();

    await act(async () => {
      fireEvent.click(botonResultado);
    });

    expect(writeTextMock).toHaveBeenCalledWith(respuesta);
  });

  it('sin redacción pero con aviso, los controles no se renderizan', () => {
    render(<CommitDraftLog notice="Modelo cargado correctamente" />);
    expect(screen.queryByRole('button', { name: /copiar/i })).toBeNull();
  });

  it('las claves nuevas existen en los tres idiomas (ES, EN, ZH)', () => {
    const languages = ['es', 'en', 'zh'] as const;
    const keys = [
      'pipeline.openspec.prepare.aiLogCopy',
      'pipeline.openspec.prepare.aiLogCopied',
      'pipeline.openspec.prepare.aiLogResultCopy',
      'pipeline.openspec.prepare.aiLogResultCopied',
    ] as const;

    for (const lang of languages) {
      for (const key of keys) {
        const translation = translate(key, lang);
        expect(translation).toBeTruthy();
        expect(translation).not.toBe(key);
        expect(translation.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
