'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_PREFIX = 'gitcron:speculativeBranches:';

function storageKey(repoPath: string | null): string | null {
  return repoPath ? `${STORAGE_PREFIX}${repoPath}` : null;
}

export function readSpeculativePreference(repoPath: string | null): boolean {
  const key = storageKey(repoPath);
  if (!key || typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return false;
    return raw === 'true';
  } catch {
    return false;
  }
}

export function writeSpeculativePreference(repoPath: string | null, value: boolean): void {
  const key = storageKey(repoPath);
  if (!key || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value ? 'true' : 'false');
  } catch {
    // Modo privado o storage sin cuota: no rompe la sesión
  }
}

export function useSpeculativeBranchesPreference(repoPath: string | null) {
  const [showSpeculative, setShowSpeculativeState] = useState<boolean>(() => readSpeculativePreference(repoPath));

  useEffect(() => {
    setShowSpeculativeState(readSpeculativePreference(repoPath));
  }, [repoPath]);

  const toggleSpeculative = useCallback(() => {
    setShowSpeculativeState((prev) => {
      const next = !prev;
      writeSpeculativePreference(repoPath, next);
      return next;
    });
  }, [repoPath]);

  const setShowSpeculative = useCallback((value: boolean) => {
    setShowSpeculativeState(value);
    writeSpeculativePreference(repoPath, value);
  }, [repoPath]);

  return {
    showSpeculative,
    setShowSpeculative,
    toggleSpeculative,
  };
}
