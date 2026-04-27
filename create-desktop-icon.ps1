$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = Join-Path $root "bluelens-start.cmd"
if (!(Test-Path $target)) {
  throw "Missing: $target"
}

$desktop = [Environment]::GetFolderPath("Desktop")
$lnkPath = Join-Path $desktop "BlueLens.lnk"

$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut($lnkPath)
$s.TargetPath = $target
$s.WorkingDirectory = $root
$s.WindowStyle = 1
$s.Description = "Start BlueLens (local OSINT console)"

# Optional icon (falls back to default if missing)
$ico = Join-Path $root "assets\\bluelens.ico"
if (Test-Path $ico) {
  $s.IconLocation = $ico
}

$s.Save()

Write-Host "Created desktop shortcut:" $lnkPath
