// electron/db/carto-cache.ts
//
// Cartografía — Fase 5. Caché de EXPLICACIONES de nodos. Reutiliza la disciplina
// de persistencia del Temporal Agent (misma DB SQLite, mismo runner de migraciones,
// tipos de fila planos) — ver electron/db/repository.ts — pero vive en su propia
// tabla `carto_explanation` (migración v2 en schema.ts).
//
// Por qué cachear: explicar un nodo cuesta una generación del modelo (tokens / o un
// modelo local lento). La clave es por CONTENIDO: repo + ruta del nodo + hash del
// código + idioma. Si el nodo no cambió, devolvemos la explicación guardada y NO
// re-llamamos al modelo; si su código cambia, el hash cambia y la caché se invalida
// sola. Es la misma idea del `input_hash` del Temporal Agent, a escala de nodo.

import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { getDatabase } from './connection';

/** Clave lógica de una explicación cacheada. */
export interface CartoExplanationKey {
  repoPath: string;
  /** Ruta estable del nodo, p. ej. `lib/cart.ts#calculateTotal`. */
  nodePath: string;
  /** Hash del contenido del nodo (código + firma). Invalida la caché al cambiar. */
  contentHash: string;
  /** Idioma de la explicación (es/en/zh): una explicación por idioma. */
  lang: string;
}

/** Explicación cacheada, tal como la consume el panel de detalle. */
export interface CartoExplanationRow {
  explanation: string;
  provider: string;
  model: string | null;
  generatedAt: string;
}

interface CartoCacheOptions {
  db?: DatabaseSync;
  userDataPath?: string;
  now?: () => string;
}

type CartoExplanationDbRow = {
  explanation: string;
  provider: string;
  model: string | null;
  generated_at: string;
};

/**
 * Busca una explicación cacheada por su clave de contenido. Devuelve `null` si no
 * hay hit (nodo nuevo, código cambiado, u otro idioma): el caller genera entonces.
 */
export function getCartoExplanation(
  key: CartoExplanationKey,
  options: CartoCacheOptions = {},
): CartoExplanationRow | null {
  const row = resolveDatabase(options)
    .prepare(
      `SELECT explanation, provider, model, generated_at
         FROM carto_explanation
        WHERE repo_path = ? AND node_path = ? AND content_hash = ? AND lang = ?
        LIMIT 1`,
    )
    .get(key.repoPath, key.nodePath, key.contentHash, key.lang) as
    | CartoExplanationDbRow
    | undefined;
  return row
    ? { explanation: row.explanation, provider: row.provider, model: row.model, generatedAt: row.generated_at }
    : null;
}

/**
 * Guarda una explicación recién generada. Antes de insertar, PODA cualquier versión
 * vieja del mismo nodo+idioma (otro `content_hash`): la caché guarda sólo la
 * explicación del contenido vigente, no un historial que crecería sin techo.
 */
export function upsertCartoExplanation(
  input: CartoExplanationKey & { provider: string; model?: string | null; explanation: string; generatedAt: string },
  options: CartoCacheOptions = {},
): void {
  const db = resolveDatabase(options);
  const createdAt = options.now?.() ?? new Date().toISOString();

  db.exec('BEGIN');
  try {
    // Poda las explicaciones de versiones anteriores de este nodo en este idioma.
    db.prepare('DELETE FROM carto_explanation WHERE repo_path = ? AND node_path = ? AND lang = ?')
      .run(input.repoPath, input.nodePath, input.lang);

    db.prepare(
      `INSERT INTO carto_explanation (
         id, repo_path, node_path, content_hash, lang, provider, model, explanation, generated_at, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      randomUUID(),
      input.repoPath,
      input.nodePath,
      input.contentHash,
      input.lang,
      input.provider,
      input.model ?? null,
      input.explanation,
      input.generatedAt,
      createdAt,
    );

    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function resolveDatabase(options: CartoCacheOptions): DatabaseSync {
  return options.db ?? getDatabase(resolveUserDataPath(options));
}

function resolveUserDataPath(options: CartoCacheOptions): string {
  if (options.userDataPath) return options.userDataPath;
  const electron = require('electron') as { app?: { getPath(name: 'userData'): string } };
  if (!electron.app) {
    throw new Error('Electron app is unavailable; pass a db/userDataPath in tests');
  }
  return electron.app.getPath('userData');
}
