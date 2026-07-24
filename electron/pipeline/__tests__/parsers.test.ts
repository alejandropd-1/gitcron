import { describe, expect, it } from 'vitest';
import {
  normalizeControlEvaluation, normalizeDelegation, normalizeGate, normalizeVisualDiff,
  parseAudit, parseJsonlChunk, parseMarkdownTasks,
} from '../parsers';

describe('Pipeline pure parsers', () => {
  it('parses only real markdown task markers outside fences', () => {
    const tasks = parseMarkdownTasks('- [x] done\ntext [x]\n```\n- [x] sample\n```\n- [ ] open', 'tasks.md');
    expect(tasks.map(({ completed, text, line }) => ({ completed, text, line }))).toEqual([
      { completed: true, text: 'done', line: 1 },
      { completed: false, text: 'open', line: 6 },
    ]);
  });

  it('extracts an explicit audit verdict and findings', () => {
    const audit = parseAudit('## Veredicto: RECHAZADO\n\n- path traversal\n- unknown as zero', 'audit.md');
    expect(audit).toMatchObject({ verdict: 'rejected', confidence: 'confirmed' });
    expect(audit.findings).toEqual(['path traversal', 'unknown as zero']);
  });

  it('keeps a partial last line and continues after isolated corruption', () => {
    const first = parseJsonlChunk('{"n":1}\ninvalid\n{"n":', { offset: 0, pending: '', generation: null }, 'events.jsonl', { startOffset: 0, generation: 'a' });
    expect(first.records).toEqual([{ n: 1 }]);
    expect(first.cursor.pending).toBe('{"n":');
    expect(first.diagnostics).toHaveLength(1);
    const second = parseJsonlChunk('2}\n', first.cursor, 'events.jsonl', { startOffset: first.cursor.offset, generation: 'a' });
    expect(second.records).toEqual([{ n: 2 }]);
  });

  it('reports truncation and resets pending content', () => {
    const result = parseJsonlChunk('{"n":3}\n', { offset: 100, pending: '{"old":', generation: 'a' }, 'events.jsonl', { startOffset: 0, generation: 'a' });
    expect(result.reset).toBe(true);
    expect(result.records).toEqual([{ n: 3 }]);
    expect(result.diagnostics[0].code).toBe('jsonl.cursor-reset');
  });

  it('resets when the producer file generation changes without shrinking', () => {
    const result = parseJsonlChunk('{"n":4}\n', { offset: 0, pending: '', generation: 'old' }, 'events.jsonl', { startOffset: 0, generation: 'new' });
    expect(result.reset).toBe(true);
    expect(result.records).toEqual([{ n: 4 }]);
  });

  it('normalizes known producer shapes and preserves unknown metrics as null', () => {
    expect(normalizeGate({ ts: 't', mode: 'fast', result: 'VERDE' })).toEqual({ ts: 't', mode: 'fast', result: 'VERDE' });
    expect(normalizeDelegation({ ts: 't', rol: 'builder', modelo: 'm', tarea: 'x' })).toMatchObject({ retries: null, humanWaitMs: null, humanTouches: null });
    expect(normalizeVisualDiff({ run_id: 'r', ts: 't', route: '/', delta_height: 2 })).toMatchObject({ runId: 'r', excepted: null, rawMeasurements: { delta_height: 2 } });
    expect(normalizeControlEvaluation({ triggered: true })).toEqual({
      triggered: true, issueCaught: null, acceptedFinding: null, falsePositive: null,
      humanWaitMs: null, humanTouches: null, retries: null, cycleTimeMs: null,
    });
  });
});
