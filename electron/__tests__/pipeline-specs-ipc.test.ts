import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authorizedRepoStore } from '../ipc/authorized-repos';
import type { InstructionsOpenSpecResult, OpenSpecInstructionsPayload } from '../../types/pipeline';

type Handler = (_event: unknown, ...args: unknown[]) => unknown;
const ipc = vi.hoisted(() => ({
  handlers: new Map<string, Handler>(),
  handle: vi.fn((channel: string, handler: Handler) => ipc.handlers.set(channel, handler)),
}));

vi.mock('electron', () => ({ ipcMain: { handle: ipc.handle } }));

/**
 * Pruebas de seguridad, contención y auditoría de pipeline:write-artifact (Tareas 3.2, 3.3, 3.4).
 *
 * Se verifica:
 * - Rechazo ante ruta de repositorio no autorizada o inválida sin tocar disco.
 * - Rechazo ante slug de cambio inválido o con caracteres no permitidos.
 * - Rechazo ante change archivado (sin tasks.md ni proposal.md) sin llamar a escritura.
 * - Rechazo ante rutas manipuladas devueltas por el CLI (otra unidad, escape .., otro change).
 * - Rechazo ante artefacto preexistente si no se especifica overwrite: true.
 * - Escritura exitosa con actualización de task-log.md con operación 'escrita' y actor.
 *
 * En todos los casos de rechazo se afirma sobre el arreglo `written`, garantizando
 * que la operación no escribió nada en el disco.
 */
describe('IPC de escritura de artefactos (pipeline:write-artifact)', () => {
  const CANONICAL_REPO = path.resolve('C:/repo-real');
  const binding = { resolveBinding: vi.fn(async () => ({ repoId: 'r1', canonicalPath: CANONICAL_REPO })) };

  beforeEach(() => {
    ipc.handlers.clear();
    ipc.handle.mockClear();
    binding.resolveBinding.mockClear();
    vi.spyOn(authorizedRepoStore, 'isAuthorized').mockImplementation((p) => p === 'C:/repo' || p === CANONICAL_REPO);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  interface RegisterOptions {
    files?: Record<string, string | null>;
    instructionsResult?: InstructionsOpenSpecResult;
    now?: string;
  }

  async function register(options: RegisterOptions = {}) {
    const files = options.files ?? {};
    const written: Array<{ relative: string; content: string }> = [];

    const defaultPayload: OpenSpecInstructionsPayload = {
      changeName: 'mi-cambio',
      artifactId: 'proposal',
      schemaName: 'spec-driven',
      changeDir: path.resolve(CANONICAL_REPO, 'openspec', 'changes', 'mi-cambio'),
      outputPath: 'proposal.md',
      resolvedOutputPath: path.resolve(CANONICAL_REPO, 'openspec', 'changes', 'mi-cambio', 'proposal.md'),
      existingOutputPaths: [],
      dependencies: [],
      unlocks: ['tasks'],
    };

    const instructionsResult: InstructionsOpenSpecResult =
      options.instructionsResult ?? { ok: true, error: null, data: defaultPayload };

    const getInstructions = vi.fn(async () => instructionsResult);

    const { registerPipelineSpecHandlers } = await import('../ipc/pipeline-specs');
    registerPipelineSpecHandlers(
      binding as never,
      async (_repo, relative) => files[relative] ?? null,
      async (_repo, relative, content) => {
        written.push({ relative, content });
      },
      getInstructions,
      () => options.now ?? '2026-08-04T10:42:00.000Z',
    );

    return {
      writeArtifact: ipc.handlers.get('pipeline:write-artifact')!,
      written,
      getInstructions,
    };
  }

  const TASKS_REF = 'openspec/changes/mi-cambio/tasks.md';
  const PROPOSAL_REF = 'openspec/changes/mi-cambio/proposal.md';
  const LOG_REF = 'openspec/changes/mi-cambio/task-log.md';

  describe('validación de autorización y parámetros', () => {
    it('rechaza una ruta de repositorio no autorizada sin escribir ni llamar al CLI', async () => {
      const { writeArtifact, written, getInstructions } = await register({
        files: { [TASKS_REF]: '- [ ] 1.1 algo\n' },
      });

      const result = await writeArtifact(null, 'C:/repo-no-autorizado', 'mi-cambio', 'proposal', '# Mi propuesta');

      expect(result).toMatchObject({
        success: false,
        error: 'Ruta de repositorio inválida o no autorizada',
        stage: 'auth',
      });
      expect(written).toHaveLength(0);
      expect(getInstructions).not.toHaveBeenCalled();
    });

    it('rechaza un slug de cambio inválido sin escribir en disco', async () => {
      const { writeArtifact, written, getInstructions } = await register({
        files: { [TASKS_REF]: '- [ ] 1.1 algo\n' },
      });

      const result = await writeArtifact(null, 'C:/repo', 'slug_invalido_con_guiones_bajos', 'proposal', '# Mi propuesta');

      expect(result).toMatchObject({
        success: false,
        error: 'Identificador de cambio inválido',
        stage: 'validate',
      });
      expect(written).toHaveLength(0);
      expect(getInstructions).not.toHaveBeenCalled();
    });

    it('rechaza un slug con escape de directorio sin escribir', async () => {
      const { writeArtifact, written, getInstructions } = await register({
        files: { [TASKS_REF]: '- [ ] 1.1 algo\n' },
      });

      const result = await writeArtifact(null, 'C:/repo', '../escape', 'proposal', '# Mi propuesta');

      expect(result).toMatchObject({
        success: false,
        error: 'Identificador de cambio inválido',
        stage: 'validate',
      });
      expect(written).toHaveLength(0);
      expect(getInstructions).not.toHaveBeenCalled();
    });

    it('rechaza un identificador de artefacto con caracteres inválidos o escape ..', async () => {
      const { writeArtifact, written, getInstructions } = await register({
        files: { [TASKS_REF]: '- [ ] 1.1 algo\n' },
      });

      const result = await writeArtifact(null, 'C:/repo', 'mi-cambio', '../../etc/passwd', '# Mi propuesta');

      expect(result).toMatchObject({
        success: false,
        error: 'Identificador de artefacto inválido',
        stage: 'validate',
      });
      expect(written).toHaveLength(0);
      expect(getInstructions).not.toHaveBeenCalled();
    });

    it('rechaza contenido no-string sin escribir', async () => {
      const { writeArtifact, written, getInstructions } = await register({
        files: { [TASKS_REF]: '- [ ] 1.1 algo\n' },
      });

      const result = await writeArtifact(null, 'C:/repo', 'mi-cambio', 'proposal', 12345);

      expect(result).toMatchObject({
        success: false,
        error: 'Contenido inválido',
        stage: 'validate',
      });
      expect(written).toHaveLength(0);
      expect(getInstructions).not.toHaveBeenCalled();
    });
  });

  describe('comprobación de cambio archivado (Tarea 3.4)', () => {
    it('rechaza escribir sobre un cambio archivado (sin tasks.md ni proposal.md) y no escribe', async () => {
      const { writeArtifact, written, getInstructions } = await register({
        files: {}, // Ningún archivo activo para este cambio
      });

      const result = await writeArtifact(null, 'C:/repo', 'mi-cambio', 'proposal', '# Propuesta', { actor: 'persona' });

      expect(result).toMatchObject({
        success: false,
        error: 'archived',
        stage: 'read',
      });
      expect(written).toHaveLength(0);
      expect(getInstructions).not.toHaveBeenCalled();
    });
  });

  describe('contención estricta ante respuestas manipuladas del CLI (Tarea 3.4)', () => {
    it('rechaza cuando el CLI devuelve una ruta en otra unidad de disco', async () => {
      const { writeArtifact, written } = await register({
        files: { [TASKS_REF]: '- [ ] 1.1 tarea\n' },
        instructionsResult: {
          ok: true,
          error: null,
          data: {
            resolvedOutputPath: 'D:/sistema/archivo-maligno.md',
            existingOutputPaths: [],
          },
        },
      });

      const result = await writeArtifact(null, 'C:/repo', 'mi-cambio', 'proposal', '# Malicioso', { actor: 'persona' });

      expect(result).toMatchObject({
        success: false,
        error: 'out-of-bounds',
        stage: 'validate',
      });
      expect(written).toHaveLength(0);
    });

    it('rechaza cuando el CLI devuelve una ruta que escapa con .. a la raíz del repositorio', async () => {
      const escapedPath = path.resolve(CANONICAL_REPO, 'openspec', 'changes', 'mi-cambio', '..', '..', 'package.json');
      const { writeArtifact, written } = await register({
        files: { [TASKS_REF]: '- [ ] 1.1 tarea\n' },
        instructionsResult: {
          ok: true,
          error: null,
          data: {
            resolvedOutputPath: escapedPath,
            existingOutputPaths: [],
          },
        },
      });

      const result = await writeArtifact(null, 'C:/repo', 'mi-cambio', 'proposal', '{ "malicious": true }', { actor: 'persona' });

      expect(result).toMatchObject({
        success: false,
        error: 'out-of-bounds',
        stage: 'validate',
      });
      expect(written).toHaveLength(0);
    });

    it('rechaza cuando el CLI devuelve una ruta correspondiente a otro cambio distinto', async () => {
      const otherChangePath = path.resolve(CANONICAL_REPO, 'openspec', 'changes', 'otro-cambio', 'tasks.md');
      const { writeArtifact, written } = await register({
        files: { [TASKS_REF]: '- [ ] 1.1 tarea\n' },
        instructionsResult: {
          ok: true,
          error: null,
          data: {
            resolvedOutputPath: otherChangePath,
            existingOutputPaths: [],
          },
        },
      });

      const result = await writeArtifact(null, 'C:/repo', 'mi-cambio', 'proposal', '# Alterar otro', { actor: 'persona' });

      expect(result).toMatchObject({
        success: false,
        error: 'out-of-bounds',
        stage: 'validate',
      });
      expect(written).toHaveLength(0);
    });
  });

  describe('prevención de sobrescritura accidental (Tarea 3.2)', () => {
    it('rechaza sobrescribir si el artefacto ya existe en disco y overwrite no es true', async () => {
      const { writeArtifact, written } = await register({
        files: {
          [TASKS_REF]: '- [ ] 1.1 tarea\n',
          [PROPOSAL_REF]: '# Propuesta ya existente\n',
        },
      });

      const result = await writeArtifact(null, 'C:/repo', 'mi-cambio', 'proposal', '# Nuevo contenido', { actor: 'persona' });

      expect(result).toMatchObject({
        success: false,
        error: 'already-exists',
        stage: 'validate',
      });
      expect(written).toHaveLength(0);
    });

    it('rechaza sobrescribir si el CLI reporta el archivo en existingOutputPaths y overwrite no es true', async () => {
      const resolvedPath = path.resolve(CANONICAL_REPO, 'openspec', 'changes', 'mi-cambio', 'proposal.md');
      const { writeArtifact, written } = await register({
        files: { [TASKS_REF]: '- [ ] 1.1 tarea\n' },
        instructionsResult: {
          ok: true,
          error: null,
          data: {
            resolvedOutputPath: resolvedPath,
            existingOutputPaths: [resolvedPath],
          },
        },
      });

      const result = await writeArtifact(null, 'C:/repo', 'mi-cambio', 'proposal', '# Nuevo contenido', { actor: 'persona' });

      expect(result).toMatchObject({
        success: false,
        error: 'already-exists',
        stage: 'validate',
      });
      expect(written).toHaveLength(0);
    });

    it('permite sobrescribir si overwrite: true está especificado', async () => {
      const { writeArtifact, written } = await register({
        files: {
          [TASKS_REF]: '- [ ] 1.1 tarea\n',
          [PROPOSAL_REF]: '# Propuesta vieja\n',
        },
      });

      const result = await writeArtifact(null, 'C:/repo', 'mi-cambio', 'proposal', '# Propuesta nueva', {
        overwrite: true,
        actor: 'persona',
      });

      expect(result).toEqual({ success: true });
      expect(written[0].relative).toBe('openspec/changes/mi-cambio/proposal.md');
      expect(written[0].content).toBe('# Propuesta nueva');
      expect(written[1].relative).toBe(LOG_REF);
      expect(written[1].content).toContain('2026-08-04 10:42 — persona — escrita — "proposal"');
    });
  });

  describe('escritura exitosa y registro de auditoría (Tareas 3.2, 3.3)', () => {
    it('escribe el artefacto y asienta la entrada en task-log.md con formato, operación escrita y actor', async () => {
      const { writeArtifact, written } = await register({
        files: { [TASKS_REF]: '- [ ] 1.1 tarea\n' },
      });

      const result = await writeArtifact(null, 'C:/repo', 'mi-cambio', 'proposal', '# Propuesta aprobada', {
        actor: 'persona',
      });

      expect(result).toEqual({ success: true });
      expect(written).toHaveLength(2);

      // 1. Escritura del artefacto
      expect(written[0].relative).toBe('openspec/changes/mi-cambio/proposal.md');
      expect(written[0].content).toBe('# Propuesta aprobada');

      // 2. Registro de auditoría
      expect(written[1].relative).toBe(LOG_REF);
      expect(written[1].content).toContain('# Registro de tareas');
      expect(written[1].content).toContain('- 2026-08-04 10:42 — persona — escrita — "proposal"');
    });

    it('rechaza sin escribir si falta el actor o es inválido, nombrando el valor recibido', async () => {
      const { writeArtifact, written, getInstructions } = await register({
        files: { [TASKS_REF]: '- [ ] 1.1 tarea\n' },
      });

      const resMissing = await writeArtifact(null, 'C:/repo', 'mi-cambio', 'proposal', '# Propuesta sin autor');
      expect(resMissing).toMatchObject({
        success: false,
        error: "Actor inválido: se esperaba 'persona' o 'agente', recibido undefined",
        stage: 'validate',
      });

      const resInvalid = await writeArtifact(null, 'C:/repo', 'mi-cambio', 'proposal', '# Propuesta sin autor', {
        actor: 'robot',
      });
      expect(resInvalid).toMatchObject({
        success: false,
        error: "Actor inválido: se esperaba 'persona' o 'agente', recibido \"robot\"",
        stage: 'validate',
      });

      expect(written).toHaveLength(0);
      expect(getInstructions).not.toHaveBeenCalled();
    });

    it('maneja artefactos con patrón comodín requiriendo targetFile', async () => {
      const expectedWildcard = path.resolve(CANONICAL_REPO, 'openspec', 'changes', 'mi-cambio', 'specs', '**', '*.md');
      const { writeArtifact, written } = await register({
        files: { [TASKS_REF]: '- [ ] 1.1 tarea\n' },
        instructionsResult: {
          ok: true,
          error: null,
          data: {
            resolvedOutputPath: expectedWildcard,
            existingOutputPaths: [],
          },
        },
      });

      // Sin targetFile debe rechazar
      const failRes = await writeArtifact(null, 'C:/repo', 'mi-cambio', 'specs', '# Delta spec', { actor: 'persona' });
      expect(failRes).toMatchObject({
        success: false,
        error: 'target-path-contains-wildcard',
        stage: 'validate',
      });
      expect(written).toHaveLength(0);

      // Con targetFile válido debe escribir dentro del change
      const okRes = await writeArtifact(null, 'C:/repo', 'mi-cambio', 'specs', '# Delta spec', {
        targetFile: 'specs/mi-capacidad/spec.md',
        actor: 'persona',
      });
      expect(okRes).toEqual({ success: true });
      expect(written[0].relative).toBe('openspec/changes/mi-cambio/specs/mi-capacidad/spec.md');
      expect(written[0].content).toBe('# Delta spec');
      expect(written[1].relative).toBe(LOG_REF);
      expect(written[1].content).toContain('- 2026-08-04 10:42 — persona — escrita — "specs"');
    });
  });
});
