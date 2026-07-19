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
import {
  childPath, isMissingPushSourceRef, isPushRejected, cloneUrlFromGitHubCreateResult,
} from '@/lib/page-helpers';
import { tNow as t } from '@/hooks/use-translation';

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

  const initialPushError = (repoDir: string, error?: string) => (
    isMissingPushSourceRef(error)
      ? t('repoCreate.pushError.noMain', { path: repoDir })
      : t('repoCreate.pushError.generic', { path: repoDir, error: error ?? t('repoCreate.unknownError') })
  );

  const openExisting = async () => {
    await openRepo();
    if (useGitStore.getState().repoPath) {
      onCloseChooser();
    }
  };

  const createRepo = async (parent: string, name: string, withGitHub: boolean) => {
    setError(null);
    const repoDir = childPath(parent, name);

    if (withGitHub && !githubToken) {
      setError('No hay una sesión válida de GitHub. Reconectá tu cuenta y volvé a intentar. No se creó el repositorio local.');
      return false;
    }

    const existsResult = await window.api.fsExistsAndNotEmpty(parent, name);
    const existsAndNotEmpty = existsResult.success && existsResult.data;

    if (existsAndNotEmpty) {
      // A failed GitHub step may leave a perfectly valid local repository.
      // Detect that retry state and continue from the remote step instead of
      // running git:init again (which intentionally rejects existing repos).
      // `rev-parse --is-inside-work-tree` also succeeds when repoDir is merely
      // nested under another repository. Reuse the exact-root open contract so
      // we never attach a remote or run a push against a parent worktree.
      const existingGit = await window.api.openPath(repoDir);
      const localRepoReady = existingGit.success;
      if (!localRepoReady && existingGit.reason !== 'not-a-repo') {
        setError(t('repoCreate.inspectError', {
          path: repoDir,
          error: existingGit.error ?? t('repoCreate.unknownError'),
        }));
        return false;
      }
      if (!localRepoReady) {
        const r = await initRepo(parent, name, true);
        if (!r.success) return false;
      }

      if (withGitHub && githubToken) {
        const gh = await createGitHubRepo(githubToken, name, true, '', false);
        if (!gh.success) {
          setError(`El repositorio local quedó listo en "${repoDir}", pero GitHub falló: ${gh.error ?? 'error desconocido'}. Reconectá tu cuenta y reintentá; GitCron continuará desde el paso remoto.`);
          return false;
        }
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
                  setError(initialPushError(repoDir, forcePushRes.error));
                  return false;
                }
              } else {
                setError(`El repositorio local quedó listo en "${repoDir}". El push inicial fue cancelado; podés reintentar sin volver a inicializarlo.`);
                return false;
              }
            } else {
              setError(initialPushError(repoDir, pushRes.error));
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
        if (!cl.success) {
          setError(`El repositorio se creó en GitHub, pero no se pudo clonar en "${repoDir}": ${cl.error ?? 'error desconocido'}.`);
        }
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
