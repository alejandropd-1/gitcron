'use client';

// Estado de apertura de las secciones del panel lateral (LOCAL, REMOTO, etc.),
// recordado por repositorio y entre sesiones en localStorage.
// Por omisión, todas las secciones arrancan contraídas (Set vacío).

import { useCallback, useEffect, useState } from 'react';

const STORAGE_PREFIX = 'gitcron:sidebarSections:';

type OpenSections = Set<string>;

function storageKey(repoPath: string | null): string | null {
  return repoPath ? `${STORAGE_PREFIX}${repoPath}` : null;
}

function readOpenSections(repoPath: string | null): OpenSections {
  const key = storageKey(repoPath);
  if (!key || typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((x): x is string => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

export type SidebarSectionState = {
  isOpen: (sectionId: string) => boolean;
  toggle: (sectionId: string) => void;
};

export function useSidebarSectionState(repoPath: string | null): SidebarSectionState {
  const [open, setOpen] = useState<OpenSections>(() => readOpenSections(repoPath));

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setOpen(readOpenSections(repoPath));
  }, [repoPath]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isOpen = useCallback((sectionId: string) => open.has(sectionId), [open]);

  const toggle = useCallback((sectionId: string) => {
    const next = new Set(readOpenSections(repoPath));
    if (next.has(sectionId)) next.delete(sectionId);
    else next.add(sectionId);

    const key = storageKey(repoPath);
    if (key && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(key, JSON.stringify([...next]));
      } catch {
        // En modo privado o storage lleno no rompe la sesión
      }
    }
    setOpen(next);
  }, [repoPath]);

  return { isOpen, toggle };
}
