import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { CheckRepoActions, simpleGit } from 'simple-git';
import type { ChangeSelection, DecisionRequest, JsonlCursor, PipelineDiagnostic, PipelineEvidence } from '../../types/pipeline';
import { selectPipelineChange } from './change-selection';
import { normalizeDelegation, normalizeGate, normalizeVisualDiff, parseAudit, parseJsonlChunk, parseMarkdownTasks } from './parsers';
import { safeListRepoDirectory, safeReadRepoFile } from './repo-paths';

const execFileAsync = promisify(execFile);

export interface RepoEvidenceReaderDependencies {
  listOpenSpecChanges(repoPath: string): Promise<string[]>;
  currentBranch(repoPath: string): Promise<string>;
  mergedChanges(repoPath: string, candidates: string[]): Promise<string[]>;
  now(): string;
}

export interface PipelineCursorStore {
  loadCursor(repoId: string, sourceRef: string): JsonlCursor;
  saveCursor(repoId: string, sourceRef: string, cursor: JsonlCursor): void;
}

export interface RepoEvidenceSnapshot {
  evidence: PipelineEvidence;
  selection: ChangeSelection;
}

function issue(code: string, message: string, sourceRef: string): PipelineDiagnostic {
  return { code, message, severity: 'warning', sourceRef };
}

async function defaultListOpenSpecChanges(repoPath: string): Promise<string[]> {
  const { stdout } = await execFileAsync('openspec', ['list', '--json'], {
    cwd: repoPath,
    timeout: 10_000,
    windowsHide: true,
    maxBuffer: 2 * 1024 * 1024,
    env: { ...process.env, OPENSPEC_TELEMETRY_DISABLED: '1', DO_NOT_TRACK: '1' },
  });
  const parsed = JSON.parse(stdout) as { changes?: Array<{ name?: unknown }> };
  return (parsed.changes ?? []).map((change) => change.name).filter((name): name is string => typeof name === 'string');
}

async function defaultCurrentBranch(repoPath: string): Promise<string> {
  const git = simpleGit(repoPath, { timeout: { block: 10_000 } });
  if (!await git.checkIsRepo(CheckRepoActions.IS_REPO_ROOT)) throw new Error('not-a-repo-root');
  return (await git.branchLocal()).current;
}

async function defaultMergedChanges(repoPath: string, candidates: string[]): Promise<string[]> {
  if (candidates.length === 0) return [];
  const messages = await simpleGit(repoPath, { timeout: { block: 10_000 } }).raw(['log', '--merges', '--format=%B%x00', '-n', '200']);
  return candidates.filter((candidate) => messages.split('\0').some((message) => message.includes(candidate)));
}

function archivedChangeId(entry: string): string | null {
  const match = /^\d{4}-\d{2}-\d{2}-(.+)$/.exec(entry);
  return match?.[1] ?? null;
}

export class RepoEvidenceReader {
  constructor(private readonly dependencies: RepoEvidenceReaderDependencies = {
    listOpenSpecChanges: defaultListOpenSpecChanges,
    currentBranch: defaultCurrentBranch,
    mergedChanges: defaultMergedChanges,
    now: () => new Date().toISOString(),
  }) {}

  async read(repoPath: string, repoId: string, cursorStore?: PipelineCursorStore): Promise<RepoEvidenceSnapshot> {
    const diagnostics: PipelineDiagnostic[] = [];
    let branch = '';
    try {
      branch = await this.dependencies.currentBranch(repoPath);
    } catch {
      diagnostics.push(issue('git.unavailable', 'No se pudo confirmar la branch del repositorio.', 'git'));
    }

    let activeChanges: string[] = [];
    try {
      activeChanges = await this.dependencies.listOpenSpecChanges(repoPath);
    } catch {
      diagnostics.push(issue('openspec.unavailable', 'OpenSpec no está disponible o el repositorio no tiene scaffold.', 'openspec'));
    }
    const selection = selectPipelineChange(branch, activeChanges);

    const tasks = [];
    if (selection.changeId && /^[a-z0-9][a-z0-9-]*$/.test(selection.changeId)) {
      const sourceRef = `openspec/changes/${selection.changeId}/tasks.md`;
      const taskFile = await safeReadRepoFile(repoPath, sourceRef);
      diagnostics.push(...taskFile.diagnostics);
      if (taskFile.content !== null) tasks.push(...parseMarkdownTasks(taskFile.content, sourceRef));
    }

    const readJsonl = async (sourceRef: string): Promise<unknown[]> => {
      const file = await safeReadRepoFile(repoPath, sourceRef);
      diagnostics.push(...file.diagnostics);
      if (file.content === null) return [];
      const previous = cursorStore?.loadCursor(repoId, sourceRef) ?? { offset: 0, pending: '', generation: null };
      const bytes = Buffer.from(file.content);
      const startOffset = previous.offset <= bytes.length ? previous.offset : 0;
      const parsed = parseJsonlChunk<unknown>(bytes.subarray(startOffset).toString('utf8'), previous, sourceRef, { startOffset, generation: file.generation ?? null });
      diagnostics.push(...parsed.diagnostics);
      cursorStore?.saveCursor(repoId, sourceRef, parsed.cursor);
      return parsed.records;
    };

    const gates = (await readJsonl('docs/ai/logs/gates.jsonl')).map(normalizeGate).filter((row): row is NonNullable<ReturnType<typeof normalizeGate>> => row !== null);
    const delegations = (await readJsonl('docs/ai/logs/delegations.jsonl')).map(normalizeDelegation).filter((row): row is NonNullable<ReturnType<typeof normalizeDelegation>> => row !== null);
    const visualDiffs = (await readJsonl('docs/ai/logs/visual-diff-heights.jsonl')).map(normalizeVisualDiff).filter((row): row is NonNullable<ReturnType<typeof normalizeVisualDiff>> => row !== null);

    let reports: string[] = [];
    let archivedChanges: string[] = [];
    const decisions: DecisionRequest[] = [];
    try {
      reports = (await safeListRepoDirectory(repoPath, 'docs/reports')).filter((name) => name.endsWith('.md')).map((name) => `docs/reports/${name}`);
      archivedChanges = (await safeListRepoDirectory(repoPath, 'openspec/changes/archive')).map(archivedChangeId).filter((id): id is string => id !== null);
      for (const report of reports) {
        const file = await safeReadRepoFile(repoPath, report, { maxBytes: 512 * 1024 });
        if (file.content === null) continue;
        const audit = parseAudit(file.content, report);
        if (audit.verdict === 'rejected') {
          decisions.push({
            decisionId: createHash('sha256').update(`${repoId}\0audit-rejected\0${report}`).digest('hex'),
            repoId,
            changeId: selection.changeId,
            kind: 'audit-rejected',
            status: 'pending',
            title: 'Auditoría rechazada',
            summary: audit.findings.join('; ') || 'La auditoría requiere revisión humana.',
            risk: 'unknown',
            riskReason: null,
            provenance: 'repo',
            evidenceRefs: [report],
            requestedAt: this.dependencies.now(),
          });
        }
      }
    } catch {
      diagnostics.push(issue('filesystem.directory-unavailable', 'No se pudo listar una fuente local.', 'filesystem'));
    }

    let mergedChanges: string[] = [];
    try {
      mergedChanges = await this.dependencies.mergedChanges(repoPath, [...new Set([...activeChanges, ...archivedChanges])]);
    } catch {
      diagnostics.push(issue('git.merge-evidence-unavailable', 'No se pudo comprobar evidencia de merges.', 'git'));
    }

    return {
      selection,
      evidence: {
        repoId,
        observedAt: this.dependencies.now(),
        tasks,
        reports,
        gates,
        delegations,
        visualDiffs,
        decisions,
        activeChanges,
        archivedChanges,
        mergedChanges,
        diagnostics,
        selection,
      },
    };
  }
}
