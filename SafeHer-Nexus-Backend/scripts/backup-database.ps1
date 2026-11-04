<#
.SYNOPSIS
    Automated Non-Destructive Backup Script for SafeHer Nexus MySQL Database.
.DESCRIPTION
    Executes a transactionally consistent mysqldump of the specified SafeHer database,
    saves it with an ISO timestamp, and prunes historical backups older than the retention limit.
#>
param (
    [string]$Database = "safeher_nexus_db",
    [string]$Username = "root",
    [string]$Password = $env:DB_PASSWORD,
    [string]$BackupDir = "$PSScriptRoot\..\backups",
    [int]$RetentionDays = 14,
    [string]$MySqlDumpPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $MySqlDumpPath)) {
    Write-Error "mysqldump.exe not found at: $MySqlDumpPath"
    exit 1
}

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $BackupDir "${Database}_backup_${timestamp}.sql"

Write-Host "Starting backup of database [$Database]..." -ForegroundColor Cyan

$dumpArgs = @(
    "-u", $Username,
    "--single-transaction",
    "--quick",
    "--default-character-set=utf8mb4",
    "--result-file=$backupFile",
    $Database
)

if ($Password) {
    $dumpArgs = @("-p$Password") + $dumpArgs
}

& $MySqlDumpPath @dumpArgs

if ($LASTEXITCODE -eq 0 -and (Test-Path $backupFile)) {
    $size = (Get-Item $backupFile).Length
    Write-Host "Backup completed successfully: $backupFile ($size bytes)" -ForegroundColor Green
} else {
    Write-Error "mysqldump failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

# Apply retention policy
Write-Host "Applying backup retention policy ($RetentionDays days)..." -ForegroundColor Cyan
$cutoffDate = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter "${Database}_backup_*.sql" | Where-Object {
    $_.CreationTime -lt $cutoffDate
} | ForEach-Object {
    Write-Host "Pruning expired backup: $($_.FullName)" -ForegroundColor Yellow
    Remove-Item $_.FullName -Force
}
Write-Host "Backup and retention maintenance complete." -ForegroundColor Green
