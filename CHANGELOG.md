# Changelog

## Unreleased

- MIT licence; repo is public, so install needs no GitHub login.

## 0.1.0 - 2026-11-21

- First release: `codemode` skill (setup check, launch in terminal and Orca, 3-test method, compare, troubleshooting).
- `cm-doctor.mjs`: version, Git for Windows and env/settings blocker check; prints setting names only.
- `cm-compare.mjs`: per-session token table by `-n` name (dedupes split model calls, skips subagent lines, counts REPL calls as proof Code Mode was on), with a node test.
- `install-shortcut.sh` / `install-shortcut.ps1`: idempotent `claude-cm` shell function for bash, zsh and PowerShell.
