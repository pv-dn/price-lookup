# Open price-lookup in its own Cursor window (not mixed with 伝票 / Shift Board / etc.).
$ErrorActionPreference = 'Stop'

$Workspace = Join-Path $PSScriptRoot '..\Cursor用\workspaces\価格参照.code-workspace'
$Workspace = [System.IO.Path]::GetFullPath($Workspace)

if (-not (Test-Path $Workspace)) {
    throw "Workspace not found: $Workspace"
}

$cursorCmd = Get-Command cursor -ErrorAction SilentlyContinue
if ($cursorCmd) {
    & cursor $Workspace
    exit 0
}

$cursorExe = Join-Path $env:LOCALAPPDATA 'Programs\cursor\Cursor.exe'
if (Test-Path $cursorExe) {
    Start-Process $cursorExe -ArgumentList "`"$Workspace`""
    Write-Host "Opened: $Workspace"
    exit 0
}

throw "Cursor not found. Install Cursor or add the cursor command to PATH."
