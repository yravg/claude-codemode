# codemode — Claude Code Code Mode plugin

A Claude Code plugin (one skill, three small scripts) for Claude Code's experimental **Code Mode**, where Claude writes one JavaScript script that makes many tool calls and only the answer reaches its context.

It does four things on any machine (Windows, macOS, Linux VPS), in a plain terminal or in Orca:

1. **Check** the setup: `cm-doctor.mjs` reports version and settings that block Code Mode (names only, never values).
2. **Launch** with a `claude-cm` shortcut (bash, zsh, PowerShell), or in an Orca terminal.
3. **Test** with the fair off/on 3-test method.
4. **Compare** two or more named sessions from their transcripts: `cm-compare.mjs`.

Based on the Claude Code docs (https://code.claude.com/docs/en/code-mode) and the RoboNuggets "Claude Code's Code Mode" guide.

## Requirements

- Claude Code 2.1.323 or later (2.1.326+ with agent teams), Node.js (for the two scripts), Git for Windows on Windows.
- An interactive terminal session, a Claude subscription or Console account direct to Anthropic, and Opus 5.5, Sonnet 5.5, Haiku 5.5 or Fable 5.2.

## Install (each device)

In Claude Code:

```
/plugin marketplace add yraveragework/claude-codemode
/plugin install codemode@codemode
```

Or from a shell:

```
claude plugin marketplace add yraveragework/claude-codemode
claude plugin install codemode@codemode
```

The repo is private: the device needs GitHub access (`gh auth login`, or an SSH key with access to the repo). Update later with `/plugin marketplace update codemode`.

Then, in a normal Claude Code session, say "set up code mode" or run `/codemode:codemode`. Claude runs the doctor, offers to install the `claude-cm` shortcut, and proposes 3 tests from your work.

## Use

```
claude-cm                      # Code Mode on for this launch only
claude                         # normal mode, unchanged
claude-cm --model sonnet -n cm-1-on
```

Orca: `orca terminal create --worktree <selector> --command "claude-cm" --focus`.

Compare runs (from the skill folder):

```
node skills/codemode/scripts/cm-compare.mjs cm-1-off cm-1-on
```

## What is off in Code Mode

Remote Control, Claude in Chrome, computer use, moving the session to the desktop app or background, `/fork` into a background copy. A Code Mode session resumes only with Code Mode on. Keep plain `claude` for those.

## Test

```
node --test test/compare.test.mjs
```
