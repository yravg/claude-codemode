#!/usr/bin/env node
// Checks whether this machine can start Claude Code in Code Mode.
// Prints setting NAMES only, never their values (keys and tokens stay hidden).
// Usage: node cm-doctor.mjs        exit 0 = nothing to fix, 1 = something to fix
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';

const MIN = '2.1.323';
const MIN_TEAMS = '2.1.326';
const win = platform() === 'win32';
let fixes = 0;
const ok = (m) => console.log(`OK    ${m}`);
const fix = (m) => { fixes++; console.log(`FIX   ${m}`); };
const info = (m) => console.log(`INFO  ${m}`);

const readJson = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };
const run = (cmd, args) => {
  try { return execFileSync(cmd, args, { encoding: 'utf8', shell: win, stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return null; }
};
const newer = (a, b) => { // a >= b for x.y.z
  const [x, y] = [a, b].map((v) => v.split('.').map(Number));
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return true;
};

const configDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
const managed = win ? 'C:\\Program Files\\ClaudeCode\\managed-settings.json'
  : platform() === 'darwin' ? '/Library/Application Support/ClaudeCode/managed-settings.json'
  : '/etc/claude-code/managed-settings.json';
const sources = [
  ['user settings', join(configDir, 'settings.json')],
  ['user local settings', join(configDir, 'settings.local.json')],
  ['project settings', join(process.cwd(), '.claude', 'settings.json')],
  ['project local settings', join(process.cwd(), '.claude', 'settings.local.json')],
  ['managed settings', managed],
].map(([name, path]) => [name, readJson(path)]).filter(([, s]) => s);
const envSources = [['shell', process.env], ...sources.map(([n, s]) => [n, s.env || {}])];
const where = (key) => envSources.filter(([, e]) => e[key] !== undefined && e[key] !== '').map(([n]) => n);
const truthyWhere = (key) => envSources.filter(([, e]) => e[key] && !/^(0|false)$/i.test(String(e[key]))).map(([n]) => n);

// 1. version
const out = run('claude', ['--version']);
const version = out && out.match(/\d+\.\d+\.\d+/)?.[0];
if (!version) fix('`claude` not found on PATH. Install Claude Code, then run this again.');
else if (!newer(version, MIN)) fix(`Claude Code ${version} is older than ${MIN}. Run: claude update`);
else ok(`Claude Code ${version} (needs ${MIN}+)`);
if (version && truthyWhere('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS').length && !newer(version, MIN_TEAMS))
  fix(`Agent teams are on and need ${MIN_TEAMS}+ with Code Mode. Run: claude update, or turn agent teams off.`);

// 2. Git for Windows
if (win) run('git', ['--version']) ? ok('Git for Windows found') : fix('Install Git for Windows (Code Mode needs it on Windows).');

// 3. settings that block Code Mode (names only)
const blockers = [
  ['ANTHROPIC_BASE_URL', 'sends requests through a gateway or proxy'],
  ['CLAUDE_CODE_USE_BEDROCK', 'uses Amazon Bedrock'],
  ['CLAUDE_CODE_USE_VERTEX', 'uses Google Cloud'],
  ['CLAUDE_CODE_USE_FOUNDRY', 'uses Microsoft Foundry'],
  ['ANTHROPIC_AUTH_TOKEN', 'counts as an auth helper'],
  ['ANTHROPIC_CUSTOM_HEADERS', 'may carry an auth header'],
  ['CLAUDE_CODE_ENABLE_TELEMETRY', 'turns on OpenTelemetry'],
  ['ENABLE_BETA_TRACING_DETAILED', 'turns on OpenTelemetry tracing'],
  ['DISABLE_TELEMETRY', 'stops the settings download Code Mode needs'],
];
let blocked = false;
for (const [key, why] of blockers) {
  const found = key.startsWith('CLAUDE_CODE_USE_') || key.includes('TELEMETRY') || key.includes('TRACING') ? truthyWhere(key) : where(key);
  if (found.length) { blocked = true; fix(`${key} is set in ${found.join(', ')}: it ${why}. Unset it for Code Mode sessions.`); }
}
const helper = sources.filter(([, s]) => s.apiKeyHelper).map(([n]) => n);
if (helper.length) { blocked = true; fix(`apiKeyHelper is set in ${helper.join(', ')}. Code Mode does not work with an API key helper.`); }
const zero = envSources.filter(([, e]) => String(e.CLAUDE_CODE_EXPERIMENTAL_CODE_MODE) === '0').map(([n]) => n);
if (zero.length) { blocked = true; fix(`CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=0 in ${zero.join(', ')}. A 0 anywhere beats a 1; remove it${zero.includes('managed settings') ? ' (managed settings: ask your admin)' : ''}.`); }
if (!blocked) ok('No env or settings blocker found');

// 4. things only the start line can tell
const model = sources.find(([, s]) => s.model)?.[1].model;
info(`Default model: ${model || '(not set)'}. Supported: Opus 5.5, Sonnet 5.5, Haiku 5.5, Fable 5.2 (switch with /model).`);
info('Plugins or mods that check tool calls can still block it. The start line names the one to turn off (/plugin).');
info('Code Mode runs only in an interactive terminal (also an Orca terminal). Not in -p, the desktop app, VS Code or cloud.');

// 5. how to start
console.log('');
console.log('Start one Code Mode session:');
console.log(win ? '  PowerShell: $env:CLAUDE_CODE_EXPERIMENTAL_CODE_MODE = "1"; claude' : '  CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=1 claude');
console.log('  or after the shortcut is installed: claude-cm');
console.log('Look for "Code Mode (experimental) is on" near the top.');
process.exit(fixes ? 1 : 0);
