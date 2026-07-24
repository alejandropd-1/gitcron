import { describe, expect, it } from 'vitest';
import { BoundedJsonlDecoder } from '../pipeline/runtime-adapters';

describe('BoundedJsonlDecoder', () => {
  it('decodes split JSONL and preserves split UTF-8', () => {
    const bytes = Buffer.from('{"text":"acción"}\n{"value":2}\n', 'utf8');
    const splitInsideAccentedCharacter = bytes.indexOf(Buffer.from('ó')) + 1;
    const decoder = new BoundedJsonlDecoder();
    expect(decoder.push(bytes.subarray(0, splitInsideAccentedCharacter)).records).toEqual([]);
    expect(decoder.push(bytes.subarray(splitInsideAccentedCharacter))).toMatchObject({
      records: [{ text: 'acción' }, { value: 2 }],
      diagnostics: [],
      stopped: false,
    });
  });

  it('flushes a valid final line without newline', () => {
    const decoder = new BoundedJsonlDecoder();
    decoder.push(Buffer.from('{"final":true}'));
    expect(decoder.finish().records).toEqual([{ final: true }]);
  });

  it('continues after an isolated invalid line', () => {
    const decoder = new BoundedJsonlDecoder();
    const batch = decoder.push(Buffer.from('{"one":1}\ninvalid\n{"two":2}\n'));
    expect(batch.records).toEqual([{ one: 1 }, { two: 2 }]);
    expect(batch.diagnostics).toEqual([{ code: 'invalid_json', line: 2, message: 'Invalid JSONL record' }]);
  });

  it('stops when total stream bytes exceed the limit', () => {
    const decoder = new BoundedJsonlDecoder({ maxStreamBytes: 8 });
    expect(decoder.push(Buffer.from('{"value":1}\n'))).toMatchObject({
      records: [],
      diagnostics: [{ code: 'stream_limit' }],
      stopped: true,
    });
  });

  it('diagnoses oversized lines and event limits', () => {
    const lineDecoder = new BoundedJsonlDecoder({ maxLineBytes: 4 });
    expect(lineDecoder.push(Buffer.from('{"long":true}\n')).diagnostics[0]?.code).toBe('line_limit');

    const eventDecoder = new BoundedJsonlDecoder({ maxEvents: 1 });
    const batch = eventDecoder.push(Buffer.from('{"one":1}\n{"two":2}\n'));
    expect(batch.records).toEqual([{ one: 1 }]);
    expect(batch.diagnostics[0]?.code).toBe('event_limit');
    expect(batch.stopped).toBe(true);
  });
});
