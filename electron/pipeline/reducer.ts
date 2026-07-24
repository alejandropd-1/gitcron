import { createHash } from 'node:crypto';
import type {
  PipelineEvidence, PipelineSemanticEvent, PipelineState, ReductionResult, SemanticEventKind,
} from '../../types/pipeline';

function eventId(repoId: string, kind: SemanticEventKind, subjectId: string): string {
  return createHash('sha256').update(`${repoId}\0${kind}\0${subjectId}`).digest('hex');
}

function event(evidence: PipelineEvidence, kind: SemanticEventKind, subjectId: string, refs: string[]): PipelineSemanticEvent {
  return { eventId: eventId(evidence.repoId, kind, subjectId), repoId: evidence.repoId, kind, observedAt: evidence.observedAt, subjectId, evidenceRefs: refs };
}

export function reducePipelineEvidence(evidence: PipelineEvidence, previous?: PipelineState): ReductionResult {
  const mergedEvidence: PipelineEvidence = previous ? {
    ...evidence,
    gates: [...previous.gates, ...evidence.gates].filter((item, index, all) => all.findIndex((candidate) => candidate.ts === item.ts && candidate.mode === item.mode && candidate.result === item.result) === index),
    delegations: [...previous.delegations, ...evidence.delegations].filter((item, index, all) => all.findIndex((candidate) => candidate.ts === item.ts && candidate.role === item.role && candidate.task === item.task) === index),
    visualDiffs: [...previous.visualDiffs, ...evidence.visualDiffs].filter((item, index, all) => all.findIndex((candidate) => candidate.runId === item.runId && candidate.ts === item.ts && candidate.route === item.route) === index),
  } : evidence;
  const events: PipelineSemanticEvent[] = [];
  if (previous) {
    const previousTasks = new Map(previous.tasks.map((task) => [task.id, task]));
    for (const task of evidence.tasks) {
      if (task.completed && previousTasks.get(task.id)?.completed === false) {
        events.push(event(evidence, 'task.completed', task.id, [`${task.sourceRef}#L${task.line}`]));
      }
    }
    const previousReports = new Set(previous.reports);
    evidence.reports.filter((report) => !previousReports.has(report)).forEach((report) => events.push(event(evidence, 'report.added', report, [report])));
    const oldGate = previous.gates.at(-1);
    const newGate = mergedEvidence.gates.at(-1);
    if (oldGate && newGate && (oldGate.result !== newGate.result || oldGate.mode !== newGate.mode)) {
      events.push(event(evidence, 'gate.changed', `${newGate.mode}:${newGate.ts}`, ['docs/ai/logs/gates.jsonl']));
    }
    const previousMerged = new Set(previous.mergedChanges);
    evidence.mergedChanges.filter((id) => !previousMerged.has(id)).forEach((id) => events.push(event(evidence, 'change.merged', id, ['git'])));
    const previousArchived = new Set(previous.archivedChanges);
    evidence.archivedChanges.filter((id) => !previousArchived.has(id)).forEach((id) => events.push(event(evidence, 'change.archived', id, ['openspec'])));
  }
  return { state: { ...mergedEvidence, revision: (previous?.revision ?? 0) + 1 }, events };
}
