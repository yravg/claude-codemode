import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from '../skills/codemode/scripts/cm-compare.mjs';

const usage = (i, cw, cr, o) => ({ input_tokens: i, cache_creation_input_tokens: cw, cache_read_input_tokens: cr, output_tokens: o });
const lines = [
  { type: 'custom-title', customTitle: 'cm-1-on' },
  { type: 'user', timestamp: '2026-11-21T00:00:00Z', message: { content: 'go' } },
  // one model call split over two lines (same message.id): counted once
  { type: 'assistant', timestamp: '2026-11-21T00:00:05Z', message: { id: 'm1', usage: usage(10, 100, 1000, 5), content: [{ type: 'tool_use', name: 'REPL' }] } },
  { type: 'assistant', timestamp: '2026-11-21T00:00:06Z', message: { id: 'm1', usage: usage(10, 100, 1000, 7), content: [{ type: 'text', text: 'thinking out loud' }] } },
  { type: 'assistant', isSidechain: true, timestamp: '2026-11-21T00:00:07Z', message: { id: 's1', usage: usage(999, 0, 0, 999), content: [] } },
  { type: 'assistant', timestamp: '2026-11-21T00:00:20Z', message: { id: 'm2', usage: usage(1, 20, 1100, 30), content: [{ type: 'text', text: 'final answer' }] } },
].map((o) => JSON.stringify(o));

test('summarize dedupes calls, skips sidechains, counts REPL', () => {
  const s = summarize([...lines, 'not json', '']);
  assert.equal(s.calls, 2);
  assert.equal(s.totalInput, 10 + 100 + 1000 + 1 + 20 + 1100);
  assert.equal(s.totalInputAfterFirst, 1121);
  assert.equal(s.output, 7 + 30);
  assert.equal(s.replCalls, 1);
  assert.equal(s.seconds, 20);
  assert.equal(s.answer, 'final answer');
});
