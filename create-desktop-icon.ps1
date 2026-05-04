$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = Join-Path $root "bluelens-start.cmd"
$icon = Join-Path $root "bluelens.ico"
if (!(Test-Path $target)) {
  throw "Missing: $target"
}
if (!(Test-Path $icon)) {
  throw "Missing: $icon"
}

$desktop = [Environment]::GetFolderPath("Desktop")
$lnkPath = Join-Path $desktop "BlueLens.lnk"

$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut($lnkPath)
$s.TargetPath = $target
$s.WorkingDirectory = $root
$s.WindowStyle = 1
$s.Description = "Start BlueLens (local OSINT console)"
$s.IconLocation = $icon

$s.Save()

Write-Host "Created desktop shortcut:" $lnkPath
