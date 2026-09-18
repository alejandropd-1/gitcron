// lib/ai-model-memory.ts
//
// Memoria en sesión de la elección del modelo local de IA por repositorio (Tarea 9c.4 b).
//
// Sincroniza la elección entre el panel de commit de OpenSpecDashboard y la vista de
// notas de versión de OpenSpecReleaseNotes mediante useSyncExternalStore.
//
// Nada preseleccionado por la aplicación: la decisión es de la persona y se conserva
// lo que ella eligió.

import { useSyncExternalStore } from 'react';

export interface AiRememberedSettings {
  model: string;
  contextLength: number;
  ttlMinutes: number;
}

const DEFAULT_AI_CONTEXT_LENGTH = 65_536;
const DEFAULT_AI_TTL_MINUTES = 30;

const defaultSettings: AiRememberedSettings = Object.freeze({
  model: '',
  contextLength: DEFAULT_AI_CONTEXT_LENGTH,
  ttlMinutes: DEFAULT_AI_TTL_MINUTES,
});

const aiSettingsByRepo = new Map<string, AiRememberedSettings>();
const listeners = new Set<() => void>();

export function getRememberedAiSettings(repoPath: string | null | undefined): AiRememberedSettings {
  if (!repoPath) return defaultSettings;
  return aiSettingsByRepo.get(repoPath) ?? defaultSettings;
}

export function rememberAiSettings(
  repoPath: string | null | undefined,
  partial: Partial<AiRememberedSettings>,
): void {
  if (!repoPath) return;
  const current = getRememberedAiSettings(repoPath);
  const next: AiRememberedSettings = Object.freeze({
    model: partial.model !== undefined ? partial.model : current.model,
    contextLength: partial.contextLength !== undefined ? partial.contextLength : current.contextLength,
    ttlMinutes: partial.ttlMinutes !== undefined ? partial.ttlMinutes : current.ttlMinutes,
  });

  if (
    next.model === current.model &&
    next.contextLength === current.contextLength &&
    next.ttlMinutes === current.ttlMinutes
  ) {
    return;
  }

  aiSettingsByRepo.set(repoPath, next);
  listeners.forEach((listener) => listener());
}

export function getRememberedAiModel(repoPath: string | null | undefined): string {
  return getRememberedAiSettings(repoPath).model;
}

export function rememberAiModel(repoPath: string | null | undefined, modelId: string): void {
  rememberAiSettings(repoPath, { model: modelId });
}

export function subscribeAiModelMemory(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useRememberedAiSettings(repoPath: string | null | undefined): AiRememberedSettings {
  return useSyncExternalStore(
    subscribeAiModelMemory,
    () => getRememberedAiSettings(repoPath),
    () => defaultSettings,
  );
}

export function useRememberedAiModel(repoPath: string | null | undefined): string {
  return useRememberedAiSettings(repoPath).model;
}

/**
 * Resuelve la etiqueta legible de las máquinas donde reside el modelo.
 *
 * Utilidad compartida entre el panel de commit y la vista de análisis de versiones.
 */
export function formatAiDeviceLabel(
  devices: string[] | undefined,
  deviceNames: Record<string, string>,
  t: (key: string, params?: Record<string, string | number>) => string,
): string | null {
  if (!devices || devices.length === 0) return null;
  const nombre = (id: string) =>
    deviceNames[id] ?? t('pipeline.openspec.prepare.aiDeviceOther', { id: id.slice(0, 6) });
  const aqui = devices.includes('');
  const otras = devices.filter((id) => id !== '');
  if (aqui && otras.length > 0) {
    return deviceNames[''] && deviceNames[otras[0]]
      ? `${deviceNames['']} + ${deviceNames[otras[0]]}`
      : t('pipeline.openspec.prepare.aiDeviceBoth');
  }
  if (aqui) return deviceNames[''] ?? t('pipeline.openspec.prepare.aiDeviceHere');
  return nombre(otras[0]);
}
