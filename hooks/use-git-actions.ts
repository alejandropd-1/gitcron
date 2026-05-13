import { useGitStore, Commit, GitFile } from '@/lib/git-store';

export const useGitActions = () => {
  const {
    commitMessage,
    setCommitMessage,
    modifiedFiles,
    setModifiedFiles,
    setLoading,
    setError,
    currentBranch,
    setCommits,
    setBranches,
  } = useGitStore();

  const runCommand = async (args: string[]) => {
    setLoading(true);
    setError(null);
    try {
      if (!window.api) {
        console.warn('IPC bridge not found. Mocking execution for:', args.join(' '));
        // Simulate a delay
        await new Promise((resolve) => setTimeout(resolve, 800));
        return { success: true };
      }
      return await window.api.gitCommand(args);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const commitChanges = async () => {
    if (!commitMessage.trim()) {
      setError('Commit message cannot be empty');
      return;
    }

    const stagedFiles = modifiedFiles.filter((f) => f.staged);
    if (stagedFiles.length === 0) {
      setError('No staged files to commit');
      return;
    }

    const result = await runCommand(['commit', '-m', commitMessage]);
    if (result.success) {
      setCommitMessage('');
      // Refresh state logic would go here
      setModifiedFiles(modifiedFiles.filter((f) => !f.staged));
    }
  };

  const mergeBranch = async (branchName: string) => {
    const result = await runCommand(['merge', branchName]);
    if (!result.success) {
      setError(`Merge conflict or error merging ${branchName}: ${result.error}`);
    }
    return result;
  };

  const revertCommit = async (hash: string) => {
    const result = await runCommand(['revert', '--no-edit', hash]);
    if (!result.success) {
      setError(`Error reverting commit ${hash}: ${result.error}`);
    }
    return result;
  };

  const stashChanges = async () => {
    const result = await runCommand(['stash']);
    if (result.success) {
      setModifiedFiles([]);
    }
    return result;
  };

  const discardFileChanges = async (filePath: string) => {
    const result = await runCommand(['restore', filePath]);
    if (result.success) {
      setModifiedFiles(modifiedFiles.filter((f) => f.path !== filePath));
    }
    return result;
  };

  const stageFile = (filePath: string, stage: boolean) => {
    setModifiedFiles(
      modifiedFiles.map((f) => (f.path === filePath ? { ...f, staged: stage } : f))
    );
  };

  return {
    commitChanges,
    mergeBranch,
    revertCommit,
    stashChanges,
    discardFileChanges,
    stageFile,
  };
};
