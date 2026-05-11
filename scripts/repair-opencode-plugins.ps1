$ErrorActionPreference = "Stop"

function Info($message) { Write-Host "[repair] $message" -ForegroundColor Cyan }
function Ok($message) { Write-Host "[ok] $message" -ForegroundColor Green }
function Warn($message) { Write-Host "[warn] $message" -ForegroundColor Yellow }

$configDir = Join-Path $env:USERPROFILE ".config\opencode"
$backupRoot = Join-Path $configDir ("repair-backup-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
$opencodeJson = Join-Path $configDir "opencode.json"
$tuiJson = Join-Path $configDir "tui.json"
$nodeModules = Join-Path $configDir "node_modules"
$packageLock = Join-Path $configDir "package-lock.json"
$packageJson = Join-Path $configDir "package.json"

if (!(Test-Path -LiteralPath $configDir)) {
  throw "OpenCode config dir not found: $configDir"
}

Info "Stopping running OpenCode processes..."
Get-Process -Name opencode -ErrorAction SilentlyContinue | Stop-Process -Force
Ok "OpenCode processes stopped or none were running."

Info "Creating backup at $backupRoot"
New-Item -ItemType Directory -Path $backupRoot | Out-Null
foreach ($path in @($opencodeJson, $tuiJson, $packageJson, $packageLock)) {
  if (Test-Path -LiteralPath $path) {
    Copy-Item -LiteralPath $path -Destination $backupRoot -Force
  }
}
Ok "Backup created."

Info "Writing known-good OpenCode plugin config..."
$opencodeConfig = [ordered]@{
  '$schema' = 'https://opencode.ai/config.json'
  plugin = @('multi-profile-provider-opencode-plugin')
}
$opencodeConfig | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $opencodeJson -Encoding UTF8

$gentleLogo = Join-Path $configDir "tui-plugins\gentle-logo.tsx"
$tuiPlugins = @(
  'opencode-subagent-statusline',
  'opencode-sdd-engram-manage',
  'multi-profile-provider-opencode-plugin'
)
if (Test-Path -LiteralPath $gentleLogo) {
  $tuiPlugins = @('opencode-subagent-statusline', 'opencode-sdd-engram-manage', $gentleLogo, 'multi-profile-provider-opencode-plugin')
}
$tuiConfig = [ordered]@{
  '$schema' = 'https://opencode.ai/tui.json'
  plugin = $tuiPlugins
}
$tuiConfig | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $tuiJson -Encoding UTF8
Ok "Config files rewritten."

Info "Ensuring package.json contains plugin dependencies..."
$pkg = [ordered]@{
  dependencies = [ordered]@{
    '@opencode-ai/plugin' = '^1.14.42'
    'multi-profile-provider-opencode-plugin' = '^0.1.5'
    'opencode-sdd-engram-manage' = '^1.5.0'
    'opencode-subagent-statusline' = '^0.6.1'
    'unique-names-generator' = '^4.7.1'
  }
}
$pkg | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $packageJson -Encoding UTF8
Ok "package.json rewritten."

Info "Removing plugin node_modules/package-lock for clean reinstall..."
if (Test-Path -LiteralPath $nodeModules) { Remove-Item -LiteralPath $nodeModules -Recurse -Force }
if (Test-Path -LiteralPath $packageLock) { Remove-Item -LiteralPath $packageLock -Force }
Ok "Old plugin dependencies removed."

Info "Installing OpenCode plugin dependencies with npm..."
Push-Location $configDir
try {
  npm install
} finally {
  Pop-Location
}
Ok "npm install completed."

Info "Validating JSON configs..."
node -e "for (const p of [process.argv[1], process.argv[2]]) JSON.parse(require('fs').readFileSync(p, 'utf8')); console.log('json ok')" $opencodeJson $tuiJson
Ok "JSON configs valid."

Info "Validating installed plugin packages..."
Push-Location $configDir
try {
  npm ls multi-profile-provider-opencode-plugin opencode-sdd-engram-manage opencode-subagent-statusline --depth=0
} finally {
  Pop-Location
}

Ok "Repair finished. Now open OpenCode again. Backup: $backupRoot"
