import { createHash } from 'node:crypto';
import type {
  AuditEvidence, ControlEvaluation, DelegationRecord, GateRecord, JsonlCursor,
  ParsedJsonl, PipelineDiagnostic, TaskEvidence, VisualDiffRecord,
} from '../../types/pipeline';

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : null;
}

function string(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function boolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function stableId(sourceRef: string, line: number, text: string): string {
  return createHash('sha256').update(`${sourceRef}\0${line}\0${text}`).digest('hex').slice(0, 20);
}

export function parseMarkdownTasks(markdown: string, sourceRef: string): TaskEvidence[] {
  const tasks: TaskEvidence[] = [];
  let fenced = false;
  for (const [index, line] of markdown.split(/\r?\n/).entries()) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const match = /^\s*[-*+]\s+\[([ xX])\]\s+(.+?)\s*$/.exec(line);
    if (!match) continue;
    const text = match[2];
    tasks.push({
      id: stableId(sourceRef, index + 1, text),
      text,
      completed: match[1].toLowerCase() === 'x',
      line: index + 1,
      sourceRef,
    });
  }
  return tasks;
}

export function parseAudit(markdown: string, sourceRef: string): AuditEvidence {
  const verdictMatch = /(?:^|\n)\s*(?:#+\s*)?(?:\*\*)?(?:veredicto\s*:\s*)?(APROBADO|RECHAZADO)(?:\*\*)?\s*(?:\n|$)/i.exec(markdown);
  const rawVerdict = verdictMatch?.[1]?.toUpperCase();
  const findings = markdown.split(/\r?\n/)
    .map((line) => /^\s*[-*]\s+(?:\[[ xX]\]\s+)?(.+)$/.exec(line)?.[1]?.trim())
    .filter((value): value is string => Boolean(value));
  return {
    verdict: rawVerdict === 'APROBADO' ? 'approved' : rawVerdict === 'RECHAZADO' ? 'rejected' : 'unknown',
    findings,
    sourceRef,
    confidence: rawVerdict ? 'confirmed' : 'unknown',
  };
}

export function parseJsonlChunk<T = JsonObject>(
  chunk: string,
  previous: JsonlCursor,
  sourceRef: string,
  options: { startOffset: number; generation: string | null },
): ParsedJsonl<T> {
  const reset = options.startOffset < previous.offset || (
    previous.generation !== null && options.generation !== null && previous.generation !== options.generation
  );
  const base = reset ? '' : previous.pending;
  const text = base + chunk;
  const complete = text.endsWith('\n');
  const lines = text.split(/\r?\n/);
  const pending = complete ? '' : (lines.pop() ?? '');
  if (complete) lines.pop();
  const records: T[] = [];
  const diagnostics: PipelineDiagnostic[] = [];
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    try {
      records.push(JSON.parse(line) as T);
    } catch {
      diagnostics.push({
        code: 'jsonl.invalid-line',
        message: 'Línea JSONL inválida; se conservaron las líneas posteriores.',
        severity: 'warning',
        sourceRef,
        line: index + 1,
      });
    }
  });
  if (reset) diagnostics.unshift({
    code: 'jsonl.cursor-reset',
    message: 'El archivo fue truncado o reemplazado; el cursor se reinició.',
    severity: 'warning',
    sourceRef,
  });
  return {
    records,
    diagnostics,
    reset,
    cursor: {
      offset: options.startOffset + Buffer.byteLength(chunk),
      pending,
      generation: options.generation,
    },
  };
}

export function normalizeGate(value: unknown): GateRecord | null {
  const row = object(value);
  const ts = string(row?.ts);
  const mode = string(row?.mode);
  const result = string(row?.result);
  return ts && mode && (result === 'VERDE' || result === 'ROJO' || result === 'PENDIENTE')
    ? { ts, mode, result }
    : null;
}

export function normalizeDelegation(value: unknown): DelegationRecord | null {
  const row = object(value);
  const ts = string(row?.ts);
  const role = string(row?.rol ?? row?.role);
  const model = string(row?.modelo ?? row?.model);
  const task = string(row?.tarea ?? row?.task);
  if (!ts || !role || !model || !task) return null;
  return {
    ts, role, model, task,
    result: string(row?.resultado ?? row?.result),
    tokensIn: number(row?.tokens_in ?? row?.tokensIn),
    tokensOut: number(row?.tokens_out ?? row?.tokensOut),
    costUsd: number(row?.costo_usd ?? row?.costUsd),
    durationMs: number(row?.duracion_ms ?? row?.durationMs),
    retries: number(row?.reintentos ?? row?.retries),
    humanWaitMs: number(row?.espera_humana_ms ?? row?.humanWaitMs),
    humanTouches: number(row?.toques_humanos ?? row?.humanTouches),
  };
}

export function normalizeVisualDiff(value: unknown): VisualDiffRecord | null {
  const row = object(value);
  const runId = string(row?.run_id ?? row?.runId);
  const ts = string(row?.ts);
  const route = string(row?.route);
  if (!runId || !ts || !route) return null;
  const rawMeasurements = Object.fromEntries(Object.entries(row ?? {}).filter(([, item]) => number(item) !== null)) as Record<string, number>;
  return { runId, ts, route, viewport: row?.viewport ?? null, excepted: boolean(row?.excepted), rawMeasurements };
}

export function normalizeControlEvaluation(value: unknown): ControlEvaluation {
  const row = object(value);
  return {
    triggered: boolean(row?.triggered),
    issueCaught: boolean(row?.issueCaught),
    acceptedFinding: boolean(row?.acceptedFinding),
    falsePositive: boolean(row?.falsePositive),
    humanWaitMs: number(row?.humanWaitMs),
    humanTouches: number(row?.humanTouches),
    retries: number(row?.retries),
    cycleTimeMs: number(row?.cycleTimeMs),
  };
}
