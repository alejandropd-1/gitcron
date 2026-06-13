'use client';

// Lógica de negocio del "repo chooser": abrir existente, crear (con opción de
// crear/asociar en GitHub) y clonar. Incluye el flujo de confirmación de
// force-push cuando el push inicial a GitHub es rechazado. Extraído de
// app/page.tsx — el flujo se mantiene idéntico.
//
// No llama a useRepoLoader() internamente a propósito: ese hook monta el
// watcher de filesystem (repoWatch) en un useEffect, y una segunda instancia
// lo duplicaría. Las funciones del loader se reciben por props tipadas.

import { useState } from 'react';
import { useGitStore } from '@/lib/git-store';
import { childPath, isPushRejected, cloneUrlFromGitHubCreateResult } from '@/lib/page-helpers';

interface ForcePushConfirmState {
  repoDir: string;
  githubToken: string;
  resolve: (value: boolean) => void;
}

interface UseRepoChooserParams {
  /** Abre el diálogo nativo y carga un repo existente. */
  openRepo: () => Promise<void>;
  /** Inicializa un repo nuevo en parentPath/name. */
  initRepo: (parentPath: string, name: string, withInitialCommit?: boolean) => Promise<{ success: boolean; error?: string }>;
  /** Clona un repo. token opcional (repos privados). */
  cloneRepo: (url: string, parentPath: string, folderName: string, token?: string) => Promise<{ success: boolean; error?: string }>;
  /** Crea el repo en GitHub. Devuelve la clone URL en data. */
  createGitHubRepo: (
    token: string,
    name: string,
    isPrivate: boolean,
    description?: string,
    autoInit?: boolean,
  ) => Promise<{ success: boolean; error?: string; data?: { cloneUrl?: string | null } | null }>;
  /** Refresca todos los datos del repo recién abierto/creado. */
  loadAll: (path?: string) => Promise<void>;
  /** Cierra el panel del chooser (orquestación de vista, vive en page). */
  onCloseChooser: () => void;
}

export function useRepoChooser({
  openRepo,
  initRepo,
  cloneRepo,
  createGitHubRepo,
  loadAll,
  onCloseChooser,
}: UseRepoChooserParams) {
  const setError = useGitStore((s) => s.setError);
  const githubToken = useGitStore((s) => s.githubToken);
  const githubUser = useGitStore((s) => s.githubUser);

  // Promise-resolve modal: createRepo se suspende hasta que el usuario confirma
  // o cancela el force-push. Sólo lo usa el flujo de creación con GitHub.
  const [forcePushConfirm, setForcePushConfirm] = useState<ForcePushConfirmState | null>(null);

  const openExisting = async () => {
    await openRepo();
    if (useGitStore.getState().repoPath) {
      onCloseChooser();
    }
  };

  const createRepo = async (parent: string, name: string, withGitHub: boolean) => {
    setError(null);
    const repoDir = childPath(parent, name);

    const existsResult = await window.api.fsExistsAndNotEmpty(parent, name);
    const existsAndNotEmpty = existsResult.success && existsResult.data;

    if (existsAndNotEmpty) {
      const r = await initRepo(parent, name, true);
      if (!r.success) return false;

      if (withGitHub && githubToken) {
        const gh = await createGitHubRepo(githubToken, name, true, '', false);
        const cloneUrl = cloneUrlFromGitHubCreateResult(gh, githubUser?.login, name);
        if (cloneUrl === null) return false;

        if (cloneUrl) {
          const remoteRes = await window.api.gitCommand(repoDir, ['remote', 'add', 'origin', cloneUrl]);
          if (!remoteRes.success && !remoteRes.error?.includes('already exists')) {
            setError(remoteRes.error ?? 'Error al asociar el repositorio remoto');
            return false;
          }

          const pushRes = await window.api.gitPushBranch(repoDir, 'main', githubToken);
          if (!pushRes.success) {
            if (isPushRejected(pushRes.error)) {
              const shouldForce = await new Promise<boolean>((resolve) => {
                setForcePushConfirm({
                  repoDir,
                  githubToken,
                  resolve,
                });
              });
              if (shouldForce) {
                const forcePushRes = await window.api.gitPushBranch(repoDir, 'main', githubToken, true);
                if (!forcePushRes.success) {
                  setError(forcePushRes.error ?? 'Error al forzar la subida a GitHub');
                  return false;
                }
              } else {
                return false;
              }
            } else {
              setError(pushRes.error ?? 'Error al subir los archivos a GitHub');
              return false;
            }
          }
        }
      }
      await loadAll(repoDir);
      return true;
    }

    if (withGitHub && githubToken) {
      const r = await createGitHubRepo(githubToken, name, true, '', true);
      const cloneUrl = cloneUrlFromGitHubCreateResult(r, githubUser?.login, name);
      if (cloneUrl === null) return false;

      if (cloneUrl) {
        const cl = await cloneRepo(cloneUrl, parent, name, githubToken);
        return cl.success;
      }
      return false;
    }

    const r = await initRepo(parent, name, true);
    return r.success;
  };

  const cloneRepoFromChooser = async (url: string, parent: string, name: string) => {
    const r = await cloneRepo(url, parent, name, githubToken ?? undefined);
    return r.success;
  };

  const cancelForcePush = () => {
    forcePushConfirm?.resolve(false);
    setForcePushConfirm(null);
  };

  const confirmForcePush = () => {
    forcePushConfirm?.resolve(true);
    setForcePushConfirm(null);
  };

  return {
    openExisting,
    createRepo,
    cloneRepoFromChooser,
    forcePushConfirmOpen: forcePushConfirm !== null,
    cancelForcePush,
    confirmForcePush,
  };
}
