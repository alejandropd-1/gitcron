import { createHash } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { app } from 'electron';
import { simpleGit } from 'simple-git';
import type { PipelineState } from '../../types/pipeline';
import { getDatabase } from '../db/connection';
import { PipelineRepository } from './pipeline-repository';
import { reducePipelineEvidence } from './reducer';
import { RepoEvidenceReader } from './repo-evidence-reader';

function digest(value: string): string {
  return createHash('sha256').update(process.platform === 'win32' ? value.toLowerCase() : value).digest('hex');
}

export class PipelineService {
  constructor(private readonly reader = new RepoEvidenceReader()) {}

  async refresh(repoPath: string): Promise<PipelineState> {
    const canonicalPath = await fs.realpath(repoPath);
    const gitCommonDirRaw = (await simpleGit(canonicalPath, { timeout: { block: 10_000 } }).raw(['rev-parse', '--git-common-dir'])).trim();
    const gitCommonDir = path.resolve(canonicalPath, gitCommonDirRaw);
    const repository = new PipelineRepository(getDatabase(app.getPath('userData')));
    const binding = repository.getOrCreateBinding(canonicalPath, digest(gitCommonDir));
    const previous = repository.loadSnapshot(binding.repoId)?.state;
    const { evidence } = await this.reader.read(canonicalPath, binding.repoId, repository);
    const reduction = reducePipelineEvidence(evidence, previous);
    repository.persist(binding, reduction.state, reduction.events);
    return reduction.state;
  }
}
