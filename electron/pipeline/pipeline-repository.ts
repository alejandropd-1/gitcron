import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { PipelineSemanticEvent, PipelineState } from '../../types/pipeline';
import type { JsonlCursor } from '../../types/pipeline';
import { stringifyPipelineValue } from './persistence-sanitizer';

export interface PipelineRepoBinding {
  repoId: string;
  canonicalPath: string;
  gitCommonDirDigest: string;
}

type BindingRow = { repo_id: string; canonical_path: string; git_common_dir_digest: string };
type SnapshotRow = { sequence: number; state_json: string; captured_at: string };

export class PipelineRepository {
  constructor(private readonly db: DatabaseSync, private readonly now: () => string = () => new Date().toISOString()) {}

  getOrCreateBinding(canonicalPath: string, gitCommonDirDigest: string): PipelineRepoBinding {
    const existing = this.db.prepare('SELECT repo_id, canonical_path, git_common_dir_digest FROM pipeline_repo WHERE canonical_path = ?').get(canonicalPath) as BindingRow | undefined;
    if (existing) {
      if (existing.git_common_dir_digest !== gitCommonDirDigest) {
        this.db.prepare('UPDATE pipeline_repo SET git_common_dir_digest = ?, updated_at = ? WHERE repo_id = ?').run(gitCommonDirDigest, this.now(), existing.repo_id);
      }
      return { repoId: existing.repo_id, canonicalPath: existing.canonical_path, gitCommonDirDigest };
    }
    const repoId = randomUUID();
    const timestamp = this.now();
    this.db.prepare(`INSERT INTO pipeline_repo (repo_id, canonical_path, git_common_dir_digest, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
      .run(repoId, canonicalPath, gitCommonDirDigest, timestamp, timestamp);
    return { repoId, canonicalPath, gitCommonDirDigest };
  }

  persist(binding: PipelineRepoBinding, state: PipelineState, events: PipelineSemanticEvent[]): { sequence: number; insertedEvents: number } {
    this.db.exec('BEGIN');
    try {
      const row = this.db.prepare('SELECT COALESCE(MAX(sequence), 0) AS sequence FROM pipeline_event WHERE repo_id = ?').get(binding.repoId) as { sequence: number };
      let sequence = Number(row.sequence);
      let insertedEvents = 0;
      const exists = this.db.prepare('SELECT 1 AS found FROM pipeline_event WHERE repo_id = ? AND event_id = ?');
      const insert = this.db.prepare(`INSERT INTO pipeline_event (repo_id, event_id, sequence, kind, observed_at, payload_json) VALUES (?, ?, ?, ?, ?, ?)`);
      for (const event of events) {
        if (exists.get(binding.repoId, event.eventId)) continue;
        sequence += 1;
        insert.run(binding.repoId, event.eventId, sequence, event.kind, event.observedAt, stringifyPipelineValue(event));
        insertedEvents += 1;
      }
      this.db.prepare(`
        INSERT INTO pipeline_snapshot (repo_id, sequence, state_json, captured_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(repo_id) DO UPDATE SET sequence = excluded.sequence, state_json = excluded.state_json, captured_at = excluded.captured_at
      `).run(binding.repoId, sequence, stringifyPipelineValue(state), state.observedAt);
      this.db.prepare('UPDATE pipeline_repo SET updated_at = ? WHERE repo_id = ?').run(this.now(), binding.repoId);
      this.db.exec('COMMIT');
      return { sequence, insertedEvents };
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  loadSnapshot(repoId: string): { sequence: number; state: PipelineState; capturedAt: string } | null {
    const row = this.db.prepare('SELECT sequence, state_json, captured_at FROM pipeline_snapshot WHERE repo_id = ?').get(repoId) as SnapshotRow | undefined;
    return row ? { sequence: row.sequence, state: JSON.parse(row.state_json) as PipelineState, capturedAt: row.captured_at } : null;
  }

  eventCount(repoId: string): number {
    const row = this.db.prepare('SELECT COUNT(*) AS count FROM pipeline_event WHERE repo_id = ?').get(repoId) as { count: number };
    return Number(row.count);
  }

  loadCursor(repoId: string, sourceRef: string): JsonlCursor {
    const row = this.db.prepare('SELECT offset, pending, generation FROM pipeline_cursor WHERE repo_id = ? AND source_ref = ?').get(repoId, sourceRef) as { offset: number; pending: string; generation: string | null } | undefined;
    return row ?? { offset: 0, pending: '', generation: null };
  }

  saveCursor(repoId: string, sourceRef: string, cursor: JsonlCursor): void {
    this.db.prepare(`
      INSERT INTO pipeline_cursor (repo_id, source_ref, offset, pending, generation, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(repo_id, source_ref) DO UPDATE SET offset = excluded.offset, pending = excluded.pending, generation = excluded.generation, updated_at = excluded.updated_at
    `).run(repoId, sourceRef, cursor.offset, cursor.pending, cursor.generation, this.now());
  }
}
