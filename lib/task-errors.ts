/**
 * Mapeo de códigos de error de operaciones de tareas a mensajes localizados.
 *
 * Tarea 8.1:
 * Los códigos de error del proceso principal (`mismatch`, `not-found`, `archived`,
 * `not-a-task`, `empty-text`, `out-of-bounds`) se traducen a mensajes claros.
 * El de `mismatch` es crítico: tiene que explicar que el archivo cambió en disco
 * y ofrecer recargar.
 */

export interface TaskErrorMessage {
  message: string;
  isMismatch: boolean;
  code: string;
}

export function resolveTaskErrorMessage(
  code: string | undefined,
  t: (key: string, options?: any) => string,
): TaskErrorMessage {
  const normalized = (code ?? 'unknown').trim();

  switch (normalized) {
    case 'mismatch':
      return {
        message: t('pipeline.openspec.task.error.mismatch'),
        isMismatch: true,
        code: 'mismatch',
      };
    case 'not-found':
      return {
        message: t('pipeline.openspec.task.error.notFound'),
        isMismatch: false,
        code: 'not-found',
      };
    case 'archived':
      return {
        message: t('pipeline.openspec.task.error.archived'),
        isMismatch: false,
        code: 'archived',
      };
    case 'not-a-task':
      return {
        message: t('pipeline.openspec.task.error.notATask'),
        isMismatch: false,
        code: 'not-a-task',
      };
    case 'empty-text':
      return {
        message: t('pipeline.openspec.task.error.emptyText'),
        isMismatch: false,
        code: 'empty-text',
      };
    case 'out-of-bounds':
      return {
        message: t('pipeline.openspec.task.error.outOfBounds'),
        isMismatch: false,
        code: 'out-of-bounds',
      };
    default:
      return {
        message: normalized !== 'unknown' ? normalized : t('pipeline.openspec.task.failed'),
        isMismatch: false,
        code: normalized,
      };
  }
}
