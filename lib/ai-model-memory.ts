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

const lastAiModelByRepo = new Map<string, string>();
const listeners = new Set<() => void>();

export function getRememberedAiModel(repoPath: string | null | undefined): string {
  if (!repoPath) return '';
  return lastAiModelByRepo.get(repoPath) ?? '';
}

export function rememberAiModel(repoPath: string | null | undefined, modelId: string): void {
  if (!repoPath) return;
  if (lastAiModelByRepo.get(repoPath) === modelId) return;
  lastAiModelByRepo.set(repoPath, modelId);
  listeners.forEach((listener) => listener());
}

export function subscribeAiModelMemory(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useRememberedAiModel(repoPath: string | null | undefined): string {
  return useSyncExternalStore(
    subscribeAiModelMemory,
    () => getRememberedAiModel(repoPath),
    () => '',
  );
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
