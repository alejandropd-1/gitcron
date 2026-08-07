import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readSpecificationContent } from '../ipc/pipeline-specs';

/**
 * Lectura del contenido de una especificación consolidada.
 *
 * Va por su propio canal y no en el snapshot: las de este repositorio pesan
 * 145 KB en quince archivos y el snapshot se rearma en cada refresco.
 */
describe('lectura de una especificación', () => {
  let root: string;
  const binding = async (repoPath: string) => ({ canonicalPath: repoPath });

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'gitcron-spec-read-'));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  async function writeSpec(id: string, content: string) {
    await fs.mkdir(path.join(root, 'openspec', 'specs', id), { recursive: true });
    await fs.writeFile(path.join(root, 'openspec', 'specs', id, 'spec.md'), content, 'utf8');
  }

  it('devuelve el contenido de una especificación legible', async () => {
    await writeSpec('mi-capacidad', '## Requisito\n\ntexto');
    const result = await readSpecificationContent(root, 'mi-capacidad', binding);
    expect(result).toEqual({ success: true, content: '## Requisito\n\ntexto' });
  });

  it('un archivo vacío es un dato, no un fallo', async () => {
    // Un archivo vacío es algo real del repositorio; confundirlo con un fallo
    // dejaría el visor en blanco sin explicar por qué.
    await writeSpec('vacia', '');
    const result = await readSpecificationContent(root, 'vacia', binding);
    expect(result).toEqual({ success: true, content: '' });
  });

  it('informa el motivo real cuando la especificación no existe', async () => {
    const result = await readSpecificationContent(root, 'no-existe', binding);
    expect(result).toEqual({ success: false, error: 'missing' });
  });

  it('rechaza un identificador fuera del alfabeto sin tocar el disco', async () => {
    const spy = vi.fn(binding);
    const result = await readSpecificationContent(root, 'Con Mayúsculas', spy);
    expect(result).toEqual({ success: false, error: 'invalid_specification_id' });
    // No llega a resolver el repositorio: se corta antes.
    expect(spy).not.toHaveBeenCalled();
  });

  it('rechaza un identificador que intenta escapar del repositorio', async () => {
    // El canal recibe un identificador y compone la ruta del lado del proceso
    // principal: nunca acepta una ruta armada por el renderer.
    const spy = vi.fn(binding);
    for (const candidate of ['../../etc', '..', 'a/../../b', '/absoluto']) {
      const result = await readSpecificationContent(root, candidate, spy);
      expect(result).toEqual({ success: false, error: 'invalid_specification_id' });
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it('rechaza cualquier valor que no sea una cadena', async () => {
    for (const candidate of [null, undefined, 42, {}, []]) {
      const result = await readSpecificationContent(root, candidate, binding);
      expect(result).toEqual({ success: false, error: 'invalid_specification_id' });
    }
  });
});
