import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

const {
  extractRequirementTitlesFromMarkdown,
  parseDeltaSpecRequirements,
  validateChangeDeltaRequirements,
} = await import('../pipeline/openspec-delta-validator');

describe('OpenSpec Group 3 — Lo que la versión nueva ya trae (3.2, 3.5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('3.5 Validación de MODIFIED Requirements contra specs consolidadas', () => {
    it('extractRequirementTitlesFromMarkdown extrae correctamente los títulos', () => {
      const content = `
# Capability Test

## Requirements

### Requirement: Primer requisito existente
Descripción del primer requisito.

### Requirement: Segundo requisito existente
Descripción del segundo requisito.
`;
      const titles = extractRequirementTitlesFromMarkdown(content);
      expect(titles.has('Primer requisito existente')).toBe(true);
      expect(titles.has('Segundo requisito existente')).toBe(true);
      expect(titles.has('Tercer requisito inexistente')).toBe(false);
    });

    it('parseDeltaSpecRequirements agrupa por sección ADDED, MODIFIED, REMOVED', () => {
      const deltaContent = `
# Delta Spec

## ADDED Requirements

### Requirement: Nuevo requisito agregado

## MODIFIED Requirements

### Requirement: Requisito modificado 1
### Requirement: Requisito modificado 2

## REMOVED Requirements

### Requirement: Requisito eliminado
`;
      const parsed = parseDeltaSpecRequirements(deltaContent);
      expect(parsed.get('ADDED')).toEqual(['Nuevo requisito agregado']);
      expect(parsed.get('MODIFIED')).toEqual(['Requisito modificado 1', 'Requisito modificado 2']);
      expect(parsed.get('REMOVED')).toEqual(['Requisito eliminado']);
    });

    it('detecta cuando un MODIFIED no existe en la spec consolidada y avisa que corresponde ADDED', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-test-'));

      try {
        // Crear estructura: openspec/specs/cap-a/spec.md
        const specsDir = path.join(tmpDir, 'openspec', 'specs', 'cap-a');
        await fs.mkdir(specsDir, { recursive: true });
        await fs.writeFile(
          path.join(specsDir, 'spec.md'),
          '# Cap A\n\n## Requirements\n\n### Requirement: Requisito Existente Real\nTexto...',
          'utf-8',
        );

        // Crear change: openspec/changes/c1/specs/cap-a/spec.md con un MODIFIED erróneo
        const changeSpecsDir = path.join(tmpDir, 'openspec', 'changes', 'c1', 'specs', 'cap-a');
        await fs.mkdir(changeSpecsDir, { recursive: true });
        await fs.writeFile(
          path.join(changeSpecsDir, 'spec.md'),
          '# Delta Cap A\n\n## MODIFIED Requirements\n\n### Requirement: Factory de adaptador con ejecutable resuelto por el hub\nTexto...',
          'utf-8',
        );

        // tasks.md completo
        const changeDir = path.join(tmpDir, 'openspec', 'changes', 'c1');
        await fs.writeFile(
          path.join(changeDir, 'tasks.md'),
          '## Tareas\n\n- [x] 1.1 Tarea 1\n- [x] 1.2 Tarea 2\n',
          'utf-8',
        );

        const result = await validateChangeDeltaRequirements(tmpDir, 'c1');
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0]).toContain('Factory de adaptador con ejecutable resuelto por el hub');
        expect(result.errors[0]).toContain('no existe en openspec/specs/cap-a/spec.md');
        expect(result.errors[0]).toContain('corresponde declararlo como ADDED');
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('detecta tareas incompletas en tasks.md antes de archivar (3.2)', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-test-tasks-'));

      try {
        const changeDir = path.join(tmpDir, 'openspec', 'changes', 'c2');
        await fs.mkdir(changeDir, { recursive: true });
        await fs.writeFile(
          path.join(changeDir, 'tasks.md'),
          '## Tareas\n\n- [x] 1.1 Tarea lista\n- [ ] 1.2 Revisión visual pendiente\n',
          'utf-8',
        );

        const result = await validateChangeDeltaRequirements(tmpDir, 'c2');
        expect(result.valid).toBe(false);
        expect(result.hasIncompleteTasks).toBe(true);
        expect(result.incompleteTasks.length).toBe(1);
        expect(result.incompleteTasks[0].id).toBe('1.2');
        expect(result.incompleteTasks[0].text).toBe('Revisión visual pendiente');
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('pasa la validación cuando todos los MODIFIED existen y las tareas están completas', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-test-clean-'));

      try {
        const specsDir = path.join(tmpDir, 'openspec', 'specs', 'cap-b');
        await fs.mkdir(specsDir, { recursive: true });
        await fs.writeFile(
          path.join(specsDir, 'spec.md'),
          '# Cap B\n\n## Requirements\n\n### Requirement: Requisito Antiguo Existente\nTexto...',
          'utf-8',
        );

        const changeSpecsDir = path.join(tmpDir, 'openspec', 'changes', 'c3', 'specs', 'cap-b');
        await fs.mkdir(changeSpecsDir, { recursive: true });
        await fs.writeFile(
          path.join(changeSpecsDir, 'spec.md'),
          '# Delta Cap B\n\n## MODIFIED Requirements\n\n### Requirement: Requisito Antiguo Existente\nNuevo texto...\n\n## ADDED Requirements\n\n### Requirement: Requisito Nuevo Valido\nNuevo texto...',
          'utf-8',
        );

        const changeDir = path.join(tmpDir, 'openspec', 'changes', 'c3');
        await fs.writeFile(
          path.join(changeDir, 'tasks.md'),
          '## Tareas\n\n- [x] 1.1 Tarea lista\n- [x] 1.2 Tarea lista 2\n',
          'utf-8',
        );

        const result = await validateChangeDeltaRequirements(tmpDir, 'c3');
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.hasIncompleteTasks).toBe(false);
      } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
