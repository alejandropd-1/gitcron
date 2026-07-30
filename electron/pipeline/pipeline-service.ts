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

/** Identidad canónica de un repo, tal como la ve el store per-repo de F01. */
export interface PipelineRepoBinding {
  repoId: string;
  canonicalPath: string;
}

export class PipelineService {
  constructor(private readonly reader = new RepoEvidenceReader()) {}

  /**
   * Resuelve `repoId` y ruta canónica sin leer evidencia.
   *
   * Lo necesita el hub de runtime: una sesión tiene que nacer con el mismo
   * `repoId` que usa la evidencia del repo, o las dos fuentes hablarían de
   * repositorios distintos y el merge del adaptador sería inválido.
   */
  async resolveBinding(repoPath: string): Promise<PipelineRepoBinding> {
    const canonicalPath = await fs.realpath(repoPath);
    const gitCommonDirRaw = (await simpleGit(canonicalPath, { timeout: { block: 10_000 } }).raw(['rev-parse', '--git-common-dir'])).trim();
    const gitCommonDir = path.resolve(canonicalPath, gitCommonDirRaw);
    const repository = new PipelineRepository(getDatabase(app.getPath('userData')));
    const binding = repository.getOrCreateBinding(canonicalPath, digest(gitCommonDir));
    return { repoId: binding.repoId, canonicalPath };
  }

  async refresh(repoPath: string, selectedChangeId?: string | null): Promise<PipelineState> {
    const canonicalPath = await fs.realpath(repoPath);
    const gitCommonDirRaw = (await simpleGit(canonicalPath, { timeout: { block: 10_000 } }).raw(['rev-parse', '--git-common-dir'])).trim();
    const gitCommonDir = path.resolve(canonicalPath, gitCommonDirRaw);
    const repository = new PipelineRepository(getDatabase(app.getPath('userData')));
    const binding = repository.getOrCreateBinding(canonicalPath, digest(gitCommonDir));
    const previous = repository.loadSnapshot(binding.repoId)?.state;
    const { evidence } = await this.reader.read(canonicalPath, binding.repoId, selectedChangeId);
    const reduction = reducePipelineEvidence(evidence, previous);
    repository.persist(binding, reduction.state, reduction.events);
    return reduction.state;
  }
}
