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

  it('sin razonamiento, el control no se renderiza', () => {
    // Caso 1: sólo contenido de respuesta sin razonamiento
    startDraftLog('draft-2');
    appendDraftChunks({
      draftId: 'draft-2',
      chunks: [{ kind: 'content', text: 'feat(pipeline): agregar nueva función' }],
    });

    render(<CommitDraftLog />);

    expect(screen.queryByRole('button', { name: /copiar/i })).toBeNull();
  });

  it('sin redacción pero con aviso, el control no se renderiza', () => {
    render(<CommitDraftLog notice="Modelo cargado correctamente" />);
    expect(screen.queryByRole('button', { name: /copiar/i })).toBeNull();
  });

  it('las claves nuevas existen en los tres idiomas (ES, EN, ZH)', () => {
    const languages = ['es', 'en', 'zh'] as const;
    const keys = [
      'pipeline.openspec.prepare.aiLogCopy',
      'pipeline.openspec.prepare.aiLogCopied',
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
