# Adds a `claude-cm` function (Code Mode on for that one launch) to your PowerShell profile.
# The variable is removed again when Claude exits, so plain `claude` in the same window stays normal.
# Safe to run again: it skips the profile if the block is already there. Remove the block to undo.
$mark = '# >>> claude-cm (codemode plugin) >>>'
$block = @'
# >>> claude-cm (codemode plugin) >>>
function claude-cm {
  $env:CLAUDE_CODE_EXPERIMENTAL_CODE_MODE = '1'
  try { claude @args } finally { Remove-Item Env:CLAUDE_CODE_EXPERIMENTAL_CODE_MODE -ErrorAction SilentlyContinue }
}
# <<< claude-cm <<<
'@
$profilePath = $PROFILE.CurrentUserAllHosts
if (-not (Test-Path $profilePath)) { New-Item -ItemType File -Path $profilePath -Force | Out-Null }
if (Select-String -Path $profilePath -SimpleMatch $mark -Quiet) { "already in $profilePath"; return }
Add-Content -Path $profilePath -Value "`n$block" -Encoding utf8
"added claude-cm to $profilePath"
"Open a new PowerShell window, then run: claude-cm"
