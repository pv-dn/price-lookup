# ホワイト事業部価格表 — デスクトップショートカット（¥アイコン）
$ErrorActionPreference = 'Stop'
$AppName = 'ホワイト事業部価格表'
$AppUrl = 'https://pv-dn.github.io/price-lookup/'
$IconPath = Join-Path $PSScriptRoot 'public\icons\desktop.ico'

if (-not (Test-Path $IconPath)) {
    python (Join-Path $PSScriptRoot 'icons\make-icons.py') | Out-Null
}

$DesktopDir = Join-Path $env:USERPROFILE 'Desktop'
if (-not (Test-Path $DesktopDir)) {
    $DesktopDir = Join-Path $env:USERPROFILE 'OneDrive\Desktop'
}

$ShortcutPath = Join-Path $DesktopDir "$AppName.lnk"

$chrome = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
$edge = "$env:ProgramFiles (x86)\Microsoft\Edge\Application\msedge.exe"
if (Test-Path $chrome) {
    $target = $chrome
} elseif (Test-Path $edge) {
    $target = $edge
} else {
    throw 'Chrome または Edge が見つかりません'
}

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $target
$Shortcut.Arguments = "--app=$AppUrl"
$Shortcut.IconLocation = "$IconPath,0"
$Shortcut.Description = $AppName
$Shortcut.WorkingDirectory = $PSScriptRoot
$Shortcut.Save()

Write-Host "Created: $ShortcutPath"
