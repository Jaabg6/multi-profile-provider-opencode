<#
.SYNOPSIS
Desinstala de forma segura componentes de Multi Profile Provider (MPP) en Windows.

.DESCRIPTION
Este script prepara una limpieza para reinstalación limpia en otra máquina.
Por defecto SIEMPRE ejecuta en simulación (dry-run). Para aplicar cambios reales use -Apply.

Acciones principales:
- (Opcional) Detener procesos de OpenCode con -StopOpenCode.
- Desinstalar CLI global @multi-profile-provider/cli con npm.
- Detectar y eliminar shims globales (mpp / opencode-mpp) en npm global bin si apuntan a MPP o están huérfanos.
- Limpiar entradas del plugin MPP en opencode.json en rutas comunes de Windows y HOME.
- Eliminar cachés/datos OpenCode relacionados con MPP en rutas comunes de Windows y HOME.
- (Opcional) Borrar perfiles solo con -RemoveProfiles.
- (Opcional) Limpiar caché global npm con -CleanNpmCache.
- Mostrar verificación final clara con hallazgos antes/después.

.PARAMETER Apply
Aplica los cambios. Si no se especifica, solo muestra qué haría (dry-run).

.PARAMETER RemoveProfiles
Permite borrar perfiles de OpenCode/MPP (auth/sesión por perfil).
Solo tiene efecto junto con -Apply.

.PARAMETER CleanNpmCache
Ejecuta npm cache clean --force.

.PARAMETER StopOpenCode
Intenta detener procesos relacionados con OpenCode antes de limpiar.
Por seguridad NO se detienen procesos a menos que se especifique este flag.

.PARAMETER PluginName
Nombre de plugin adicional a eliminar de opencode.json.
Default: multi-profile-provider-opencode-plugin.

.PARAMETER VerboseReport
Muestra inventario detallado de rutas detectadas y hallazgos antes/después.

.EXAMPLE
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\uninstall-mpp-stack.ps1
Simula todo, sin borrar ni desinstalar.

.EXAMPLE
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\uninstall-mpp-stack.ps1 -Apply
Aplica desinstalación/limpieza manteniendo perfiles.

.EXAMPLE
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\uninstall-mpp-stack.ps1 -Apply -StopOpenCode -RemoveProfiles -CleanNpmCache -VerboseReport
Limpieza completa con reporte detallado.
#>

[CmdletBinding()]
param(
    [switch]$Apply,
    [switch]$RemoveProfiles,
    [switch]$CleanNpmCache,
    [switch]$StopOpenCode,
    [switch]$VerboseReport,
    [string]$PluginName = 'multi-profile-provider-opencode-plugin'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Section {
    param([string]$Title)
    Write-Host "`n=== $Title ===" -ForegroundColor Cyan
}

function Write-Plan {
    param([string]$Message)
    Write-Host "[PLAN] $Message" -ForegroundColor Yellow
}

function Write-Do {
    param([string]$Message)
    Write-Host "[DO]   $Message" -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message"
}

function Write-WarnMsg {
    param([string]$Message)
    Write-Warning $Message
}

function Invoke-Safe {
    param(
        [Parameter(Mandatory = $true)][string]$Action,
        [Parameter(Mandatory = $true)][scriptblock]$Script
    )

    if (-not $Apply) {
        Write-Plan $Action
        return
    }

    Write-Do $Action
    & $Script
}

function Get-ExistingPaths {
    param([string[]]$Paths)
    $result = @()
    foreach ($p in $Paths) {
        if ([string]::IsNullOrWhiteSpace($p)) { continue }
        if (Test-Path -LiteralPath $p) {
            $result += $p
        }
    }
    return @($result | Select-Object -Unique)
}

function Get-CommandPathOrNull {
    param([string]$Name)
    try {
        $cmd = Get-Command $Name -ErrorAction Stop
        return $cmd.Source
    } catch {
        return $null
    }
}

function Get-NpmPathOrNull {
    try {
        $cmd = Get-Command 'npm.cmd' -ErrorAction Stop
        return $cmd.Source
    } catch {
        return Get-CommandPathOrNull -Name 'npm'
    }
}

function Run-Native {
    param(
        [Parameter(Mandatory = $true)][string]$File,
        [string[]]$Arguments = @()
    )

    $output = @()
    $success = $true
    $exitCode = -1

    try {
        $output = & $File @Arguments 2>&1
        $exitCode = $LASTEXITCODE
        if ($exitCode -ne 0) {
            $success = $false
        }
    } catch {
        $success = $false
        $output = @($_.Exception.Message)
        $exitCode = -1
    }

    return [pscustomobject]@{
        Success  = $success
        ExitCode = $exitCode
        Output   = @($output)
    }
}

function Get-ShimTargetsFromWhere {
    param([string]$CommandName)
    $paths = @()
    try {
        $res = Run-Native -File 'where.exe' -Arguments @($CommandName)
        if ($res.Success) {
            foreach ($line in $res.Output) {
                $candidate = [string]$line
                if (-not [string]::IsNullOrWhiteSpace($candidate) -and (Test-Path -LiteralPath $candidate)) {
                    $paths += $candidate
                }
            }
        }
    } catch {
    }
    return @($paths | Select-Object -Unique)
}

function Test-IsMppShim {
    param([string]$Path)

    $full = [string]$Path
    if ($full -match '(?i)[\\/]node_modules[\\/]\.bin[\\/]') {
        return $false
    }

    $leaf = [string](Split-Path -Leaf $full)
    $leafLower = $leaf.ToLowerInvariant()

    if ($leafLower -notin @('mpp', 'mpp.cmd', 'mpp.ps1', 'opencode-mpp', 'opencode-mpp.cmd', 'opencode-mpp.ps1')) {
        return $false
    }

    if (-not (Test-Path -LiteralPath $full)) {
        return $false
    }

    $content = ''
    try {
        $content = [string](Get-Content -LiteralPath $full -Raw -ErrorAction Stop)
    } catch {
        return $false
    }

    $contentLower = $content.ToLowerInvariant()
    $mentionsMpp = ($contentLower -match '@multi-profile-provider/cli') -or
                   ($contentLower -match 'multi-profile-provider') -or
                   ($contentLower -match 'opencode-mpp')

    if (-not $mentionsMpp) {
        return $false
    }

    $isStale = ($contentLower -match 'node_modules') -and (-not (Test-Path -LiteralPath (Join-Path $homeDir 'AppData\Roaming\npm\node_modules\@multi-profile-provider\cli')))
    return ($mentionsMpp -or $isStale)
}

function Test-IsMppPluginEntry {
    param([object]$Entry)

    if ($null -eq $Entry) { return $false }
    return (Test-IsMppPluginReference -Reference ([string]$Entry))
}

function Normalize-PluginReference {
    param([string]$Reference)

    if ([string]::IsNullOrWhiteSpace($Reference)) { return $null }

    $value = $Reference.Trim()
    foreach ($prefix in @('npm:', 'jsr:')) {
        if ($value.StartsWith($prefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            $value = $value.Substring($prefix.Length)
            break
        }
    }

    if ($value.StartsWith('@')) {
        $lastAt = $value.LastIndexOf('@')
        if ($lastAt -gt 0) {
            $value = $value.Substring(0, $lastAt)
        }
    } else {
        $firstAt = $value.IndexOf('@')
        if ($firstAt -gt 0) {
            $value = $value.Substring(0, $firstAt)
        }
    }

    return $value.Trim().ToLowerInvariant()
}

function Get-CanonicalPluginIdentity {
    param([string]$Reference)

    $normalized = Normalize-PluginReference -Reference $Reference
    if ([string]::IsNullOrWhiteSpace($normalized)) { return $null }

    if ($normalized -eq 'multi-profile-provider-opencode-plugin') {
        return 'multi-profile-provider-opencode-plugin'
    }

    if ($normalized -eq '@multi-profile-provider/opencode-plugin') {
        return '@multi-profile-provider/opencode-plugin'
    }

    return $null
}

function Test-IsMppPluginReference {
    param([string]$Reference)
    return $null -ne (Get-CanonicalPluginIdentity -Reference $Reference)
}

function Test-IsMppStateReference {
    param([string]$Key, [object]$Value)

    if (Test-IsMppPluginReference -Reference $Key) { return $true }

    if ($null -eq $Value) { return $false }
    if ($Value -is [string]) {
        return (Test-IsMppPluginReference -Reference ([string]$Value))
    }

    if ($Value -is [System.Collections.IEnumerable] -and -not ($Value -is [string])) {
        foreach ($entry in $Value) {
            if (Test-IsMppStateReference -Key '' -Value $entry) {
                return $true
            }
        }
    }

    if ($null -ne $Value.PSObject) {
        foreach ($fieldName in @('name', 'plugin', 'package', 'specifier', 'id', 'source')) {
            if ($null -ne $Value.PSObject.Properties[$fieldName]) {
                $fieldValue = [string]$Value.PSObject.Properties[$fieldName].Value
                if (Test-IsMppPluginReference -Reference $fieldValue) {
                    return $true
                }
            }
        }
    }

    return $false
}

function Test-IsMppCachePath {
    param([string]$PathValue)

    if ([string]::IsNullOrWhiteSpace($PathValue)) { return $false }

    $leaf = ([string](Split-Path -Leaf $PathValue)).ToLowerInvariant()
    $compact = ($leaf -replace '[^a-z0-9@/._-]', '')

    if ($leaf -match '^multi-profile-provider-opencode-plugin(@.+)?$') { return $true }
    if ($leaf -match '^@multi-profile-provider[\\/]opencode-plugin(@.+)?$') { return $true }
    if ($leaf -eq 'opencode-plugin') {
        $parent = [string](Split-Path -Parent $PathValue)
        if ($parent.ToLowerInvariant().EndsWith('@multi-profile-provider')) {
            return $true
        }
    }
    if ($compact -eq '@multi-profile-provider-opencode-plugin') { return $true }

    return $false
}

function Backup-JsonFile {
    param([string]$Path)

    if ($env:MPP_UNINSTALL_FORCE_BACKUP_FAILURE -eq '1') {
        throw "Abortando mutación: fallo forzado de backup para '$Path'."
    }

    $dir = Split-Path -Parent $Path
    $leaf = Split-Path -Leaf $Path
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $backupFile = Join-Path $dir ("$leaf.backup-$timestamp")
    try {
        Copy-Item -LiteralPath $Path -Destination $backupFile -Force -ErrorAction Stop
    } catch {
        throw "Abortando mutación: no se pudo crear backup para '$Path'. Error: $($_.Exception.Message)"
    }
    Write-Info "Backup creado: $backupFile"
    return $backupFile
}

Write-Section 'Modo de ejecución'
if ($Apply) {
    Write-Host 'APPLY MODE: se realizarán cambios reales.' -ForegroundColor Green
} else {
    Write-Host 'DRY-RUN MODE: no se realizará ningún cambio.' -ForegroundColor Yellow
    Write-Host 'Para aplicar, ejecuta de nuevo con -Apply.' -ForegroundColor Yellow
}

$homeDir = $HOME
$appData = $env:APPDATA
$localAppData = $env:LOCALAPPDATA

$opencodeConfigCandidates = @(
    (Join-Path (Get-Location).Path '.opencode\opencode.json'),
    (Join-Path $homeDir '.config\opencode\opencode.json'),
    (Join-Path $appData 'opencode\opencode.json'),
    (Join-Path $localAppData 'opencode\opencode.json')
) | Select-Object -Unique

$opencodeTuiConfigCandidates = @(
    (Join-Path (Get-Location).Path '.opencode\tui.json'),
    (Join-Path $homeDir '.config\opencode\tui.json'),
    (Join-Path $appData 'opencode\tui.json'),
    (Join-Path $localAppData 'opencode\tui.json')
) | Select-Object -Unique

$opencodeStateJsonCandidates = @(
    (Join-Path $homeDir '.local\state\opencode\plugin-meta.json'),
    (Join-Path $homeDir '.local\state\opencode\kv.json'),
    (Join-Path $appData 'opencode\plugin-meta.json'),
    (Join-Path $appData 'opencode\kv.json'),
    (Join-Path $localAppData 'opencode\plugin-meta.json'),
    (Join-Path $localAppData 'opencode\kv.json')
) | Select-Object -Unique

$cacheRootsCandidates = @(
    (Join-Path $homeDir '.cache\opencode'),
    (Join-Path $homeDir '.local\share\opencode'),
    (Join-Path $appData 'opencode'),
    (Join-Path $localAppData 'opencode')
) | Select-Object -Unique

$profilesCandidates = @(
    (Join-Path $homeDir '.opencode-profiles'),
    (Join-Path $appData 'opencode\profiles'),
    (Join-Path $localAppData 'opencode\profiles')
) | Select-Object -Unique

$pluginNamesToRemove = @(
    $PluginName,
    '@multi-profile-provider/opencode-plugin'
) | Select-Object -Unique

Write-Section 'Contexto detectado'
Write-Info "HOME: $homeDir"
Write-Info "APPDATA: $appData"
Write-Info "LOCALAPPDATA: $localAppData"
Write-Info "Plugins objetivo: $($pluginNamesToRemove -join ', ')"

if ($VerboseReport) {
    Write-Info 'Configs candidatos:'
    $opencodeConfigCandidates | ForEach-Object { Write-Host "  - $_" }
    Write-Info 'TUI configs candidatos:'
    $opencodeTuiConfigCandidates | ForEach-Object { Write-Host "  - $_" }
    Write-Info 'State JSON candidatos:'
    $opencodeStateJsonCandidates | ForEach-Object { Write-Host "  - $_" }
    Write-Info 'Roots cache/data candidatos:'
    $cacheRootsCandidates | ForEach-Object { Write-Host "  - $_" }
    Write-Info 'Profiles candidatos:'
    $profilesCandidates | ForEach-Object { Write-Host "  - $_" }
}

Write-Section 'Procesos OpenCode'
$opencodeLikeProcesses = @(
    Get-Process -ErrorAction SilentlyContinue |
        Where-Object { $_.ProcessName -match 'opencode|open.?code|mpp' }
)

if ($opencodeLikeProcesses.Count -gt 0) {
    Write-Host 'Procesos potencialmente relacionados encontrados:'
    $opencodeLikeProcesses | Select-Object Id, ProcessName | Format-Table -AutoSize

    if ($StopOpenCode) {
        foreach ($proc in $opencodeLikeProcesses) {
            $pidToStop = $proc.Id
            $nameToStop = $proc.ProcessName
            Invoke-Safe -Action "Detener proceso $nameToStop (PID $pidToStop)" -Script {
                Stop-Process -Id $pidToStop -Force -ErrorAction SilentlyContinue
            }
        }
    } else {
        Write-WarnMsg 'No se detuvieron procesos. Usa -StopOpenCode (idealmente junto con -Apply) si quieres cerrarlos.'
    }
} else {
    Write-Host 'No se detectaron procesos relacionados con OpenCode/MPP.'
}

$npmPath = Get-NpmPathOrNull
$npmUninstallResult = $null

Write-Section 'Desinstalar CLI global'
if ($null -eq $npmPath) {
    Write-WarnMsg 'npm no está disponible en PATH. Se omite npm uninstall -g.'
} else {
    if (-not $Apply) {
        Write-Plan 'npm uninstall -g @multi-profile-provider/cli'
    } else {
        Write-Do 'npm uninstall -g @multi-profile-provider/cli'
        $npmUninstallResult = Run-Native -File $npmPath -Arguments @('uninstall', '-g', '@multi-profile-provider/cli')
        Write-Info ("npm uninstall exit code: {0}" -f $npmUninstallResult.ExitCode)
        if ($VerboseReport -and $npmUninstallResult.Output.Count -gt 0) {
            $npmUninstallResult.Output | ForEach-Object { Write-Host "  $_" }
        }
    }
}

Write-Section 'Remover shims npm globales mpp/opencode-mpp'
$shimCandidates = @()

if ($null -ne $npmPath) {
    $npmBinResult = Run-Native -File $npmPath -Arguments @('bin', '-g')
    if ($npmBinResult.Success -and $npmBinResult.Output.Count -gt 0) {
        $binDir = [string]$npmBinResult.Output[0]
        if (Test-Path -LiteralPath $binDir) {
            $shimCandidates += (Join-Path $binDir 'mpp')
            $shimCandidates += (Join-Path $binDir 'mpp.cmd')
            $shimCandidates += (Join-Path $binDir 'mpp.ps1')
            $shimCandidates += (Join-Path $binDir 'opencode-mpp')
            $shimCandidates += (Join-Path $binDir 'opencode-mpp.cmd')
            $shimCandidates += (Join-Path $binDir 'opencode-mpp.ps1')
        }
    }
}

$shimCandidates += Get-ShimTargetsFromWhere -CommandName 'mpp'
$shimCandidates += Get-ShimTargetsFromWhere -CommandName 'opencode-mpp'

$uniqueShimCandidates = @($shimCandidates | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique)
if ($uniqueShimCandidates.Count -eq 0) {
    Write-Host 'No se encontraron shims candidatos de mpp/opencode-mpp.'
} else {
    foreach ($shim in $uniqueShimCandidates) {
        if (Test-IsMppShim -Path $shim) {
            Invoke-Safe -Action "Eliminar shim MPP: $shim" -Script {
                Remove-Item -LiteralPath $shim -Force -ErrorAction SilentlyContinue
            }
        } elseif ($VerboseReport) {
            Write-Info "Shim detectado pero NO removido (no parece MPP): $shim"
        }
    }
}

Write-Section 'Limpiar plugins en opencode.json'
$existingConfigFiles = @(Get-ExistingPaths -Paths $opencodeConfigCandidates)
if ($existingConfigFiles.Count -eq 0) {
    Write-Host 'No se encontraron archivos opencode.json en rutas candidatas.'
} else {
    foreach ($configFile in $existingConfigFiles) {
        Write-Info "Revisando: $configFile"
        $rawJson = Get-Content -LiteralPath $configFile -Raw
        $json = $null
        try {
            $json = $rawJson | ConvertFrom-Json -ErrorAction Stop
        } catch {
            Write-WarnMsg "No se pudo parsear JSON en '$configFile'. Se omite. Error: $($_.Exception.Message)"
            continue
        }

        $pluginProperties = @('plugin', 'plugins')
        $propertiesFound = @($pluginProperties | Where-Object { $null -ne $json.PSObject.Properties[$_] })

        if ($propertiesFound.Count -eq 0) {
            Write-Host '  No tiene propiedad "plugin" ni "plugins".'
            continue
        }

        $changedProperties = @()
        foreach ($propertyName in $propertiesFound) {
            $rawValue = $json.PSObject.Properties[$propertyName].Value
            $pluginEntries = @()
            if ($null -ne $rawValue) {
                $pluginEntries = @($rawValue)
            }

            $beforeCount = $pluginEntries.Count
            $filteredPlugins = @($pluginEntries | Where-Object { -not (Test-IsMppPluginEntry -Entry $_) })
            $afterCount = $filteredPlugins.Count
            $removedCount = $beforeCount - $afterCount

            Write-Info ("{0} antes={1}, después={2}, removidos={3}" -f $propertyName, $beforeCount, $afterCount, $removedCount)
            if ($removedCount -gt 0) {
                $changedProperties += [pscustomobject]@{
                    Name  = $propertyName
                    Value = $filteredPlugins
                }
            }
        }

        if ($changedProperties.Count -gt 0) {
            $configDir = Split-Path -Parent $configFile
            Invoke-Safe -Action "Backup + actualización de $configFile" -Script {
                Backup-JsonFile -Path $configFile

                foreach ($change in $changedProperties) {
                    $json.PSObject.Properties[$change.Name].Value = @($change.Value)
                }

                $updated = $json | ConvertTo-Json -Depth 20
                Set-Content -LiteralPath $configFile -Value $updated -Encoding UTF8
            }
        }
    }
}

Write-Section 'Limpiar plugins en tui.json'
$existingTuiConfigFiles = @(Get-ExistingPaths -Paths $opencodeTuiConfigCandidates)
if ($existingTuiConfigFiles.Count -eq 0) {
    Write-Host 'No se encontraron archivos tui.json en rutas candidatas.'
} else {
    foreach ($tuiFile in $existingTuiConfigFiles) {
        Write-Info "Revisando: $tuiFile"
        $rawJson = Get-Content -LiteralPath $tuiFile -Raw
        $json = $null
        try {
            $json = $rawJson | ConvertFrom-Json -ErrorAction Stop
        } catch {
            Write-WarnMsg "No se pudo parsear JSON en '$tuiFile'. Se omite. Error: $($_.Exception.Message)"
            continue
        }

        if ($null -eq $json.PSObject.Properties['plugin']) {
            Write-Host '  No tiene propiedad "plugin".'
            continue
        }

        $pluginEntries = @()
        if ($null -ne $json.plugin) {
            $pluginEntries = @($json.plugin)
        }

        $beforeCount = $pluginEntries.Count
        $filteredPlugins = @($pluginEntries | Where-Object { -not (Test-IsMppPluginEntry -Entry $_) })
        $afterCount = $filteredPlugins.Count
        $removedCount = $beforeCount - $afterCount
        Write-Info ("plugin antes={0}, después={1}, removidos={2}" -f $beforeCount, $afterCount, $removedCount)

        if ($removedCount -gt 0) {
            Invoke-Safe -Action "Backup + actualización de $tuiFile" -Script {
                Backup-JsonFile -Path $tuiFile
                $json.plugin = @($filteredPlugins)
                $updated = $json | ConvertTo-Json -Depth 20
                Set-Content -LiteralPath $tuiFile -Value $updated -Encoding UTF8
            }
        }
    }
}

Write-Section 'Limpiar metadata interna de OpenCode'
$existingStateJsonFiles = @(Get-ExistingPaths -Paths $opencodeStateJsonCandidates)
if ($existingStateJsonFiles.Count -eq 0) {
    Write-Host 'No se encontraron archivos de metadata interna candidatos.'
} else {
    foreach ($stateFile in $existingStateJsonFiles) {
        Write-Info "Revisando: $stateFile"
        $rawJson = Get-Content -LiteralPath $stateFile -Raw
        $json = $null
        try {
            $json = $rawJson | ConvertFrom-Json -ErrorAction Stop
        } catch {
            Write-WarnMsg "No se pudo parsear JSON en '$stateFile'. Se omite. Error: $($_.Exception.Message)"
            continue
        }

        $changed = $false
            $removedKeys = @()
            foreach ($prop in @($json.PSObject.Properties)) {
                $propName = [string]$prop.Name
                if (Test-IsMppStateReference -Key $propName -Value $prop.Value) {
                    $removedKeys += $propName
                }
            }

        foreach ($key in $removedKeys) {
            $json.PSObject.Properties.Remove($key)
            $changed = $true
        }

        if ($null -ne $json.PSObject.Properties['plugin_enabled']) {
            $pluginEnabled = $json.plugin_enabled
            foreach ($prop in @($pluginEnabled.PSObject.Properties)) {
                if (Test-IsMppPluginReference -Reference ([string]$prop.Name)) {
                    $pluginEnabled.PSObject.Properties.Remove($prop.Name)
                    $changed = $true
                }
            }
        }

        if ($changed) {
            Invoke-Safe -Action "Backup + actualización de metadata $stateFile" -Script {
                Backup-JsonFile -Path $stateFile
                $updated = $json | ConvertTo-Json -Depth 20
                Set-Content -LiteralPath $stateFile -Value $updated -Encoding UTF8
            }
        } else {
            Write-Host '  No se encontraron referencias MPP.'
        }
    }
}

Write-Section 'Limpiar cache/data de OpenCode (solo rutas MPP)'
$existingRoots = @(Get-ExistingPaths -Paths $cacheRootsCandidates)
if ($existingRoots.Count -eq 0) {
    Write-Host 'No existen roots de cache/data esperados. Nada para limpiar.'
} else {
    $targets = @()
    foreach ($root in $existingRoots) {
        Write-Info "Escaneando root: $root"
            $matches = @()
            try {
                $matches = Get-ChildItem -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue |
                Where-Object {
                    Test-IsMppCachePath -PathValue $_.FullName
                }
            } catch {
            Write-WarnMsg "No se pudo escanear completamente '$root'. Error: $($_.Exception.Message)"
        }

        if ($matches) {
            $targets += $matches
        }
    }

    $uniqueTargets = @(
        $targets |
            ForEach-Object {
                if ($_ -is [System.IO.FileSystemInfo]) { $_.FullName } else { [string]$_ }
            } |
            Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
            Sort-Object -Unique
    )
    if ($uniqueTargets.Count -eq 0) {
        Write-Host 'No se encontraron rutas MPP en cache/data de OpenCode.'
    } else {
        Write-Info ("Rutas candidatas para borrar: {0}" -f $uniqueTargets.Count)
        foreach ($t in $uniqueTargets) {
            $targetPath = [string]$t
            Invoke-Safe -Action "Eliminar $targetPath" -Script {
                Remove-Item -LiteralPath $targetPath -Recurse -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

Write-Section 'Perfiles y auth data'
if ($RemoveProfiles) {
    $existingProfiles = @(Get-ExistingPaths -Paths $profilesCandidates)
    if ($existingProfiles.Count -eq 0) {
        Write-Host 'No se encontraron carpetas de perfiles en rutas candidatas.'
    } else {
        foreach ($profilesPath in $existingProfiles) {
            Invoke-Safe -Action "Eliminar perfiles: $profilesPath" -Script {
                Remove-Item -LiteralPath $profilesPath -Recurse -Force -ErrorAction Stop
            }
        }
    }
} else {
    Write-WarnMsg 'Perfiles preservados. Para borrarlos explícitamente usa -RemoveProfiles (junto con -Apply).'
}

Write-Section 'Limpieza opcional de cache npm'
if ($CleanNpmCache) {
    if ($null -eq $npmPath) {
        Write-WarnMsg 'npm no está disponible en PATH. No se puede limpiar cache npm.'
    } else {
        if (-not $Apply) {
            Write-Plan 'npm cache clean --force'
        } else {
            Write-Do 'npm cache clean --force'
            $npmCacheResult = Run-Native -File $npmPath -Arguments @('cache', 'clean', '--force')
            Write-Info ("npm cache clean exit code: {0}" -f $npmCacheResult.ExitCode)
            if ($VerboseReport -and $npmCacheResult.Output.Count -gt 0) {
                $npmCacheResult.Output | ForEach-Object { Write-Host "  $_" }
            }
        }
    }
} else {
    Write-Host 'No se limpió cache npm (flag -CleanNpmCache no especificado).'
}

Write-Section 'Verificación final (after)'
Write-Info 'where.exe mpp'
$afterMpp = @(Get-ShimTargetsFromWhere -CommandName 'mpp')
if ($afterMpp.Count -eq 0) {
    Write-Host '  mpp no encontrado en PATH.'
} else {
    $afterMpp | ForEach-Object { Write-Host "  $_" }
}

Write-Info 'where.exe opencode-mpp'
$afterOpencodeMpp = @(Get-ShimTargetsFromWhere -CommandName 'opencode-mpp')
if ($afterOpencodeMpp.Count -eq 0) {
    Write-Host '  opencode-mpp no encontrado en PATH.'
} else {
    $afterOpencodeMpp | ForEach-Object { Write-Host "  $_" }
}

if ($null -ne $npmPath) {
    Write-Info 'npm list -g --depth=0'
    $npmListResult = Run-Native -File $npmPath -Arguments @('list', '-g', '--depth=0')
    Write-Info ("npm list exit code: {0}" -f $npmListResult.ExitCode)
    if ($npmListResult.Output.Count -gt 0) {
        $npmListResult.Output | ForEach-Object { Write-Host "  $_" }
    }
}

Write-Section 'Resumen'
if ($Apply) {
    Write-Host 'Finalizado en modo APPLY.' -ForegroundColor Green
    Write-Host 'Si aún hay estado en OpenCode, cierre/reabra OpenCode y verifique rutas reportadas.' -ForegroundColor Green
} else {
    Write-Host 'Finalizado en modo DRY-RUN. No se aplicaron cambios.' -ForegroundColor Yellow
    Write-Host 'Ejecute de nuevo con -Apply para realizar la limpieza real.' -ForegroundColor Yellow
}
