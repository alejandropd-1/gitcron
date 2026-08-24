'use client';

// Estado de apertura de las secciones del panel lateral y del panel derecho,
// recordado por repositorio y entre sesiones en localStorage.
// Se guarda como Record<string, boolean>. Si no hay registro previo, resuelve
// contra defaultOpen (o false si no se especifica).

import { useCallback, useEffect, useState } from 'react';

const STORAGE_PREFIX = 'gitcron:sidebarSections:';

type SectionRecord = Record<string, boolean>;

function storageKey(repoPath: string | null): string | null {
  return repoPath ? `${STORAGE_PREFIX}${repoPath}` : null;
}

function readStoredSections(repoPath: string | null): SectionRecord {
  const key = storageKey(repoPath);
  if (!key || typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const record: SectionRecord = {};
      for (const item of parsed) {
        if (typeof item === 'string') {
          record[item] = true;
        }
      }
      return record;
    }
    if (parsed && typeof parsed === 'object') {
      const record: SectionRecord = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === 'boolean') {
          record[k] = v;
        }
      }
      return record;
    }
    return {};
  } catch {
    return {};
  }
}

export type SidebarSectionState = {
  isOpen: (sectionId: string) => boolean;
  toggle: (sectionId: string) => void;
};

export function useSidebarSectionState(
  repoPath: string | null,
  defaultOpen?: readonly string[],
): SidebarSectionState {
  const [sections, setSections] = useState<SectionRecord>(() => readStoredSections(repoPath));

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSections(readStoredSections(repoPath));
  }, [repoPath]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isOpen = useCallback(
    (sectionId: string) => {
      if (sectionId in sections) {
        return Boolean(sections[sectionId]);
      }
      return Boolean(defaultOpen?.includes(sectionId));
    },
    [sections, defaultOpen],
  );

  const toggle = useCallback(
    (sectionId: string) => {
      const currentStored = readStoredSections(repoPath);
      const currentlyOpen = sectionId in currentStored
        ? currentStored[sectionId]
        : Boolean(defaultOpen?.includes(sectionId));
      const next: SectionRecord = {
        ...currentStored,
        [sectionId]: !currentlyOpen,
      };

      const key = storageKey(repoPath);
      if (key && typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // En modo privado o storage lleno no rompe la sesión
        }
      }
      setSections(next);
    },
    [repoPath, defaultOpen],
  );

  return { isOpen, toggle };
}
