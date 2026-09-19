import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRepoWatcher, type RepoWatcher } from '../ipc/repo-watch';
import { createRepoIgnoreFilter } from '../ipc/watchers';

describe('createRepoWatcher (fs.watch recursivo)', () => {
  let tempDir: string;
  let watcher: RepoWatcher | null = null;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitcron-repo-watch-'));
    fs.mkdirSync(path.join(tempDir, '.git'), { recursive: true });
  });

  afterEach(async () => {
    if (watcher) {
      await watcher.close();
      watcher = null;
    }
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  it('un cambio en un archivo produce un evento', async () => {
    const testFile = path.join(tempDir, 'sample.txt');
    fs.writeFileSync(testFile, 'initial');

    const events: Array<{ event: string; path: string }> = [];
    watcher = createRepoWatcher(tempDir, {
      ignored: createRepoIgnoreFilter(path.join(tempDir, '.git')),
      stabilityThreshold: 100,
    });
    watcher.on('all', (event, filePath) => {
      events.push({ event, path: filePath });
    });

    // Pequeño retardo para asegurar que el observador esté activo en el SO
    await sleep(100);

    fs.writeFileSync(testFile, 'modified content');

    // Esperar a que pase el umbral de estabilización (100ms) + margen
    await sleep(300);

    expect(events.length).toBeGreaterThanOrEqual(1);
    const matched = events.find((e) => path.resolve(e.path) === path.resolve(testFile));
    expect(matched).toBeDefined();
  });

  it('un archivo ignorado (.git/objects/...) no produce evento', async () => {
    const objectsDir = path.join(tempDir, '.git', 'objects', '1a');
    fs.mkdirSync(objectsDir, { recursive: true });
    const ignoredFile = path.join(objectsDir, '2b3c4d');

    const events: Array<{ event: string; path: string }> = [];
    watcher = createRepoWatcher(tempDir, {
      ignored: createRepoIgnoreFilter(path.join(tempDir, '.git')),
      stabilityThreshold: 100,
    });
    watcher.on('all', (event, filePath) => {
      events.push({ event, path: filePath });
    });

    await sleep(100);

    fs.writeFileSync(ignoredFile, 'object-blob');

    await sleep(300);

    const matched = events.find((e) => path.resolve(e.path) === path.resolve(ignoredFile));
    expect(matched).toBeUndefined();
    expect(events.length).toBe(0);
  });

  it('una ráfaga de escrituras del mismo archivo produce un solo evento estabilizado', async () => {
    const burstFile = path.join(tempDir, 'burst.txt');
    fs.writeFileSync(burstFile, 'initial');

    const fileEvents: Array<{ event: string; path: string }> = [];
    watcher = createRepoWatcher(tempDir, {
      ignored: createRepoIgnoreFilter(path.join(tempDir, '.git')),
      stabilityThreshold: 200,
    });
    watcher.on('all', (event, filePath) => {
      if (path.resolve(filePath) === path.resolve(burstFile)) {
        fileEvents.push({ event, path: filePath });
      }
    });

    await sleep(100);

    // Ráfaga: 5 escrituras rápidas con 25 ms de separación (< 200 ms)
    for (let i = 0; i < 5; i++) {
      fs.writeFileSync(burstFile, `burst content ${i}`);
      await sleep(25);
    }

    // Esperar ventana de estabilización completa de 200 ms + margen
    await sleep(400);

    expect(fileEvents.length).toBe(1);
  });

  it('close() detiene la emisión de eventos y limpia timers pendientes', async () => {
    const testFile = path.join(tempDir, 'close-test.txt');
    fs.writeFileSync(testFile, 'initial');

    const events: Array<{ event: string; path: string }> = [];
    watcher = createRepoWatcher(tempDir, {
      ignored: createRepoIgnoreFilter(path.join(tempDir, '.git')),
      stabilityThreshold: 100,
    });
    watcher.on('all', (event, filePath) => {
      events.push({ event, path: filePath });
    });

    await sleep(100);

    // Escribir y cerrar inmediatamente antes de que expire el debounce
    fs.writeFileSync(testFile, 'write-before-close');
    await watcher.close();

    await sleep(300);

    expect(events.length).toBe(0);

    // Escribir después del close tampoco produce nada
    fs.writeFileSync(testFile, 'write-after-close');
    await sleep(300);
    expect(events.length).toBe(0);
  });

  it('prueba de sabotaje del renombre: renombrar una carpeta con la observación activa funciona', async () => {
    // Caso 1: carpeta que contiene una subcarpeta con un archivo (en chokidar falla con EPERM)
    const subfolder = path.join(tempDir, 'subfolder');
    const nested = path.join(subfolder, 'nested');
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(nested, 'file.txt'), 'nested content');

    // Caso 2: carpeta con un archivo simple
    const simpleFolder = path.join(tempDir, 'simple-folder');
    fs.mkdirSync(simpleFolder, { recursive: true });
    fs.writeFileSync(path.join(simpleFolder, 'file.txt'), 'simple content');

    watcher = createRepoWatcher(tempDir, {
      ignored: createRepoIgnoreFilter(path.join(tempDir, '.git')),
      stabilityThreshold: 100,
    });

    await sleep(100);

    const renamedSubfolder = path.join(tempDir, 'subfolder-renamed');
    const renamedSimpleFolder = path.join(tempDir, 'simple-folder-renamed');

    // Renombrar las carpetas desde fuera: ambas deben funcionar sin EPERM
    expect(() => {
      fs.renameSync(subfolder, renamedSubfolder);
    }).not.toThrow();

    expect(() => {
      fs.renameSync(simpleFolder, renamedSimpleFolder);
    }).not.toThrow();

    expect(fs.existsSync(renamedSubfolder)).toBe(true);
    expect(fs.existsSync(subfolder)).toBe(false);
    expect(fs.existsSync(renamedSimpleFolder)).toBe(true);
    expect(fs.existsSync(simpleFolder)).toBe(false);
  });
});
