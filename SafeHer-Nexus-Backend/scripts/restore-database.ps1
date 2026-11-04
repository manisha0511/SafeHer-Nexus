<#
.SYNOPSIS
    Controlled Non-Destructive Restore Script for SafeHer Nexus MySQL Database.
.DESCRIPTION
    Restores a verified SQL backup file into the target database.
    Contains strict safeguards to prevent restoring onto legacy or unauthorized databases.
#>
param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$TargetDatabase = "safeher_nexus_db",
    [string]$Username = "root",
    [string]$Password = $env:DB_PASSWORD,
    [string]$MySqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
)

$ErrorActionPreference = "Stop"

# Strict safety checks to prevent touching legacy databases
$forbiddenDatabases = @("safeher", "safeher_db", "mysql", "information_schema", "performance_schema")
if ($forbiddenDatabases -contains $TargetDatabase.ToLower().Trim()) {
    Write-Error "CRITICAL SAFETY VIOLATION: Refusing to restore onto protected database: $TargetDatabase"
    exit 1
}

if (-not (Test-Path $BackupFile)) {
    Write-Error "Backup file does not exist: $BackupFile"
    exit 1
}

if (-not (Test-Path $MySqlPath)) {
    Write-Error "mysql.exe not found at: $MySqlPath"
    exit 1
}

Write-Host "Restoring backup [$BackupFile] into database [$TargetDatabase]..." -ForegroundColor Cyan

$mysqlArgs = @(
    "-u", $Username,
    $TargetDatabase,
    "-e", "source $BackupFile"
)

if ($Password) {
    $mysqlArgs = @("-p$Password") + $mysqlArgs
}

& $MySqlPath @mysqlArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host "Database restore completed successfully into [$TargetDatabase]." -ForegroundColor Green
} else {
    Write-Error "mysql.exe restore failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}
