# ホワイト事業部価格表 — デスクトップショートカット（¥アイコン）
$ErrorActionPreference = 'Stop'
python (Join-Path $PSScriptRoot 'install-desktop-shortcut.py')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
