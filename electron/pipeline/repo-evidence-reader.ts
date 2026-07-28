import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { CheckRepoActions, simpleGit } from 'simple-git';
import type {
  ChangeSelection,
  DecisionRequest,
  JsonlCursor,
  OpenSpecArchivedChangeEvidence,
  OpenSpecChangeEvidence,
  OpenSpecSpecificationEvidence,
  OpenSpecValidationStatus,
  PipelineDiagnostic,
  PipelineEvidence,
} from '../../types/pipeline';
import { selectPipelineChange } from './change-selection';
import { normalizeDelegation, normalizeGate, normalizeVisualDiff, parseAudit, parseJsonlChunk, parseMarkdownTasks } from './parsers';
import { safeListRepoDirectory, safeReadRepoFile } from './repo-paths';

const execFileAsync = promisify(execFile);

export interface RepoEvidenceReaderDependencies {
  listOpenSpecChanges(repoPath: string): Promise<string[]>;
  currentBranch(repoPath: string): Promise<string>;
  mergedChanges(repoPath: string, candidates: string[]): Promise<string[]>;
  validateOpenSpecChange?(repoPath: string, changeId: string): Promise<OpenSpecValidationStatus>;
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

async function defaultValidateOpenSpecChange(
  repoPath: string,
  changeId: string,
): Promise<OpenSpecValidationStatus> {
  try {
    await execFileAsync('openspec', ['validate', changeId, '--strict', '--no-interactive'], {
      cwd: repoPath,
      timeout: 15_000,
      windowsHide: true,
      maxBuffer: 2 * 1024 * 1024,
      env: { ...process.env, OPENSPEC_TELEMETRY_DISABLED: '1', DO_NOT_TRACK: '1' },
    });
    return 'passed';
  } catch (error) {
    const exitCode = (error as { code?: unknown })?.code;
    return typeof exitCode === 'number' ? 'failed' : 'unknown';
  }
}

function archivedChangeId(entry: string): string | null {
  const match = /^\d{4}-\d{2}-\d{2}-(.+)$/.exec(entry);
  return match?.[1] ?? null;
}

function archivedChange(entry: string): OpenSpecArchivedChangeEvidence | null {
  const match = /^(\d{4}-\d{2}-\d{2})-(.+)$/.exec(entry);
  if (!match) return null;
  return {
    changeId: match[2],
    archivedAt: match[1],
    sourceRef: `openspec/changes/archive/${entry}`,
  };
}

function firstWhyParagraph(markdown: string): string | null {
  const section = /^## Why\s*$([\s\S]*?)(?=^##\s|(?![\s\S]))/im.exec(markdown)?.[1] ?? '';
  const paragraph = section
    .split(/\r?\n\s*\r?\n/)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .find((part) => part.length > 0 && !part.startsWith('#'));
  return paragraph || null;
}

function countRequirements(markdown: string): number {
  return Array.from(markdown.matchAll(/^### Requirement:\s+.+$/gm)).length;
}

export class RepoEvidenceReader {
  constructor(private readonly dependencies: RepoEvidenceReaderDependencies = {
    listOpenSpecChanges: defaultListOpenSpecChanges,
    currentBranch: defaultCurrentBranch,
    mergedChanges: defaultMergedChanges,
    validateOpenSpecChange: defaultValidateOpenSpecChange,
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

    const safeActiveChanges = activeChanges.filter((changeId) => /^[a-z0-9][a-z0-9-]*$/.test(changeId));
    const openSpecChanges: OpenSpecChangeEvidence[] = [];
    for (const changeId of safeActiveChanges) {
      const changeRoot = `openspec/changes/${changeId}`;
      const taskRef = `${changeRoot}/tasks.md`;
      const proposalRef = `${changeRoot}/proposal.md`;
      const designRef = `${changeRoot}/design.md`;
      const [taskFile, proposalFile, designFile, deltaSpecs, validation] = await Promise.all([
        safeReadRepoFile(repoPath, taskRef),
        safeReadRepoFile(repoPath, proposalRef),
        safeReadRepoFile(repoPath, designRef),
        safeListRepoDirectory(repoPath, `${changeRoot}/specs`),
        this.dependencies.validateOpenSpecChange?.(repoPath, changeId) ?? Promise.resolve('unknown' as const),
      ]);
      if (taskFile.status !== 'missing') diagnostics.push(...taskFile.diagnostics);
      if (proposalFile.status !== 'missing') diagnostics.push(...proposalFile.diagnostics);
      if (designFile.status !== 'missing') diagnostics.push(...designFile.diagnostics);
      openSpecChanges.push({
        changeId,
        intent: proposalFile.content ? firstWhyParagraph(proposalFile.content) : null,
        tasks: taskFile.content ? parseMarkdownTasks(taskFile.content, taskRef) : [],
        proposalExists: proposalFile.content !== null,
        designExists: designFile.content !== null,
        specsCount: deltaSpecs.length,
        validation,
      });
    }

    const tasks = selection.changeId
      ? openSpecChanges.find((change) => change.changeId === selection.changeId)?.tasks ?? []
      : [];

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
    let openSpecArchivedChanges: OpenSpecArchivedChangeEvidence[] = [];
    const decisions: DecisionRequest[] = [];
    try {
      reports = (await safeListRepoDirectory(repoPath, 'docs/reports')).filter((name) => name.endsWith('.md')).map((name) => `docs/reports/${name}`);
      const archiveEntries = await safeListRepoDirectory(repoPath, 'openspec/changes/archive');
      archivedChanges = archiveEntries.map(archivedChangeId).filter((id): id is string => id !== null);
      openSpecArchivedChanges = archiveEntries
        .map(archivedChange)
        .filter((entry): entry is OpenSpecArchivedChangeEvidence => entry !== null)
        .sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''));
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

    const openSpecSpecifications: OpenSpecSpecificationEvidence[] = [];
    try {
      const specificationIds = await safeListRepoDirectory(repoPath, 'openspec/specs');
      for (const specificationId of specificationIds.filter((id) => /^[a-z0-9][a-z0-9-]*$/.test(id))) {
        const sourceRef = `openspec/specs/${specificationId}/spec.md`;
        const specFile = await safeReadRepoFile(repoPath, sourceRef);
        if (specFile.status !== 'missing') diagnostics.push(...specFile.diagnostics);
        openSpecSpecifications.push({
          specificationId,
          requirements: specFile.content === null ? null : countRequirements(specFile.content),
          sourceRef,
        });
      }
    } catch {
      diagnostics.push(issue('openspec.specifications-unavailable', 'No se pudieron listar las especificaciones OpenSpec.', 'openspec/specs'));
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
        openSpecChanges,
        openSpecArchivedChanges,
        openSpecSpecifications,
      },
    };
  }
}
