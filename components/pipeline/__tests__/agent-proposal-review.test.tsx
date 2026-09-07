// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DiffViewer } from '@/components/DiffViewer';
import { AgentProposalReview } from '../AgentProposalReview';
import { generateUnifiedDiff } from '@/lib/diff-proposal';

afterEach(cleanup);

describe('DiffViewer - Modo propuesta y preservación de modos existentes (Tarea 8.5)', () => {
  const sampleDiff = [
    '--- a/sample.md',
    '+++ b/sample.md',
    '@@ -1,3 +1,4 @@',
    ' Line 1',
    '-Line 2',
    '+Line 2 modified',
    ' Line 3',
    '+Line 4 added',
  ].join('\n');

  it('el modo stage sigue funcionando idéntico: ofrece stagear y descartar', () => {
    const onStageHunk = vi.fn();
    const onDiscardHunk = vi.fn();

    render(
      <DiffViewer
        diff={sampleDiff}
        hunkActions={{
          mode: 'stage',
          onStageHunk,
          onDiscardHunk,
        }}
      />,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2); // Stage (Plus) and Discard (Trash2)

    fireEvent.click(buttons[0]);
    expect(onStageHunk).toHaveBeenCalledWith(0, undefined);

    fireEvent.click(buttons[1]);
    expect(onDiscardHunk).toHaveBeenCalledWith(0, undefined);
  });

  it('el modo unstage sigue funcionando idéntico: ofrece des-stagear', () => {
    const onUnstageHunk = vi.fn();

    render(
      <DiffViewer
        diff={sampleDiff}
        hunkActions={{
          mode: 'unstage',
          onUnstageHunk,
        }}
      />,
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1); // Unstage (Minus)

    fireEvent.click(buttons[0]);
    expect(onUnstageHunk).toHaveBeenCalledWith(0, undefined);
  });

  it('el modo proposal ofrece aplicar y descartar por bloque con badge distintivo', () => {
    const onApplyHunk = vi.fn();
    const onDiscardHunk = vi.fn();

    render(
      <DiffViewer
        diff={sampleDiff}
        hunkActions={{
          mode: 'proposal',
          onApplyHunk,
          onDiscardHunk,
          hunkStatuses: { 0: 'pending' },
        }}
      />,
    );

    // Badge de propuesta
    const badge = screen.getByTestId('proposal-hunk-badge-0');
    expect(badge.textContent).toBe('Propuesta');

    // Botón de aplicar bloque
    const applyBtn = screen.getByTestId('proposal-apply-hunk-0');
    fireEvent.click(applyBtn);
    expect(onApplyHunk).toHaveBeenCalledWith(0, undefined);

    // Botón de descartar bloque
    const discardBtn = screen.getByTestId('proposal-discard-hunk-0');
    fireEvent.click(discardBtn);
    expect(onDiscardHunk).toHaveBeenCalledWith(0, undefined);
  });
});

describe('AgentProposalReview - Máquina de revisión de propuestas (Tareas 8.6 y 8.7)', () => {
  const original = [
    '# Spec Title',
    '',
    '## Requirements',
    'Requirement 1: Original',
    'unchanged pad A',
    'unchanged pad B',
    'unchanged pad C',
    'Requirement 2: Original',
    'unchanged pad D',
    'unchanged pad E',
  ].join('\n');

  const proposed = [
    '# Spec Title',
    '',
    '## Requirements',
    'Requirement 1: PROPOSED UPDATE',
    'unchanged pad A',
    'unchanged pad B',
    'unchanged pad C',
    'Requirement 2: PROPOSED UPDATE',
    'unchanged pad D',
    'unchanged pad E',
  ].join('\n');

  const diff = generateUnifiedDiff(original, proposed, 'spec.md', 1);

  it('muestra la distinción visual de lo especulativo con advertencia NO ESCRITO (Tarea 8.6)', () => {
    render(
      <AgentProposalReview
        originalContent={original}
        proposedContent={proposed}
        diff={diff}
        filePath="openspec/specs/auth/spec.md"
        onConfirm={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );

    expect(screen.getByText('NO ESCRITO')).toBeTruthy();
    expect(screen.getByText(/Estado especulativo/)).toBeTruthy();
  });

  it('descartar una propuesta NO invoca el canal de confirmación/escritura (Tarea 8.7)', () => {
    const onConfirm = vi.fn();
    const onDiscard = vi.fn();

    render(
      <AgentProposalReview
        originalContent={original}
        proposedContent={proposed}
        diff={diff}
        onConfirm={onConfirm}
        onDiscard={onDiscard}
      />,
    );

    const discardBtn = screen.getByTestId('proposal-discard-btn');
    fireEvent.click(discardBtn);

    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('aceptar parcialmente escribe ÚNICAMENTE los bloques aceptados en el canal de confirmación (Tarea 8.7)', () => {
    const onConfirm = vi.fn();
    const onDiscard = vi.fn();

    render(
      <AgentProposalReview
        originalContent={original}
        proposedContent={proposed}
        diff={diff}
        onConfirm={onConfirm}
        onDiscard={onDiscard}
      />,
    );

    // Hunks esperados: 2 bloques independientes
    // Aceptamos ÚNICAMENTE el bloque 0 (Requirement 1), descartamos el bloque 1 (Requirement 2)
    const applyHunk0 = screen.getByTestId('proposal-apply-hunk-0');
    fireEvent.click(applyHunk0);

    const discardHunk1 = screen.getByTestId('proposal-discard-hunk-1');
    fireEvent.click(discardHunk1);

    // Confirmar y escribir
    const confirmBtn = screen.getByTestId('proposal-confirm-btn');
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledTimes(1);

    const writtenContent = onConfirm.mock.calls[0][0] as string;
    // Contiene el cambio del bloque 0 aceptado
    expect(writtenContent).toContain('Requirement 1: PROPOSED UPDATE');
    expect(writtenContent).not.toContain('Requirement 1: Original');

    // Conserva intacto el texto original del bloque 1 descartado
    expect(writtenContent).toContain('Requirement 2: Original');
    expect(writtenContent).not.toContain('Requirement 2: PROPOSED UPDATE');
  });

  it('permite editar el resultado manualmente y confirma el texto editado (Tarea 8.6)', () => {
    const onConfirm = vi.fn();

    render(
      <AgentProposalReview
        originalContent={original}
        proposedContent={proposed}
        diff={diff}
        onConfirm={onConfirm}
        onDiscard={vi.fn()}
      />,
    );

    // Cambiar a vista de edición
    const editTabBtn = screen.getByRole('button', { name: /Editar resultado/ });
    fireEvent.click(editTabBtn);

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '# Custom Edited Spec Content' } });

    // Confirmar
    const confirmBtn = screen.getByTestId('proposal-confirm-btn');
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledWith('# Custom Edited Spec Content');
  });
});
