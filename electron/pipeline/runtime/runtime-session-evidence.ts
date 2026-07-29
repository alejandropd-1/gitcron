import { simpleGit } from 'simple-git';
import type { OpenSpecValidationStatus } from '../../../types/pipeline';
import { validateOpenSpecChangeWithCli } from '../openspec-cli';

export interface RuntimeWorkingTreeEvidence {
  signature: string;
  filesChanged: number;
  additions: number | null;
  deletions: number | null;
}

export interface RuntimeSessionEvidenceCollector {
  captureWorkingTree(repoPath: string): Promise<RuntimeWorkingTreeEvidence>;
  validateChange(repoPath: string, changeId: string): Promise<OpenSpecValidationStatus>;
}

function numstatTotals(raw: string): { additions: number | null; deletions: number | null } {
  let additions = 0;
  let deletions = 0;
  let binary = false;
  for (const line of raw.split(/\r?\n/)) {
    if (!line) continue;
    const [added, deleted] = line.split('\t');
    if (added === '-' || deleted === '-') {
      binary = true;
      continue;
    }
    additions += Number.parseInt(added, 10) || 0;
    deletions += Number.parseInt(deleted, 10) || 0;
  }
  return binary ? { additions: null, deletions: null } : { additions, deletions };
}

export class DefaultRuntimeSessionEvidenceCollector implements RuntimeSessionEvidenceCollector {
  async captureWorkingTree(repoPath: string): Promise<RuntimeWorkingTreeEvidence> {
    const git = simpleGit(repoPath, { timeout: { block: 10_000 } });
    const [status, numstat] = await Promise.all([
      git.status(),
      git.raw(['diff', '--numstat', 'HEAD', '--']),
    ]);
    const signature = JSON.stringify(status.files
      .map((file) => [file.path, file.index, file.working_dir])
      .sort((left, right) => left[0].localeCompare(right[0])));
    return { signature, filesChanged: status.files.length, ...numstatTotals(numstat) };
  }

  async validateChange(repoPath: string, changeId: string): Promise<OpenSpecValidationStatus> {
    return validateOpenSpecChangeWithCli(repoPath, changeId);
  }
}
