#!/usr/bin/env bash
# Adds a `claude-cm` shell function (Code Mode on for that one launch) to your bash/zsh startup files.
# Safe to run again: it skips a file that already has the block. Remove the block to undo.
set -eo pipefail
MARK="# >>> claude-cm (codemode plugin) >>>"
BLOCK="$MARK
claude-cm() { CLAUDE_CODE_EXPERIMENTAL_CODE_MODE=1 claude \"\$@\"; }
# <<< claude-cm <<<"

files=()
[ -f "$HOME/.bashrc" ] || [ "$(basename "${SHELL:-bash}")" = bash ] && files+=("$HOME/.bashrc")
[ -f "$HOME/.zshrc" ] || [ "$(basename "${SHELL:-}")" = zsh ] && files+=("$HOME/.zshrc")

for f in "${files[@]}"; do
  if grep -qF "$MARK" "$f" 2>/dev/null; then echo "already in $f"; continue; fi
  printf '\n%s\n' "$BLOCK" >> "$f"
  echo "added claude-cm to $f"
done
echo "Open a new terminal (or: source the file), then run: claude-cm"
