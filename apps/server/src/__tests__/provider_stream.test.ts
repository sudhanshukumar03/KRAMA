import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { streamWithFallback } from '../lib/providerStream';

describe('Brain text stream provider recovery', () => {
  it('bounds a provider that ignores cancellation and falls back before emitting text', async () => {
    let calls = 0; let abandonedSignal: AbortSignal | undefined;
    const chunks: string[] = [];
    for await (const text of streamWithFallback([
      async signal => { calls++; abandonedSignal = signal; return new Promise<AsyncIterable<string>>(() => {}); },
      async () => (async function* () { yield 'Fallback answer'; })(),
    ], new AbortController().signal, 20)) chunks.push(text);
    assert.equal(calls, 1); assert.equal(abandonedSignal?.aborted, true);
    assert.equal(chunks.join(''), 'Fallback answer');
  });
  it('ends a stalled partial answer without appending a different provider', async () => {
    const chunks: string[] = []; let fallbackCalled = false;
    await assert.rejects(async () => {
      for await (const text of streamWithFallback([
        async () => (async function* () { yield 'Partial'; await new Promise(() => {}); })(),
        async () => { fallbackCalled = true; return (async function* () { yield 'Other'; })(); },
      ], new AbortController().signal, 20)) chunks.push(text);
    }, /timed out/);
    assert.deepEqual(chunks, ['Partial']); assert.equal(fallbackCalled, false);
  });
  it('cancels a provider immediately while it is awaiting its first answer', async () => {
    const controller = new AbortController();
    await assert.rejects(async () => {
      for await (const _text of streamWithFallback([async () => {
        controller.abort(); return new Promise<AsyncIterable<string>>(() => {});
      }], controller.signal, 10000)) {}
    }, /cancelled/);
  });
  it('retries a temporary overload once before emitting text', async () => {
    let calls = 0; const text: string[] = [];
    for await (const chunk of streamWithFallback([async () => {
      if (++calls === 1) throw { code: 503 };
      return (async function* () { yield 'Recovered'; })();
    }], new AbortController().signal)) text.push(chunk);
    assert.equal(calls, 2); assert.deepEqual(text, ['Recovered']);
  });
  it('falls back after an invalid primary key before emitting text', async () => {
    const result: string[] = [];
    for await (const text of streamWithFallback([
      async () => { throw { status: 401 }; },
      async () => (async function* () { yield 'Verified '; yield 'answer'; })(),
    ], new AbortController().signal)) result.push(text);
    assert.equal(result.join(''), 'Verified answer');
  });
  it('does not splice a fallback answer into a partially delivered response', async () => {
    let fallbackCalled = false; const chunks: string[] = [];
    await assert.rejects(async () => {
      for await (const text of streamWithFallback([
        async () => (async function* () { yield 'Partial'; throw new Error('Disconnected'); })(),
        async () => { fallbackCalled = true; return (async function* () { yield 'Different answer'; })(); },
      ], new AbortController().signal)) chunks.push(text);
    }, /Disconnected/);
    assert.deepEqual(chunks, ['Partial']); assert.equal(fallbackCalled, false);
  });
  it('does not contact providers after cancellation', async () => {
    const controller = new AbortController(); controller.abort(); let called = false;
    await assert.rejects(async () => {
      for await (const _text of streamWithFallback([async () => { called = true; return (async function* () { yield 'Text'; })(); }], controller.signal)) {}
    }, /cancelled/);
    assert.equal(called, false);
  });
});
