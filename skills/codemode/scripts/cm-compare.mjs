#!/usr/bin/env node
// Compares Claude Code sessions by name (the -n / --name you started them with).
// Reads transcripts under $CLAUDE_CONFIG_DIR/projects (default ~/.claude/projects).
// Usage: node cm-compare.mjs cm-1-off cm-1-on [more names] [--days 30]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export function summarize(lines) {
  const calls = new Map(); // message.id -> { usage, text, ts }, last line wins
  let first = null, last = null, repl = 0;
  for (const line of lines) {
    let j; try { j = JSON.parse(line); } catch { continue; }
    if (j.isSidechain || !j.timestamp || !['user', 'assistant'].includes(j.type)) continue;
    first ??= j.timestamp;
    if (j.type !== 'assistant' || !j.message?.usage) continue;
    last = j.timestamp;
    const id = j.message.id || j.requestId || j.uuid;
    const c = calls.get(id) || { text: '' };
    c.usage = j.message.usage;
    for (const b of j.message.content || []) {
      if (b.type === 'text') c.text += b.text;
      if (b.type === 'tool_use' && b.name === 'REPL') repl++;
    }
    calls.set(id, c);
  }
  const list = [...calls.values()];
  const inputOf = (u) => (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
  const sum = (arr, f) => arr.reduce((n, c) => n + f(c.usage), 0);
  return {
    calls: list.length,
    newInput: sum(list, (u) => u.input_tokens || 0),
    cacheWrite: sum(list, (u) => u.cache_creation_input_tokens || 0),
    cacheRead: sum(list, (u) => u.cache_read_input_tokens || 0),
    totalInput: sum(list, inputOf),
    totalInputAfterFirst: sum(list.slice(1), inputOf),
    output: sum(list, (u) => u.output_tokens || 0),
    seconds: first && last ? Math.round((Date.parse(last) - Date.parse(first)) / 1000) : 0,
    replCalls: repl,
    answer: [...list].reverse().find((c) => c.text.trim())?.text.trim() || '',
  };
}

function findSessions(names, days) {
  const root = join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'projects');
  const since = Date.now() - days * 864e5; // shortcut: scans only recent transcripts, raise --days for older runs
  const found = new Map(); // name -> { file, mtime }
  for (const dir of readdirSync(root, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const f of readdirSync(join(root, dir.name))) {
      if (!f.endsWith('.jsonl')) continue;
      const file = join(root, dir.name, f);
      const { mtimeMs } = statSync(file);
      if (mtimeMs < since) continue;
      const text = readFileSync(file, 'utf8');
      if (!text.includes('"custom-title"')) continue;
      let title = null; // the last rename wins
      for (const line of text.split('\n')) {
        if (!line.includes('"custom-title"')) continue;
        try { title = JSON.parse(line).customTitle ?? title; } catch {}
      }
      if (names.includes(title) && (!found.has(title) || found.get(title).mtime < mtimeMs)) found.set(title, { file, mtime: mtimeMs });
    }
  }
  return found;
}

function main(argv) {
  const di = argv.indexOf('--days');
  const days = di >= 0 ? Number(argv[di + 1]) : 30;
  const names = di >= 0 ? [...argv.slice(0, di), ...argv.slice(di + 2)] : argv;
  if (!names.length || !(days > 0)) {
    console.error('Usage: node cm-compare.mjs <session-name> [<session-name> ...] [--days 30]');
    process.exit(2);
  }
  const found = findSessions(names, days);
  const fmt = (n) => n.toLocaleString('en-US');
  console.log('| run | Code Mode (REPL calls) | model calls | new input | cache write | cache read | total input | total input after 1st call | output | time (s) |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  const answers = [];
  for (const name of names) {
    const hit = found.get(name);
    if (!hit) { console.log(`| ${name} | not found in the last ${days} days | | | | | | | | |`); continue; }
    const s = summarize(readFileSync(hit.file, 'utf8').split('\n'));
    console.log(`| ${name} | ${s.replCalls ? `yes (${s.replCalls})` : 'no'} | ${s.calls} | ${fmt(s.newInput)} | ${fmt(s.cacheWrite)} | ${fmt(s.cacheRead)} | ${fmt(s.totalInput)} | ${fmt(s.totalInputAfterFirst)} | ${fmt(s.output)} | ${s.seconds} |`);
    answers.push(`### ${name}\n${hit.file}\n\n${s.answer.slice(0, 1500)}${s.answer.length > 1500 ? '\n[...cut]' : ''}`);
  }
  console.log('\nTotal input = new input + cache write + cache read. One run each is a hint, not a benchmark.\n');
  console.log(answers.join('\n\n'));
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) main(process.argv.slice(2));
