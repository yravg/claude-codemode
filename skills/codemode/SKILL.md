---
name: codemode
description: Use Claude Code's experimental Code Mode (Claude writes one JavaScript script that makes many tool calls, so only the answer reaches its context). Use when the user says "code mode", "/codemode", "claude-cm", asks to turn Code Mode on in a terminal or in Orca, asks whether Code Mode saves tokens on their work, wants the off/on 3-test method, or wants to compare token use of two named sessions. Also use when the start line says "Code Mode (experimental) isn't available".
---

# Code Mode

Code Mode swaps Claude's usual tools for a script runner (`REPL`, plus `Poll` to wait). Claude writes JavaScript that makes the tool calls; Claude Code runs it in the session. Each call inside the script still goes through the usual permission rules and `PreToolUse` hooks under its own name (Bash, Edit, MCP tool).

Docs: https://code.claude.com/docs/en/code-mode. It is experimental: it "may change or be removed in any release". It is off by default.

Paths below are relative to this skill's base directory (shown when the skill loads). Run scripts with `node`.

## Rules for you

- Ask before you change any file or setting (shell profile, settings.json). Checks and tests only read.
- Never print a key, token or secret value. The doctor prints setting names only.
- Code Mode runs only in an interactive terminal. You cannot turn it on for the session you are in now. Give the user the command, or start a new terminal for them (Orca, below).
- Do not put `CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=1` in `settings.json` unless the user asks for it. That turns it on for every new terminal session and removes Remote Control, Claude in Chrome and computer use from all of them.

## 1. Check the setup

```
node scripts/cm-doctor.mjs
```

It checks: Claude Code version (2.1.323+, 2.1.326+ with agent teams), Git for Windows, and env or settings that block Code Mode (gateway or `ANTHROPIC_BASE_URL`, Bedrock, Vertex, Foundry, `apiKeyHelper`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_CUSTOM_HEADERS`, OpenTelemetry, `DISABLE_TELEMETRY`, a `0` for the Code Mode variable). Exit 1 means a `FIX` line needs action. Give the user each fix; do not apply it without a yes.

The doctor cannot see plugin, mod, model or account blockers. Only the start line of a real session shows those (section 6).

## 2. Turn it on for one session

| Shell | Command |
|---|---|
| bash / zsh (macOS, Linux, VPS) | `CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=1 claude` |
| PowerShell | `$env:CLAUDE_CODE_EXPERIMENTAL_CODE_MODE = "1"; claude` (stays set in that window) |

First launch asks once: pick **Yes, turn on Code Mode**. Claude Code restarts. Look for `Code Mode (experimental) is on` near the top.

### `claude-cm` shortcut (recommended)

Ask first, then run the installer for the user's shell. It adds a `claude-cm` function between marker lines; running it again does nothing.

- bash / zsh: `bash scripts/install-shortcut.sh` (adds to `~/.bashrc` and/or `~/.zshrc`)
- PowerShell: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-shortcut.ps1` (adds to the current-user profile of that PowerShell edition; run it with `pwsh` too if the user uses PowerShell 7). The PowerShell `claude-cm` removes the variable when Claude exits, so plain `claude` in the same window stays normal. The profile loads only if the execution policy allows it (`RemoteSigned` or looser).

Then `claude-cm` starts Code Mode and plain `claude` stays normal. All `claude` flags pass through: `claude-cm --model sonnet -n my-run`.

## 3. Use it in Orca

An Orca terminal is an interactive terminal, so Code Mode works there (checked on Windows, Orca, Claude Code 2.1.329).

- New Code Mode terminal in a workspace:
  `orca terminal create --worktree <selector> --title "claude-cm" --command "claude-cm" --focus`
  Without the shortcut, use the raw command for the host's shell as `--command`. On a remote (SSH) Orca host the command runs in that host's shell, so install the shortcut there too.
- The first launch per machine shows the trust prompt (unknown folder) and the Code Mode question. Answer them in the terminal, or with `orca terminal send --terminal <handle> --text $'\x1b[B'` (arrow down) then `--text $'\r'` (Enter). Read the screen with `orca terminal read --terminal <handle> --screen`.
- `orca agent launch --agent claude` and `orca orchestration worker-start --agent claude` start plain `claude` and do not set the variable, so those workers run without Code Mode. To give a worker Code Mode, start a `claude-cm` terminal first and pass its handle with `worker-start --terminal <handle>` (not tested yet: check the worker's start line).
- Every Orca Claude in Code Mode: only if the user asks. Set `"env": {"CLAUDE_CODE_EXPERIMENTAL_CODE_MODE": "1"}` in the user settings of the Claude profile Orca uses (`$CLAUDE_CONFIG_DIR/settings.json`). Project settings ignore this variable. All those sessions then lose Remote Control, Claude in Chrome and computer use.

## 4. Test whether it saves tokens (3-test method)

Code Mode does not help every job. Run the same read-only task twice, once off and once on, and compare.

1. Pick 3 tests from the user's real work. Look at their recent sessions, MCP servers and skills to propose them:
   - **Lots of small steps**: many reads, searches or the same command on many items. Example from the docs: "Read every Markdown file in this project and list the links that point to local files that don't exist."
   - **A data job**: an MCP server or tool that sends back a lot, where only a little matters.
   - **An everyday task**: the control. Code Mode may not help.
2. End every test prompt with "read only, no subagents".
3. Ask whether the user runs them, or you run them (each in its own new terminal, for example an Orca terminal per run).
4. Each test runs twice, same folder, model and effort, new terminal each time:
   - off: `claude --model opus --effort medium -n cm-1-off`
   - on: `claude-cm --model opus --effort medium -n cm-1-on`
   Paste the prompt, wait for the answer, type `/exit`.
5. Fair test: same plugins both runs (if a plugin was turned off for Code Mode, turn it off for the off run too). If the on run says Code Mode isn't available, that run does not count. Check the answers, not only the tokens.

## 5. Compare

```
node scripts/cm-compare.mjs cm-1-off cm-1-on cm-2-off cm-2-on cm-3-off cm-3-on
```

It finds each session by its `-n` name in `$CLAUDE_CONFIG_DIR/projects` (default `~/.claude/projects`, last 30 days; add `--days 90` for older runs) and prints one table row per run: Code Mode (`yes (n)` = REPL calls seen, proof it was on), model calls, new input, cache write, cache read, total input, total input after the first call, output, time, then each final answer.

Read it the honest way:
- Total input = new input + cache write + cache read, so a cached run cannot look cheaper than it is.
- The first call loads CLAUDE.md, skills and memory. Its cache state can differ between runs, so also compare "total input after 1st call".
- One run each is a hint, not a benchmark. If the gap is small, run it again.
- Fewer tokens for a wrong answer is a loss. Code Mode can also be slower.
- Published results (RoboNuggets guide, Nov 2026): about 35% fewer tokens read and 36% cheaper after the first turn on 5 short tasks, about 4% cheaper in total; it lost an MCP data task.

## 6. If it doesn't turn on

The start line says `Code Mode (experimental) isn't available` with a reason. `/status` shows it too.

| Reason | Fix |
|---|---|
| for now it only works in the interactive terminal | Start `claude` in a terminal. Not the desktop app, `-p`, the VS Code panel or cloud. `claude -p` prints a warning and runs normally. |
| it only works (directly) with the Anthropic API | Remove gateway, Bedrock, Vertex, Foundry or custom `ANTHROPIC_BASE_URL` settings. |
| it doesn't work with an API key helper | Remove `apiKeyHelper`, `ANTHROPIC_AUTH_TOKEN`, auth headers in `ANTHROPIC_CUSTOM_HEADERS`. |
| OpenTelemetry is on | Unset `CLAUDE_CODE_ENABLE_TELEMETRY` and `ENABLE_BETA_TRACING_DETAILED`. |
| it needs settings that Claude Code downloads from Anthropic | Unset `DISABLE_TELEMETRY` (or what stops those downloads). |
| it doesn't yet work with the plugin | `/plugin`, turn off the plugin the line names (or start with that plugin off). |
| it doesn't yet work with an installed mod | Turn off the mod that checks tool calls. |
| it only works with Opus 5.5, Sonnet 5.5 and later models | `/model` to Opus 5.5, Sonnet 5.5, Haiku 5.5 or Fable 5.2. |
| it can't be used together with agent teams yet | `claude update` to 2.1.326+, or turn agent teams off. |
| it isn't open to your account (yet / in this version) | Nothing to fix locally; try after `claude update`. |
| your organization's settings don't allow it | Managed settings hold a `0`; only an admin can change it. HIPAA and zero-data-retention orgs cannot use it. |
| it doesn't work in background jobs | Run it in a foreground terminal session. |

Windows with an npm install of Claude Code: a new session can auto-update while other `claude.exe` processes run, and leave `claude` broken ("claude native binary not installed" or not found). Close all Claude Code terminal sessions, then run `npm install -g @anthropic-ai/claude-code`.

## 7. What is off in Code Mode

- Remote Control, Claude in Chrome, computer use, moving the session to the desktop app or background, `/fork` into a background copy.
- A Code Mode session resumes only in a terminal with Code Mode on.
- A script stops after 10 minutes of waiting (time at permission prompts in manual and acceptEdits mode doesn't count from 2.1.328). Background scripts (auto or bypassPermissions mode) run up to 2 hours; stop them with `/tasks` then `x`.
- In auto mode the safety check reads each script once before it runs, not each tool call inside it.
- To block or audit scripts with a hook, match the `REPL` tool and read `tool_input.code`.
- Turn it off: start plain `claude`, or close the PowerShell window where you set the variable. A `0` anywhere beats a `1`.
