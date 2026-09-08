import { describe, expect, it } from 'vitest';
import { resolveTaskErrorMessage } from '../task-errors';
import { translate } from '../i18n';

describe('resolveTaskErrorMessage (Tarea 8.1)', () => {
  const t = (key: string, opts?: any) => translate(key, 'es', opts);

  it('resuelve mismatch como error crítico con flag isMismatch: true', () => {
    const res = resolveTaskErrorMessage('mismatch', t);
    expect(res.isMismatch).toBe(true);
    expect(res.code).toBe('mismatch');
    expect(res.message).toContain('El archivo cambió en disco');
  });

  it('resuelve not-found con mensaje claro', () => {
    const res = resolveTaskErrorMessage('not-found', t);
    expect(res.isMismatch).toBe(false);
    expect(res.code).toBe('not-found');
    expect(res.message).toContain('No se encontró la tarea');
  });

  it('resuelve archived indicando que el cambio está archivado', () => {
    const res = resolveTaskErrorMessage('archived', t);
    expect(res.isMismatch).toBe(false);
    expect(res.code).toBe('archived');
    expect(res.message).toContain('El cambio está archivado');
  });

  it('resuelve not-a-task indicando formato inválido', () => {
    const res = resolveTaskErrorMessage('not-a-task', t);
    expect(res.isMismatch).toBe(false);
    expect(res.code).toBe('not-a-task');
    expect(res.message).toContain('no tiene formato de tarea');
  });

  it('resuelve empty-text indicando descripción vacía', () => {
    const res = resolveTaskErrorMessage('empty-text', t);
    expect(res.isMismatch).toBe(false);
    expect(res.code).toBe('empty-text');
    expect(res.message).toContain('no puede estar vacía');
  });

  it('resuelve out-of-bounds indicando posición fuera de archivo', () => {
    const res = resolveTaskErrorMessage('out-of-bounds', t);
    expect(res.isMismatch).toBe(false);
    expect(res.code).toBe('out-of-bounds');
    expect(res.message).toContain('fuera del archivo');
  });

  it('degrada errores arbitrarios a su texto o al fallback', () => {
    const res = resolveTaskErrorMessage('Permiso denegado por SO', t);
    expect(res.isMismatch).toBe(false);
    expect(res.message).toBe('Permiso denegado por SO');

    const resUnknown = resolveTaskErrorMessage(undefined, t);
    expect(resUnknown.isMismatch).toBe(false);
    expect(resUnknown.message).toBe(t('pipeline.openspec.task.failed'));
  });
});
