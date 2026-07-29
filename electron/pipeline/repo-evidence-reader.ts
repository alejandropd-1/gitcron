import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { CheckRepoActions, simpleGit } from 'simple-git';
import type {
  ChangeSelection,
  DecisionRequest,
  OpenSpecArchivedChangeEvidence,
  OpenSpecChangeEvidence,
  OpenSpecDeltaSpec,
  OpenSpecSpecificationEvidence,
  OpenSpecValidationStatus,
  PipelineDiagnostic,
  PipelineEvidence,
} from '../../types/pipeline';
import { selectPipelineChange } from './change-selection';
import { parseAudit, parseMarkdownTasks } from './parsers';
import { validateOpenSpecChangeWithCli } from './openspec-cli';
import { safeListRepoDirectory, safeReadRepoFile } from './repo-paths';

const execFileAsync = promisify(execFile);

export interface RepoEvidenceReaderDependencies {
  listOpenSpecChanges(repoPath: string): Promise<string[]>;
  currentBranch(repoPath: string): Promise<string>;
  mergedChanges(repoPath: string, candidates: string[]): Promise<string[]>;
  validateOpenSpecChange?(repoPath: string, changeId: string): Promise<OpenSpecValidationStatus>;
  now(): string;
}

export interface RepoEvidenceSnapshot {
  evidence: PipelineEvidence;
  selection: ChangeSelection;
}

function issue(code: string, message: string, sourceRef: string): PipelineDiagnostic {
  return { code, message, severity: 'warning', sourceRef };
}

/**
 * Cambios activos leídos del scaffold, sin subproceso.
 *
 * Antes esto invocaba `openspec list --json` con `execFile`. En Windows el CLI
 * se instala como `openspec.cmd`, que `execFile` no puede resolver (ENOENT), y
 * si se lo nombra con extensión Node lo rechaza por la mitigación de
 * CVE-2024-27980 (EINVAL) salvo que se habilite un shell. El resultado era que
 * el lector caía siempre en su `catch` y reportaba cero cambios activos, aunque
 * el scaffold existiera: los archivados aparecían —se leen del disco— y los
 * activos no.
 *
 * Leerlo del disco elimina la dependencia del PATH, del CLI instalado y de un
 * shell, y usa el mismo camino contenido que ya se usa para `archive`.
 */
export async function defaultListOpenSpecChanges(repoPath: string): Promise<string[]> {
  const entries = await safeListRepoDirectory(repoPath, 'openspec/changes');
  // `archive` es el contenedor de los cerrados, no un cambio.
  return entries.filter((entry) => entry !== 'archive');
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
  return validateOpenSpecChangeWithCli(repoPath, changeId);
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

  /**
   * Lee el `spec.md` de cada capacidad tocada por el cambio.
   *
   * Sólo corre para el cambio seleccionado, así que la cantidad de lecturas
   * está acotada por las capacidades de un único change. Una capacidad sin
   * `spec.md` conserva su nombre con contenido `null`: existe la carpeta y eso
   * es evidencia, aunque el archivo falte.
   */
  private async readDeltaSpecs(
    repoPath: string,
    changeRoot: string,
    capabilities: string[],
    diagnostics: PipelineDiagnostic[],
  ): Promise<OpenSpecDeltaSpec[]> {
    return Promise.all(capabilities.map(async (capability) => {
      const sourceRef = `${changeRoot}/specs/${capability}/spec.md`;
      const file = await safeReadRepoFile(repoPath, sourceRef);
      if (file.status !== 'missing') diagnostics.push(...file.diagnostics);
      return { capability, content: file.content, sourceRef };
    }));
  }

  async read(repoPath: string, repoId: string): Promise<RepoEvidenceSnapshot> {
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
        // El markdown ya está leído: hasta ahora se descartaba después de
        // extraer el intent. Se conserva sólo para el cambio seleccionado.
        artifacts: changeId === selection.changeId
          ? {
            proposal: proposalFile.content,
            design: designFile.content,
            tasks: taskFile.content,
            specs: await this.readDeltaSpecs(repoPath, changeRoot, deltaSpecs, diagnostics),
          }
          : null,
      });
    }

    const tasks = selection.changeId
      ? openSpecChanges.find((change) => change.changeId === selection.changeId)?.tasks ?? []
      : [];

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
