<#
PowerShell script to detect Log4j jar conflicts in Tomcat, backup/move redundant jars,
create log directories and set permissions for Tomcat's log writing.

Usage examples:

PS> .\tools\fix-tomcat-log4j.ps1 -TomcatHome 'C:\Program Files\Apache Software Foundation\Tomcat 9.0' -Action report
PS> .\tools\fix-tomcat-log4j.ps1 -TomcatHome 'C:\Program Files\Apache Software Foundation\Tomcat 9.0' -Action backup -Force
PS> .\tools\fix-tomcat-log4j.ps1 -TomcatHome 'C:\Program Files\Apache Software Foundation\Tomcat 9.0' -Action remove -Force
PS> .\tools\fix-tomcat-log4j.ps1 -TomcatHome 'C:\Program Files\Apache Software Foundation\Tomcat 9.0' -Action setup-logs -Force

Options:
  -TomcatHome  : Tomcat installation dir (default: 'C:\Program Files\Apache Software Foundation\Tomcat 9.0')
  -Action      : report | backup | remove | setup-logs  (default: report)
  -Force       : Proceed without interactive confirmation
#>

param(
    [string]$TomcatHome = 'C:\Program Files\Apache Software Foundation\Tomcat 9.0',
    [ValidateSet('report','backup','remove','setup-logs')][string]$Action = 'report',
    [switch]$Force
)

function Write-Info { param($m) Write-Host "[INFO]  $m" -ForegroundColor Cyan }
function Write-Warn { param($m) Write-Host "[WARN]  $m" -ForegroundColor Yellow }
function Write-Err { param($m) Write-Host "[ERROR] $m" -ForegroundColor Red }

Set-StrictMode -Version Latest

# Normalize TomcatHome
try {
    $TomcatHome = (Resolve-Path -Path $TomcatHome).ProviderPath
} catch {
    Write-Err "TomcatHome not found: $TomcatHome"
    exit 1
}

if (-not (Test-Path $TomcatHome)) {
    Write-Err "TomcatHome not found: $TomcatHome"
    exit 1
}

# Resolve LogsRoot - TomcatHome\..\logs as in the original traces
$LogsRoot = [System.IO.Path]::GetFullPath((Join-Path $TomcatHome "..\logs"))
$WebappsRoot = Join-Path $TomcatHome 'webapps'
$TomcatLib = Join-Path $TomcatHome 'lib'
$BackupRoot = Join-Path $TomcatHome ('backup\log4j_jars_' + (Get-Date -Format 'yyyyMMdd_HHmmss'))

Write-Info "TomcatHome: $TomcatHome"
Write-Info "TomcatLib:  $TomcatLib"
Write-Info "Webapps:    $WebappsRoot"
Write-Info "LogsRoot:   $LogsRoot"
Write-Info "Action:     $Action"

# Find Tomcat service account by scanning Win32_Service for PathName containing TomcatHome
$service = Get-WmiObject -Class Win32_Service | Where-Object {
    $_.PathName -and (
        $_.PathName -like "*$($TomcatHome)*" -or
        $_.PathName -like "*$($TomcatHome.Replace('\\','\\\\'))*"
    )
} | Select-Object -First 1
if ($null -ne $service) {
    $tomcatServiceAccount = $service.StartName
    Write-Info "Detected Tomcat service '$($service.Name)' running as: $tomcatServiceAccount"
} else {
    Write-Warn "Could not detect Tomcat service. Defaulting permissions to 'NT AUTHORITY\NETWORK SERVICE' fallback."
    $tomcatServiceAccount = 'NT AUTHORITY\NETWORK SERVICE'
}

# Step: create backup dir if allowed
if ($Action -in @('backup','remove','report','setup-logs')) {
    if (-not (Test-Path $BackupRoot)) {
        Write-Info "Creating backup folder: $BackupRoot"
        New-Item -Path $BackupRoot -ItemType Directory -Force | Out-Null
    }
}

# Collect jars in Tomcat/lib
$tomcatJars = @(Get-ChildItem -Path $TomcatLib -Filter 'log4j-*.jar' -File -ErrorAction SilentlyContinue)
$tomcatJars += @(Get-ChildItem -Path $TomcatLib -Filter 'log4j-core*.jar' -File -ErrorAction SilentlyContinue | Where-Object { $_ -ne $null })
$tomcatJars = @($tomcatJars | Sort-Object Name -Unique)

# Collect jars in webapps (WEB-INF/lib)
$webappJars = @()
if (Test-Path $WebappsRoot) {
    $webappJars = @(Get-ChildItem -Path (Join-Path $WebappsRoot '*') -Recurse -Filter 'log4j-*.jar' -File -ErrorAction SilentlyContinue)
    $webappJars += @(Get-ChildItem -Path (Join-Path $WebappsRoot '*') -Recurse -Filter 'log4j-core*.jar' -File -ErrorAction SilentlyContinue)
    $webappJars = @($webappJars | Sort-Object Name -Unique)
}

Write-Info "Found $($tomcatJars.Count) log4j jar(s) in Tomcat/lib and $($webappJars.Count) in webapps' WEB-INF/lib"

# Map webapp jars by name for quick lookup
$webappMap = @{}
foreach ($j in $webappJars) {
    if (-not $webappMap.ContainsKey($j.Name)) { $webappMap[$j.Name] = @() }
    $webappMap[$j.Name] += $j.FullName
}

# Detect duplicates by file base name (name only)
$conflicts = @()
foreach ($tj in $tomcatJars) {
    if ($webappMap.ContainsKey($tj.Name)) {
        $conflicts += [PSCustomObject]@{
            JarName = $tj.Name
            TomcatLibPath = $tj.FullName
            WebappPaths = $webappMap[$tj.Name] -join '; '
        }
    }
}

if ($conflicts.Count -eq 0) {
    Write-Info "No jar name collisions between Tomcat/lib and webapps detected"
} else {
    Write-Warn "Detected $($conflicts.Count) jar name collisions. Review carefully."
    $conflicts | Format-Table -AutoSize
}

# Show webapps with log4j jars
$webappsWithLog4j = $webappJars | ForEach-Object {
    $webappRoot = ($_ | Split-Path -Parent -Parent) # go up from .../WEB-INF/lib to webapp root
    [PSCustomObject]@{ WebappRoot = $webappRoot; Jar = $_.Name; Path = $_.FullName }
} | Group-Object -Property WebappRoot

Write-Info "Webapps containing Log4j jars:"
foreach ($g in $webappsWithLog4j) {
    Write-Host "- $($g.Name): $($g.Count) log4j jar(s)" -ForegroundColor Green
}

# Function to create the required logs folder and grant permissions
function Setup-Logs {
    param([string]$LogsRoot, [string]$ServiceAccount)
    $dirs = @(
        Join-Path $LogsRoot 'FineLog',
        Join-Path $LogsRoot 'FineLog\gclogs'
    )
    foreach ($d in $dirs) {
        if (-not (Test-Path $d)) {
            Write-Info "Creating directory: $d"
            New-Item -Path $d -ItemType Directory -Force | Out-Null
        } else {
            Write-Info "Directory exists: $d"
        }
        try {
            Write-Info "Granting Modify permissions to $($ServiceAccount) on $d"
            icacls $d /grant "$($ServiceAccount):(OI)(CI)M" /T | Out-Null
        } catch {
            # MODIFIED LINE: using ${d}: instead of $d:
            Write-Warn ("icacls failed on ${d}: $($_)")
        }
    }
}

if ($Action -eq 'setup-logs') {
    Setup-Logs -LogsRoot $LogsRoot -ServiceAccount $tomcatServiceAccount
    Write-Info "setup-logs completed."
    exit 0
}

if ($Action -eq 'report') {
    Write-Info "REPORT complete. No changes made. Specify -Action backup or -Action remove with -Force to make changes."
    exit 0
}

# For backup and removal operations
function Backup-And-Remove {
    param(
        [array]$Conflicts,
        [string]$BackupRoot,
        [switch]$Remove,
        [switch]$Force
    )
    if ($Conflicts.Count -eq 0) { Write-Info "No conflicts to backup/move."; return }

    foreach ($c in $Conflicts) {
        $source = $c.TomcatLibPath
        $targetDir = Join-Path $BackupRoot ([IO.Path]::GetFileNameWithoutExtension($c.JarName))
        if (-not (Test-Path $targetDir)) { New-Item -Path $targetDir -ItemType Directory -Force | Out-Null }
        $target = Join-Path $targetDir ([IO.Path]::GetFileName($source))

        Write-Info "Backing up $source -> $target"
        try {
            Copy-Item -Path $source -Destination $target -Force
        } catch {
            Write-Err "Copy failed: $_"
            continue
        }
        if ($Remove) {
            if (-not $Force) {
                $confirm = Read-Host "Remove $source from Tomcat/lib? (Y/N)"
                if ($confirm -notin @('Y','y')) {
                    Write-Warn "Skipping removal of $source"
                    continue
                }
            }
            try {
                Write-Info "Removing $source"
                Remove-Item -Path $source -Force
            } catch {
                Write-Err "Removal failed: $_"
            }
        } else {
            Write-Info "(Backup-only; not removing $source)"
        }
    }
}

if ($Action -in @('backup','remove')) {
    $removeFlag = $Action -eq 'remove'
    Write-Info "This will backup duplicates from Tomcat/lib. Remove afterwards: $removeFlag"

    if (-not $Force) {
        Write-Host "Conflicts to operate on: $($conflicts.Count)" -ForegroundColor Yellow
        foreach ($c in $conflicts) { Write-Host " - $($c.JarName) : Tomcat lib: $($c.TomcatLibPath) -> webapps: $($c.WebappPaths)" }
        $confirm = Read-Host "Proceed with action '$Action' (Backup to $BackupRoot)? (Y/N)"
        if ($confirm -notin @('Y','y')) { Write-Warn "Operation cancelled by user."; exit 0 }
    }

    Backup-And-Remove -Conflicts $conflicts -BackupRoot $BackupRoot -Remove:$removeFlag -Force:$Force

    Write-Info "Backup operation complete. Files are in $BackupRoot"
}

# Ensure logs dirs exist and have correct ACLs
Setup-Logs -LogsRoot $LogsRoot -ServiceAccount $tomcatServiceAccount

Write-Info "Script finished. Please restart Tomcat and enable log4j2 debug if issues persist: -Dlog4j2.debug"

exit 0