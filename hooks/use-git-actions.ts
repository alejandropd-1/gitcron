'use client';

// useGitActions — fachada que compone los sub-hooks de hooks/git-actions/*.
// La API pública (el objeto retornado) es estable: los consumidores siguen
// haciendo `const { commitChanges, pushChanges, ... } = useGitActions()`.
// La implementación vive partida por dominio:
//   working-tree.ts  → commit, staging, stash, archivos del árbol de trabajo
//   branches.ts      → checkout, branches, merge/rebase, tags
//   history.ts       → revert, reset, amend, cherry-pick, squash, conflictos
//   remote.ts        → push / pull / fetch contra origin
//   github-auth.ts   → token, OAuth device flow, bootstrap de sesión
//   preferences.ts   → idioma, tema, shortcuts, auto-fetch, bootstrap de prefs

import { useWorkingTreeActions } from './git-actions/working-tree';
import { useBranchActions } from './git-actions/branches';
import { useHistoryActions } from './git-actions/history';
import { useRemoteActions } from './git-actions/remote';
import { useGitHubAuthActions } from './git-actions/github-auth';
import { usePreferenceActions } from './git-actions/preferences';

export const useGitActions = () => {
  const workingTree = useWorkingTreeActions();
  const branches = useBranchActions();
  const history = useHistoryActions();
  const remote = useRemoteActions();
  const githubAuth = useGitHubAuthActions();
  const preferences = usePreferenceActions();

  return {
    ...workingTree,
    ...branches,
    ...history,
    ...remote,
    ...githubAuth,
    ...preferences,
  };
};
