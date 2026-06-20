// electron/ai/carto/index.ts
//
// Cartografía — Fase 4. Punto de entrada de la capa de IA: store de preferencias
// (opt-in, apagado por defecto) + dispatcher que arma el proveedor correcto según
// esas preferencias. Todo en main.
//
// Las preferencias NO son secreto (no hay keys acá: las keys viven en el vault
// cifrado `key-store`). Por eso se guardan en un JSON plano de `userData`, mismo
// patrón que la config per-repo del Temporal Agent — no en el storage cifrado.

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import {
  type CartoAISettings,
  DEFAULT_CARTO_AI_SETTINGS,
} from '../../../types/carto-ai';
import type { CartoAIProvider } from './provider';
import { createLmStudioProvider } from './lmstudio';
import { createCartoOpenRouterProvider } from './openrouter';

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'carto-ai.json');
}

/** Lee las preferencias, normalizadas contra el default (tolera archivo ausente/corrupto). */
export function getCartoAISettings(): CartoAISettings {
  try {
    const raw = JSON.parse(fs.readFileSync(settingsPath(), 'utf8')) as Partial<CartoAISettings>;
    return {
      enabled: typeof raw.enabled === 'boolean' ? raw.enabled : DEFAULT_CARTO_AI_SETTINGS.enabled,
      mode: raw.mode === 'online' || raw.mode === 'local' ? raw.mode : DEFAULT_CARTO_AI_SETTINGS.mode,
      model: typeof raw.model === 'string' ? raw.model : DEFAULT_CARTO_AI_SETTINGS.model,
    };
  } catch {
    return { ...DEFAULT_CARTO_AI_SETTINGS };
  }
}

/** Persiste un cambio parcial de preferencias y devuelve el estado resultante. */
export function setCartoAISettings(patch: Partial<CartoAISettings>): CartoAISettings {
  const next: CartoAISettings = { ...getCartoAISettings(), ...patch };
  // Normalización defensiva por si llega basura desde el IPC.
  if (next.mode !== 'local' && next.mode !== 'online') next.mode = DEFAULT_CARTO_AI_SETTINGS.mode;
  if (typeof next.enabled !== 'boolean') next.enabled = DEFAULT_CARTO_AI_SETTINGS.enabled;
  if (typeof next.model !== 'string') next.model = '';
  fs.mkdirSync(app.getPath('userData'), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(next), { mode: 0o600 });
  return next;
}

/**
 * Construye el proveedor activo según las preferencias. Lanza si la IA está
 * apagada — el caller (IPC) lo traduce a un error claro y la vista sigue sin IA.
 */
export function getCartoProvider(settings = getCartoAISettings()): CartoAIProvider {
  if (!settings.enabled) {
    throw new Error('La IA de Cartografía está desactivada. Activala en Ajustes → Cartografía.');
  }
  if (settings.mode === 'online') {
    return createCartoOpenRouterProvider({ model: settings.model });
  }
  return createLmStudioProvider({ model: settings.model });
}
