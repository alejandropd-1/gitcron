import { StringDecoder } from 'node:string_decoder';

export type JsonlDiagnosticCode = 'invalid_json' | 'line_limit' | 'stream_limit' | 'event_limit';

export interface JsonlDiagnostic {
  code: JsonlDiagnosticCode;
  line: number;
  message: string;
}

export interface JsonlDecodeBatch {
  records: unknown[];
  diagnostics: JsonlDiagnostic[];
  stopped: boolean;
}

export interface BoundedJsonlDecoderOptions {
  maxLineBytes?: number;
  maxStreamBytes?: number;
  maxEvents?: number;
}

const DEFAULT_MAX_LINE_BYTES = 256 * 1024;
const DEFAULT_MAX_STREAM_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_EVENTS = 10_000;

export class BoundedJsonlDecoder {
  private readonly decoder = new StringDecoder('utf8');
  private readonly maxLineBytes: number;
  private readonly maxStreamBytes: number;
  private readonly maxEvents: number;
  private pending = '';
  private totalBytes = 0;
  private eventCount = 0;
  private line = 0;
  private stopped = false;

  constructor(options: BoundedJsonlDecoderOptions = {}) {
    this.maxLineBytes = options.maxLineBytes ?? DEFAULT_MAX_LINE_BYTES;
    this.maxStreamBytes = options.maxStreamBytes ?? DEFAULT_MAX_STREAM_BYTES;
    this.maxEvents = options.maxEvents ?? DEFAULT_MAX_EVENTS;
  }

  push(chunk: Uint8Array): JsonlDecodeBatch {
    if (this.stopped) return { records: [], diagnostics: [], stopped: true };
    this.totalBytes += chunk.byteLength;
    if (this.totalBytes > this.maxStreamBytes) {
      this.stopped = true;
      return {
        records: [],
        diagnostics: [{ code: 'stream_limit', line: this.line + 1, message: 'JSONL stream exceeded byte limit' }],
        stopped: true,
      };
    }
    this.pending += this.decoder.write(Buffer.from(chunk));
    return this.drain(false);
  }

  finish(): JsonlDecodeBatch {
    if (this.stopped) return { records: [], diagnostics: [], stopped: true };
    this.pending += this.decoder.end();
    return this.drain(true);
  }

  private drain(flush: boolean): JsonlDecodeBatch {
    const records: unknown[] = [];
    const diagnostics: JsonlDiagnostic[] = [];
    const parts = this.pending.split('\n');
    this.pending = flush ? '' : parts.pop() ?? '';
    if (flush && parts.length === 1 && parts[0] === '') parts.pop();

    for (const part of parts) {
      this.line += 1;
      const value = part.endsWith('\r') ? part.slice(0, -1) : part;
      if (!value.trim()) continue;
      if (Buffer.byteLength(value, 'utf8') > this.maxLineBytes) {
        diagnostics.push({ code: 'line_limit', line: this.line, message: 'JSONL line exceeded byte limit' });
        continue;
      }
      if (this.eventCount >= this.maxEvents) {
        this.stopped = true;
        diagnostics.push({ code: 'event_limit', line: this.line, message: 'JSONL stream exceeded event limit' });
        break;
      }
      try {
        records.push(JSON.parse(value));
        this.eventCount += 1;
      } catch {
        diagnostics.push({ code: 'invalid_json', line: this.line, message: 'Invalid JSONL record' });
      }
    }

    if (!flush && Buffer.byteLength(this.pending, 'utf8') > this.maxLineBytes) {
      this.pending = '';
      this.line += 1;
      diagnostics.push({ code: 'line_limit', line: this.line, message: 'JSONL partial line exceeded byte limit' });
    }
    return { records, diagnostics, stopped: this.stopped };
  }
}
