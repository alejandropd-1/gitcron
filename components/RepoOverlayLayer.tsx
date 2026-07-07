'use client';

import { AnimatePresence } from 'motion/react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { BranchContextMenuLayer, CommitContextMenu, FileContextMenu } from '@/components/ContextMenus';
import { DangerConfirmDialog } from '@/components/DangerConfirmDialog';
import {
  AmendLastCommitModal,
  CheckoutConflictModal,
  CleanUntrackedModal,
  CreateTagModal,
  ForcePushConfirmModal,
  MergeNeedsCheckoutModal,
  NewBranchModal,
  RenameBranchModal,
  ResetAllConfirmDialog,
  SquashCommitsModal,
  AddRemoteModal,
  RenameRemoteModal,
  SetRemoteUrlModal,
  NewWorktreeModal,
  NewSubmoduleModal,
} from '@/components/RepoActionModals';
import { ResetCommitModal } from '@/components/ResetCommitModal';
import { StashCreateModal, StashPreviewModal, type StashPreviewState } from '@/components/StashModals';
import { useT } from '@/hooks/use-translation';
import type { Commit, GitFile } from '@/lib/git-store';
import type { RemoteEntry, WorktreeEntry, SubmoduleEntry } from '@/types/electron';
// Removed InteractiveRebasePanel import as it is now in RepoMainView

type BranchTracking = Record<string, { ahead: number; behind: number; gone: boolean; upstream: string | null }>;
type BranchMenuState = { x: number; y: number; branch: string } | null;
type CommitMenuState = { x: number; y: number; hash?: string } | null;
type FileMenuState = { x: number; y: number; file: GitFile } | null;
type RenameModalState = { oldName: string; newName: string } | null;
type DeleteScope = 'local' | 'remote' | 'both';
type DeleteBranchState = { branch: string; scope: DeleteScope; notMerged?: boolean } | null;
type CheckoutConflictState = { branch: string; error: string } | null;
type MergeNeedsCheckoutState = { sourceBranch: string; targetBranch: string } | null;
type GitResult = { success?: boolean; conflict?: boolean; notMerged?: boolean; alreadyIgnored?: boolean; error?: string };

export type RepoOverlayLayerProps = {
  setInteractiveRebaseFrom: (hash: string | null) => void;
  isLoading: boolean;
  currentBranch: string;
  repoPath: string | null;
  commits: Commit[];
  branchTracking: BranchTracking;
  showNewBranch: boolean;
  setShowNewBranch: (show: boolean) => void;
  newBranchName: string;
  setNewBranchName: (name: string) => void;
  newBranchFrom?: string;
  setNewBranchFrom: (branch?: string) => void;
  newBranchInputRef: RefObject<HTMLInputElement | null>;
  onCreateBranch: () => Promise<void> | void;
  showStashModal: boolean;
  setShowStashModal: (show: boolean) => void;
  stashMessage: string;
  setStashMessage: (message: string) => void;
  onCreateStash: () => Promise<void> | void;
  stashPreviewState: StashPreviewState | null;
  setStashPreviewState: (state: StashPreviewState | null) => void;
  createTagFrom?: string;
  setCreateTagFrom: (hash?: string) => void;
  newTagName: string;
  setNewTagName: (name: string) => void;
  newTagMessage: string;
  setNewTagMessage: (message: string) => void;
  newTagInputRef: RefObject<HTMLInputElement | null>;
  onCreateTag: () => Promise<void> | void;
  resetCommitFrom?: string;
  setResetCommitFrom: (hash?: string) => void;
  onResetCommit: (mode: 'soft' | 'mixed' | 'hard') => Promise<void> | void;
  branchMenu: BranchMenuState;
  setBranchMenu: (menu: BranchMenuState) => void;
  remoteBranchMenu: BranchMenuState;
  setRemoteBranchMenu: (menu: BranchMenuState) => void;
  performMerge: (sourceBranch: string, targetBranch: string) => Promise<void> | void;
  rebaseOnto: (branch: string) => Promise<void | GitResult> | void | GitResult;
  fastForwardBranch: (branch: string, upstream: string) => Promise<void | GitResult> | void | GitResult;
  pullSpecificBranch: (branch: string) => Promise<void | GitResult> | void | GitResult;
  pushSpecificBranch: (branch: string) => Promise<void | GitResult> | void | GitResult;
  onCheckoutAttempt: (branch: string) => Promise<void> | void;
  mergeNeedsCheckout: MergeNeedsCheckoutState;
  setMergeNeedsCheckout: (state: MergeNeedsCheckoutState) => void;
  checkoutBranch: (branch: string) => Promise<GitResult>;
  mergeIntoCurrent: (branch: string) => Promise<GitResult> | GitResult;
  setCheckoutConflict: (state: CheckoutConflictState) => void;
  renameModal: RenameModalState;
  setRenameModal: Dispatch<SetStateAction<RenameModalState>>;
  renameBranch: (oldName: string, newName: string) => Promise<boolean> | boolean;
  deleteConfirm: DeleteBranchState;
  setDeleteConfirm: (state: DeleteBranchState) => void;
  deleteBranch: (branch: string, force?: boolean) => Promise<GitResult>;
  deleteRemoteBranch: (branch: string, remote?: string) => Promise<{ success: boolean; error?: string; authRequired?: boolean }>;
  deleteTagConfirm: string | null;
  setDeleteTagConfirm: (tag: string | null) => void;
  deleteTag: (tag: string) => Promise<GitResult> | GitResult;
  discardConfirmFile: GitFile | null;
  setDiscardConfirmFile: (file: GitFile | null) => void;
  deleteFile: (path: string) => Promise<boolean | GitResult> | boolean | GitResult;
  discardFileChanges: (path: string) => Promise<GitResult> | GitResult;
  forcePushConfirmOpen: boolean;
  cancelForcePush: () => void;
  confirmForcePush: () => void;
  checkoutConflict: CheckoutConflictState;
  setCheckoutConflictModal: (state: CheckoutConflictState) => void;
  checkoutBranchSmart: (branch: string, options?: { stashFirst?: boolean }) => Promise<GitResult> | GitResult;
  showResetConfirm: boolean;
  setShowResetConfirm: (show: boolean) => void;
  resetAll: () => Promise<boolean> | boolean;
  showCleanModal: boolean;
  setShowCleanModal: (show: boolean) => void;
  cleanableFiles: string[];
  selectedCleanFiles: Set<string>;
  setSelectedCleanFiles: Dispatch<SetStateAction<Set<string>>>;
  onCleanSelected: () => Promise<void> | void;
  cleanModalLoading: boolean;
  showAmend: boolean;
  setShowAmend: (show: boolean) => void;
  amendNewMessage: string;
  setAmendNewMessage: (message: string) => void;
  amendLastCommit: (message?: string) => Promise<GitResult>;
  showSquash: boolean;
  setShowSquash: (show: boolean) => void;
  squashN: number;
  setSquashN: (n: number) => void;
  squashMessage: string;
  setSquashMessage: (message: string) => void;
  squashCommits: (count: number, message: string) => Promise<GitResult>;
  fileContextMenu: FileMenuState;
  setFileContextMenu: (menu: FileMenuState) => void;
  onOpenFileHistory: (file: GitFile) => Promise<void> | void;
  onOpenFileBlame: (file: GitFile) => Promise<void> | void;
  stageFile: (path: string, stage: boolean) => Promise<void | GitResult> | void | GitResult;
  stashFile: (path: string) => Promise<void | GitResult> | void | GitResult;
  addToGitignore: (path: string) => Promise<GitResult>;
  setError: (error: string | null) => void;
  openInDefault: (path: string) => Promise<void | GitResult> | void | GitResult;
  showInFolder: (path: string) => Promise<void | GitResult> | void | GitResult;
  copyFilePath: (path: string) => Promise<void> | void;
  contextMenu: CommitMenuState;
  setContextMenu: (menu: CommitMenuState) => void;
  mergeBranch: (hash: string) => Promise<GitResult> | GitResult;
  cherryPickCommit: (hash: string, shortHash?: string) => Promise<GitResult> | GitResult;
  revertCommit: (hash: string) => Promise<GitResult> | GitResult;

  // F5 props
  // remotes
  showAddRemote: boolean;
  setShowAddRemote: (show: boolean) => void;
  onAddRemote: (name: string, url: string) => Promise<void>;
  remoteToRename: RemoteEntry | null;
  setRemoteToRename: (remote: RemoteEntry | null) => void;
  onRenameRemote: (oldName: string, newName: string) => Promise<void>;
  remoteToSetUrl: RemoteEntry | null;
  setRemoteToSetUrl: (remote: RemoteEntry | null) => void;
  onSetRemoteUrl: (name: string, url: string) => Promise<void>;
  remoteToDelete: RemoteEntry | null;
  setRemoteToDelete: (remote: RemoteEntry | null) => void;
  onDeleteRemote: (name: string) => Promise<void>;
  // worktrees
  showAddWorktree: boolean;
  setShowAddWorktree: (show: boolean) => void;
  onAddWorktree: (path: string, branch: string) => Promise<void>;
  onPickWorktreeFolder: () => Promise<string | null>;
  worktreeToDelete: WorktreeEntry | null;
  setWorktreeToDelete: (wt: WorktreeEntry | null) => void;
  onDeleteWorktree: (path: string, force?: boolean) => Promise<void>;
  branches: string[];
  // submodules
  showAddSubmodule: boolean;
  setShowAddSubmodule: (show: boolean) => void;
  onAddSubmodule: (url: string, path: string) => Promise<void>;
};

export function RepoOverlayLayer(props: RepoOverlayLayerProps) {
  const t = useT();

  // ── Diálogo de borrado de branch (local / remota / ambas) ──
  const dc = props.deleteConfirm;
  const dcImagined = dc?.branch.startsWith('imagined/') ?? false;
  const dcScope: DeleteScope = dc?.scope ?? 'local';
  const dcTitle = dcImagined
    ? 'Descartar futuro materializado'
    : dcScope === 'remote'
      ? t('deleteBranch.remoteTitle')
      : dcScope === 'both'
        ? t('deleteBranch.bothTitle')
        : t('deleteBranch.title');
  const dcMessage = !dc
    ? ''
    : dcImagined
      ? `¿Estás seguro de que deseas descartar este futuro? Esto eliminará de forma permanente la branch real "${dc.branch}" y su tag de flight level asociado.`
      : dcScope === 'remote'
        ? t('deleteBranch.remoteConfirm', { branch: dc.branch })
        : dcScope === 'both'
          ? t('deleteBranch.bothConfirm', { branch: dc.branch })
          : t('deleteBranch.confirm', { branch: dc.branch });
  // La advertencia de "no mergeada" aplica al borrado LOCAL (remota pura no la usa).
  const dcWarning = dcScope !== 'remote' && dc?.notMerged ? t('deleteBranch.notMergedWarning') : undefined;
  const dcConfirmLabel = dcScope === 'remote'
    ? t('deleteBranch.deleteRemote')
    : dcScope === 'both'
      ? t('deleteBranch.deleteBoth')
      : dc?.notMerged ? t('deleteBranch.force') : t('deleteBranch.delete');

  const reportRemoteFailure = (error?: string, authRequired?: boolean) => {
    props.setError(authRequired
      ? t('deleteBranch.remoteAuthRequired')
      : t('deleteBranch.remoteError', { error: error ?? '' }));
  };

  const handleDeleteConfirm = async () => {
    const state = props.deleteConfirm;
    if (!state) return;
    const force = state.notMerged === true;

    if (state.scope === 'remote') {
      const r = await props.deleteRemoteBranch(state.branch);
      if (!r.success) reportRemoteFailure(r.error, r.authRequired);
      props.setDeleteConfirm(null);
      return;
    }

    if (state.scope === 'both') {
      const local = await props.deleteBranch(state.branch, force);
      if (!local.success) {
        // Local no mergeada → escalá a force conservando el scope "both".
        if (local.notMerged && !state.notMerged) {
          props.setDeleteConfirm({ branch: state.branch, scope: 'both', notMerged: true });
          return;
        }
        // Otro fallo local: deleteBranch ya seteó el error. No tocamos la remota.
        props.setDeleteConfirm(null);
        return;
      }
      // Local borrada; intentá la remota y reportá si queda a medias.
      const remote = await props.deleteRemoteBranch(state.branch);
      if (!remote.success) {
        props.setError(remote.authRequired
          ? t('deleteBranch.remoteAuthRequired')
          : t('deleteBranch.partialLocalOk', { error: remote.error ?? '' }));
      }
      props.setDeleteConfirm(null);
      return;
    }

    // scope === 'local'
    const r = await props.deleteBranch(state.branch, force);
    if (r.success) {
      props.setDeleteConfirm(null);
    } else if (r.notMerged && !state.notMerged) {
      props.setDeleteConfirm({ branch: state.branch, scope: 'local', notMerged: true });
    } else {
      props.setDeleteConfirm(null);
    }
  };

  return (
    <>
      <NewBranchModal
        show={props.showNewBranch}
        onClose={() => props.setShowNewBranch(false)}
        branchName={props.newBranchName}
        onBranchNameChange={props.setNewBranchName}
        branchFrom={props.newBranchFrom}
        inputRef={props.newBranchInputRef}
        onCreate={props.onCreateBranch}
        isLoading={props.isLoading}
      />
      <StashCreateModal
        open={props.showStashModal}
        onClose={() => props.setShowStashModal(false)}
        message={props.stashMessage}
        onMessageChange={props.setStashMessage}
        onSubmit={props.onCreateStash}
      />
      <StashPreviewModal preview={props.stashPreviewState} onClose={() => props.setStashPreviewState(null)} />
      <CreateTagModal
        commitHash={props.createTagFrom}
        onClose={() => props.setCreateTagFrom(undefined)}
        tagName={props.newTagName}
        onTagNameChange={props.setNewTagName}
        tagMessage={props.newTagMessage}
        onTagMessageChange={props.setNewTagMessage}
        inputRef={props.newTagInputRef}
        onCreate={props.onCreateTag}
        isLoading={props.isLoading}
      />
      <ResetCommitModal
        commitHash={props.resetCommitFrom}
        onClose={() => props.setResetCommitFrom(undefined)}
        onConfirm={props.onResetCommit}
      />
      <BranchContextMenuLayer
        branchMenu={props.branchMenu}
        remoteBranchMenu={props.remoteBranchMenu}
        currentBranch={props.currentBranch}
        branchTracking={props.branchTracking}
        onMerge={(branch) => { props.performMerge(branch, props.currentBranch); props.setBranchMenu(null); }}
        onRebase={(branch) => { props.rebaseOnto(branch); props.setBranchMenu(null); }}
        onFastForward={(branch) => { props.fastForwardBranch(branch, `origin/${branch}`); props.setBranchMenu(null); }}
        onPull={(branch) => { props.pullSpecificBranch(branch); props.setBranchMenu(null); }}
        onPush={(branch) => { props.pushSpecificBranch(branch); props.setBranchMenu(null); }}
        onCheckout={(branch) => { props.onCheckoutAttempt(branch); props.setBranchMenu(null); props.setRemoteBranchMenu(null); }}
        onRename={(branch) => { props.setRenameModal({ oldName: branch, newName: branch }); props.setBranchMenu(null); }}
        onDeleteLocal={(branch) => { props.setDeleteConfirm({ branch, scope: 'local' }); props.setBranchMenu(null); }}
        onDeleteRemote={(branch) => { props.setDeleteConfirm({ branch, scope: 'remote' }); props.setBranchMenu(null); }}
        onDeleteBoth={(branch) => { props.setDeleteConfirm({ branch, scope: 'both' }); props.setBranchMenu(null); }}
        onCopyName={(branch) => { navigator.clipboard.writeText(branch); props.setBranchMenu(null); props.setRemoteBranchMenu(null); }}
        onCreateFrom={(branch) => { props.setNewBranchFrom(branch); props.setShowNewBranch(true); props.setBranchMenu(null); props.setRemoteBranchMenu(null); }}
        onCloseBranchMenu={() => props.setBranchMenu(null)}
        onCloseRemoteBranchMenu={() => props.setRemoteBranchMenu(null)}
      />
      <MergeNeedsCheckoutModal
        mergeNeedsCheckout={props.mergeNeedsCheckout}
        onClose={() => props.setMergeNeedsCheckout(null)}
        onConfirm={async () => {
          if (!props.mergeNeedsCheckout) return;
          const { sourceBranch, targetBranch } = props.mergeNeedsCheckout;
          props.setMergeNeedsCheckout(null);
          const co = await props.checkoutBranch(targetBranch);
          if (co.success) {
            await props.mergeIntoCurrent(sourceBranch);
          } else if (co.conflict) {
            props.setCheckoutConflict({ branch: targetBranch, error: co.error ?? '' });
          }
        }}
        isLoading={props.isLoading}
      />
      <RenameBranchModal
        renameModal={props.renameModal}
        onClose={() => props.setRenameModal(null)}
        onNewNameChange={(name) => props.setRenameModal((prev) => (prev ? { ...prev, newName: name } : prev))}
        onConfirm={async () => {
          if (!props.renameModal) return;
          const newName = props.renameModal.newName.trim();
          if (!newName || newName === props.renameModal.oldName) { props.setRenameModal(null); return; }
          const ok = await props.renameBranch(props.renameModal.oldName, newName);
          if (ok) props.setRenameModal(null);
        }}
        isLoading={props.isLoading}
      />
      <DangerConfirmDialog
        open={props.deleteConfirm !== null}
        title={dcTitle}
        message={dcMessage}
        warning={dcWarning}
        cancelLabel={t('modal.cancel')}
        confirmLabel={dcConfirmLabel}
        disabled={props.isLoading}
        onCancel={() => props.setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
      />
      <DangerConfirmDialog
        open={props.deleteTagConfirm !== null}
        title="Eliminar Tag"
        message={(
          <>
            ¿Estás seguro de que deseas eliminar el tag{' '}
            <span className="font-bold text-text-primary">{props.deleteTagConfirm}</span>?
          </>
        )}
        cancelLabel={t('modal.cancel')}
        confirmLabel="Eliminar"
        disabled={props.isLoading}
        onCancel={() => props.setDeleteTagConfirm(null)}
        onConfirm={async () => {
          if (!props.deleteTagConfirm) return;
          await props.deleteTag(props.deleteTagConfirm);
          props.setDeleteTagConfirm(null);
        }}
      />
      <DangerConfirmDialog
        open={props.discardConfirmFile !== null}
        title={t('discardConfirm.title')}
        message={props.discardConfirmFile ? t('discardConfirm.warning', { file: props.discardConfirmFile.path }) : ''}
        cancelLabel={t('modal.cancel')}
        confirmLabel={t('discardConfirm.button')}
        disabled={props.isLoading}
        onCancel={() => props.setDiscardConfirmFile(null)}
        onConfirm={async () => {
          if (!props.discardConfirmFile) return;
          const file = props.discardConfirmFile;
          props.setDiscardConfirmFile(null);
          if (file.status === 'untracked') await props.deleteFile(file.path);
          else await props.discardFileChanges(file.path);
        }}
      />
      <ForcePushConfirmModal
        open={props.forcePushConfirmOpen}
        onCancel={props.cancelForcePush}
        onConfirm={props.confirmForcePush}
      />
      <CheckoutConflictModal
        checkoutConflict={props.checkoutConflict}
        onClose={() => props.setCheckoutConflictModal(null)}
        onStashAndSwitch={async (branch) => {
          props.setCheckoutConflictModal(null);
          await props.checkoutBranchSmart(branch, { stashFirst: true });
        }}
        isLoading={props.isLoading}
      />
      <ResetAllConfirmDialog
        show={props.showResetConfirm}
        onClose={() => props.setShowResetConfirm(false)}
        onConfirm={async () => {
          const ok = await props.resetAll();
          if (ok) props.setShowResetConfirm(false);
        }}
        isLoading={props.isLoading}
      />
      <CleanUntrackedModal
        show={props.showCleanModal}
        onClose={() => props.setShowCleanModal(false)}
        cleanableFiles={props.cleanableFiles}
        selectedCleanFiles={props.selectedCleanFiles}
        setSelectedCleanFiles={props.setSelectedCleanFiles}
        onClean={props.onCleanSelected}
        cleanModalLoading={props.cleanModalLoading}
      />
      <AmendLastCommitModal
        show={props.showAmend}
        onClose={() => { props.setShowAmend(false); props.setAmendNewMessage(''); }}
        lastCommitMessage={props.commits[0]?.message || t('graph.noCommits')}
        newMessage={props.amendNewMessage}
        setNewMessage={props.setAmendNewMessage}
        onConfirm={async () => {
          const r = await props.amendLastCommit(props.amendNewMessage.trim() || undefined);
          if (r.success) {
            props.setShowAmend(false);
            props.setAmendNewMessage('');
          }
        }}
        isLoading={props.isLoading}
        hasCommits={props.commits.length > 0 && !!props.repoPath}
      />
      <SquashCommitsModal
        show={props.showSquash}
        onClose={() => { props.setShowSquash(false); props.setSquashMessage(''); props.setSquashN(2); }}
        commits={props.commits}
        squashN={props.squashN}
        setSquashN={props.setSquashN}
        squashMessage={props.squashMessage}
        setSquashMessage={props.setSquashMessage}
        onConfirm={async () => {
          const msg = props.squashMessage.trim() || props.commits[0]?.message || '';
          const r = await props.squashCommits(props.squashN, msg);
          if (r.success) {
            props.setShowSquash(false);
            props.setSquashMessage('');
            props.setSquashN(2);
          }
        }}
        isLoading={props.isLoading}
      />
      <AnimatePresence>
        {props.fileContextMenu && (
          <FileContextMenu
            x={props.fileContextMenu.x}
            y={props.fileContextMenu.y}
            file={props.fileContextMenu.file}
            onStage={() => { props.stageFile(props.fileContextMenu!.file.path, !props.fileContextMenu!.file.staged); props.setFileContextMenu(null); }}
            onOpenHistory={() => { props.onOpenFileHistory(props.fileContextMenu!.file); props.setFileContextMenu(null); }}
            onOpenBlame={() => { props.onOpenFileBlame(props.fileContextMenu!.file); props.setFileContextMenu(null); }}
            onDiscard={() => { props.setDiscardConfirmFile(props.fileContextMenu!.file); props.setFileContextMenu(null); }}
            onStashFile={() => { props.stashFile(props.fileContextMenu!.file.path); props.setFileContextMenu(null); }}
            onIgnore={async () => {
              const file = props.fileContextMenu!.file;
              const r = await props.addToGitignore(file.path);
              if (r.success && r.alreadyIgnored) props.setError(`"${file.path}" ya estaba en .gitignore`);
              props.setFileContextMenu(null);
            }}
            onOpenInEditor={() => { props.openInDefault(props.fileContextMenu!.file.path); props.setFileContextMenu(null); }}
            onShowInFolder={() => { props.showInFolder(props.fileContextMenu!.file.path); props.setFileContextMenu(null); }}
            onCopyPath={() => { props.copyFilePath(props.fileContextMenu!.file.path); props.setFileContextMenu(null); }}
            onDelete={async () => {
              const file = props.fileContextMenu!.file;
              props.setFileContextMenu(null);
              if (confirm(`¿Eliminar "${file.path}" del disco?`)) await props.deleteFile(file.path);
            }}
            onClose={() => props.setFileContextMenu(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {props.contextMenu && (
          <CommitContextMenu
            x={props.contextMenu.x}
            y={props.contextMenu.y}
            onMerge={() => { props.contextMenu?.hash && props.mergeBranch(props.contextMenu.hash); props.setContextMenu(null); }}
            onCherryPick={() => {
              if (props.contextMenu?.hash) void props.cherryPickCommit(props.contextMenu.hash, props.contextMenu.hash.slice(0, 7));
              props.setContextMenu(null);
            }}
            onRevert={() => { props.contextMenu?.hash && props.revertCommit(props.contextMenu.hash); props.setContextMenu(null); }}
            onCheckout={() => { props.contextMenu?.hash && props.checkoutBranch(props.contextMenu.hash); props.setContextMenu(null); }}
            onCreateBranch={() => { props.setNewBranchFrom(props.contextMenu?.hash); props.setShowNewBranch(true); props.setContextMenu(null); }}
            onCreateTag={() => { props.setCreateTagFrom(props.contextMenu?.hash); props.setNewTagName(''); props.setNewTagMessage(''); props.setContextMenu(null); }}
            onReset={() => { props.setResetCommitFrom(props.contextMenu?.hash); props.setContextMenu(null); }}
            onInteractiveRebase={() => {
              if (props.contextMenu?.hash) props.setInteractiveRebaseFrom(props.contextMenu.hash);
              props.setContextMenu(null);
            }}
            onCopySha={() => { props.contextMenu?.hash && navigator.clipboard.writeText(props.contextMenu.hash); props.setContextMenu(null); }}
            onClose={() => props.setContextMenu(null)}
          />
        )}
      </AnimatePresence>

      {/* F5 Modals */}
      <AddRemoteModal
        show={props.showAddRemote}
        onClose={() => props.setShowAddRemote(false)}
        onAdd={props.onAddRemote}
        isLoading={props.isLoading}
      />
      <RenameRemoteModal
        remote={props.remoteToRename}
        onClose={() => props.setRemoteToRename(null)}
        onRename={props.onRenameRemote}
        isLoading={props.isLoading}
      />
      <SetRemoteUrlModal
        remote={props.remoteToSetUrl}
        onClose={() => props.setRemoteToSetUrl(null)}
        onSetUrl={props.onSetRemoteUrl}
        isLoading={props.isLoading}
      />
      <DangerConfirmDialog
        open={!!props.remoteToDelete}
        title={t('remote.deleteConfirmTitle')}
        message={t('remote.deleteConfirmDesc', { name: props.remoteToDelete?.name || '' })}
        confirmLabel={t('sidebar.remoteRemove')}
        cancelLabel={t('modal.cancel')}
        disabled={props.isLoading}
        onCancel={() => props.setRemoteToDelete(null)}
        onConfirm={async () => {
          if (props.remoteToDelete) {
            await props.onDeleteRemote(props.remoteToDelete.name);
            props.setRemoteToDelete(null);
          }
        }}
      />

      <NewWorktreeModal
        show={props.showAddWorktree}
        onClose={() => props.setShowAddWorktree(false)}
        onAdd={props.onAddWorktree}
        onPickFolder={props.onPickWorktreeFolder}
        isLoading={props.isLoading}
        branches={props.branches}
      />
      <DangerConfirmDialog
        open={!!props.worktreeToDelete}
        title={t('worktree.deleteConfirmTitle')}
        message={t('worktree.deleteConfirmDesc', { path: props.worktreeToDelete?.path || '' })}
        warning={t('worktree.deleteWarning')}
        confirmLabel={t('sidebar.worktreeRemove')}
        cancelLabel={t('modal.cancel')}
        disabled={props.isLoading}
        onCancel={() => props.setWorktreeToDelete(null)}
        onConfirm={async () => {
          if (props.worktreeToDelete) {
            await props.onDeleteWorktree(props.worktreeToDelete.path);
            props.setWorktreeToDelete(null);
          }
        }}
      />

      <NewSubmoduleModal
        show={props.showAddSubmodule}
        onClose={() => props.setShowAddSubmodule(false)}
        onAdd={props.onAddSubmodule}
        isLoading={props.isLoading}
      />
    </>
  );
}
