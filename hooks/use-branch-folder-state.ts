'use client';

// Si cada carpeta de ramas del sidebar está abierta o cerrada, recordado por
// repositorio y entre sesiones.
//
// Antes cada carpeta arrancaba abierta y su estado moría con el componente: Ale
// tiene 45 ramas bajo `origin` y 17 locales, así que abrir la aplicación
// significaba encontrarse la lista entera desplegada y volver a cerrarla a mano
// cada vez.
//
// El principio es el mismo que ya rige para el modelo de IA del panel de
// commits: la aplicación no elige por la persona, pero sí recuerda lo que ella
// eligió. Perder esa elección obliga a rehacerla en cada vuelta.

import { useCallback, useEffect, useState } from 'react';

const STORAGE_PREFIX = 'gitcron:branchFolders:';

/**
 * Qué carpetas están ABIERTAS. Se guarda lo abierto y no lo cerrado porque el
 * estado inicial es cerrado: así una carpeta que nunca se tocó, y una que se
 * cerró, se representan igual —ausentes— y no hay que distinguirlas.
 */
type OpenFolders = Set<string>;

function storageKey(repoPath: string | null): string | null {
  return repoPath ? `${STORAGE_PREFIX}${repoPath}` : null;
}

function readOpenFolders(repoPath: string | null): OpenFolders {
  const key = storageKey(repoPath);
  if (!key || typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((x): x is string => typeof x === 'string')) : new Set();
  } catch {
    // Un valor corrupto no puede romper el sidebar: se arranca con todo cerrado,
    // que es el mismo estado que la primera vez.
    return new Set();
  }
}

/**
 * El estado de las carpetas del repositorio abierto.
 *
 * Por repositorio y no global: GitCron abre varios en pestañas y sus carpetas no
 * son las mismas —`change/` en uno, `feature/` en otro—, así que un estado
 * compartido haría que abrir una carpeta en un repositorio moviera otra ajena.
 */
export type BranchFolderState = {
  isOpen: (prefix: string) => boolean;
  toggle: (prefix: string) => void;
};

export function useBranchFolderState(repoPath: string | null): BranchFolderState {
  const [open, setOpen] = useState<OpenFolders>(() => readOpenFolders(repoPath));

  // Al cambiar de repositorio se relee: el estado del anterior no aplica.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setOpen(readOpenFolders(repoPath));
  }, [repoPath]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isOpen = useCallback((prefix: string) => open.has(prefix), [open]);

  const toggle = useCallback((prefix: string) => {
    // El nuevo conjunto se calcula y se guarda ACÁ, no dentro del updater de
    // `setOpen`. Un updater tiene que ser puro: React puede llamarlo dos veces o
    // diferirlo, y con la escritura adentro el disco se tocaría de más o de
    // menos. Se lee del disco y no del estado en memoria para que dos árboles
    // montados a la vez —el local y el remoto— no se pisen entre sí.
    const next = new Set(readOpenFolders(repoPath));
    if (next.has(prefix)) next.delete(prefix);
    else next.add(prefix);

    const key = storageKey(repoPath);
    if (key && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(key, JSON.stringify([...next]));
      } catch {
        // Sin espacio o en modo privado: la sesión sigue funcionando con el
        // estado en memoria. Perder la persistencia no puede romper el panel.
      }
    }
    setOpen(next);
  }, [repoPath]);

  return { isOpen, toggle };
}
