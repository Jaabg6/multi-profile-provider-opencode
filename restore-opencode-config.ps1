param(
  [string]$BackupRoot = "C:\Users\Jabibi\opencode-mpp-backups\backup-20260509-124251",
  [string]$SnapshotRoot = "C:\Users\Jabibi\opencode-mpp-backups",
  [switch]$StopProcesses,
  [switch]$RestoreLocalData,
  [switch]$RestoreRoamingData
)

$ErrorActionPreference = "Stop"

function Assert-PathExists {
  param([string]$Path, [string]$Label)
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "$Label not found: $Path"
  }
}

function Copy-TreeReplacingTarget {
  param([string]$Source, [string]$Target)

  Assert-PathExists -Path $Source -Label "Backup source"

  $parent = Split-Path -Parent $Target
  if (-not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent | Out-Null
  }

  if (Test-Path -LiteralPath $Target) {
    Remove-Item -LiteralPath $Target -Recurse -Force
  }

  Copy-Item -LiteralPath $Source -Destination $Target -Recurse -Force
  "RESTORED $Target"
}

Assert-PathExists -Path $BackupRoot -Label "Backup root"
Assert-PathExists -Path $SnapshotRoot -Label "Snapshot root"

if ($StopProcesses) {
  foreach ($processName in @("opencode", "OpenCode", "open-code")) {
    Get-Process -Name $processName -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  }
  "Stopped OpenCode processes best-effort."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$snapshot = Join-Path $SnapshotRoot "broken-before-minimal-restore-$stamp"
New-Item -ItemType Directory -Path $snapshot | Out-Null

$configTarget = Join-Path $env:USERPROFILE ".config\opencode"
if (Test-Path -LiteralPath $configTarget) {
  Copy-Item -LiteralPath $configTarget -Destination (Join-Path $snapshot "Users_Jabibi_.config_opencode") -Recurse -Force
  "SNAPSHOT $configTarget -> $snapshot"
}

Copy-TreeReplacingTarget `
  -Source (Join-Path $BackupRoot "Users_Jabibi_.config_opencode") `
  -Target $configTarget

if ($RestoreLocalData) {
  Copy-TreeReplacingTarget `
    -Source (Join-Path $BackupRoot "Users_Jabibi_AppData_Local_opencode") `
    -Target (Join-Path $env:LOCALAPPDATA "opencode")
}

if ($RestoreRoamingData) {
  Copy-TreeReplacingTarget `
    -Source (Join-Path $BackupRoot "Users_Jabibi_AppData_Roaming_opencode") `
    -Target (Join-Path $env:APPDATA "opencode")
}

$badPath = "D:\ProgramacionTera\multi-profile-provider-opencode\packages\opencode-plugin-public"
$remaining = Get-ChildItem -LiteralPath $configTarget -Recurse -File -ErrorAction SilentlyContinue |
  Select-String -SimpleMatch $badPath -ErrorAction SilentlyContinue

if ($remaining) {
  "WARNING: bad plugin path still found:"
  $remaining | ForEach-Object { "$($_.Path):$($_.LineNumber)" }
  exit 2
}

"OK: local plugin path removed from $configTarget"
"Current broken-state snapshot: $snapshot"
"Now reopen OpenCode and test your existing plugins."
